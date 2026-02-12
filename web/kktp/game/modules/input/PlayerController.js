/**
 * PlayerController.js - Connects InputManager to game actions
 * 
 * Responsibilities:
 * - Map input events to game actions
 * - Apply actions to GameEngine
 * - Update PlayerModel visuals
 * - Handle audio feedback
 * - Record moves via kkGameEngine
 * - Track optimistic updates
 */

import { EventEmitter } from '../../core/EventEmitter.js';
import { Logger } from '../../core/Logger.js';
import { ACTION } from '../../constants/constants.js';
import { globalState } from '../../core/StateManager.js';
import { InputEvent } from '../../input/InputManager.js';
import { GameState } from '../../engine/GameEngine.js';

const log = Logger.create('PlayerController');

/**
 * Player controller events
 */
export const PlayerEvent = Object.freeze({
  ACTION_PERFORMED: 'actionPerformed',
  MOVE_PROCESSED: 'moveProcessed',
  MOVE_FAILED: 'moveFailed',
  // Audio events (decoupled from direct AudioManager calls)
  AUDIO_LANE_SWITCH: 'audioLaneSwitch',
  AUDIO_JUMP: 'audioJump',
  AUDIO_DUCK: 'audioDuck',
});

export class PlayerController extends EventEmitter {
  constructor() {
    super();
    
    this._inputManager = null;
    this._gameEngine = null;
    this._playerModel = null;
    this._audioManager = null;
    this._kkGameEngine = null;
    this._integrityMonitor = null;
    
    this._gameId = null;
    this._enabled = false;
    
    // Bound handlers for cleanup
    this._boundHandlers = new Map();
  }

  /**
   * Inject dependencies
   */
  setDependencies(deps) {
    this._inputManager = deps.inputManager ?? this._inputManager;
    this._gameEngine = deps.gameEngine ?? this._gameEngine;
    this._playerModel = deps.playerModel ?? this._playerModel;
    this._audioManager = deps.audioManager ?? this._audioManager;
    this._kkGameEngine = deps.kkGameEngine ?? this._kkGameEngine;
    this._integrityMonitor = deps.integrityMonitor ?? this._integrityMonitor;
  }

  /**
   * Set game ID for move tracking
   */
  setGameId(gameId) {
    this._gameId = gameId;
  }

  /**
   * Enable input handling
   */
  enable() {
    if (this._enabled) return;
    
    this._setupInputListeners();
    this._enabled = true;
    log.debug('PlayerController enabled');
  }

  /**
   * Disable input handling
   */
  disable() {
    if (!this._enabled) return;
    
    this._cleanupInputListeners();
    this._enabled = false;
    log.debug('PlayerController disabled');
  }

  /**
   * Handle a player action
   * @param {string} action - Action from ACTION constants
   * @returns {Promise<boolean>} Success status
   */
  async handleAction(action) {
    if (!this._gameEngine || this._gameEngine.state !== GameState.RUNNING) {
      return false;
    }

    // Generate unique optimistic ID
    const optimisticId = `playerMove:${this._gameId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

    // Optimistic update for zero latency
    const handle = globalState.optimistic(optimisticId, {
      action,
      timestamp: Date.now(),
    });

    // Apply to game engine
    const result = this._gameEngine.handleInput(action);

    if (!result.success) {
      handle.rollback();
      return false;
    }

    // Update visuals and audio
    this._applyVisualFeedback(action);

    // Record move via kkGameEngine
    if (this._kkGameEngine) {
      try {
        const move = await this._kkGameEngine.recordMove(action, {
          lane: this._gameEngine.playerLane,
        });

        handle.confirm();
        this._integrityMonitor?.recordLocalMove(move);
        
        this.emit(PlayerEvent.MOVE_PROCESSED, move);
        return true;
      } catch (e) {
        // Graceful degradation: the game engine already applied the move
        // (lane switch, jump, etc.) — don't roll back game state.
        // The move simply won't be anchored on-chain, which is acceptable
        // for transient issues (e.g., background anchor race on retry).
        log.warn('Move recording failed (game continues with degraded anchoring)', e?.message);
        handle.confirm();
        this.emit(PlayerEvent.MOVE_FAILED, { action, error: e });
        return true;
      }
    } else {
      handle.confirm();
      this.emit(PlayerEvent.ACTION_PERFORMED, { action });
      return true;
    }
  }

  /**
   * Destroy controller
   */
  destroy() {
    this.disable();
    this.removeAllListeners();
    log.info('PlayerController destroyed');
  }

  // ─── Private Methods ───────────────────────────────────────────

  _setupInputListeners() {
    if (!this._inputManager) return;

    const actionMap = {
      [InputEvent.MOVE_LEFT]: ACTION.MOVE_LEFT,
      [InputEvent.MOVE_RIGHT]: ACTION.MOVE_RIGHT,
      [InputEvent.JUMP]: ACTION.JUMP,
      [InputEvent.DUCK]: ACTION.DUCK,
      [InputEvent.DUCK_END]: ACTION.DUCK_RELEASED,
    };

    for (const [inputEvent, action] of Object.entries(actionMap)) {
      const handler = () => this.handleAction(action);
      this._boundHandlers.set(inputEvent, handler);
      this._inputManager.on(inputEvent, handler);
    }
  }

  _cleanupInputListeners() {
    if (!this._inputManager) return;

    for (const [inputEvent, handler] of this._boundHandlers) {
      this._inputManager.off(inputEvent, handler);
    }
    this._boundHandlers.clear();
  }

  _applyVisualFeedback(action) {
    // Update player model
    if (action === ACTION.MOVE_LEFT || action === ACTION.MOVE_RIGHT) {
      this._playerModel?.setLane(this._gameEngine.playerLane);
      this._audioManager?.playLaneSwitch();
      this.emit(PlayerEvent.AUDIO_LANE_SWITCH, { lane: this._gameEngine.playerLane });
    } else if (action === ACTION.JUMP) {
      this._playerModel?.triggerJump();
      this._audioManager?.playJump();
      this.emit(PlayerEvent.AUDIO_JUMP);
    } else if (action === ACTION.DUCK) {
      this.emit(PlayerEvent.AUDIO_DUCK);
    }
    // Duck is handled by render loop via isDucking state
  }
}

export default PlayerController;
