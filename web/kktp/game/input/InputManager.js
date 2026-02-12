/**
 * InputManager.js - Unified input handling for DAG Dasher
 * 
 * Supports:
 * - Touch gestures (swipe with 50px threshold)
 * - Keyboard (WASD + arrows)
 * - Mobile-first, responsive
 * - Unified event emitter pattern
 */

import { EventEmitter } from '../core/EventEmitter.js';
import { Logger } from '../core/Logger.js';
import { INPUT, ACTION } from '../constants/constants.js';

const log = Logger.create('InputManager');

/**
 * Input events
 */
export const InputEvent = Object.freeze({
  MOVE_LEFT: 'move_left',
  MOVE_RIGHT: 'move_right',
  JUMP: 'jump',
  DUCK: 'duck',
  DUCK_END: 'duck_end', // Released duck key
  PAUSE: 'pause',
  ANY_KEY: 'any_key',
});

export class InputManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this._enabled = false;
    this._target = options.target || document.body;
    this._swipeThreshold = options.swipeThreshold || INPUT.SWIPE_THRESHOLD_PX;
    this._swipeMaxTime = options.swipeMaxTime || INPUT.SWIPE_MAX_TIME_MS;
    this._actionCooldown = options.actionCooldown || INPUT.ACTION_COOLDOWN_MS;
    
    // Touch state
    this._touchStartX = 0;
    this._touchStartY = 0;
    this._touchStartTime = 0;
    this._isTouching = false;
    
    // Cooldown state
    this._lastActionTime = 0;
    this._actionLock = false;
    
    // Reverse controls state (for powerdown)
    this._reverseControls = false;
    
    // Bound handlers
    this._handleKeyDown = this._onKeyDown.bind(this);
    this._handleKeyUp = this._onKeyUp.bind(this);
    this._handleTouchStart = this._onTouchStart.bind(this);
    this._handleTouchMove = this._onTouchMove.bind(this);
    this._handleTouchEnd = this._onTouchEnd.bind(this);
    this._handleMouseDown = this._onMouseDown.bind(this);
    this._handleMouseUp = this._onMouseUp.bind(this);
    
    // Key state tracking
    this._keysDown = new Set();
  }

  /**
   * Enable input handling
   */
  enable() {
    if (this._enabled) return;
    
    // Keyboard
    document.addEventListener('keydown', this._handleKeyDown);
    document.addEventListener('keyup', this._handleKeyUp);
    
    // Touch
    this._target.addEventListener('touchstart', this._handleTouchStart, { passive: false });
    this._target.addEventListener('touchmove', this._handleTouchMove, { passive: false });
    this._target.addEventListener('touchend', this._handleTouchEnd);
    this._target.addEventListener('touchcancel', this._handleTouchEnd);
    
    // Mouse (for desktop testing of touch)
    this._target.addEventListener('mousedown', this._handleMouseDown);
    this._target.addEventListener('mouseup', this._handleMouseUp);
    
    this._enabled = true;
    log.info('Input enabled');
  }

  /**
   * Disable input handling
   */
  disable() {
    if (!this._enabled) return;
    
    document.removeEventListener('keydown', this._handleKeyDown);
    document.removeEventListener('keyup', this._handleKeyUp);
    
    this._target.removeEventListener('touchstart', this._handleTouchStart);
    this._target.removeEventListener('touchmove', this._handleTouchMove);
    this._target.removeEventListener('touchend', this._handleTouchEnd);
    this._target.removeEventListener('touchcancel', this._handleTouchEnd);
    
    this._target.removeEventListener('mousedown', this._handleMouseDown);
    this._target.removeEventListener('mouseup', this._handleMouseUp);
    
    this._keysDown.clear();
    this._enabled = false;
    log.info('Input disabled');
  }

  /**
   * Check if input is enabled
   * @returns {boolean}
   */
  get enabled() {
    return this._enabled;
  }

  /**
   * Set reverse controls (for powerdown)
   * @param {boolean} reversed
   */
  setReverseControls(reversed) {
    this._reverseControls = reversed;
    log.debug('Reverse controls:', reversed);
  }

  /**
   * Check if a key is currently held
   * @param {string} action - Action name
   * @returns {boolean}
   */
  isActionHeld(action) {
    const keys = INPUT.KEYS[action.toUpperCase()];
    if (!keys) return false;
    return keys.some(key => this._keysDown.has(key));
  }

  /**
   * Set swipe threshold
   * @param {number} pixels
   */
  setSwipeThreshold(pixels) {
    this._swipeThreshold = pixels;
  }

  /**
   * Get current swipe threshold
   * @returns {number}
   */
  get swipeThreshold() {
    return this._swipeThreshold;
  }

  // ─── Private Methods ───────────────────────────────────────────

  _canAction() {
    const now = performance.now();
    if (now - this._lastActionTime < this._actionCooldown) {
      return false;
    }
    return !this._actionLock;
  }

  _recordAction() {
    this._lastActionTime = performance.now();
  }

  _emitAction(event) {
    if (!this._canAction()) {
      log.trace('Action blocked by cooldown:', event);
      return;
    }
    
    // Apply reverse controls if active
    let actualEvent = event;
    if (this._reverseControls) {
      if (event === InputEvent.MOVE_LEFT) actualEvent = InputEvent.MOVE_RIGHT;
      else if (event === InputEvent.MOVE_RIGHT) actualEvent = InputEvent.MOVE_LEFT;
      else if (event === InputEvent.JUMP) actualEvent = InputEvent.DUCK;
      else if (event === InputEvent.DUCK) actualEvent = InputEvent.JUMP;
    }
    
    this._recordAction();
    this.emit(actualEvent, { timestamp: Date.now(), originalEvent: event });
    this.emit(InputEvent.ANY_KEY, { action: actualEvent, timestamp: Date.now() });
    
    log.debug('Input:', actualEvent);
  }

  _onKeyDown(e) {
    const target = e.target;
    const isTextInput =
      !!target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        target.closest?.('[contenteditable="true"], [contenteditable=""]'));

    if (isTextInput) {
      return;
    }

    const key = e.code;
    
    // Prevent default for game keys
    const allGameKeys = [
      ...INPUT.KEYS.LEFT,
      ...INPUT.KEYS.RIGHT,
      ...INPUT.KEYS.JUMP,
      ...INPUT.KEYS.DUCK,
      ...INPUT.KEYS.PAUSE,
    ];
    
    if (allGameKeys.includes(key)) {
      e.preventDefault();
    }
    
    // Avoid repeat events
    if (this._keysDown.has(key)) return;
    this._keysDown.add(key);
    
    // Map key to action
    if (INPUT.KEYS.LEFT.includes(key)) {
      this._emitAction(InputEvent.MOVE_LEFT);
    } else if (INPUT.KEYS.RIGHT.includes(key)) {
      this._emitAction(InputEvent.MOVE_RIGHT);
    } else if (INPUT.KEYS.JUMP.includes(key)) {
      this._emitAction(InputEvent.JUMP);
    } else if (INPUT.KEYS.DUCK.includes(key)) {
      this._emitAction(InputEvent.DUCK);
    } else if (INPUT.KEYS.PAUSE.includes(key)) {
      this.emit(InputEvent.PAUSE, { timestamp: Date.now() });
    }
  }

  _onKeyUp(e) {
    const target = e.target;
    const isTextInput =
      !!target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        target.closest?.('[contenteditable="true"], [contenteditable=""]'));

    if (isTextInput) {
      return;
    }

    const key = e.code;
    this._keysDown.delete(key);
    
    // Emit duck release when duck key is released
    if (INPUT.KEYS.DUCK.includes(key)) {
      if (!this._reverseControls) {
        this.emit(InputEvent.DUCK_END, { timestamp: Date.now() });
      }
      return;
    }

    if (this._reverseControls && INPUT.KEYS.JUMP.includes(key)) {
      this.emit(InputEvent.DUCK_END, { timestamp: Date.now() });
    }
  }

  _onTouchStart(e) {
    // Don't interfere with button/UI element touches
    if (e.target.closest('button, a, input, select, [role="button"], .ks-audit-view, .ks-modal, .ks-menu')) {
      return;
    }
    
    if (e.touches.length !== 1) return;
    
    // Only prevent default for game canvas touches
    if (e.target.closest('canvas') || e.target.tagName === 'CANVAS') {
      e.preventDefault();
    }
    
    const touch = e.touches[0];
    this._touchStartX = touch.clientX;
    this._touchStartY = touch.clientY;
    this._touchStartTime = performance.now();
    this._isTouching = true;
  }

  _onTouchMove(e) {
    if (!this._isTouching) return;
    
    // Don't interfere with scrolling in modals/menus
    if (e.target.closest('.ks-audit-view, .ks-modal, .ks-menu, .ks-game-over')) {
      return;
    }
    
    // Only prevent default for game canvas
    if (e.target.closest('canvas') || e.target.tagName === 'CANVAS') {
      e.preventDefault();
    }
  }

  _onTouchEnd(e) {
    if (!this._isTouching) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - this._touchStartX;
    const deltaY = touch.clientY - this._touchStartY;
    const deltaTime = performance.now() - this._touchStartTime;
    
    this._isTouching = false;
    
    // Check if swipe was fast enough
    if (deltaTime > this._swipeMaxTime) {
      log.trace('Swipe too slow:', deltaTime, 'ms');
      return;
    }
    
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    // Determine swipe direction
    if (absX >= this._swipeThreshold && absX > absY) {
      // Horizontal swipe
      if (deltaX > 0) {
        this._emitAction(InputEvent.MOVE_RIGHT);
      } else {
        this._emitAction(InputEvent.MOVE_LEFT);
      }
    } else if (absY >= this._swipeThreshold && absY > absX) {
      // Vertical swipe
      if (deltaY < 0) {
        this._emitAction(InputEvent.JUMP);
      } else {
        this._emitAction(InputEvent.DUCK);
      }
    } else {
      log.trace('Swipe below threshold:', absX, absY);
    }
  }

  _onMouseDown(e) {
    // Simulate touch for desktop testing
    this._touchStartX = e.clientX;
    this._touchStartY = e.clientY;
    this._touchStartTime = performance.now();
    this._isTouching = true;
  }

  _onMouseUp(e) {
    if (!this._isTouching) return;
    
    const deltaX = e.clientX - this._touchStartX;
    const deltaY = e.clientY - this._touchStartY;
    const deltaTime = performance.now() - this._touchStartTime;
    
    this._isTouching = false;
    
    if (deltaTime > this._swipeMaxTime) return;
    
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    if (absX >= this._swipeThreshold && absX > absY) {
      this._emitAction(deltaX > 0 ? InputEvent.MOVE_RIGHT : InputEvent.MOVE_LEFT);
    } else if (absY >= this._swipeThreshold && absY > absX) {
      this._emitAction(deltaY < 0 ? InputEvent.JUMP : InputEvent.DUCK);
    }
  }

  /**
   * Clean up
   */
  destroy() {
    this.disable();
    this.removeAllListeners();
    log.info('InputManager destroyed');
  }
}

export default InputManager;