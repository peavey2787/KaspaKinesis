/**
 * PlayerModel.js - Procedural player character for DAG Dasher
 * 
 * Features:
 * - Procedural geometry (no external models)
 * - Cyberpunk neon aesthetic
 * - Lane switching animation
 * - Jump animation
 * - Particle trail effect
 */

import { Logger } from '../core/Logger.js';
import { COLORS, GAME } from '../core/Constants.js';
import { Lane } from '../engine/GameEngine.js';

const log = Logger.create('PlayerModel');

let THREE = null;

export class PlayerModel {
  constructor(sceneManager) {
    this._sceneManager = sceneManager;
    THREE = sceneManager.THREE;
    
    this._group = null;
    this._body = null;
    this._glow = null;
    this._trail = [];
    
    this._currentLane = Lane.CENTER;
    this._targetLane = Lane.CENTER;
    this._lanePosition = 0; // Actual X position
    this._jumpY = 0;
    
    this._laneWidth = GAME.LANE_WIDTH;
    this._moveSpeed = 12; // Lane switch speed
    
    this._initialized = false;
  }

  /**
   * Initialize the player model
   */
  init() {
    if (this._initialized) return;
    
    this._group = new THREE.Group();
    
    this._createBody();
    this._createGlow();
    this._createTrail();
    
    // Position in center lane
    this._group.position.set(0, 0.5, 0);
    
    this._sceneManager.add(this._group);
    this._initialized = true;
    
    log.info('PlayerModel initialized');
  }

  /**
   * Get the player group
   */
  get group() {
    return this._group;
  }

  /**
   * Get current position
   */
  get position() {
    return this._group.position;
  }

  /**
   * Set target lane (will animate to it)
   * @param {number} lane - Lane.LEFT, Lane.CENTER, or Lane.RIGHT
   */
  setLane(lane) {
    this._targetLane = lane;
    log.trace('Lane set', { lane });
  }

  /**
   * Set jump height
   * @param {number} y - Jump Y position (0 = ground)
   */
  setJumpY(y) {
    this._jumpY = y;
  }

  /**
   * Update animation
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    if (!this._initialized) return;
    
    // Animate lane position
    const targetX = (this._targetLane - 1) * this._laneWidth;
    const dx = targetX - this._lanePosition;
    
    if (Math.abs(dx) > 0.01) {
      this._lanePosition += Math.sign(dx) * this._moveSpeed * dt;
      
      // Clamp if overshot
      if ((dx > 0 && this._lanePosition > targetX) ||
          (dx < 0 && this._lanePosition < targetX)) {
        this._lanePosition = targetX;
      }
      
      // Tilt during movement
      this._group.rotation.z = -dx * 0.3;
    } else {
      this._lanePosition = targetX;
      this._group.rotation.z *= 0.9; // Smoothly return to upright
    }
    
    this._group.position.x = this._lanePosition;
    
    // Update jump position
    this._group.position.y = 0.5 + this._jumpY;
    
    // Animate body
    this._animateBody(dt);
    
    // Update trail
    this._updateTrail(dt);
  }

  /**
   * Trigger a jump animation
   */
  triggerJump() {
    // Squash and stretch
    if (this._body) {
      this._body.scale.y = 0.7;
      this._body.scale.x = 1.3;
    }
  }

  /**
   * Set ducking state (flatten the player)
   * @param {boolean} isDucking - Whether player is ducking
   */
  setDucking(isDucking) {
    if (!this._body) return;
    
    if (isDucking) {
      // Flatten player - squash vertically, stretch horizontally
      this._body.scale.y = 0.3;
      this._body.scale.x = 1.5;
      this._body.scale.z = 1.5;
      // Lower position slightly
      this._group.position.y = 0.25;
    } else {
      // Return to normal scale (will be animated in _animateBody)
      this._body.scale.y = 1.0;
      this._body.scale.x = 1.0;
      this._body.scale.z = 1.0;
      // Restore normal position
      this._group.position.y = 0.5 + this._jumpY;
    }
  }

  /**
   * Reset to center lane
   */
  reset() {
    this._currentLane = Lane.CENTER;
    this._targetLane = Lane.CENTER;
    this._lanePosition = 0;
    this._jumpY = 0;
    this._group.position.set(0, 0.5, 0);
    this._group.rotation.z = 0;
  }

  // ─── Private Methods ───────────────────────────────────────────

  _createBody() {
    // Main body - rounded capsule-like shape
    const bodyGeometry = new THREE.CapsuleGeometry(0.3, 0.6, 4, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(COLORS.PRIMARY),
      emissive: new THREE.Color(COLORS.PRIMARY),
      emissiveIntensity: 0.3,
      metalness: 0.7,
      roughness: 0.2
    });
    
    this._body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this._body.rotation.x = -Math.PI * 0.1;
    this._group.add(this._body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(COLORS.ACCENT),
      emissive: new THREE.Color(COLORS.ACCENT),
      emissiveIntensity: 0.4,
      metalness: 0.6,
      roughness: 0.3
    });
    
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.55;
    this._group.add(head);
    
    // Eyes (simple glowing dots)
    const eyeGeometry = new THREE.SphereGeometry(0.05, 6, 6);
    const eyeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff
    });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.08, 0.58, 0.15);
    this._group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.08, 0.58, 0.15);
    this._group.add(rightEye);
    
    log.debug('Body created');
  }

  _createGlow() {
    // Outer glow effect using a larger transparent sphere
    const glowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.PRIMARY),
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    
    this._glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this._group.add(this._glow);
  }

  _createTrail() {
    // Trail particles behind the player
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
      const geometry = new THREE.SphereGeometry(0.05, 4, 4);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(COLORS.PRIMARY),
        transparent: true,
        opacity: 0
      });
      
      const particle = new THREE.Mesh(geometry, material);
      particle.position.set(0, 0.3, 0.5 + i * 0.15);
      particle.userData = {
        offset: i,
        baseOpacity: 0.5 - (i / particleCount) * 0.4
      };
      
      this._trail.push(particle);
      this._sceneManager.add(particle);
    }
    
    log.debug('Trail created', { particles: particleCount });
  }

  _animateBody(dt) {
    if (!this._body) return;
    
    // Breathing animation
    const breathe = Math.sin(performance.now() * 0.003) * 0.02;
    this._body.scale.y = THREE.MathUtils.lerp(this._body.scale.y, 1 + breathe, 0.1);
    this._body.scale.x = THREE.MathUtils.lerp(this._body.scale.x, 1, 0.1);
    
    // Glow pulsing
    if (this._glow) {
      const pulse = 0.15 + Math.sin(performance.now() * 0.005) * 0.05;
      this._glow.material.opacity = pulse;
    }
  }

  _updateTrail(dt) {
    const playerPos = this._group.position;
    
    for (const particle of this._trail) {
      // Move towards player X position
      particle.position.x = THREE.MathUtils.lerp(
        particle.position.x,
        playerPos.x,
        0.05
      );
      
      // Oscillate slightly
      const wave = Math.sin(performance.now() * 0.01 + particle.userData.offset * 0.5) * 0.05;
      particle.position.y = 0.3 + playerPos.y * 0.3 + wave;
      
      // Update opacity based on movement
      const isMoving = Math.abs(this._group.rotation.z) > 0.01;
      const targetOpacity = isMoving ? particle.userData.baseOpacity : 0.1;
      particle.material.opacity = THREE.MathUtils.lerp(
        particle.material.opacity,
        targetOpacity,
        0.1
      );
    }
  }

  /**
   * Clean up
   */
  destroy() {
    if (this._group) {
      this._sceneManager.remove(this._group);
      
      this._group.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    }
    
    for (const particle of this._trail) {
      this._sceneManager.remove(particle);
      particle.geometry.dispose();
      particle.material.dispose();
    }
    this._trail = [];
    
    this._initialized = false;
    log.info('PlayerModel destroyed');
  }
}

export default PlayerModel;
