/**
 * SessionState.js - Internal state holder for current game session
 * 
 * Owns all session-specific data:
 * - Game ID, player IDs
 * - DAA scores and countdown state
 * - Game progress and results
 */

import { EventEmitter } from '../../core/EventEmitter.js';
import { GAME } from '../../core/Constants.js';

/**
 * Session state events
 */
export const SessionStateEvent = Object.freeze({
  STATE_CHANGED: 'stateChanged',
  COUNTDOWN_TICK: 'countdownTick',
  COUNTDOWN_COMPLETE: 'countdownComplete',
  PROGRESS_UPDATE: 'progressUpdate',
  SESSION_END: 'sessionEnd',
});

/**
 * Session phases
 */
export const SessionPhase = Object.freeze({
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  COUNTDOWN: 'countdown',
  RUNNING: 'running',
  ENDED: 'ended',
});

/**
 * Countdown configuration
 * Uses hybrid timing: local clock for smooth display, blocks for calibration
 */
const COUNTDOWN_CONFIG = {
  TOTAL_SECONDS: 3,           // 3-2-1-GO countdown
  TICK_INTERVAL_MS: 16,       // ~60fps for smooth radial progress
  BLOCKS_PER_SECOND: 10,      // Kaspa's target BPS
};

export class SessionState extends EventEmitter {
  constructor() {
    super();
    this.reset();
  }

  /**
   * Reset all session state
   */
  reset() {
    // Stop any running countdown timer
    this._stopCountdownTimer();
    
    // Identity
    this._gameId = null;
    this._playerId = null;
    this._opponentId = null;
    this._lobbyId = null;
    
    // Mode
    this._isMultiplayer = false;
    
    // DAA tracking
    this._startDaaScore = 0;
    this._endDaaScore = 0;
    this._currentDaaScore = 0;
    
    // Countdown - hybrid timer state
    this._countdownStartTime = null;     // Local clock start (ms)
    this._countdownStartDaa = null;      // DAA score at countdown start
    this._lastCountdownDaa = null;       // Actual last DAA score received during countdown
    this._countdownBlockCount = 0;       // Blocks received during countdown
    this._countdownPhase = 3;            // Current visual number (3, 2, 1, 0)
    this._countdownProgress = 0;         // 0-1 progress within current second
    this._countdownDone = false;
    this._countdownTimerId = null;       // RAF/interval ID for smooth updates
    
    // VRF
    this._vrfSeed = null;
    
    // Phase
    this._phase = SessionPhase.IDLE;
    
    // Results
    this._lastResults = null;
  }

  // ─── Getters ───────────────────────────────────────────────────

  get gameId() { return this._gameId; }
  get playerId() { return this._playerId; }
  get opponentId() { return this._opponentId; }
  get lobbyId() { return this._lobbyId; }
  get isMultiplayer() { return this._isMultiplayer; }
  get startDaaScore() { return this._startDaaScore; }
  get endDaaScore() { return this._endDaaScore; }
  get currentDaaScore() { return this._currentDaaScore; }
  get vrfSeed() { return this._vrfSeed; }
  get phase() { return this._phase; }
  get lastResults() { return this._lastResults; }
  get countdownPhase() { return this._countdownPhase; }
  get countdownProgress() { return this._countdownProgress; }
  get countdownDone() { return this._countdownDone; }

  get blocksRemaining() {
    if (this._endDaaScore <= 0) return GAME.DAA_DURATION;
    return Math.max(0, this._endDaaScore - this._currentDaaScore);
  }

  get progress() {
    const total = GAME.DAA_DURATION;
    const remaining = this.blocksRemaining;
    return Math.min(1, Math.max(0, (total - remaining) / total));
  }

  // ─── Setters / Actions ─────────────────────────────────────────

  setPhase(phase) {
    if (this._phase !== phase) {
      this._phase = phase;
      this.emit(SessionStateEvent.STATE_CHANGED, { phase });
    }
  }

  /**
   * Initialize a new session
   */
  initialize(options) {
    this._gameId = options.gameId;
    this._playerId = options.playerId;
    this._opponentId = options.opponentId ?? null;
    this._lobbyId = options.lobbyId ?? null;
    this._isMultiplayer = options.isMultiplayer ?? false;
    this._vrfSeed = options.vrfSeed ?? null;
    this._startDaaScore = options.startDaaScore ?? 0;
    
    this._phase = SessionPhase.INITIALIZING;
    this.emit(SessionStateEvent.STATE_CHANGED, { phase: this._phase });
  }

  /**
   * Begin countdown phase
   * Starts a hybrid timer: local clock for smooth display, blocks for calibration
   */
  startCountdown() {
    this._countdownStartTime = null;  // Will be set on first tick
    this._countdownStartDaa = null;
    this._lastCountdownDaa = null;    // Track actual last DAA score
    this._countdownBlockCount = 0;
    this._countdownPhase = 3;
    this._countdownProgress = 0;
    this._countdownDone = false;
    this._phase = SessionPhase.COUNTDOWN;
    
    // Start the smooth local timer
    this._startCountdownTimer();
    
    this.emit(SessionStateEvent.STATE_CHANGED, { phase: this._phase });
  }

  /**
   * Start the local countdown timer for smooth display
   * Runs at ~60fps and emits fractional progress for radial animation
   * @private
   */
  _startCountdownTimer() {
    this._stopCountdownTimer();
    
    const tick = () => {
      if (this._countdownDone) return;
      
      // Initialize start time on first tick
      if (this._countdownStartTime === null) {
        this._countdownStartTime = performance.now();
        // Emit initial "3" with 0 progress
        this.emit(SessionStateEvent.COUNTDOWN_TICK, { 
          value: 3, 
          progress: 0,
          isStart: true 
        });
      }
      
      const elapsed = performance.now() - this._countdownStartTime;
      const totalDurationMs = COUNTDOWN_CONFIG.TOTAL_SECONDS * 1000;
      
      // Calculate current phase and progress within that second
      const elapsedSeconds = elapsed / 1000;
      const newPhase = Math.max(0, COUNTDOWN_CONFIG.TOTAL_SECONDS - Math.floor(elapsedSeconds));
      
      // Progress within current second (0 to 1)
      const secondProgress = elapsedSeconds % 1;
      this._countdownProgress = secondProgress;
      
      // Emit tick if phase changed
      if (newPhase !== this._countdownPhase && newPhase > 0) {
        this._countdownPhase = newPhase;
        this.emit(SessionStateEvent.COUNTDOWN_TICK, { 
          value: newPhase,
          progress: 0  // Reset progress for new number
        });
      }
      
      // Check if countdown complete (3 seconds elapsed)
      if (elapsed >= totalDurationMs && !this._countdownDone) {
        this._completeCountdown();
        return;
      }
      
      // Continue timer
      this._countdownTimerId = requestAnimationFrame(tick);
    };
    
    // Start immediately
    this._countdownTimerId = requestAnimationFrame(tick);
  }

  /**
   * Stop the countdown timer
   * @private
   */
  _stopCountdownTimer() {
    if (this._countdownTimerId !== null) {
      cancelAnimationFrame(this._countdownTimerId);
      this._countdownTimerId = null;
    }
  }

  /**
   * Complete the countdown and transition to RUNNING
   * @private
   */
  _completeCountdown() {
    this._stopCountdownTimer();
    this._countdownDone = true;
    this._countdownPhase = 0;
    this._phase = SessionPhase.RUNNING;
    
    // Use the ACTUAL last DAA score received during countdown (not blockCount estimate)
    // DAA score per block varies due to difficulty adjustments, so counting blocks is inaccurate
    const currentDaa = this._lastCountdownDaa ?? this._countdownStartDaa ?? Date.now();
    
    this._startDaaScore = currentDaa;
    this._endDaaScore = currentDaa + GAME.DAA_DURATION;
    
    this.emit(SessionStateEvent.COUNTDOWN_COMPLETE, {
      startDaa: this._startDaaScore,
      endDaa: this._endDaaScore,
    });
  }

  /**
   * Process a block during countdown (for DAA calibration, not display timing)
   * The hybrid timer uses local time for display, blocks just calibrate the DAA estimate
   * @param {number} daaScore - Current DAA score
   * @returns {Object|null} Always null (display handled by local timer)
   */
  processCountdownBlock(daaScore) {
    if (this._countdownDone) return null;

    // First block sets the DAA baseline for calibration
    if (this._countdownStartDaa === null) {
      this._countdownStartDaa = daaScore;
    }
    
    // Always track the latest DAA score (actual value, not estimate)
    this._lastCountdownDaa = daaScore;
    this._countdownBlockCount++;
    
    // Don't drive display from blocks - that's handled by local timer
    // Just track block count for DAA estimation
    return null;
  }

  /**
   * Update DAA score during running phase
   * @param {number} daaScore - Current DAA score
   */
  updateDaaScore(daaScore) {
    // Guard: countdown must be complete
    if (!this._countdownDone) {
      return;
    }
    
    // Guard: endDaaScore must be set
    if (this._endDaaScore <= 0) {
      return;
    }
    
    // Guard: DAA can only increase (reject stale/duplicate blocks)
    if (daaScore <= this._currentDaaScore) {
      return;
    }
    
    this._currentDaaScore = daaScore;
    
    const progress = this.progress;
    const remaining = this.blocksRemaining;
    
    this.emit(SessionStateEvent.PROGRESS_UPDATE, { progress, remaining });
  }

  /**
   * End the session
   * @param {Object} results - Game results
   */
  end(results) {
    this._lastResults = {
      score: results?.score ?? 0,
      coins: results?.coins ?? 0,
      distance: results?.distance ?? 0,
      progress: results?.progress ?? this.progress,
      raceTimeMs: results?.raceTimeMs ?? 0,
      raceTimeFormatted: results?.raceTimeFormatted ?? '0:00.00',
      endReason: results?.reason ?? results?.endReason ?? 'unknown',
    };
    
    this._phase = SessionPhase.ENDED;
    this.emit(SessionStateEvent.SESSION_END, this._lastResults);
  }

  /**
   * Generate a unique game ID
   * @param {string} prefix - 'SP' for single player, 'MP' for multiplayer
   * @param {string} [lobbyId] - Optional lobby ID for multiplayer
   * @returns {string}
   */
  static generateGameId(prefix = 'SP', lobbyId = null) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    if (lobbyId) {
      return `${prefix}_${lobbyId}_${timestamp}`;
    }
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Generate a unique player ID
   * @returns {string}
   */
  static generatePlayerId() {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default SessionState;
