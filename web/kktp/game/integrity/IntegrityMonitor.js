/**
 * IntegrityMonitor.js - Anti-cheat integrity shield system
 * 
 * State machine:
 * - GREEN (OK): Normal play, opponent responding
 * - ORANGE (WARNING): 5s since last opponent move
 * - RED (CHEAT): Cheat detected (flashing)
 * - FORFEIT: 15s timeout, auto-forfeit
 * 
 * Visual: Shield icon that changes color based on state
 */

import { EventEmitter } from '../core/EventEmitter.js';
import { Logger } from '../core/Logger.js';
import { INTEGRITY, COLORS } from '../constants/constants.js';

const log = Logger.create('IntegrityMonitor');

/**
 * Integrity states
 */
export const IntegrityState = {
  GREEN: 'green',
  ORANGE: 'orange',
  RED: 'red',
  FORFEIT: 'forfeit'
};

/**
 * Integrity events
 */
export const IntegrityEvent = {
  STATE_CHANGED: 'stateChanged',
  CHEAT_DETECTED: 'cheatDetected',
  WARNING: 'warning',
  FORFEIT: 'forfeit',
  RECOVERED: 'recovered'
};

export class IntegrityMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this._state = IntegrityState.GREEN;
    this._lastOpponentMoveTime = Date.now();
    this._lastLocalMoveTime = Date.now();
    
    this._orangeThreshold = options.orangeThreshold ?? INTEGRITY.ORANGE_THRESHOLD_MS;
    this._forfeitThreshold = options.forfeitThreshold ?? INTEGRITY.FORFEIT_THRESHOLD_MS;
    
    this._checkInterval = null;
    this._flashInterval = null;
    this._isFlashing = false;
    this._flashVisible = true;
    
    this._opponentPlayerId = null;
    this._isSinglePlayer = true;
    this._active = false;
    
    // Cheat detection flags
    this._cheats = {
      invalidVrf: false,
      merkleInvalid: false,
      timestampManipulation: false,
      duplicateMove: false
    };
  }

  /**
   * Get current state
   */
  get state() {
    return this._state;
  }

  /**
   * Get if currently flashing (for red state)
   */
  get isFlashing() {
    return this._isFlashing;
  }

  /**
   * Get flash visibility (toggles for animation)
   */
  get flashVisible() {
    return this._flashVisible;
  }

  /**
   * Get time since last opponent move
   */
  get timeSinceOpponentMove() {
    return Date.now() - this._lastOpponentMoveTime;
  }

  /**
   * Check if monitoring is active
   */
  get isActive() {
    return this._active;
  }

  /**
   * Start monitoring (call when game starts)
   * @param {Object} options
   * @param {string} options.opponentPlayerId - Opponent's ID (null for single player)
   * @param {boolean} options.isSinglePlayer - True for single player mode
   */
  start(options = {}) {
    this._opponentPlayerId = options.opponentPlayerId ?? null;
    this._isSinglePlayer = options.isSinglePlayer ?? true;
    this._active = true;
    
    this._lastOpponentMoveTime = Date.now();
    this._lastLocalMoveTime = Date.now();
    this._setState(IntegrityState.GREEN);
    
    // Clear any existing cheats
    for (const key in this._cheats) {
      this._cheats[key] = false;
    }
    
    // Start monitoring interval (only in multiplayer)
    if (!this._isSinglePlayer) {
      this._startMonitoring();
    }
    
    log.info('Integrity monitoring started', {
      isSinglePlayer: this._isSinglePlayer,
      opponentId: this._opponentPlayerId
    });
  }

  /**
   * Stop monitoring
   */
  stop() {
    this._active = false;
    this._stopMonitoring();
    this._stopFlashing();
    this._setState(IntegrityState.GREEN);
    
    log.info('Integrity monitoring stopped');
  }

  /**
   * Record local move
   * @param {Object} move - The move data
   */
  recordLocalMove(move) {
    this._lastLocalMoveTime = Date.now();
    log.trace('Local move recorded', { timestamp: this._lastLocalMoveTime });
  }

  /**
   * Record opponent move (resets timer)
   * @param {Object} move - The validated move from opponent
   */
  recordOpponentMove(move) {
    if (this._isSinglePlayer) return;
    
    const now = Date.now();
    const elapsed = now - this._lastOpponentMoveTime;
    this._lastOpponentMoveTime = now;
    
    log.trace('Opponent move recorded', { elapsed, timestamp: now });
    
    // Recover from orange state if we were waiting
    if (this._state === IntegrityState.ORANGE) {
      this._setState(IntegrityState.GREEN);
      this.emit(IntegrityEvent.RECOVERED, { elapsed });
      log.debug('Recovered from warning state');
    }
  }

  /**
   * Report a cheat detection
   * @param {string} type - Type of cheat (invalidVrf, merkleInvalid, etc.)
   * @param {Object} details - Additional details
   */
  reportCheat(type, details = {}) {
    if (!this._active) return;
    
    this._cheats[type] = true;
    
    log.warn(`Cheat detected: ${type}`, details);
    
    this._setState(IntegrityState.RED);
    this._startFlashing();
    
    this.emit(IntegrityEvent.CHEAT_DETECTED, {
      type,
      details,
      timestamp: Date.now()
    });
    
    // Auto-forfeit after a brief display of the cheat
    setTimeout(() => {
      if (this._state === IntegrityState.RED) {
        this._triggerForfeit('cheat_detected', type);
      }
    }, INTEGRITY.FLASH_DURATION_MS);
  }

  /**
   * Validate a move (basic checks)
   * @param {Object} move - Move to validate
   * @param {boolean} isOpponent - Whether this is an opponent move
   * @returns {Object} Validation result { valid, reason }
   */
  validateMove(move, isOpponent = false) {
    if (!move) {
      return { valid: false, reason: 'null_move' };
    }
    
    // Check required fields
    if (typeof move.action === 'undefined') {
      return { valid: false, reason: 'missing_action' };
    }
    
    if (typeof move.timestamp === 'undefined') {
      return { valid: false, reason: 'missing_timestamp' };
    }
    
    // Timestamp sanity check (not too far in future)
    const now = Date.now();
    if (move.timestamp > now + 5000) {
      this.reportCheat('timestampManipulation', { 
        moveTime: move.timestamp, 
        serverTime: now,
        drift: move.timestamp - now
      });
      return { valid: false, reason: 'future_timestamp' };
    }
    
    // VRF output check (if present)
    if (move.vrfOutput !== undefined) {
      if (typeof move.vrfOutput !== 'string' || move.vrfOutput.length === 0) {
        this.reportCheat('invalidVrf', { vrfOutput: move.vrfOutput });
        return { valid: false, reason: 'invalid_vrf' };
      }
    }
    
    return { valid: true };
  }

  /**
   * Get current shield color
   * @returns {string} Hex color code
   */
  getShieldColor() {
    switch (this._state) {
      case IntegrityState.GREEN:
        return COLORS.INTEGRITY_GREEN;
      case IntegrityState.ORANGE:
        return COLORS.INTEGRITY_ORANGE;
      case IntegrityState.RED:
        return this._flashVisible ? COLORS.INTEGRITY_RED : '#330000';
      case IntegrityState.FORFEIT:
        return COLORS.INTEGRITY_RED;
      default:
        return COLORS.INTEGRITY_GREEN;
    }
  }

  /**
   * Get state info for UI
   * @returns {Object} State information
   */
  getStateInfo() {
    return {
      state: this._state,
      color: this.getShieldColor(),
      isFlashing: this._isFlashing,
      timeSinceOpponentMove: this.timeSinceOpponentMove,
      cheats: { ...this._cheats },
      isSinglePlayer: this._isSinglePlayer
    };
  }

  // ─── Private Methods ───────────────────────────────────────────

  _setState(newState) {
    if (this._state === newState) return;
    
    const oldState = this._state;
    this._state = newState;
    
    log.debug('State changed', { from: oldState, to: newState });
    
    this.emit(IntegrityEvent.STATE_CHANGED, {
      from: oldState,
      to: newState,
      timestamp: Date.now()
    });
  }

  _startMonitoring() {
    if (this._checkInterval) return;
    
    this._checkInterval = setInterval(() => {
      this._checkIntegrity();
    }, INTEGRITY.CHECK_INTERVAL_MS);
    
    log.debug('Monitoring interval started');
  }

  _stopMonitoring() {
    if (this._checkInterval) {
      clearInterval(this._checkInterval);
      this._checkInterval = null;
    }
  }

  _checkIntegrity() {
    if (!this._active || this._isSinglePlayer) return;
    if (this._state === IntegrityState.RED || this._state === IntegrityState.FORFEIT) return;
    
    const elapsed = this.timeSinceOpponentMove;
    
    if (elapsed >= this._forfeitThreshold) {
      this._triggerForfeit('timeout', `${elapsed}ms since last opponent move`);
    } else if (elapsed >= this._orangeThreshold && this._state === IntegrityState.GREEN) {
      this._setState(IntegrityState.ORANGE);
      this.emit(IntegrityEvent.WARNING, {
        elapsed,
        threshold: this._orangeThreshold
      });
      log.warn('Opponent not responding', { elapsed });
    }
  }

  _triggerForfeit(reason, details) {
    this._stopFlashing();
    this._setState(IntegrityState.FORFEIT);
    
    log.error('Forfeit triggered', { reason, details });
    
    this.emit(IntegrityEvent.FORFEIT, {
      reason,
      details,
      timestamp: Date.now()
    });
  }

  _startFlashing() {
    if (this._flashInterval) return;
    
    this._isFlashing = true;
    this._flashVisible = true;
    
    this._flashInterval = setInterval(() => {
      this._flashVisible = !this._flashVisible;
      this.emit(IntegrityEvent.STATE_CHANGED, {
        from: this._state,
        to: this._state,
        flashVisible: this._flashVisible
      });
    }, INTEGRITY.FLASH_INTERVAL_MS);
    
    log.debug('Flash animation started');
  }

  _stopFlashing() {
    if (this._flashInterval) {
      clearInterval(this._flashInterval);
      this._flashInterval = null;
    }
    this._isFlashing = false;
    this._flashVisible = true;
  }

  /**
   * Clean up
   */
  destroy() {
    this.stop();
    this.removeAllListeners();
    log.info('IntegrityMonitor destroyed');
  }
}

export default IntegrityMonitor;
