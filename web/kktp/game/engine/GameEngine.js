/**
 * GameEngine.js - Core game orchestration for DAG Dasher
 * 
 * Refactored to use modular mixins:
 * - EntityManager.js - Entity spawning and lifecycle (with object pooling)
 * - PhysicsSystem.js - Collision detection and jump physics
 * - EntropySource.js - VRF entropy and deterministic randomness
 * - GameState.js - Constants, enums, and formatting utilities
 * - PlayerPhysicsMixin.js - Player movement (lane switching)
 * - PowerupSystem.js - Powerup lifecycle management
 * 
 * This file now focuses on:
 * - Game state machine (IDLE → COUNTDOWN → RUNNING → PAUSED → ENDED)
 * - Main game loop orchestration
 * - DAA-based progress tracking
 * - Input handling coordination
 * - Multiplayer state sync
 */

import { EventEmitter } from '../core/EventEmitter.js';
import { Logger } from '../core/Logger.js';
import { GAME, ACTION } from '../constants/constants.js';

// Sub-modules
import { GameState, GameEvent, Lane, EntityType, formatRaceTime } from './GameState.js';
import { EntityManagerMixin } from './EntityManager.js';
import { PhysicsSystemMixin } from './PhysicsSystem.js';
import { EntropySourceMixin } from './EntropySource.js';
import { PlayerControllerMixin } from './PlayerPhysicsMixin.js';
import { PowerupSystemMixin } from './PowerupSystem.js';

const log = Logger.create('GameEngine');

// Re-export constants for external consumers
export { GameState, GameEvent, Lane, EntityType };

/**
 * GameEngine - Core game logic coordinator
 * Uses mixin composition for separation of concerns
 */
export class GameEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // ─── Core Game State ───────────────────────────────────────
    this._state = GameState.IDLE;
    this._paused = false;
    this._countdownValue = 3;
    
    // ─── Player State ──────────────────────────────────────────
    this._playerLane = Lane.CENTER;
    this._playerY = 0;
    this._isJumping = false;
    this._isDucking = false;
    this._jumpVelocity = 0;
    this._playerHeight = 1.0;
    this._playerDuckHeight = 0.3;
    
    // ─── Game Metrics ──────────────────────────────────────────
    this._coins = 0;
    this._progress = 0;
    this._speed = GAME.INITIAL_SPEED;
    this._distance = 0;
    
    // ─── DAA Timing ────────────────────────────────────────────
    this._startDaaScore = 0;
    this._endDaaScore = 0;
    this._currentDaaScore = 0;
    
    // ─── Race Timer ────────────────────────────────────────────
    this._raceStartTime = 0;
    this._raceElapsedMs = 0;
    
    // ─── Powerup State ─────────────────────────────────────────
    this._activePowerup = null;
    this._powerupEndTime = 0;
    this._baseSpeed = null;
    
    // ─── Collision Slowdown ────────────────────────────────────
    this._collisionSlowdownEndTime = 0;
    this._preCollisionSpeed = null;
    
    // ─── Game Loop ─────────────────────────────────────────────
    this._lastUpdate = 0;
    this._gameLoop = null;
    
    // ─── Multiplayer ───────────────────────────────────────────
    this._isMultiplayer = false;
    this._opponentProgress = 0;
    this._opponentCoins = 0;
    
    // ─── Initialize Mixins ─────────────────────────────────────
    this._initEntityManager();
    this._initPhysicsSystem();
    this._initEntropySource();
    this._initPlayer();
    this._initPowerupSystem();
  }
  
  // ═══════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════
  
  get state() { return this._state; }
  get playerLane() { return this._playerLane; }
  get playerY() { return this._playerY; }
  get isJumping() { return this._isJumping; }
  get isDucking() { return this._isDucking; }
  get playerHeight() { return this._isDucking ? this._playerDuckHeight : this._playerHeight; }
  get coins() { return this._coins; }
  get progress() { return this._progress; }
  get speed() { return this._speed; }
  get entities() { return this._entities; }
  get activePowerup() { return this._activePowerup; }
  get isMultiplayer() { return this._isMultiplayer; }
  get opponentProgress() { return this._opponentProgress; }
  get countdownValue() { return this._countdownValue; }
  
  get blocksRemaining() {
    return Math.max(0, this._endDaaScore - this._currentDaaScore);
  }
  
  get raceElapsedMs() {
    if (this._state === GameState.RUNNING) {
      return Date.now() - this._raceStartTime;
    }
    return this._raceElapsedMs;
  }
  
  get raceTimeFormatted() {
    return formatRaceTime(this.raceElapsedMs);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Initialize game with VRF seed
   * @param {Object} options
   * @param {string} options.vrfSeed - Initial VRF seed for obstacle generation
   * @param {number} options.startDaaScore - Starting DAA score
   * @param {boolean} options.isMultiplayer - Multiplayer mode
   * @param {Object} options.kkGameEngine - kkGameEngine instance for VRF
   */
  init(options = {}) {
    // DAA timing
    this._startDaaScore = options.startDaaScore ?? 0;
    this._endDaaScore = this._startDaaScore + GAME.DAA_DURATION;
    this._currentDaaScore = this._startDaaScore;
    this._isMultiplayer = options.isMultiplayer ?? false;
    
    // Setup entropy source with VRF seed and kkGameEngine
    this._setupEntropySource(options);
    
    // Reset player state
    this._playerLane = Lane.CENTER;
    this._playerY = 0;
    this._isJumping = false;
    this._isDucking = false;
    this._coins = GAME.PLAYER_START_COINS;
    this._progress = 0;
    this._speed = GAME.INITIAL_SPEED;
    this._distance = 0;
    
    // Reset entities
    this._resetEntities();
    
    // Reset powerup
    this._activePowerup = null;
    
    this._setState(GameState.IDLE);
    
    log.info('Game initialized', {
      startDaa: this._startDaaScore,
      endDaa: this._endDaaScore,
      isMultiplayer: this._isMultiplayer,
    });
  }
  
  // ═══════════════════════════════════════════════════════════════
  // GAME STATE MACHINE
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Start countdown - sets state to COUNTDOWN
   */
  startCountdown() {
    if (this._state !== GameState.IDLE) return;
    
    this._countdownValue = 3;
    this._setState(GameState.COUNTDOWN);
    
    log.info('Countdown started - waiting for blocks');
  }
  
  /**
   * Update countdown value (called by GameFacade based on block count)
   * @param {number} value - Countdown value (3, 2, 1, 0)
   */
  setCountdownValue(value) {
    this._countdownValue = value;
  }
  
  /**
   * Start the game (called after block-based countdown)
   */
  startGame() {
    if (this._state !== GameState.COUNTDOWN) {
      log.warn('startGame called but not in COUNTDOWN state', { state: this._state });
      return;
    }
    this._startGameLoop();
  }
  
  /**
   * Set DAA scores for game timing
   * @param {number} startDaa - Starting DAA score
   * @param {number} endDaa - Ending DAA score
   */
  setDaaScores(startDaa, endDaa) {
    this._startDaaScore = startDaa;
    this._endDaaScore = endDaa;
    this._currentDaaScore = startDaa;
    log.info('DAA scores set', { startDaa, endDaa, duration: endDaa - startDaa });
  }
  
  /**
   * Pause the game
   */
  pause() {
    if (this._state !== GameState.RUNNING) return;
    
    this._paused = true;
    this._setState(GameState.PAUSED);
    
    log.info('Game paused');
  }
  
  /**
   * Resume the game
   */
  resume() {
    if (this._state !== GameState.PAUSED) return;
    
    this._paused = false;
    this._lastUpdate = performance.now();
    this._setState(GameState.RUNNING);
    
    log.info('Game resumed');
  }
  
  /**
   * Force end the game
   * @param {string} reason - Reason for ending
   */
  forceEnd(reason) {
    this._endGame(reason);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // INPUT HANDLING
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Handle player input
   * @param {string} action - Action type from ACTION constants
   * @returns {Object} Result of the action
   */
  handleInput(action) {
    if (this._state !== GameState.RUNNING) {
      return { success: false, reason: 'not_running' };
    }
    
    let result = { success: false };
    
    switch (action) {
      case ACTION.MOVE_LEFT:
        result = this._movePlayer(-1);
        break;
      case ACTION.MOVE_RIGHT:
        result = this._movePlayer(1);
        break;
      case ACTION.JUMP:
        result = this._jump();
        break;
      case ACTION.SLIDE:
      case ACTION.DUCK:
        result = this._duck();
        break;
      case ACTION.DUCK_RELEASED:
        result = this._duckRelease();
        break;
      default:
        result = { success: false, reason: 'unknown_action' };
    }
    
    if (result.success) {
      this.emit(GameEvent.PLAYER_MOVED, {
        action,
        lane: this._playerLane,
        y: this._playerY,
        timestamp: Date.now(),
      });
    }
    
    return result;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // DAA PROGRESS TRACKING
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Update DAA score (call periodically with latest DAA)
   * @param {number} currentDaa - Current DAA score from blockchain
   */
  updateDaaScore(currentDaa) {
    if (this._state !== GameState.RUNNING) return;
    if (!this._startDaaScore || !this._endDaaScore) return;
    
    const previousDaa = this._currentDaaScore;
    this._currentDaaScore = currentDaa;
    
    // Calculate progress
    const totalDuration = this._endDaaScore - this._startDaaScore;
    if (totalDuration <= 0) {
      this._progress = 0;
      return;
    }
    
    const elapsed = currentDaa - this._startDaaScore;
    this._progress = Math.min(1, Math.max(0, elapsed / totalDuration));
    
    // Calculate speed from progress (don't overwrite if slowdown/powerup active)
    const progressSpeed = GAME.INITIAL_SPEED + (GAME.MAX_SPEED - GAME.INITIAL_SPEED) * this._progress;
    
    // Only update speed if no collision slowdown or powerup is active
    if (this._collisionSlowdownEndTime === 0 && !this._baseSpeed) {
      this._speed = progressSpeed;
    }
    
    // Emit progress update
    this.emit(GameEvent.PROGRESS_UPDATE, {
      progress: this._progress,
      daaScore: currentDaa,
      speed: this._speed,
    });
    
    // Check for game end
    if (previousDaa > 0 && previousDaa < this._endDaaScore && currentDaa >= this._endDaaScore) {
      this._endGame('daa_complete');
    }
  }
  
  /**
   * Update opponent state (multiplayer)
   * @param {Object} opponentState
   */
  updateOpponentState(opponentState) {
    if (!this._isMultiplayer) return;
    
    this._opponentProgress = opponentState.progress ?? this._opponentProgress;
    this._opponentCoins = opponentState.coins ?? this._opponentCoins;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // RESULTS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Get game results
   */
  getResults() {
    return {
      coins: this._coins,
      progress: this._progress,
      distance: this._distance,
      speed: this._speed,
      raceTimeMs: this._raceElapsedMs,
      raceTimeFormatted: this.raceTimeFormatted,
      daaScore: {
        start: this._startDaaScore,
        end: this._currentDaaScore,
        target: this._endDaaScore,
      },
    };
  }
  
  // ═══════════════════════════════════════════════════════════════
  // PRIVATE - STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  
  _setState(newState) {
    if (this._state === newState) return;
    
    const oldState = this._state;
    this._state = newState;
    
    log.debug('State changed', { from: oldState, to: newState });
    this.emit(GameEvent.STATE_CHANGED, { from: oldState, to: newState });
  }
  
  _startGameLoop() {
    this._lastUpdate = performance.now();
    this._raceStartTime = Date.now();
    this._setState(GameState.RUNNING);
    
    // Start game loop
    this._gameLoop = requestAnimationFrame(this._update.bind(this));
    
    log.info('Game started');
    this.emit(GameEvent.GAME_START, { timestamp: Date.now() });
  }
  
  _endGame(reason) {
    if (this._state === GameState.ENDED) return;
    
    // Record final race time FIRST
    if (this._raceStartTime > 0) {
      this._raceElapsedMs = Date.now() - this._raceStartTime;
    }
    
    this._setState(GameState.ENDED);
    
    if (this._gameLoop) {
      cancelAnimationFrame(this._gameLoop);
      this._gameLoop = null;
    }
    
    const results = this.getResults();
    
    log.info('Game ended', { reason, results, raceTimeMs: this._raceElapsedMs });
    this.emit(GameEvent.GAME_END, { reason, results, timestamp: Date.now() });
  }
  
  // ═══════════════════════════════════════════════════════════════
  // PRIVATE - GAME LOOP
  // ═══════════════════════════════════════════════════════════════
  
  _update(timestamp) {
    if (this._state !== GameState.RUNNING) return;
    
    const dt = (timestamp - this._lastUpdate) / 1000;
    this._lastUpdate = timestamp;
    
    // Cap delta time to prevent huge jumps
    const cappedDt = Math.min(dt, 0.1);
    
    // Update collision slowdown recovery
    this._updateCollisionSlowdown();
    
    // Update distance
    this._distance += this._speed * cappedDt * GAME.DISTANCE_MULTIPLIER;
    
    // Update jump physics (from PhysicsSystem)
    this._updateJump(cappedDt);
    
    // Update entities (from EntityManager)
    this._updateEntities(cappedDt);
    
    // Spawn new entities (from EntityManager)
    this._spawnEntities();
    
    // Check collisions (from PhysicsSystem)
    this._checkCollisions();
    
    // Update powerup (from PowerupSystem)
    this._updatePowerup();
    
    // Continue loop
    this._gameLoop = requestAnimationFrame(this._update.bind(this));
  }
  
  _updateCollisionSlowdown() {
    if (this._collisionSlowdownEndTime > 0 && Date.now() >= this._collisionSlowdownEndTime) {
      // Restore speed after slowdown period
      if (this._preCollisionSpeed !== null) {
        this._speed = this._preCollisionSpeed;
        this._preCollisionSpeed = null;
        log.debug('Collision slowdown ended, speed restored', { speed: this._speed });
        this.emit(GameEvent.SPEED_CHANGED, { speed: this._speed, reason: 'slowdown_ended' });
      }
      this._collisionSlowdownEndTime = 0;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Reset game state for a new game (called between games)
   * Clears all game-specific state while keeping the engine alive
   */
  reset() {
    // Stop game loop if running
    if (this._gameLoop) {
      cancelAnimationFrame(this._gameLoop);
      this._gameLoop = null;
    }
    
    // Reset state machine
    this._state = GameState.IDLE;
    this._paused = false;
    this._countdownValue = 3;
    
    // Reset player state
    this._playerLane = Lane.CENTER;
    this._playerY = 0;
    this._isJumping = false;
    this._isDucking = false;
    this._jumpVelocity = 0;
    
    // Reset game metrics
    this._coins = 0;
    this._progress = 0;
    this._speed = GAME.INITIAL_SPEED;
    this._distance = 0;
    
    // Reset DAA timing
    this._startDaaScore = 0;
    this._endDaaScore = 0;
    this._currentDaaScore = 0;
    
    // Reset race timer
    this._raceStartTime = 0;
    this._raceElapsedMs = 0;
    
    // Reset powerup state
    this._activePowerup = null;
    this._powerupEndTime = 0;
    this._baseSpeed = null;
    
    // Reset collision slowdown
    this._collisionSlowdownEndTime = 0;
    this._preCollisionSpeed = null;
    
    // Reset multiplayer
    this._opponentProgress = 0;
    this._opponentCoins = 0;
    
    // Reset entities (also clears entity pools)
    this._resetEntities();
    
    // Reset physics state (clears collected coins tracking)
    this._resetPhysics();
    
    log.info('GameEngine reset (all state cleared)');
  }
  
  destroy() {
    if (this._gameLoop) {
      cancelAnimationFrame(this._gameLoop);
      this._gameLoop = null;
    }
    
    // Cleanup mixins
    this._destroyEntityManager();
    this._destroyEntropySource();
    this._destroyPhysicsSystem();
    
    // Clear powerup state
    this._activePowerup = null;
    
    this.removeAllListeners();
    log.info('GameEngine destroyed');
  }
}

// ═══════════════════════════════════════════════════════════════
// APPLY MIXINS
// ═══════════════════════════════════════════════════════════════

Object.assign(GameEngine.prototype, EntityManagerMixin);
Object.assign(GameEngine.prototype, PhysicsSystemMixin);
Object.assign(GameEngine.prototype, EntropySourceMixin);
Object.assign(GameEngine.prototype, PlayerControllerMixin);
Object.assign(GameEngine.prototype, PowerupSystemMixin);

export default GameEngine;
