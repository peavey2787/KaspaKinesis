/**
 * PowerupSystem.js - Powerup management for DAG Dasher
 * 
 * Extracted from GameEngine.js for separation of concerns.
 * Handles:
 * - Active powerup tracking
 * - Powerup expiration
 * - Speed restoration
 */

import { Logger } from '../core/Logger.js';
import { GameEvent } from './GameState.js';

const log = Logger.create('PowerupSystem');

/**
 * Powerup System mixin for GameEngine
 * Provides powerup management methods
 */
export const PowerupSystemMixin = {
  
  /**
   * Initialize powerup state
   */
  _initPowerupSystem() {
    this._activePowerup = null;
    this._powerupEndTime = 0;
    this._baseSpeed = null;
  },
  
  /**
   * Update powerup state (check for expiration)
   */
  _updatePowerup() {
    if (!this._activePowerup) return;

    if (Date.now() >= this._powerupEndTime) {
      log.debug('Powerup expired', {
        type: this._activePowerup.type.id || this._activePowerup.type,
      });

      // Restore base speed when powerup/powerdown expires
      if (this._baseSpeed) {
        this._speed = this._baseSpeed;
        this._baseSpeed = null;
        log.debug('Speed restored', { speed: this._speed });
        this.emit(GameEvent.SPEED_CHANGED, {
          speed: this._speed,
          reason: 'expired',
        });
      }

      this._activePowerup = null;
    }
  },
  
  /**
   * Get active powerup info
   * @returns {Object|null}
   */
  getActivePowerup() {
    if (!this._activePowerup) return null;
    
    return {
      type: this._activePowerup.type,
      startTime: this._activePowerup.startTime,
      duration: this._activePowerup.duration,
      remaining: Math.max(0, this._powerupEndTime - Date.now()),
    };
  },
  
  /**
   * Clear active powerup
   */
  clearPowerup() {
    if (!this._activePowerup) return;
    
    // Restore base speed
    if (this._baseSpeed) {
      this._speed = this._baseSpeed;
      this._baseSpeed = null;
    }
    
    this._activePowerup = null;
    log.debug('Powerup cleared');
  },
  
  /**
   * Check if a specific powerup type is active
   * @param {string} typeId - Powerup type ID
   * @returns {boolean}
   */
  hasPowerup(typeId) {
    return this._activePowerup?.type?.id === typeId;
  },
};

export default PowerupSystemMixin;
