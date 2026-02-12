/**
 * ObstacleFactory.js - Procedural obstacle and collectible generation
 * 
 * Features:
 * - Multiple obstacle types (barriers, walls, low obstacles)
 * - Coins with rotation animation
 * - Powerups with glow effects
 * - Object pooling for performance
 */

import { Logger } from '../core/Logger.js';
import { COLORS, GAME, POWERUPS, BARRIER_TYPES, PLATFORM_TYPES } from '../constants/constants.js';
import { EntityType } from '../engine/GameEngine.js';

const log = Logger.create('ObstacleFactory');

let THREE = null;

export class ObstacleFactory {
  constructor(sceneManager) {
    this._sceneManager = sceneManager;
    THREE = sceneManager.THREE;
    
    this._laneWidth = GAME.LANE_WIDTH;
    
    // Object pools for reuse
    this._obstaclePool = [];
    this._coinPool = [];
    this._powerupPool = [];
    this._platformPool = [];

    // Pool caps to prevent unbounded VRAM growth
    this._maxObstaclePool = 30;
    this._maxCoinPool = 50;
    this._maxPowerupPool = 20;
    this._maxPlatformPool = 15;

    this._powerupEmojiTextures = new Map();
    
    // Active objects
    this._activeObjects = new Map(); // entityId -> object3D
    
    this._initialized = false;
  }

  /**
   * Initialize the factory
   */
  init() {
    if (this._initialized) return;
    
    // Pre-create pooled objects
    this._initPools();
    
    this._initialized = true;
    log.info('ObstacleFactory initialized');
  }

  /**
   * Create an entity mesh
   * @param {Object} entity - Entity data from GameEngine
   * @returns {Object3D} Three.js object
   */
  createEntity(entity) {
    let object;
    
    switch (entity.type) {
      case EntityType.OBSTACLE:
        object = this._createObstacle(entity);
        break;
      case EntityType.COIN:
        object = this._createCoin(entity);
        break;
      case EntityType.POWERUP:
        object = this._createPowerup(entity);
        break;
      case EntityType.PLATFORM:
        object = this._createPlatform(entity);
        break;
      default:
        log.warn('Unknown entity type', entity.type);
        return null;
    }
    
    if (object) {
      this._positionEntity(object, entity);
      this._activeObjects.set(entity.id, object);
      this._sceneManager.add(object);
    }
    
    return object;
  }

  /**
   * Update entity positions
   * @param {Array} entities - Current entities from GameEngine
   */
  updateEntities(entities) {
    const currentIds = new Set(entities.map(e => e.id));
    
    // Remove entities that no longer exist
    for (const [id, object] of this._activeObjects) {
      if (!currentIds.has(id)) {
        this._removeEntity(id);
      }
    }
    
    // Update existing entities and create new ones
    for (const entity of entities) {
      let object = this._activeObjects.get(entity.id);
      
      if (!object) {
        object = this.createEntity(entity);
      }
      
      if (object) {
        // Update position
        object.position.z = entity.z;
        object.position.y = entity.y ?? object.position.y;
        
        // Animate based on type
        this._animateEntity(entity, object);
      }
    }
  }

  /**
   * Remove an entity
   * @param {number} entityId
   */
  removeEntity(entityId) {
    this._removeEntity(entityId);
  }

  /**
   * Clear all entities
   */
  clearAll() {
    for (const [id] of this._activeObjects) {
      this._removeEntity(id);
    }
  }

  // ─── Private Methods ───────────────────────────────────────────

  _initPools() {
    // Pre-create obstacle pool with generic barriers
    for (let i = 0; i < 15; i++) {
      this._obstaclePool.push(this._buildGenericBarrier());
    }
    
    // Pre-create coin pool
    for (let i = 0; i < 10; i++) {
      this._coinPool.push(this._buildCoin());
    }
    
    // Pre-create powerup pool
    for (let i = 0; i < 5; i++) {
      this._powerupPool.push(this._buildPowerup(POWERUPS.TYPES.SHIELD));
    }
    
    log.debug('Object pools initialized', {
      obstacles: this._obstaclePool.length,
      coins: this._coinPool.length,
      powerups: this._powerupPool.length,
    });
  }

  _createObstacle(entity) {
    // Try to reuse from pool
    let obstacle = this._obstaclePool.pop();
    
    if (obstacle) {
      // Reset the pooled obstacle to match new entity
      this._resetObstacleMesh(obstacle, entity);
      obstacle.visible = true;
    } else {
      // Pool exhausted, create fresh
      obstacle = this._buildColoredBarrier(entity);
    }
    
    return obstacle;
  }

  /**
   * Build a generic barrier for pool initialization
   * Uses default JUMP_SINGLE type, will be reconfigured on use
   */
  _buildGenericBarrier() {
    const group = new THREE.Group();
    const barrierType = BARRIER_TYPES.JUMP_SINGLE;
    
    const height = barrierType.height || GAME.OBSTACLE_HEIGHT;
    const y = barrierType.y || 0;
    
    // Main barrier geometry
    const geometry = new THREE.BoxGeometry(
      GAME.OBSTACLE_WIDTH,
      height,
      0.3
    );
    
    const material = new THREE.MeshStandardMaterial({
      color: barrierType.color,
      emissive: barrierType.emissive,
      emissiveIntensity: 0.4,
      metalness: 0.7,
      roughness: 0.3,
    });
    
    const barrier = new THREE.Mesh(geometry, material);
    barrier.position.y = y + height / 2;
    barrier.userData.isMainMesh = true;
    group.add(barrier);
    
    // Add glow effect placeholder
    const glowGeometry = new THREE.BoxGeometry(
      GAME.OBSTACLE_WIDTH * 1.2,
      height * 1.2,
      0.1
    );
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: barrierType.color,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = y + height / 2;
    glow.userData.isGlow = true;
    group.add(glow);
    
    // Store barrier type for reference
    group.userData.barrierType = barrierType;
    group.userData.type = barrierType.id;
    
    return group;
  }

  /**
   * Reset a pooled obstacle to match a new entity's barrierType
   * Reconfigures color, height, and indicator without full rebuild
   */
  _resetObstacleMesh(group, entity) {
    const barrierType = entity.barrierType || BARRIER_TYPES.JUMP_SINGLE;
    const oldType = group.userData.barrierType;
    
    const color = entity.color || barrierType.color || 0x00FFFF;
    const emissive = entity.emissive || barrierType.emissive || 0x00AAAA;
    const height = entity.height || barrierType.height || GAME.OBSTACLE_HEIGHT;
    const y = entity.y || barrierType.y || 0;
    
    // Track which children to remove (indicators/non-essential)
    const childrenToRemove = [];
    
    for (let i = 0; i < group.children.length; i++) {
      const child = group.children[i];
      
      if (child.userData.isMainMesh) {
        // Update main barrier mesh
        child.material.color.setHex(color);
        child.material.emissive.setHex(emissive);
        
        // Rebuild geometry if height changed significantly
        if (oldType && Math.abs((oldType.height || 1.5) - height) > 0.1) {
          child.geometry.dispose();
          child.geometry = new THREE.BoxGeometry(
            GAME.OBSTACLE_WIDTH,
            height,
            0.3
          );
        }
        child.position.y = y + height / 2;
      } else if (child.userData.isGlow) {
        // Update glow mesh
        child.material.color.setHex(color);
        
        // Rebuild glow geometry if height changed significantly
        if (oldType && Math.abs((oldType.height || 1.5) - height) > 0.1) {
          child.geometry.dispose();
          child.geometry = new THREE.BoxGeometry(
            GAME.OBSTACLE_WIDTH * 1.2,
            height * 1.2,
            0.1
          );
        }
        child.position.y = y + height / 2;
      } else {
        // Mark indicator meshes for removal
        childrenToRemove.push(child);
      }
    }
    
    // Remove old indicator meshes
    for (const child of childrenToRemove) {
      group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
    
    // Add new indicator if needed
    if (barrierType.showIndicator) {
      this._addActionIndicator(group, barrierType, height, y);
    }
    
    // Update userData
    group.userData.barrierType = barrierType;
    group.userData.type = barrierType.id;
    
    // Reset transforms
    group.rotation.set(0, 0, 0);
    group.scale.set(1, 1, 1);
  }

  /**
   * Build a color-coded barrier based on entity barrierType
   * Jump=Cyan, Duck=Yellow, Move=Red
   */
  _buildColoredBarrier(entity) {
    const group = new THREE.Group();
    const barrierType = entity.barrierType || BARRIER_TYPES.JUMP_SINGLE;
    
    const color = entity.color || barrierType.color || 0x00FFFF;
    const emissive = entity.emissive || barrierType.emissive || 0x00AAAA;
    const height = entity.height || barrierType.height || GAME.OBSTACLE_HEIGHT;
    const y = entity.y || barrierType.y || 0;
    
    // Main barrier geometry
    const geometry = new THREE.BoxGeometry(
      GAME.OBSTACLE_WIDTH,
      height,
      0.3
    );
    
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: emissive,
      emissiveIntensity: 0.4,
      metalness: 0.7,
      roughness: 0.3,
    });
    
    const barrier = new THREE.Mesh(geometry, material);
    barrier.position.y = y + height / 2;
    barrier.userData.isMainMesh = true;
    group.add(barrier);
    
    // Add action indicator icon (only for types that enable it)
    if (barrierType.showIndicator) {
      this._addActionIndicator(group, barrierType, height, y);
    }
    
    // Add glow effect
    const glowGeometry = new THREE.BoxGeometry(
      GAME.OBSTACLE_WIDTH * 1.2,
      height * 1.2,
      0.1
    );
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = y + height / 2;
    glow.userData.isGlow = true;
    group.add(glow);
    
    // Store barrier type for reference
    group.userData.barrierType = barrierType;
    group.userData.type = barrierType.id;
    
    return group;
  }

  /**
   * Add visual indicator for required action (arrow up for jump, arrow down for duck)
   */
  _addActionIndicator(group, barrierType, height, y) {
    const action = barrierType.action;
    
    if (action === 'jump') {
      // Upward arrow indicator
      const arrowShape = new THREE.Shape();
      arrowShape.moveTo(0, 0.3);
      arrowShape.lineTo(0.15, 0);
      arrowShape.lineTo(0.05, 0);
      arrowShape.lineTo(0.05, -0.2);
      arrowShape.lineTo(-0.05, -0.2);
      arrowShape.lineTo(-0.05, 0);
      arrowShape.lineTo(-0.15, 0);
      arrowShape.closePath();
      
      const arrowGeom = new THREE.ShapeGeometry(arrowShape);
      const arrowMat = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, 
        side: THREE.DoubleSide,
      });
      const arrow = new THREE.Mesh(arrowGeom, arrowMat);
      arrow.position.set(0, y + height / 2, 0.2);
      arrow.scale.set(1.5, 1.5, 1);
      group.add(arrow);
    } else if (action === 'duck') {
      // Downward arrow indicator
      const arrowShape = new THREE.Shape();
      arrowShape.moveTo(0, -0.3);
      arrowShape.lineTo(0.15, 0);
      arrowShape.lineTo(0.05, 0);
      arrowShape.lineTo(0.05, 0.2);
      arrowShape.lineTo(-0.05, 0.2);
      arrowShape.lineTo(-0.05, 0);
      arrowShape.lineTo(-0.15, 0);
      arrowShape.closePath();
      
      const arrowGeom = new THREE.ShapeGeometry(arrowShape);
      const arrowMat = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, 
        side: THREE.DoubleSide,
      });
      const arrow = new THREE.Mesh(arrowGeom, arrowMat);
      arrow.position.set(0, y + height / 2, 0.2);
      arrow.scale.set(1.5, 1.5, 1);
      group.add(arrow);
    } else if (action === 'move') {
      // X indicator (cannot pass - must move to another lane)
      const xShape = new THREE.Shape();
      // Left diagonal of X
      xShape.moveTo(-0.15, 0.15);
      xShape.lineTo(-0.1, 0.15);
      xShape.lineTo(0, 0.05);
      xShape.lineTo(0.1, 0.15);
      xShape.lineTo(0.15, 0.15);
      xShape.lineTo(0.05, 0);
      xShape.lineTo(0.15, -0.15);
      xShape.lineTo(0.1, -0.15);
      xShape.lineTo(0, -0.05);
      xShape.lineTo(-0.1, -0.15);
      xShape.lineTo(-0.15, -0.15);
      xShape.lineTo(-0.05, 0);
      xShape.closePath();
      
      const xGeom = new THREE.ShapeGeometry(xShape);
      const xMat = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, 
        side: THREE.DoubleSide,
      });
      const xMesh = new THREE.Mesh(xGeom, xMat);
      xMesh.position.set(0, y + height / 2, 0.2);
      xMesh.scale.set(2, 2, 1);
      group.add(xMesh);
    }
  }


  _createCoin(entity) {
    let coin = this._coinPool.pop();
    
    if (!coin) {
      coin = this._buildCoin();
    } else {
      coin.visible = true;
    }
    
    return coin;
  }

  _buildCoin() {
    const group = new THREE.Group();
    
    // Coin shape (torus for ring effect - Kaspa style)
    const geometry = new THREE.TorusGeometry(0.25, 0.08, 8, 16);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(COLORS.COIN),
      emissive: new THREE.Color(COLORS.COIN),
      emissiveIntensity: 0.5,
      metalness: 0.9,
      roughness: 0.1
    });
    
    const coin = new THREE.Mesh(geometry, material);
    group.add(coin);
    
    // Inner glow
    const glowGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.COIN),
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);
    
    group.userData.type = 'coin';
    
    return group;
  }

  _createPowerup(entity) {
    let powerup = this._powerupPool.pop();
    
    if (!powerup) {
      powerup = this._buildPowerup(entity.powerupType);
    } else {
      powerup.visible = true;
      this._updatePowerupAppearance(powerup, entity.powerupType);
    }
    
    return powerup;
  }

  _buildPowerup(type) {
    const group = new THREE.Group();
    
    const color = this._getPowerupColor(type);

    const baseGeometry = new THREE.CircleGeometry(0.42, 32);
    const baseMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.rotation.x = Math.PI / 2;
    group.add(base);

    const emojiTexture = this._getPowerupEmojiTexture(type);
    const emojiMaterial = new THREE.SpriteMaterial({
      map: emojiTexture,
      transparent: true,
    });
    const emojiSprite = new THREE.Sprite(emojiMaterial);
    emojiSprite.scale.set(0.9, 0.9, 1);
    emojiSprite.position.y = 0.15;
    group.add(emojiSprite);
    
    // Outer glow ring
    const ringGeometry = new THREE.TorusGeometry(0.5, 0.03, 8, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.4
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    
    group.userData.type = 'powerup';
    group.userData.powerupType = type;
    group.userData.emojiSprite = emojiSprite;
    group.userData.outerRing = ring;
    group.userData.base = base;
    
    return group;
  }

  _getPowerupColor(type) {
    // Check if this is a powerdown (positive: false)
    if (type && type.positive === false) {
      return COLORS.POWERDOWN_MAGENTA || 0xff00ff; // Magenta for powerdowns
    }
    
    switch (type) {
      case POWERUPS.TYPES.SHIELD:
        return 0x00aaff;
      case POWERUPS.TYPES.DOUBLE_COINS:
        return COLORS.COIN;
      case POWERUPS.TYPES.SPEED_BOOST:
        return 0xff6600;
      case POWERUPS.TYPES.MAGNET:
      case POWERUPS.TYPES.COIN_MAGNET:
        return 0xaa00ff;
      default:
        return COLORS.PRIMARY;
    }
  }

  _updatePowerupAppearance(group, type) {
    const color = this._getPowerupColor(type);

    if (group.userData.base?.material?.color) {
      group.userData.base.material.color.set(color);
    }
    if (group.userData.outerRing?.material?.color) {
      group.userData.outerRing.material.color.set(color);
    }

    if (group.userData.emojiSprite?.material) {
      const texture = this._getPowerupEmojiTexture(type);
      group.userData.emojiSprite.material.map = texture;
      group.userData.emojiSprite.material.needsUpdate = true;
    }

    group.userData.powerupType = type;
  }

  _getPowerupEmoji(type) {
    switch (type) {
      case POWERUPS.TYPES.SHIELD:
        return "🛡️";
      case POWERUPS.TYPES.DOUBLE_COINS:
        return "💰";
      case POWERUPS.TYPES.SPEED_BOOST:
        return "⚡";
      case POWERUPS.TYPES.COIN_MAGNET:
        return "🧲";
      case POWERUPS.TYPES.SLOW:
        return "🐢";
      case POWERUPS.TYPES.REVERSE_CONTROLS:
        return "🔄";
      case POWERUPS.TYPES.FOG:
        return "🌫️";
      default:
        return "✨";
    }
  }

  _getPowerupEmojiTexture(type) {
    const typeId = type?.id || "unknown";
    if (this._powerupEmojiTextures.has(typeId)) {
      return this._powerupEmojiTextures.get(typeId);
    }

    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    const emoji = this._getPowerupEmoji(type);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "72px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, canvas.width / 2, canvas.height / 2 + 6);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    this._powerupEmojiTextures.set(typeId, texture);
    return texture;
  }

  // ─── Platform Methods ──────────────────────────────────────────

  _createPlatform(entity) {
    let platform = this._platformPool.pop();
    
    if (!platform) {
      platform = this._buildPlatform(entity);
    } else {
      platform.visible = true;
      this._updatePlatformAppearance(platform, entity);
    }
    
    return platform;
  }

  _buildPlatform(entity) {
    const group = new THREE.Group();
    
    const platformType = entity.platformType || PLATFORM_TYPES.CUBE;
    const width = platformType.width || GAME.PLATFORM_WIDTH;
    const height = platformType.height || GAME.PLATFORM_HEIGHT;
    const length = platformType.length || GAME.PLATFORM_LENGTH;
    const color = platformType.color || 0x8844FF;
    const emissive = platformType.emissive || 0x4422AA;
    
    if (platformType.isRamp) {
      // Build ramp shape (triangular prism)
      // We want LOW side facing player (at +z), HIGH side at back (-z)
      // So player walks onto low end and rides up as ramp passes
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);           // LOW corner at x=0
      shape.lineTo(length, 0);      // Bottom edge
      shape.lineTo(0, height);      // HIGH corner at x=0
      shape.lineTo(0, 0);           // Close
      
      const extrudeSettings = {
        steps: 1,
        depth: width,
        bevelEnabled: false,
      };
      
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geometry.rotateY(Math.PI / 2);
      geometry.translate(-width / 2, 0, -length / 2);
      
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(emissive),
        emissiveIntensity: 0.3,
        metalness: 0.6,
        roughness: 0.3,
      });
      
      const ramp = new THREE.Mesh(geometry, material);
      group.add(ramp);
      
      // Add edge glow
      const edges = new THREE.EdgesGeometry(geometry);
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.8,
      });
      const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
      group.add(edgeLines);
      
    } else {
      // Build cube/block
      const geometry = new THREE.BoxGeometry(width, height, length);
      geometry.translate(0, height / 2, 0); // Position so bottom is at y=0
      
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(emissive),
        emissiveIntensity: 0.3,
        metalness: 0.6,
        roughness: 0.3,
      });
      
      const cube = new THREE.Mesh(geometry, material);
      group.add(cube);
      
      // Add top surface glow
      const topGeometry = new THREE.PlaneGeometry(width * 0.9, length * 0.9);
      const topMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
      const topGlow = new THREE.Mesh(topGeometry, topMaterial);
      topGlow.rotation.x = -Math.PI / 2;
      topGlow.position.y = height + 0.01;
      group.add(topGlow);
      
      // Add edge glow
      const edges = new THREE.EdgesGeometry(geometry);
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.8,
      });
      const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
      group.add(edgeLines);
    }
    
    // Arrows pointing up to indicate "jump here"
    const arrowGeometry = new THREE.ConeGeometry(0.15, 0.3, 4);
    const arrowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FF88,
      transparent: true,
      opacity: 0.7,
    });
    
    const arrow1 = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow1.position.set(0, height + 0.8, 0);
    arrow1.name = 'arrow';
    group.add(arrow1);
    
    group.userData.type = 'platform';
    group.userData.platformType = platformType;
    
    return group;
  }

  _updatePlatformAppearance(group, entity) {
    const platformType = entity.platformType || PLATFORM_TYPES.CUBE;
    const color = platformType.color || 0x8844FF;
    const emissive = platformType.emissive || 0x4422AA;
    
    group.children.forEach(child => {
      if (child.material && child.name !== 'arrow') {
        if (child.material.color) child.material.color.set(color);
        if (child.material.emissive) child.material.emissive.set(emissive);
      }
    });
    
    group.userData.platformType = platformType;
  }

  _positionEntity(object, entity) {
    const x = (entity.lane - 1) * this._laneWidth;
    const z = entity.z ?? 0;
    
    // For obstacles and platforms, y is handled in mesh construction (height from ground)
    // For coins and powerups, use entity.y directly
    let y = entity.y ?? 0.5;
    if (entity.type === EntityType.OBSTACLE || entity.type === EntityType.PLATFORM) {
      y = 0;
    }
    
    object.position.set(x, y, z);
  }

  _animateEntity(entity, object) {
    const time = performance.now() * 0.001;
    
    if (entity.type === EntityType.COIN) {
      // Rotate coins
      object.rotation.y = time * 2;
      object.rotation.z = Math.sin(time * 3) * 0.1;
      
      // Bobbing - more dramatic for high-floating coins
      const bobAmount = entity.floatingHigh ? 0.25 : 0.1;
      const bobSpeed = entity.floatingHigh ? 5 : 4;
      object.position.y = (entity.y ?? 0.5) + Math.sin(time * bobSpeed) * bobAmount;
      
      // Extra glow pulse for high-floating coins
      if (entity.floatingHigh) {
        const glowChild = object.children[1]; // glow sphere
        if (glowChild?.material) {
          glowChild.material.opacity = 0.3 + Math.sin(time * 6) * 0.2;
          const scale = 1.2 + Math.sin(time * 5) * 0.3;
          glowChild.scale.setScalar(scale);
        }
      }
    }
    
    if (entity.type === EntityType.POWERUP) {
      // Rotate powerups
      object.rotation.y = time * 1.5;
      object.rotation.x = Math.sin(time * 2) * 0.2;
      
      // Pulsing scale - bigger pulse for high-floating
      const pulseAmount = entity.floatingHigh ? 0.2 : 0.1;
      const scale = 1 + Math.sin(time * 4) * pulseAmount;
      object.scale.setScalar(scale);
      
      // Bobbing - more dramatic for high-floating powerups
      const bobAmount = entity.floatingHigh ? 0.3 : 0.15;
      const bobSpeed = entity.floatingHigh ? 4 : 3;
      object.position.y = (entity.y ?? 1) + Math.sin(time * bobSpeed) * bobAmount;
      
      // Extra glow for high-floating powerups
      if (entity.floatingHigh) {
        const outerRing = object.userData.outerRing;
        if (outerRing?.material) {
          outerRing.material.opacity = 0.3 + Math.sin(time * 6) * 0.15;
        }
      }
    }
    
    if (entity.type === EntityType.OBSTACLE) {
      // Subtle warning pulse for obstacles
      const child = object.children[0];
      if (child?.material?.emissiveIntensity !== undefined) {
        child.material.emissiveIntensity = 0.3 + Math.sin(time * 8) * 0.1;
      }
    }
    
    if (entity.type === EntityType.PLATFORM) {
      // Animate arrow bobbing up and down
      object.children.forEach(child => {
        if (child.name === 'arrow') {
          child.position.y = (entity.height || 1.2) + 0.8 + Math.sin(time * 4) * 0.2;
          child.rotation.y = time * 2;
        }
      });
      
      // Subtle glow pulse
      object.children.forEach(child => {
        if (child.material?.emissiveIntensity !== undefined) {
          child.material.emissiveIntensity = 0.3 + Math.sin(time * 3) * 0.1;
        }
      });
    }
  }

  _removeEntity(id) {
    const object = this._activeObjects.get(id);
    if (!object) return;
    
    this._sceneManager.remove(object);
    object.visible = false;
    
    // Return to pool (with caps) or dispose
    const type = object.userData.type;
    
    if (type === 'coin') {
      if (this._coinPool.length < this._maxCoinPool) {
        this._coinPool.push(object);
      } else {
        this._disposeObject(object);
      }
    } else if (type === 'powerup') {
      if (this._powerupPool.length < this._maxPowerupPool) {
        this._powerupPool.push(object);
      } else {
        this._disposeObject(object);
      }
    } else if (type && typeof type === 'string' && type.includes('barrier')) {
      // Obstacles use barrierType.id which contains 'barrier' substring
      if (this._obstaclePool.length < this._maxObstaclePool) {
        this._obstaclePool.push(object);
      } else {
        this._disposeObject(object);
      }
    } else if (object.userData.barrierType) {
      // Fallback: check for barrierType userData
      if (this._obstaclePool.length < this._maxObstaclePool) {
        this._obstaclePool.push(object);
      } else {
        this._disposeObject(object);
      }
    } else if (type === 'platform') {
      if (this._platformPool.length < this._maxPlatformPool) {
        this._platformPool.push(object);
      } else {
        this._disposeObject(object);
      }
    } else {
      this._disposeObject(object);
    }
    
    this._activeObjects.delete(id);
  }

  _disposeObject(object) {
    object.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => {
            if (mat.map) mat.map.dispose();
            mat.dispose();
          });
        } else {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      }
    });
  }

  /**
   * Clean up
   */
  destroy() {
    this.clearAll();
    
    // Dispose all pooled objects
    const disposePools = [
      ...this._obstaclePool,
      ...this._coinPool,
      ...this._powerupPool,
      ...this._platformPool,
    ];
    
    for (const obj of disposePools) {
      this._disposeObject(obj);
    }
    
    this._obstaclePool = [];
    this._coinPool = [];
    this._powerupPool = [];
    this._platformPool = [];
    
    // Dispose cached emoji textures (GPU-resident CanvasTextures)
    for (const [, texture] of this._powerupEmojiTextures) {
      texture.dispose();
    }
    const textureCount = this._powerupEmojiTextures.size;
    this._powerupEmojiTextures.clear();
    
    this._initialized = false;
    log.info('ObstacleFactory destroyed', {
      disposedCount: disposePools.length,
      texturesDisposed: textureCount,
    });
  }
}

export default ObstacleFactory;
