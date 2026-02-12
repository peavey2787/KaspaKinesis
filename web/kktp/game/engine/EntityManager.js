/**
 * EntityManager.js - Entity spawning and lifecycle management
 * 
 * Extracted from GameEngine.js for separation of concerns.
 * Handles:
 * - Entity array management with object pooling
 * - Obstacle spawning with VRF lane randomization
 * - Coin and powerup spawning
 * - Platform spawning with collectibles
 * - Entity movement and despawning
 * - Coin magnet attraction logic
 * 
 * Object Pooling: Reuses entity objects instead of creating new ones,
 * which is the #1 way to fix memory leaks in endless runners.
 */

import { Logger } from '../core/Logger.js';
import { GAME, POWERUPS, BARRIER_TYPES, BARRIER_TYPE_KEYS, PLATFORM_TYPES, PLATFORM_TYPE_KEYS } from '../constants/constants.js';
import { EntityType, Lane } from './GameState.js';

const log = Logger.create('EntityManager');

/**
 * Object pool for entity recycling
 */
class EntityPool {
  constructor() {
    this._pools = {
      [EntityType.OBSTACLE]: [],
      [EntityType.COIN]: [],
      [EntityType.POWERUP]: [],
      [EntityType.PLATFORM]: [],
    };
    this._maxPoolSize = 50; // Max entities per type to keep in pool
  }
  
  /**
   * Get an entity from pool or create new
   * @param {string} type - EntityType
   * @returns {Object} Entity object (may have stale properties)
   */
  acquire(type) {
    const pool = this._pools[type];
    if (pool && pool.length > 0) {
      return pool.pop();
    }
    return {}; // Fresh object if pool empty
  }
  
  /**
   * Return an entity to the pool for reuse
   * @param {Object} entity - Entity to recycle
   */
  release(entity) {
    if (!entity || !entity.type) return;
    
    const pool = this._pools[entity.type];
    if (!pool) return;
    
    // Only pool if we have room
    if (pool.length < this._maxPoolSize) {
      // Clear dynamic properties but keep the object
      this._resetEntity(entity);
      pool.push(entity);
    }
    // else: let it be garbage collected
  }
  
  /**
   * Reset entity properties for reuse
   * @param {Object} entity
   */
  _resetEntity(entity) {
    // Clear collision/collection flags
    entity._collided = false;
    entity._collected = false;
    entity._magnetAttracted = false;
    
    // Clear position (will be set on spawn)
    entity.z = 0;
    entity.y = 0;
    entity.lane = 0;
    
    // Keep type for pool identification
    // Keep id for potential debugging
  }
  
  /**
   * Clear all pools (for game restart)
   */
  clear() {
    for (const type of Object.keys(this._pools)) {
      this._pools[type].length = 0;
    }
  }
  
  /**
   * Get pool statistics
   */
  getStats() {
    const stats = {};
    for (const [type, pool] of Object.entries(this._pools)) {
      stats[type] = pool.length;
    }
    return stats;
  }
}

/**
 * EntityManager mixin for GameEngine
 * Provides entity spawning and management methods
 */
export const EntityManagerMixin = {
  
  /**
   * Initialize entity management state
   * Called from GameEngine constructor
   */
  _initEntityManager() {
    // Entity storage
    this._entities = [];
    this._entityIdCounter = 0;
    
    // Object pool for recycling
    this._entityPool = new EntityPool();
    
    // Spawn throttling (easy mode)
    this._lastSpawnTime = 0;
    this._spawnCooldown = GAME.SPAWN_COOLDOWN_MS;
    
    // Spawn configuration
    this._spawnDistance = GAME.SPAWN_DISTANCE;
    this._despawnDistance = GAME.DESPAWN_DISTANCE;
  },
  
  /**
   * Reset entity state for new game
   */
  _resetEntities() {
    // Return all entities to pool
    for (const entity of this._entities) {
      this._entityPool.release(entity);
    }
    this._entities.length = 0;
    this._entityIdCounter = 0;
    this._lastSpawnTime = 0;
    
    // Clear pools between games to prevent memory buildup
    // Pooled objects can accumulate stale references over multiple games
    this._entityPool.clear();
    
    log.trace('Entities reset (pools cleared)');
  },
  
  /**
   * Update all entities (movement and despawning)
   * @param {number} dt - Delta time in seconds
   */
  _updateEntities(dt) {
    const moveDistance = this._speed * dt * GAME.DISTANCE_MULTIPLIER;
    
    // Check if coin magnet is active
    const magnetActive = this._activePowerup?.type?.id === 'coin_magnet' ||
                         this._activePowerup?.type === POWERUPS.TYPES.COIN_MAGNET;
    const magnetRange = POWERUPS.TYPES.COIN_MAGNET.range || 5;
    const magnetSpeed = 15; // Units per second coins fly toward player
    
    for (let i = this._entities.length - 1; i >= 0; i--) {
      const entity = this._entities[i];
      entity.z += moveDistance; // Move toward player (positive z direction)
      
      // Coin magnet: attract nearby coins to player's lane and position
      if (magnetActive && entity.type === EntityType.COIN && !entity._collected) {
        const distanceToPlayer = Math.abs(entity.z);
        
        // Only attract coins within range and in front of player
        if (distanceToPlayer < magnetRange && entity.z < 0) {
          // Move coin toward player's lane
          const playerLaneX = GAME.LANE_POSITIONS[this._playerLane];
          const entityLaneX = GAME.LANE_POSITIONS[entity.lane];
          const laneDiff = playerLaneX - entityLaneX;
          
          if (Math.abs(laneDiff) > 0.1) {
            // Smoothly move coin's lane toward player
            const laneStep = Math.sign(laneDiff);
            const newLane = entity.lane + laneStep;
            if (newLane >= Lane.LEFT && newLane <= Lane.RIGHT) {
              entity.lane = newLane;
            }
          }
          
          // Move coin toward player (increase z toward 0)
          entity.z += magnetSpeed * dt;
          
          // Move coin to player's Y height
          const targetY = this._playerY + this.playerHeight / 2;
          entity.y = entity.y + (targetY - entity.y) * 0.1;
          
          // Mark as being attracted for visual effects
          entity._magnetAttracted = true;
        }
      }
      
      // Remove entities that passed behind the player
      if (entity.z > -this._despawnDistance) {
        this._entities.splice(i, 1);
        this._entityPool.release(entity); // Recycle!
      }
    }
  },
  
  /**
   * Spawn new entities based on VRF randomness
   */
  _spawnEntities() {
    const now = Date.now();
    
    // Throttle spawning - wait for cooldown (easy mode: 1.5s)
    if (now - this._lastSpawnTime < this._spawnCooldown) {
      return;
    }
    
    // Check if we need to spawn - find furthest entity in front (most negative z)
    const furthestZ = this._entities.reduce((min, e) => Math.min(min, e.z), 0);
    
    // Enforce minimum gap between entities (spawn at negative z)
    if (furthestZ < -this._spawnDistance + GAME.OBSTACLE_MIN_GAP) {
      return;
    }
    
    // Use VRF for deterministic spawn type decision
    const rand = this._getVrfRandom();
    
    // Decide what to spawn:
    // 30% obstacle, 10% platform, 35% coin, 15% powerup, 10% nothing
    const platformThreshold = 0.30;
    const platformEnd = platformThreshold + (GAME.PLATFORM_CHANCE || 0.10);
    const coinEnd = platformEnd + 0.35;
    const powerupEnd = coinEnd + 0.15;
    
    if (rand < platformThreshold) {
      this._spawnObstacle();
      this._lastSpawnTime = now;
    } else if (rand < platformEnd) {
      this._spawnPlatform();
      this._lastSpawnTime = now;
    } else if (rand < coinEnd) {
      this._spawnCoin();
      this._lastSpawnTime = now;
    } else if (rand < powerupEnd) {
      this._spawnPowerup();
      this._lastSpawnTime = now;
    }
    // else: 10% nothing spawns (breathing room for easy mode)
  },
  
  /**
   * Spawn an obstacle using VRF for type and lane selection
   */
  _spawnObstacle() {
    // Use VRF to select barrier type
    const typeRand = this._getVrfRandom();
    const barrierTypeKey = BARRIER_TYPE_KEYS[Math.floor(typeRand * BARRIER_TYPE_KEYS.length)];
    const barrierType = BARRIER_TYPES[barrierTypeKey];
    
    // For non-full-lane barriers, use VRF to randomize which lanes are blocked
    let lanes = barrierType.lanes;
    
    // Randomize lane placement for single/double barriers
    if (lanes !== GAME.LANE_ALL) {
      const laneRand = this._getVrfRandom();
      
      // Rotate lane pattern based on VRF
      if (laneRand < 0.33) {
        // Shift left
        lanes = ((lanes << 1) | (lanes >> 2)) & 0b111;
      } else if (laneRand < 0.66) {
        // Shift right
        lanes = ((lanes >> 1) | (lanes << 2)) & 0b111;
      }
      // else: keep original pattern
    }
    
    // Create entities for each lane in the pattern
    const laneMask = lanes;
    const laneIndices = [];
    if (laneMask & GAME.LANE_LEFT) laneIndices.push(0);
    if (laneMask & GAME.LANE_CENTER) laneIndices.push(1);
    if (laneMask & GAME.LANE_RIGHT) laneIndices.push(2);
    
    // Spawn an entity for each blocked lane
    for (const lane of laneIndices) {
      const entity = this._entityPool.acquire(EntityType.OBSTACLE);
      
      entity.id = ++this._entityIdCounter;
      entity.type = EntityType.OBSTACLE;
      entity.lane = lane;
      entity.z = -this._spawnDistance;
      entity.y = barrierType.y;
      entity.barrierType = barrierType;
      entity.barrierTypeId = barrierType.id;
      entity.obstacleTypeName = barrierType.id;
      entity.requiresDuck = barrierType.requiresDuck;
      entity.requiresJump = barrierType.requiresJump;
      entity.width = GAME.OBSTACLE_WIDTH;
      entity.height = barrierType.height;
      entity.color = barrierType.color;
      entity.emissive = barrierType.emissive;
      // Collision bounds
      entity.minY = barrierType.strictDuck ? (barrierType.y ?? 0.4) : (barrierType.requiresDuck ? 0.5 : 0);
      entity.maxY = barrierType.strictDuck ? (barrierType.y ?? 0.4) + barrierType.height : (barrierType.requiresDuck ? 1.5 : barrierType.height);
      // Multi-lane metadata
      entity.laneMask = laneMask;
      entity.laneCount = laneIndices.length;
      // Clear flags
      entity._collided = false;
      
      this._entities.push(entity);
      this.emit('obstacleSpawned', entity);
    }
    
    log.trace('Obstacle spawned', {
      type: barrierType.id,
      lanes: laneIndices,
      requiresDuck: barrierType.requiresDuck,
      requiresJump: barrierType.requiresJump,
    });
  },
  
  /**
   * Spawn a coin with VRF lane and height selection
   */
  _spawnCoin() {
    // Separate VRF call for lane variety
    const laneRand = this._getVrfRandom();
    const lane = Math.floor(laneRand * 3);
    
    // VRF for height - coins spawn on ground or in air (requires jump)
    const heightRand = this._getVrfRandom();
    // 50% ground (y=0.5), 50% air (y=1.5-2.5 requires jump)
    const y = heightRand < 0.5 ? 0.5 : 1.5 + heightRand * 1.0;
    
    const entity = this._entityPool.acquire(EntityType.COIN);
    
    entity.id = ++this._entityIdCounter;
    entity.type = EntityType.COIN;
    entity.lane = lane;
    entity.z = -this._spawnDistance;
    entity.y = y;
    entity.value = GAME.COIN_VALUE;
    entity.collectRadius = 0.8;
    entity._collected = false;
    entity._magnetAttracted = false;
    
    this._entities.push(entity);
    log.trace('Coin spawned', { lane, y });
  },
  
  /**
   * Spawn a powerup with VRF type and position selection
   */
  _spawnPowerup() {
    const lane = Math.floor(this._getVrfRandom() * 3);
    
    // Random powerup type
    const types = Object.values(POWERUPS.TYPES);
    const type = types[Math.floor(this._getVrfRandom() * types.length)];
    
    // VRF for height - powerups spawn on ground or in air
    const heightRand = this._getVrfRandom();
    const y = heightRand < 0.5 ? 1.0 : 1.5 + heightRand * 1.0;
    
    const entity = this._entityPool.acquire(EntityType.POWERUP);
    
    entity.id = ++this._entityIdCounter;
    entity.type = EntityType.POWERUP;
    entity.powerupType = type;
    entity.lane = lane;
    entity.z = -this._spawnDistance;
    entity.y = y;
    entity.collectRadius = 0.8;
    entity._collected = false;
    
    this._entities.push(entity);
    log.trace('Powerup spawned', { lane, type: type.id, y });
  },
  
  /**
   * Spawn a platform (ramp or cube) with collectibles on top
   * Player can jump onto these and collect items above
   */
  _spawnPlatform() {
    // Random lane for platform
    const lane = Math.floor(this._getVrfRandom() * 3);
    
    // Random platform type
    const typeRand = this._getVrfRandom();
    const platformTypeKey = PLATFORM_TYPE_KEYS[Math.floor(typeRand * PLATFORM_TYPE_KEYS.length)];
    const platformType = PLATFORM_TYPES[platformTypeKey];
    
    const platformZ = -this._spawnDistance;
    
    // Create the platform entity
    const platformEntity = this._entityPool.acquire(EntityType.PLATFORM);
    
    platformEntity.id = ++this._entityIdCounter;
    platformEntity.type = EntityType.PLATFORM;
    platformEntity.platformType = platformType;
    platformEntity.platformTypeId = platformType.id;
    platformEntity.lane = lane;
    platformEntity.z = platformZ;
    platformEntity.y = 0;
    platformEntity.width = platformType.width;
    platformEntity.height = platformType.height;
    platformEntity.length = platformType.length;
    platformEntity.isRamp = platformType.isRamp;
    platformEntity.color = platformType.color;
    platformEntity.emissive = platformType.emissive;
    platformEntity.surfaceY = platformType.height;
    
    this._entities.push(platformEntity);
    
    // Spawn collectibles FLOATING ABOVE the platform
    // Use VRF to decide what goes on top: 60% coins, 30% powerup, 10% nothing
    const collectibleRand = this._getVrfRandom();
    
    // For longer platforms (12m+), put collectibles higher requiring jump
    // For shorter platforms, put them closer to the surface for easy grab
    const isLongPlatform = platformType.length >= 10;
    const floatHeight = isLongPlatform ? 2.0 : 0.8;
    const collectibleY = platformType.height + floatHeight;
    
    if (collectibleRand < 0.6) {
      // Spawn coins - more coins for longer platforms
      const baseCoinCount = isLongPlatform ? 3 : 1;
      const extraCoins = Math.floor(this._getVrfRandom() * (isLongPlatform ? 4 : 3));
      const coinCount = baseCoinCount + extraCoins;
      const spacing = platformType.length / (coinCount + 1);
      
      for (let i = 0; i < coinCount; i++) {
        const coinZ = platformZ - (platformType.length / 2) + spacing * (i + 1);
        
        const coinEntity = this._entityPool.acquire(EntityType.COIN);
        coinEntity.id = ++this._entityIdCounter;
        coinEntity.type = EntityType.COIN;
        coinEntity.lane = lane;
        coinEntity.z = coinZ;
        coinEntity.y = collectibleY;
        coinEntity.value = GAME.COIN_VALUE;
        coinEntity.collectRadius = 0.8;
        coinEntity.onPlatform = true;
        coinEntity.platformId = platformEntity.id;
        coinEntity.floatingHigh = isLongPlatform;
        coinEntity._collected = false;
        coinEntity._magnetAttracted = false;
        
        this._entities.push(coinEntity);
      }
      
      log.trace('Platform spawned with coins', {
        type: platformType.id,
        lane,
        coinCount,
        floatingHigh: isLongPlatform,
        collectibleY,
      });
    } else if (collectibleRand < 0.9) {
      // Spawn a powerup on top
      const types = Object.values(POWERUPS.TYPES);
      const powerupType = types[Math.floor(this._getVrfRandom() * types.length)];
      
      const powerupEntity = this._entityPool.acquire(EntityType.POWERUP);
      powerupEntity.id = ++this._entityIdCounter;
      powerupEntity.type = EntityType.POWERUP;
      powerupEntity.powerupType = powerupType;
      powerupEntity.lane = lane;
      powerupEntity.z = platformZ;
      powerupEntity.y = collectibleY;
      powerupEntity.collectRadius = 0.8;
      powerupEntity.onPlatform = true;
      powerupEntity.platformId = platformEntity.id;
      powerupEntity.floatingHigh = isLongPlatform;
      powerupEntity._collected = false;
      
      this._entities.push(powerupEntity);
      
      log.trace('Platform spawned with powerup', {
        type: platformType.id,
        lane,
        powerupType: powerupType.id,
        floatingHigh: isLongPlatform,
      });
    } else {
      log.trace('Platform spawned (empty)', { type: platformType.id, lane });
    }
  },
  
  /**
   * Remove an entity by index and return to pool
   * @param {number} index - Index in _entities array
   */
  _removeEntity(index) {
    const entity = this._entities[index];
    this._entities.splice(index, 1);
    this._entityPool.release(entity);
  },
  
  /**
   * Get entity pool statistics
   * @returns {Object} Pool statistics
   */
  _getEntityPoolStats() {
    return this._entityPool.getStats();
  },
  
  /**
   * Cleanup entity manager
   */
  _destroyEntityManager() {
    // Return all entities to pool
    for (const entity of this._entities) {
      this._entityPool.release(entity);
    }
    this._entities.length = 0;
    
    // Clear pools
    this._entityPool.clear();
    this._entityPool = null;
    
    log.debug('EntityManager destroyed');
  },
};

export default EntityManagerMixin;
