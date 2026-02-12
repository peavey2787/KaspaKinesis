/**
 * PlayerPhysicsMixin.js - Player movement and physics for DAG Dasher
 * 
 * Extracted from GameEngine.js for separation of concerns.
 * Handles:
 * - Lane movement (left/right)
 * - Jump physics with gravity
 * - Duck mechanics for low obstacles
 * 
 * NOTE: This is a MIXIN file (physics logic extracted from GameEngine).
 *       For input mapping, see modules/input/PlayerController.js
 */

import { Logger } from '../core/Logger.js';
import { GAME, ACTION } from '../constants/constants.js';
import { Lane, GameState, GameEvent } from './GameState.js';

const log = Logger.create('PlayerPhysicsMixin');

/**
 * Player Physics mixin for GameEngine
 * Provides player movement and physics methods
 */
export const PlayerControllerMixin = {
  
  /**
   * Initialize player state
   */
  _initPlayer() {
    this._playerLane = Lane.CENTER;
    this._playerY = 0;
    this._isJumping = false;
    this._isDucking = false;
    this._jumpVelocity = 0;
    this._playerHeight = 1.0;
    this._playerDuckHeight = 0.3;
  },
  
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
  },
  
  /**
   * Move player to adjacent lane
   * @param {number} direction - -1 for left, 1 for right
   * @returns {Object} Result
   */
  _movePlayer(direction) {
    const newLane = this._playerLane + direction;

    if (newLane < Lane.LEFT || newLane > Lane.RIGHT) {
      return { success: false, reason: 'out_of_bounds' };
    }

    this._playerLane = newLane;
    log.trace('Player moved', { direction, newLane });

    return { success: true, lane: newLane };
  },
  
  /**
   * Start a jump
   * @returns {Object} Result
   */
  _jump() {
    if (this._isJumping) {
      return { success: false, reason: 'already_jumping' };
    }

    // Cancel duck when jumping — critical for mobile where there is
    // no key-release event to trigger DUCK_END.  Swiping up (jump)
    // is the natural "un-duck" gesture on touch screens.
    if (this._isDucking) {
      this._isDucking = false;
      log.trace('Duck cancelled by jump');
    }

    this._isJumping = true;
    this._jumpVelocity = GAME.JUMP_VELOCITY;

    log.trace('Player jumped');
    return { success: true };
  },
  
  /**
   * Start ducking
   * @returns {Object} Result
   */
  _duck() {
    if (this._isJumping) {
      return { success: false, reason: 'cannot_duck_while_jumping' };
    }
    if (this._isDucking) {
      return { success: false, reason: 'already_ducking' };
    }

    this._isDucking = true;
    log.trace('Player ducking');
    return { success: true };
  },
  
  /**
   * Stop ducking
   * @returns {Object} Result
   */
  _duckRelease() {
    if (!this._isDucking) {
      return { success: false, reason: 'not_ducking' };
    }

    this._isDucking = false;
    log.trace('Player stopped ducking');
    return { success: true };
  },
  
  // NOTE: _updateJump is defined in PhysicsSystem.js (handles platforms, gravity, landing)
  // Do NOT define it here or it will overwrite the platform-aware version!
};

export default PlayerControllerMixin;
