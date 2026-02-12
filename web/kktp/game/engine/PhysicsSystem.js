/**
 * PhysicsSystem.js - Collision detection and jump physics
 * 
 * Extracted from GameEngine.js for separation of concerns.
 * Handles:
 * - Jump physics with gravity
 * - Platform landing and mounting
 * - Collision detection for obstacles, coins, powerups
 * - Y-axis overlap calculations
 * - Platform fall-off detection
 * 
 * This is the "hot path" that runs 60 times per second.
 * Optimized for minimal GC pressure and fast iteration.
 */

import { Logger } from '../core/Logger.js';
import { GAME, POWERUPS } from '../core/Constants.js';
import { EntityType, GameEvent } from './GameState.js';

const log = Logger.create('PhysicsSystem');

/**
 * PhysicsSystem mixin for GameEngine
 * Provides collision detection and jump physics methods
 */
export const PhysicsSystemMixin = {
  
  /**
   * Initialize physics state
   * Called from GameEngine constructor
   */
  _initPhysicsSystem() {
    // Reusable result object to avoid GC pressure in hot path
    this._platformResult = { entity: null, surfaceY: 0 };
    
    // Platform standing state
    this._onPlatform = null; // Platform ID if standing on one
    
    // Collision tracking
    this._lastCollisionTime = 0;
    
    // Coin collection tracking to prevent duplicate +10 notifications
    this._collectedCoinIds = new Set();
  },
  
  /**
   * Update jump/fall physics
   * CRITICAL: Player must ALWAYS be either:
   * - On ground (playerY = 0, not jumping)
   * - On a platform (playerY = surfaceY, not jumping)
   * - In the air falling/jumping (isJumping = true)
   * @param {number} dt - Delta time in seconds
   */
  _updateJump(dt) {
    // SAFETY CHECK: If player is in the air but not jumping, start falling
    // This catches edge cases where state gets desynced
    if (this._playerY > 0.01 && !this._isJumping && this._onPlatform === null) {
      log.trace('Safety: Player in air but not jumping - starting fall');
      this._isJumping = true;
      this._jumpVelocity = 0;
    }
    
    // If standing on a platform, validate we're still on it
    if (this._onPlatform !== null && !this._isJumping) {
      const platform = this._findPlatformById(this._onPlatform);
      
      if (platform) {
        // Maintain height at surface
        this._playerY = platform.surfaceY;
        
        // Check if platform has moved past us (z-check) or we changed lanes
        const playerZ = 0;
        const platLength = platform.entity.length || GAME.PLATFORM_LENGTH;
        const platMinZ = platform.entity.z - platLength / 2;
        const platMaxZ = platform.entity.z + platLength / 2;
        
        // Platform moved past player OR player changed lanes
        if (playerZ < platMinZ - 0.5 || playerZ > platMaxZ + 0.5 || platform.entity.lane !== this._playerLane) {
          log.trace('Falling off platform', { id: this._onPlatform, platZ: platform.entity.z, playerZ });
          this._onPlatform = null;
          this._isJumping = true;
          this._jumpVelocity = 0;
        }
        return; // Still on platform, done
      } else {
        // Platform despawned - start falling
        log.trace('Platform despawned, falling');
        this._onPlatform = null;
        this._isJumping = true;
        this._jumpVelocity = 0;
      }
    }
    
    // Not jumping? Nothing to do (on ground)
    if (!this._isJumping) return;
    
    // Apply gravity and movement
    const prevY = this._playerY;
    this._jumpVelocity -= GAME.GRAVITY * dt;
    this._playerY += this._jumpVelocity * dt;
    
    // Check for landing on platforms (only when falling)
    if (this._jumpVelocity < 0) {
      const platform = this._findLandablePlatform(prevY);
      if (platform) {
        log.trace('Landed on platform', { id: platform.entity.id, surfaceY: platform.surfaceY, prevY, playerY: this._playerY });
        this._playerY = platform.surfaceY;
        this._isJumping = false;
        this._jumpVelocity = 0;
        this._onPlatform = platform.entity.id;
        this._isDucking = false;
        return;
      }
    }
    
    // Land on ground
    if (this._playerY <= 0) {
      this._playerY = 0;
      this._isJumping = false;
      this._jumpVelocity = 0;
      this._onPlatform = null;
    }
  },
  
  /**
   * Find a specific platform by ID
   * @param {number} platformId - Platform entity ID
   * @returns {{ entity: Object, surfaceY: number }|null}
   */
  _findPlatformById(platformId) {
    for (const entity of this._entities) {
      if (entity.type !== EntityType.PLATFORM) continue;
      if (entity.id !== platformId) continue;
      
      const surfaceY = entity.height || GAME.PLATFORM_HEIGHT;
      this._platformResult.entity = entity;
      this._platformResult.surfaceY = surfaceY;
      return this._platformResult;
    }
    return null;
  },
  
  /**
   * Find a platform the player can land on
   * Must be: same lane, player within z-range, player falling through surface
   * @param {number} prevY - Player's Y position last frame
   * @returns {{ entity: Object, surfaceY: number }|null}
   */
  _findLandablePlatform(prevY) {
    const playerZ = 0;
    
    for (const entity of this._entities) {
      if (entity.type !== EntityType.PLATFORM) continue;
      if (entity.lane !== this._playerLane) continue;
      
      const platLength = entity.length || GAME.PLATFORM_LENGTH;
      const platMinZ = entity.z - platLength / 2;
      const platMaxZ = entity.z + platLength / 2;
      
      // Player must be within platform's z-range
      if (playerZ < platMinZ - 0.3 || playerZ > platMaxZ + 0.3) continue;
      
      const surfaceY = entity.height || GAME.PLATFORM_HEIGHT;
      
      // Landing check: player was above or near surface, now at or below surface
      // Use generous tolerance to catch fast falls
      const wasAbove = prevY >= surfaceY - 0.5;
      const nowAtOrBelow = this._playerY <= surfaceY + 0.3;
      
      if (wasAbove && nowAtOrBelow) {
        this._platformResult.entity = entity;
        this._platformResult.surfaceY = surfaceY;
        return this._platformResult;
      }
    }
    return null;
  },
  
  /**
   * Check collisions for all entities
   * Hot path - runs every frame
   */
  _checkCollisions() {
    const playerZ = 0; // Player is at z = 0
    const currentPlayerHeight = this.playerHeight; // Gets duck height if ducking
    
    for (let i = this._entities.length - 1; i >= 0; i--) {
      const entity = this._entities[i];
      
      if (entity._collided || entity._collected) continue;
      
      // Check if in collision range (z-axis)
      if (Math.abs(entity.z - playerZ) > GAME.COLLISION_DISTANCE) continue;
      if (entity.lane !== this._playerLane) continue;
      
      // Handle based on type
      switch (entity.type) {
        case EntityType.OBSTACLE:
          this._checkObstacleCollision(entity, i, currentPlayerHeight);
          break;
          
        case EntityType.COIN:
          this._checkCoinCollection(entity, i, currentPlayerHeight);
          break;
          
        case EntityType.POWERUP:
          this._checkPowerupCollection(entity, i, currentPlayerHeight);
          break;
          
        case EntityType.PLATFORM:
          this._checkPlatformCollision(entity, currentPlayerHeight);
          break;
      }
    }
  },
  
  /**
   * Check collision with obstacle
   * @param {Object} entity - Obstacle entity
   * @param {number} index - Entity index
   * @param {number} playerHeight - Current player height
   */
  _checkObstacleCollision(entity, index, playerHeight) {
    // Y-axis collision check with NO grace period (must dodge precisely)
    const playerMinY = this._playerY;
    const playerMaxY = this._playerY + playerHeight;
    
    // Check if this is an unjumpable barrier (red X)
    const cannotJumpOver = entity.cannotJumpOver === true || entity.barrierType?.cannotJumpOver === true;
    
    // Obstacle occupies Y range from entity.minY to entity.maxY
    // For unjumpable barriers, extend to impossible height
    const obsMinY = entity.minY || 0;
    const obsMaxY = cannotJumpOver ? 10 : (entity.maxY || entity.height);
    
    // Check for Y-axis overlap
    const yOverlap = playerMinY < obsMaxY && playerMaxY > obsMinY;
    
    if (yOverlap) {
      const now = Date.now();
      if (now - this._lastCollisionTime < GAME.PLAYER_INVINCIBILITY_DURATION) {
        return; // Invincibility frames
      }
      
      this._lastCollisionTime = now;
      entity._collided = true;
      
      // Handle collision effects
      this._handleObstacleCollision(entity);
      this._removeEntity(index);
    }
  },
  
  /**
   * Handle obstacle collision effects
   * @param {Object} obstacle - Obstacle entity
   */
  _handleObstacleCollision(obstacle) {
    // Shield powerup protects from collision
    if (this._activePowerup?.type === POWERUPS.TYPES.SHIELD) {
      this._activePowerup = null;
      log.debug('Shield absorbed collision');
      return;
    }
    
    // Lose coins on collision (same as coin pickup value)
    const lostCoins = GAME.COIN_VALUE;
    this._coins = Math.max(0, this._coins - lostCoins);
    
    // Apply collision slowdown - store current speed and reduce
    if (this._preCollisionSpeed === null) {
      this._preCollisionSpeed = this._speed;
    }
    this._speed = this._preCollisionSpeed * GAME.COLLISION_SLOWDOWN_FACTOR;
    this._collisionSlowdownEndTime = Date.now() + GAME.COLLISION_SLOWDOWN_DURATION;
    
    log.debug('Collision! Speed reduced', {
      lostCoins,
      remaining: this._coins,
      originalSpeed: this._preCollisionSpeed,
      reducedSpeed: this._speed,
    });
    
    this.emit(GameEvent.COLLISION, {
      obstacle,
      coinsLost: lostCoins,
      coinsRemaining: this._coins,
      speedReduced: this._speed,
    });
    
    this.emit(GameEvent.SPEED_CHANGED, {
      speed: this._speed,
      reason: 'collision',
    });
    
    // End game if coins depleted (no coins left)
    if (this._coins <= 0) {
      log.info('Game over - coins depleted');
      this._endGame('coins_depleted');
    }
  },
  
  /**
   * Check coin collection
   * @param {Object} entity - Coin entity
   * @param {number} index - Entity index
   * @param {number} playerHeight - Current player height
   */
  _checkCoinCollection(entity, index, playerHeight) {
    // Y-axis collision with grace radius for collection
    const coinY = entity.y || 0.5;
    const collectRadius = entity.collectRadius || 0.8;
    const playerCenterY = this._playerY + playerHeight / 2;
    
    // Check if player Y is within collectRadius of coin Y
    if (Math.abs(playerCenterY - coinY) <= collectRadius) {
      this._collectCoin(entity);
      this._removeEntity(index);
    }
  },
  
  /**
   * Collect a coin
   * @param {Object} coin - Coin entity
   */
  _collectCoin(coin) {
    // GUARD: Triple-check to prevent duplicate +10 notifications
    if (coin._collected) return;
    if (this._collectedCoinIds.has(coin.id)) return;
    
    // Mark as collected in BOTH places immediately
    coin._collected = true;
    this._collectedCoinIds.add(coin.id);
    
    // Double coins powerup
    const multiplier = this._activePowerup?.type === POWERUPS.TYPES.DOUBLE_COINS ? 2 : 1;
    const value = (coin.value || GAME.COIN_VALUE) * multiplier;
    
    this._coins += value;
    
    log.trace('Coin collected', { id: coin.id, value, total: this._coins });
    this.emit(GameEvent.COIN_COLLECTED, { value, total: this._coins, coinId: coin.id });
  },
  
  /**
   * Check powerup collection
   * @param {Object} entity - Powerup entity
   * @param {number} index - Entity index
   * @param {number} playerHeight - Current player height
   */
  _checkPowerupCollection(entity, index, playerHeight) {
    // Y-axis collision with grace radius for collection
    const powerupY = entity.y || 1.0;
    const powerupRadius = entity.collectRadius || 0.8;
    const playerMidY = this._playerY + playerHeight / 2;
    
    // Check if player Y is within collectRadius of powerup Y
    if (Math.abs(playerMidY - powerupY) <= powerupRadius) {
      this._collectPowerup(entity);
      this._removeEntity(index);
    }
  },
  
  /**
   * Collect a powerup
   * @param {Object} powerup - Powerup entity
   */
  _collectPowerup(powerup) {
    const powerupType = powerup.powerupType;
    const duration = powerupType.duration || POWERUPS.DURATION_MS;
    
    // Store base speed before applying powerdown effect
    if (!this._baseSpeed) {
      this._baseSpeed = this._speed;
    }
    
    this._activePowerup = {
      type: powerupType,
      startTime: Date.now(),
      duration: duration,
    };
    this._powerupEndTime = Date.now() + duration;
    
    // Apply powerdown speed effect
    if (powerupType.positive === false && powerupType.id === 'slow') {
      // SLOW powerdown: reduce speed, making it harder to finish the race in time
      this._speed = this._baseSpeed * (powerupType.multiplier || 0.6);
      log.debug('Slow powerdown applied - speed reduced', { speed: this._speed });
      this.emit(GameEvent.SPEED_CHANGED, {
        speed: this._speed,
        reason: 'powerdown',
      });
    } else if (powerupType.id === 'speed_boost') {
      // Speed boost powerup
      this._speed = this._baseSpeed * (powerupType.multiplier || 1.5);
      log.debug('Speed boost applied', { speed: this._speed });
      this.emit(GameEvent.SPEED_CHANGED, {
        speed: this._speed,
        reason: 'powerup',
      });
    }
    
    log.debug('Powerup collected', { type: powerupType.id, duration });
    this.emit(GameEvent.POWERUP_COLLECTED, {
      type: powerupType,
      duration: duration,
    });
  },
  
  /**
   * Check platform collision - SOLID OBJECT behavior
   * Player CANNOT go through platforms - they are instantly mounted on top
   * @param {Object} entity - Platform entity
   * @param {number} playerHeight - Current player height
   */
  _checkPlatformCollision(entity, playerHeight) {
    // Skip if already on this or another platform
    if (this._onPlatform !== null) return;
    
    const playerZ = 0;
    const platLength = entity.length || GAME.PLATFORM_LENGTH;
    const platMinZ = entity.z - platLength / 2;
    const platMaxZ = entity.z + platLength / 2;
    const surfaceY = entity.height || GAME.PLATFORM_HEIGHT;
    
    // Check if player is within platform's z-range (platform has reached player)
    const inZRange = playerZ >= platMinZ - 0.5 && playerZ <= platMaxZ + 0.5;
    if (!inZRange) return;
    
    // ═══════════════════════════════════════════════════════════════
    // SOLID OBJECT BEHAVIOR: Player cannot overlap with platform
    // ═══════════════════════════════════════════════════════════════
    
    // CASE 1: Player on ground or below platform surface - INSTANT MOUNT
    // This is the key fix: when player runs straight into platform, put them on top
    if (!this._isJumping && this._playerY < surfaceY) {
      log.trace('Solid platform: auto-mounted (ran into it)', { id: entity.id, surfaceY, prevY: this._playerY });
      this._playerY = surfaceY;
      this._onPlatform = entity.id;
      this._isDucking = false;
      return;
    }
    
    // CASE 2: Player jumping/falling - check if they would pass through
    if (this._isJumping) {
      const playerFeetY = this._playerY;
      
      // If player's feet are at or below the surface, they're overlapping - mount them
      if (playerFeetY <= surfaceY && this._jumpVelocity <= 2) {
        log.trace('Solid platform: mounted during fall/jump', { id: entity.id, surfaceY, playerY: this._playerY });
        this._playerY = surfaceY;
        this._isJumping = false;
        this._jumpVelocity = 0;
        this._onPlatform = entity.id;
        this._isDucking = false;
      }
    }
  },
  
  /**
   * Reset physics state
   */
  _resetPhysics() {
    this._onPlatform = null;
    this._lastCollisionTime = 0;
    this._collectedCoinIds?.clear();
    log.trace('Physics reset');
  },
  
  /**
   * Cleanup physics system
   */
  _destroyPhysicsSystem() {
    this._platformResult = null;
    this._onPlatform = null;
    this._collectedCoinIds?.clear();
    this._collectedCoinIds = null;
    log.debug('PhysicsSystem destroyed');
  },
};

export default PhysicsSystemMixin;
