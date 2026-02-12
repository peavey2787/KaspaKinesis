/**
 * TrackGenerator.js - Infinite procedural track generation
 * 
 * Features:
 * - Endless scrolling track segments
 * - 3 lanes with neon edge lighting
 * - Cyberpunk grid pattern
 * - Dynamic segment recycling
 */

import { Logger } from '../core/Logger.js';
import { COLORS, GAME, RENDERER } from '../core/Constants.js';

const log = Logger.create('TrackGenerator');

let THREE = null;

export class TrackGenerator {
  constructor(sceneManager) {
    this._sceneManager = sceneManager;
    THREE = sceneManager.THREE;
    
    this._segments = [];
    this._segmentLength = GAME.TRACK_SEGMENT_LENGTH;
    this._segmentCount = 8;
    this._lastSegmentZ = 0;
    
    this._laneWidth = GAME.LANE_WIDTH;
    this._trackWidth = this._laneWidth * 3;
    
    this._gridGroup = null;
    this._edgeLights = [];
    
    // Skybox objects (stars, buildings, windows) - tracked for disposal
    this._skyboxObjects = [];
    
    // Finish line and celebration
    this._finishLine = null;
    this._finishLineVisible = false;
    this._confettiParticles = null;
    this._trophy = null;
    this._celebrationActive = false;
    
    this._initialized = false;
  }

  /**
   * Initialize the track
   */
  init() {
    if (this._initialized) return;
    
    this._createSegments();
    this._createEdgeLights();
    this._createSkybox();
    this._createFinishLine();
    
    this._initialized = true;
    log.info('TrackGenerator initialized');
  }

  /**
   * Update track scrolling
   * @param {number} speed - Current game speed
   * @param {number} dt - Delta time
   */
  update(speed, dt) {
    if (!this._initialized) return;
    
    const moveDistance = speed * dt * GAME.DISTANCE_MULTIPLIER;
    
    // Move all segments toward player
    for (const segment of this._segments) {
      segment.position.z += moveDistance;
    }
    
    // Move finish line toward player if visible
    if (this._finishLineVisible && this._finishLine) {
      this._finishLine.position.z += moveDistance;
    }
    
    // Find the minimum z position (furthest forward segment)
    let minZ = Infinity;
    for (const segment of this._segments) {
      if (segment.position.z < minZ) {
        minZ = segment.position.z;
      }
    }
    
    // Recycle segments only after they pass behind the camera
    const recycleZ = RENDERER.CAMERA_DISTANCE + this._segmentLength;
    for (const segment of this._segments) {
      if (segment.position.z > recycleZ) {
        // Place at the front of the track
        segment.position.z = minZ - this._segmentLength;
        // Update minZ for next recycled segment in same frame
        minZ = segment.position.z;
      }
    }
    
    // Update _lastSegmentZ for reset tracking
    this._lastSegmentZ = minZ;
    
    // Update edge light animation
    this._updateEdgeLights(dt);
    
    // Update celebration animation if active
    if (this._celebrationActive) {
      this._updateCelebration(dt);
    }
  }

  /**
   * Reset track position
   */
  reset() {
    for (let i = 0; i < this._segments.length; i++) {
      this._segments[i].position.z = -i * this._segmentLength;
    }
    this._lastSegmentZ = -(this._segments.length - 1) * this._segmentLength;
    
    // Reset finish line
    this.hideFinishLine();
    this.hideCelebration();
  }

  /**
   * Show finish line when approaching end of game
   * @param {number} progress - Game progress 0-1
   */
  showFinishLine(progress) {
    if (!this._finishLine) return;
    
    if (progress >= GAME.FINISH_LINE_THRESHOLD && !this._finishLineVisible) {
      this._finishLineVisible = true;
      this._finishLine.visible = true;
      this._finishLine.position.z = -80;
      log.info('Finish line shown');
    }
  }
  
  /**
   * Hide finish line
   */
  hideFinishLine() {
    if (this._finishLine) {
      this._finishLine.visible = false;
      this._finishLineVisible = false;
      this._finishLine.position.z = -200;
    }
  }
  
  /**
   * Show victory celebration with confetti and trophy
   * Only called when player completes the race
   */
  showCelebration() {
    if (this._celebrationActive) return;
    
    this._celebrationActive = true;
    this._createConfetti();
    this._createTrophy();
    log.info('Celebration started');
  }
  
  /**
   * Hide celebration elements
   */
  hideCelebration() {
    this._celebrationActive = false;
    
    if (this._confettiParticles) {
      this._sceneManager.remove(this._confettiParticles);
      this._confettiParticles.geometry?.dispose();
      this._confettiParticles.material?.dispose();
      this._confettiParticles = null;
    }
    
    if (this._trophy) {
      this._sceneManager.remove(this._trophy);
      this._trophy.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      this._trophy = null;
    }
  }

  // ─── Private Methods ───────────────────────────────────────────

  _createSegments() {
    for (let i = 0; i < this._segmentCount; i++) {
      const segment = this._createSegment();
      segment.position.z = -i * this._segmentLength;
      this._segments.push(segment);
      this._sceneManager.add(segment);
    }
    
    this._lastSegmentZ = -(this._segmentCount - 1) * this._segmentLength;
    log.debug('Track segments created', { count: this._segmentCount });
  }

  _createSegment() {
    const group = new THREE.Group();
    
    // Main track surface
    const trackGeometry = new THREE.PlaneGeometry(
      this._trackWidth,
      this._segmentLength,
      3,
      Math.floor(this._segmentLength / 2)
    );
    
    const trackMaterial = new THREE.MeshStandardMaterial({
      color: 0x111122,
      metalness: 0.8,
      roughness: 0.4
    });
    
    const track = new THREE.Mesh(trackGeometry, trackMaterial);
    track.rotation.x = -Math.PI / 2;
    track.position.y = -0.01;
    track.position.z = -this._segmentLength / 2;
    group.add(track);
    
    // Grid lines (cyberpunk effect)
    this._addGridLines(group);
    
    // Lane dividers (neon)
    this._addLaneDividers(group);
    
    return group;
  }

  _addGridLines(group) {
    // Use thin box meshes instead of lines to avoid WebGL lineWidth errors
    const lineMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.PRIMARY),
      transparent: true,
      opacity: 0.2
    });
    
    // Horizontal lines (thin boxes)
    const hLineCount = Math.floor(this._segmentLength / 2);
    const lineThickness = 0.02;
    const lineHeight = 0.005;
    
    for (let i = 0; i <= hLineCount; i++) {
      const geometry = new THREE.BoxGeometry(this._trackWidth, lineHeight, lineThickness);
      const mesh = new THREE.Mesh(geometry, lineMaterial);
      mesh.position.set(0, lineHeight / 2, -i * 2);
      group.add(mesh);
    }
    
    // Vertical lines at lane boundaries (thin boxes)
    const vLineMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.PRIMARY),
      transparent: true,
      opacity: 0.1
    });
    
    for (let i = -1; i <= 1; i++) {
      if (i === 0) continue; // Skip center
      
      const geometry = new THREE.BoxGeometry(lineThickness, lineHeight, this._segmentLength);
      const mesh = new THREE.Mesh(geometry, vLineMaterial);
      mesh.position.set(i * this._laneWidth, lineHeight / 2, -this._segmentLength / 2);
      group.add(mesh);
    }
  }

  _addLaneDividers(group) {
    // Glowing lane dividers
    const dividerGeometry = new THREE.BoxGeometry(0.05, 0.02, this._segmentLength);
    
    // Left divider
    const leftMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.PRIMARY),
      transparent: true,
      opacity: 0.6
    });
    const leftDivider = new THREE.Mesh(dividerGeometry, leftMaterial);
    leftDivider.position.set(-this._laneWidth / 2, 0.01, -this._segmentLength / 2);
    group.add(leftDivider);
    
    // Right divider
    const rightMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.ACCENT),
      transparent: true,
      opacity: 0.6
    });
    const rightDivider = new THREE.Mesh(dividerGeometry, rightMaterial);
    rightDivider.position.set(this._laneWidth / 2, 0.01, -this._segmentLength / 2);
    group.add(rightDivider);
  }

  _createEdgeLights() {
    // Left edge
    const leftLight = this._createEdgeLightStrip(-this._trackWidth / 2 - 0.2);
    this._edgeLights.push(leftLight);
    this._sceneManager.add(leftLight);
    
    // Right edge
    const rightLight = this._createEdgeLightStrip(this._trackWidth / 2 + 0.2);
    this._edgeLights.push(rightLight);
    this._sceneManager.add(rightLight);
    
    log.debug('Edge lights created');
  }

  _createEdgeLightStrip(x) {
    const group = new THREE.Group();
    
    // Series of glowing boxes
    const lightCount = 30;
    const spacing = 3;
    
    for (let i = 0; i < lightCount; i++) {
      const geometry = new THREE.BoxGeometry(0.1, 0.2, 0.5);
      const material = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 
          new THREE.Color(COLORS.PRIMARY) : 
          new THREE.Color(COLORS.ACCENT),
        transparent: true,
        opacity: 0.8
      });
      
      const light = new THREE.Mesh(geometry, material);
      light.position.set(x, 0.1, -i * spacing);
      light.userData = { index: i, baseOpacity: 0.8 };
      
      group.add(light);
    }
    
    return group;
  }

  _updateEdgeLights(dt) {
    const time = performance.now() * 0.002;
    
    for (const strip of this._edgeLights) {
      strip.children.forEach((light, i) => {
        // Pulsing effect
        const pulse = Math.sin(time + i * 0.5) * 0.3 + 0.7;
        light.material.opacity = light.userData.baseOpacity * pulse;
      });
    }
  }

  _createSkybox() {
    // Simple gradient background - we'll use fog instead of a full skybox
    // Add some distant stars/particles for depth
    
    const starCount = 200;
    const starGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = Math.random() * 50 + 10;
      positions[i * 3 + 2] = -Math.random() * 200 - 20;
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.3,
      transparent: true,
      opacity: 0.6
    });
    
    const stars = new THREE.Points(starGeometry, starMaterial);
    this._sceneManager.add(stars);
    this._skyboxObjects.push(stars);
    
    // Add some floating neon structures in the background
    this._createBackgroundStructures();
    
    log.debug('Skybox and stars created');
  }

  _createBackgroundStructures() {
    // Distant cyberpunk buildings/structures
    const structureCount = 10;
    
    for (let i = 0; i < structureCount; i++) {
      const height = 10 + Math.random() * 30;
      const width = 2 + Math.random() * 5;
      const depth = 2 + Math.random() * 5;
      
      const geometry = new THREE.BoxGeometry(width, height, depth);
      const material = new THREE.MeshBasicMaterial({
        color: 0x0a0a15,
        transparent: true,
        opacity: 0.8
      });
      
      const building = new THREE.Mesh(geometry, material);
      
      // Position on sides of track
      const side = i % 2 === 0 ? -1 : 1;
      building.position.set(
        side * (15 + Math.random() * 20),
        height / 2,
        -20 - i * 15
      );
      
      this._sceneManager.add(building);
      this._skyboxObjects.push(building);
      
      // Add window lights
      this._addWindowLights(building, width, height, depth);
    }
  }

  _addWindowLights(building, width, height, depth) {
    // Random window lights on buildings
    const windowCount = Math.floor(height * 2);
    
    for (let i = 0; i < windowCount; i++) {
      if (Math.random() > 0.3) continue; // Only some windows lit
      
      const geometry = new THREE.PlaneGeometry(0.3, 0.2);
      const color = Math.random() > 0.5 ? COLORS.PRIMARY : COLORS.ACCENT;
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.4 + Math.random() * 0.4
      });
      
      const windowMesh = new THREE.Mesh(geometry, material);
      
      // Position on building face
      const x = building.position.x > 0 ? -width / 2 - 0.01 : width / 2 + 0.01;
      windowMesh.position.set(
        building.position.x + x,
        Math.random() * height,
        building.position.z + (Math.random() - 0.5) * depth
      );
      windowMesh.rotation.y = building.position.x > 0 ? Math.PI / 2 : -Math.PI / 2;
      
      this._sceneManager.add(windowMesh);
      this._skyboxObjects.push(windowMesh);
    }
  }

  /**
   * Create the finish line visual
   * @private
   */
  _createFinishLine() {
    const group = new THREE.Group();
    
    const bannerWidth = this._trackWidth + 2;
    const bannerHeight = 3;
    
    // Checkered pattern texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    const squareSize = 32;
    for (let y = 0; y < canvas.height; y += squareSize) {
      for (let x = 0; x < canvas.width; x += squareSize) {
        const isBlack = ((x / squareSize) + (y / squareSize)) % 2 === 0;
        ctx.fillStyle = isBlack ? '#000000' : '#ffffff';
        ctx.fillRect(x, y, squareSize, squareSize);
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.x = 4;
    
    // Banner
    const bannerGeometry = new THREE.PlaneGeometry(bannerWidth, bannerHeight);
    const bannerMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });
    const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
    banner.position.y = bannerHeight / 2 + 3;
    group.add(banner);
    
    // Ground stripe
    const stripeGeometry = new THREE.PlaneGeometry(bannerWidth, 2);
    const stripe = new THREE.Mesh(stripeGeometry, bannerMaterial.clone());
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.y = 0.02;
    group.add(stripe);
    
    // Glowing arch
    const archGeometry = new THREE.TorusGeometry(bannerWidth / 2 + 0.5, 0.2, 8, 32, Math.PI);
    const archMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.NEON_GREEN,
      transparent: true,
      opacity: 0.9,
    });
    const arch = new THREE.Mesh(archGeometry, archMaterial);
    arch.rotation.z = Math.PI;
    arch.position.y = bannerHeight + 3.5;
    group.add(arch);
    
    // Side poles with neon glow
    const poleHeight = 7;
    const poleGeometry = new THREE.CylinderGeometry(0.12, 0.12, poleHeight, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.NEON_GREEN,
      emissive: COLORS.NEON_GREEN,
      emissiveIntensity: 0.6,
      metalness: 0.8,
      roughness: 0.2,
    });
    
    const leftPole = new THREE.Mesh(poleGeometry, poleMaterial);
    leftPole.position.set(-bannerWidth / 2, poleHeight / 2, 0);
    group.add(leftPole);
    
    const rightPole = new THREE.Mesh(poleGeometry, poleMaterial);
    rightPole.position.set(bannerWidth / 2, poleHeight / 2, 0);
    group.add(rightPole);
    
    // Glowing orbs on poles
    const orbGeometry = new THREE.SphereGeometry(0.35, 16, 16);
    const orbMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.NEON_GREEN,
      transparent: true,
      opacity: 0.95,
    });
    
    const leftOrb = new THREE.Mesh(orbGeometry, orbMaterial);
    leftOrb.position.set(-bannerWidth / 2, poleHeight + 0.35, 0);
    group.add(leftOrb);
    
    const rightOrb = new THREE.Mesh(orbGeometry, orbMaterial);
    rightOrb.position.set(bannerWidth / 2, poleHeight + 0.35, 0);
    group.add(rightOrb);
    
    // "FINISH" text boxes
    this._addFinishText(group, bannerHeight);
    
    group.visible = false;
    group.position.z = -200;
    
    this._finishLine = group;
    this._sceneManager.add(group);
    
    log.debug('Finish line created');
  }
  
  /**
   * Add "FINISH" text to finish line
   * @private
   */
  _addFinishText(group, bannerHeight) {
    const textMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.NEON_GREEN,
    });
    
    const letters = ['F', 'I', 'N', 'I', 'S', 'H'];
    const spacing = 0.9;
    const startX = -((letters.length - 1) * spacing) / 2;
    
    letters.forEach((letter, i) => {
      const letterGeometry = new THREE.BoxGeometry(0.6, 1.0, 0.1);
      const letterMesh = new THREE.Mesh(letterGeometry, textMaterial);
      letterMesh.position.set(startX + i * spacing, bannerHeight + 5.2, 0);
      group.add(letterMesh);
    });
  }
  
  /**
   * Create confetti particle system
   * @private
   */
  _createConfetti() {
    const particleCount = 300;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = [];
    
    const confettiColors = [
      new THREE.Color(COLORS.KASPA_TEAL),
      new THREE.Color(COLORS.KASPA_PURPLE),
      new THREE.Color(COLORS.NEON_GREEN),
      new THREE.Color(COLORS.NEON_PINK),
      new THREE.Color(COLORS.NEON_YELLOW),
      new THREE.Color(0xffffff),
    ];
    
    for (let i = 0; i < particleCount; i++) {
      // Start positions - spread above and around player
      positions[i * 3] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = 5 + Math.random() * 10;
      positions[i * 3 + 2] = -5 + (Math.random() - 0.5) * 20;
      
      // Random color
      const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      // Velocity for animation
      velocities.push({
        x: (Math.random() - 0.5) * 2,
        y: -1 - Math.random() * 3,
        z: (Math.random() - 0.5) * 2,
        rotSpeed: Math.random() * 5,
      });
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });
    
    this._confettiParticles = new THREE.Points(geometry, material);
    this._confettiParticles.userData.velocities = velocities;
    this._confettiParticles.userData.startTime = Date.now();
    this._sceneManager.add(this._confettiParticles);
    
    log.debug('Confetti created');
  }
  
  /**
   * Create victory trophy
   * @private
   */
  _createTrophy() {
    const group = new THREE.Group();
    
    // Trophy cup
    const cupGeometry = new THREE.CylinderGeometry(0.8, 0.5, 1.5, 16);
    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.3,
      metalness: 1.0,
      roughness: 0.2,
    });
    const cup = new THREE.Mesh(cupGeometry, goldMaterial);
    cup.position.y = 2;
    group.add(cup);
    
    // Trophy base
    const baseGeometry = new THREE.CylinderGeometry(0.6, 0.7, 0.4, 16);
    const base = new THREE.Mesh(baseGeometry, goldMaterial);
    base.position.y = 1.0;
    group.add(base);
    
    // Trophy stem
    const stemGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.6, 8);
    const stem = new THREE.Mesh(stemGeometry, goldMaterial);
    stem.position.y = 1.35;
    group.add(stem);
    
    // Trophy handles
    const handleGeometry = new THREE.TorusGeometry(0.4, 0.08, 8, 16, Math.PI);
    const leftHandle = new THREE.Mesh(handleGeometry, goldMaterial);
    leftHandle.rotation.y = Math.PI / 2;
    leftHandle.rotation.z = Math.PI / 2;
    leftHandle.position.set(-0.8, 2, 0);
    group.add(leftHandle);
    
    const rightHandle = new THREE.Mesh(handleGeometry, goldMaterial);
    rightHandle.rotation.y = -Math.PI / 2;
    rightHandle.rotation.z = -Math.PI / 2;
    rightHandle.position.set(0.8, 2, 0);
    group.add(rightHandle);
    
    // Glowing star on top
    const starGeometry = new THREE.OctahedronGeometry(0.3, 0);
    const starMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.KASPA_TEAL,
      transparent: true,
      opacity: 0.95,
    });
    const star = new THREE.Mesh(starGeometry, starMaterial);
    star.position.y = 3.0;
    star.userData.rotSpeed = 2;
    group.add(star);
    
    group.position.set(0, 1, -10);
    group.userData.startTime = Date.now();
    group.userData.bobOffset = 0;
    
    this._trophy = group;
    this._sceneManager.add(group);
    
    log.debug('Trophy created');
  }
  
  /**
   * Update celebration animation
   * @param {number} dt - Delta time
   * @private
   */
  _updateCelebration(dt) {
    const time = Date.now();
    
    // Update confetti
    if (this._confettiParticles) {
      const positions = this._confettiParticles.geometry.attributes.position.array;
      const velocities = this._confettiParticles.userData.velocities;
      
      for (let i = 0; i < velocities.length; i++) {
        const vel = velocities[i];
        
        // Apply velocity
        positions[i * 3] += vel.x * dt;
        positions[i * 3 + 1] += vel.y * dt;
        positions[i * 3 + 2] += vel.z * dt;
        
        // Reset particles that fall too low
        if (positions[i * 3 + 1] < -2) {
          positions[i * 3] = (Math.random() - 0.5) * 15;
          positions[i * 3 + 1] = 8 + Math.random() * 5;
          positions[i * 3 + 2] = -5 + (Math.random() - 0.5) * 20;
        }
      }
      
      this._confettiParticles.geometry.attributes.position.needsUpdate = true;
    }
    
    // Update trophy
    if (this._trophy) {
      // Bob up and down
      this._trophy.userData.bobOffset += dt * 2;
      this._trophy.position.y = 1 + Math.sin(this._trophy.userData.bobOffset) * 0.3;
      
      // Rotate slowly
      this._trophy.rotation.y += dt * 0.5;
      
      // Rotate the star faster
      const star = this._trophy.children[this._trophy.children.length - 1];
      if (star?.userData?.rotSpeed) {
        star.rotation.y += dt * star.userData.rotSpeed;
        star.rotation.x += dt * star.userData.rotSpeed * 0.5;
      }
    }
  }

  /**
   * Clean up - FIXED: comprehensive disposal to prevent memory leaks
   */
  destroy() {
    // Dispose track segments
    for (const segment of this._segments) {
      this._sceneManager.remove(segment);
      this._disposeObject(segment);
    }
    this._segments = [];
    
    // Dispose edge lights
    for (const light of this._edgeLights) {
      this._sceneManager.remove(light);
      if (light.dispose) light.dispose(); // Some lights have dispose
    }
    this._edgeLights = [];
    
    // Dispose grid group
    if (this._gridGroup) {
      this._sceneManager.remove(this._gridGroup);
      this._disposeObject(this._gridGroup);
      this._gridGroup = null;
    }
    
    // Clean up finish line
    if (this._finishLine) {
      this._sceneManager.remove(this._finishLine);
      this._disposeObject(this._finishLine);
      this._finishLine = null;
    }
    
    // Clean up confetti
    if (this._confettiParticles) {
      this._sceneManager.remove(this._confettiParticles);
      this._disposeObject(this._confettiParticles);
      this._confettiParticles = null;
    }
    
    // Clean up trophy
    if (this._trophy) {
      this._sceneManager.remove(this._trophy);
      this._disposeObject(this._trophy);
      this._trophy = null;
    }
    
    // Dispose skybox objects (stars, buildings, windows)
    for (const obj of this._skyboxObjects) {
      this._sceneManager.remove(obj);
      this._disposeObject(obj);
    }
    this._skyboxObjects = [];
    
    this._finishLineVisible = false;
    this._celebrationActive = false;
    this._initialized = false;
    
    log.info('TrackGenerator destroyed with full disposal');
  }

  /**
   * Recursively dispose object and all children
   * @param {Object3D} object
   */
  _disposeObject(object) {
    if (!object) return;
    
    // Process children first (clone to avoid mutation during iteration)
    const children = [...(object.children || [])];
    for (const child of children) {
      this._disposeObject(child);
    }
    
    if (object.geometry) {
      object.geometry.dispose();
    }
    
    if (object.material) {
      this._disposeMaterial(object.material);
    }
    
    if (object.parent) {
      object.parent.remove(object);
    }
  }

  /**
   * Dispose material and textures
   * @param {Material|Material[]} material
   */
  _disposeMaterial(material) {
    if (!material) return;
    
    if (Array.isArray(material)) {
      material.forEach(m => this._disposeMaterial(m));
      return;
    }
    
    if (material.map) material.map.dispose();
    if (material.emissiveMap) material.emissiveMap.dispose();
    if (material.normalMap) material.normalMap.dispose();
    material.dispose();
  }
}

export default TrackGenerator;
