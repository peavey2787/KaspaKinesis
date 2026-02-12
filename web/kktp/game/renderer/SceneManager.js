/**
 * SceneManager.js - Three.js scene management with cyberpunk aesthetics
 * 
 * Features:
 * - Scene setup with fog and lighting
 * - Camera management
 * - Post-processing (bloom)
 * - Responsive resize handling
 */

import { Logger } from '../core/Logger.js';
import { RENDERER, COLORS } from '../core/Constants.js';

const log = Logger.create('SceneManager');

// We'll use dynamic imports for Three.js
let THREE = null;
let EffectComposer = null;
let RenderPass = null;
let UnrealBloomPass = null;

export class SceneManager {
  constructor(container) {
    this._container = container;
    this._renderer = null;
    this._scene = null;
    this._camera = null;
    this._composer = null;
    
    this._width = 0;
    this._height = 0;
    this._aspectRatio = 1;
    
    this._initialized = false;
    this._animationId = null;
    this._renderCallbacks = [];
    
    // Event handlers for cleanup
    this._resizeHandler = null;
    this._orientationHandler = null;
  }

  /**
   * Initialize the scene
   */
  async init() {
    if (this._initialized) return;
    
    // Load Three.js
    try {
      THREE = await import('three');
      const postProcessing = await import('three/addons/postprocessing/EffectComposer.js');
      EffectComposer = postProcessing.EffectComposer;
      
      const renderPassModule = await import('three/addons/postprocessing/RenderPass.js');
      RenderPass = renderPassModule.RenderPass;
      
      const bloomModule = await import('three/addons/postprocessing/UnrealBloomPass.js');
      UnrealBloomPass = bloomModule.UnrealBloomPass;
    } catch (e) {
      log.error('Failed to load Three.js modules', e);
      throw new Error('Three.js not available');
    }
    
    this._setupRenderer();
    this._setupScene();
    this._setupCamera();
    this._setupLights();
    this._setupPostProcessing();
    this._setupResizeHandler();
    
    this._initialized = true;
    log.info('SceneManager initialized');
  }

  /**
   * Get Three.js module
   */
  get THREE() {
    return THREE;
  }

  /**
   * Get the scene
   */
  get scene() {
    return this._scene;
  }

  /**
   * Get the camera
   */
  get camera() {
    return this._camera;
  }

  /**
   * Get the renderer
   */
  get renderer() {
    return this._renderer;
  }

  /**
   * Add callback to be called each frame
   * @param {Function} callback - (deltaTime) => void
   */
  addRenderCallback(callback) {
    this._renderCallbacks.push(callback);
  }

  /**
   * Remove render callback
   * @param {Function} callback
   */
  removeRenderCallback(callback) {
    const idx = this._renderCallbacks.indexOf(callback);
    if (idx !== -1) {
      this._renderCallbacks.splice(idx, 1);
    }
  }

  /**
   * Start render loop
   */
  startRenderLoop() {
    if (this._animationId) return;
    
    let lastTime = performance.now();
    
    const animate = (time) => {
      this._animationId = requestAnimationFrame(animate);
      
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      
      // Call render callbacks
      for (const cb of this._renderCallbacks) {
        cb(dt);
      }
      
      // Render with post-processing
      if (this._composer) {
        this._composer.render();
      } else {
        this._renderer.render(this._scene, this._camera);
      }
    };
    
    this._animationId = requestAnimationFrame(animate);
    log.debug('Render loop started');
  }

  /**
   * Stop render loop
   */
  stopRenderLoop() {
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
    log.debug('Render loop stopped');
  }

  /**
   * Add object to scene
   * @param {Object3D} object
   */
  add(object) {
    this._scene.add(object);
  }

  /**
   * Remove object from scene
   * @param {Object3D} object
   */
  remove(object) {
    this._scene.remove(object);
  }

  /**
   * Set fog intensity (for fog powerdown effect)
   * @param {boolean} intense - If true, fog is closer/denser
   */
  setFogIntense(intense) {
    if (!this._scene || !this._scene.fog) return;
    
    if (intense) {
      // Fog powerdown active - reduce visibility significantly
      this._scene.fog.near = 5;   // Fog starts very close
      this._scene.fog.far = 35;   // Complete fog at 35 units
    } else {
      // Normal fog settings
      this._scene.fog.near = RENDERER.FOG_NEAR;  // 30
      this._scene.fog.far = RENDERER.FOG_FAR;    // 150
    }
    
    log.debug('Fog intensity changed', { intense, near: this._scene.fog.near, far: this._scene.fog.far });
  }

  // ─── Private Methods ───────────────────────────────────────────

  _setupRenderer() {
    // Force layout recalculation to get correct dimensions
    this._container.offsetHeight;
    
    // Get dimensions with fallback to window size
    this._width = this._container.clientWidth || window.innerWidth;
    this._height = this._container.clientHeight || window.innerHeight;
    
    // Ensure we have valid dimensions (mobile sometimes reports 0)
    if (this._width === 0) this._width = window.innerWidth;
    if (this._height === 0) this._height = window.innerHeight;
    
    this._aspectRatio = this._width / this._height;
    
    this._renderer = new THREE.WebGLRenderer({
      antialias: RENDERER.ANTIALIAS,
      alpha: true,
      powerPreference: 'high-performance'
    });
    
    this._renderer.setSize(this._width, this._height);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDERER.MAX_PIXEL_RATIO));
    this._renderer.outputColorSpace = THREE.SRGBColorSpace;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.2;
    
    // Ensure canvas has proper styles for mobile
    this._renderer.domElement.style.cssText = `
      display: block;
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 1;
      touch-action: manipulation;
    `;
    
    this._container.appendChild(this._renderer.domElement);
    
    log.info('Renderer created', { 
      width: this._width, 
      height: this._height,
      containerWidth: this._container.clientWidth,
      containerHeight: this._container.clientHeight,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      pixelRatio: this._renderer.getPixelRatio()
    });
  }

  _setupScene() {
    this._scene = new THREE.Scene();
    
    // Dark background
    const bgColor = new THREE.Color(COLORS.BACKGROUND);
    this._scene.background = bgColor;
    
    // Fog for depth
    this._scene.fog = new THREE.Fog(
      bgColor,
      RENDERER.FOG_NEAR,
      RENDERER.FOG_FAR
    );
    
    log.debug('Scene created with fog');
  }

  _setupCamera() {
    this._camera = new THREE.PerspectiveCamera(
      RENDERER.FOV,
      this._aspectRatio,
      RENDERER.NEAR,
      RENDERER.FAR
    );
    
    // Position camera behind and above the player
    this._camera.position.set(0, RENDERER.CAMERA_HEIGHT, RENDERER.CAMERA_DISTANCE);
    this._camera.lookAt(0, 0, -10);
    
    log.debug('Camera created', { 
      position: this._camera.position,
      fov: RENDERER.FOV
    });
  }

  _setupLights() {
    // Ambient light (teal tint)
    const ambientColor = new THREE.Color(COLORS.PRIMARY);
    const ambient = new THREE.AmbientLight(ambientColor, 0.4);
    this._scene.add(ambient);
    
    // Main directional light
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 10, 5);
    directional.castShadow = false; // Shadows disabled for performance
    this._scene.add(directional);
    
    // Accent point light (purple)
    const accent = new THREE.PointLight(new THREE.Color(COLORS.ACCENT), 0.5, 50);
    accent.position.set(-5, 5, -10);
    this._scene.add(accent);
    
    // Front light for player visibility
    const frontLight = new THREE.PointLight(new THREE.Color(COLORS.PRIMARY), 0.3, 30);
    frontLight.position.set(0, 3, 5);
    this._scene.add(frontLight);
    
    log.debug('Lights added');
  }

  _setupPostProcessing() {
    if (!RENDERER.BLOOM_ENABLED) return;
    
    try {
      this._composer = new EffectComposer(this._renderer);
      
      const renderPass = new RenderPass(this._scene, this._camera);
      this._composer.addPass(renderPass);
      
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(this._width, this._height),
        RENDERER.BLOOM_STRENGTH,
        RENDERER.BLOOM_RADIUS,
        RENDERER.BLOOM_THRESHOLD
      );
      this._composer.addPass(bloomPass);
      
      log.debug('Post-processing enabled');
    } catch (e) {
      log.warn('Post-processing setup failed', e);
      this._composer = null;
    }
  }

  _setupResizeHandler() {
    let resizeTimeout = null;
    
    const onResize = () => {
      // Force layout recalculation
      this._container.offsetHeight;
      
      this._width = this._container.clientWidth || window.innerWidth;
      this._height = this._container.clientHeight || window.innerHeight;
      
      // Ensure valid dimensions
      if (this._width === 0) this._width = window.innerWidth;
      if (this._height === 0) this._height = window.innerHeight;
      
      this._aspectRatio = this._width / this._height;
      
      // Adjust FOV for portrait mode to maintain playable view
      const isPortrait = this._aspectRatio < 1;
      const baseFov = RENDERER.FOV;
      // Widen FOV in portrait to see lanes, narrow in landscape
      this._camera.fov = isPortrait ? baseFov * 1.2 : baseFov;
      this._camera.aspect = this._aspectRatio;
      this._camera.updateProjectionMatrix();
      
      this._renderer.setSize(this._width, this._height);
      
      if (this._composer) {
        this._composer.setSize(this._width, this._height);
      }
      
      log.debug('Resized', { 
        width: this._width, 
        height: this._height, 
        isPortrait,
        fov: this._camera.fov
      });
    };
    
    // Debounced resize for performance
    this._resizeHandler = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(onResize, 50);
    };
    
    // Handle orientation change on mobile with multiple retries
    this._orientationHandler = () => {
      setTimeout(onResize, 50);
      setTimeout(onResize, 150);
      setTimeout(onResize, 300);
    };
    
    window.addEventListener('resize', this._resizeHandler);
    window.addEventListener('orientationchange', this._orientationHandler);
    
    // Also listen for visualViewport resize (better on some mobile browsers)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', this._resizeHandler);
    }
  }

  /**
   * Create a glowing material
   * @param {number|string} color - Base color
   * @param {number} emissiveIntensity - Glow intensity
   */
  createGlowMaterial(color, emissiveIntensity = 0.5) {
    const c = new THREE.Color(color);
    return new THREE.MeshStandardMaterial({
      color: c,
      emissive: c,
      emissiveIntensity,
      metalness: 0.5,
      roughness: 0.3
    });
  }

  /**
   * Create a wireframe material
   * @param {number|string} color
   */
  createWireframeMaterial(color) {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });
  }

  /**
   * Clean up - FIXED: comprehensive disposal to prevent memory leaks
   */
  destroy() {
    this.stopRenderLoop();
    
    // Remove event listeners
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', this._resizeHandler);
      }
    }
    if (this._orientationHandler) {
      window.removeEventListener('orientationchange', this._orientationHandler);
    }
    
    // Dispose scene objects with full texture cleanup
    if (this._scene) {
      this._scene.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          this._disposeMaterial(object.material);
        }
      });
      this._scene.clear();
    }
    
    // Dispose post-processing with full render target cleanup
    if (this._composer) {
      // Dispose each pass and its internal render targets
      for (const pass of this._composer.passes) {
        if (pass.dispose) pass.dispose();
        // UnrealBloomPass has internal render targets
        if (pass.renderTargetBright) {
          pass.renderTargetBright.dispose();
        }
        if (pass.renderTargetsHorizontal) {
          for (const rt of pass.renderTargetsHorizontal) rt.dispose();
        }
        if (pass.renderTargetsVertical) {
          for (const rt of pass.renderTargetsVertical) rt.dispose();
        }
        // Dispose any textures in pass materials
        if (pass.materialCopy) pass.materialCopy.dispose();
        if (pass.materialHighPassFilter) pass.materialHighPassFilter.dispose();
        if (pass.compositeMaterial) pass.compositeMaterial.dispose();
        if (pass.separableBlurMaterials) {
          for (const mat of pass.separableBlurMaterials) mat.dispose();
        }
      }
      // Dispose composer's own render targets
      if (this._composer.renderTarget1) this._composer.renderTarget1.dispose();
      if (this._composer.renderTarget2) this._composer.renderTarget2.dispose();
      this._composer.dispose();
      this._composer = null;
    }
    
    // Dispose renderer and force WebGL context loss
    if (this._renderer) {
      this._renderer.dispose();
      this._renderer.forceContextLoss();
      
      // Remove canvas from DOM
      if (this._renderer.domElement?.parentNode) {
        this._renderer.domElement.parentNode.removeChild(this._renderer.domElement);
      }
      this._renderer = null;
    }
    
    this._scene = null;
    this._camera = null;
    this._renderCallbacks = [];
    this._resizeHandler = null;
    this._orientationHandler = null;
    this._initialized = false;
    
    log.info('SceneManager destroyed with full WebGL cleanup');
  }

  /**
   * Dispose material and all its textures
   * @param {Material|Material[]} material
   */
  _disposeMaterial(material) {
    if (!material) return;
    
    if (Array.isArray(material)) {
      material.forEach(m => this._disposeMaterial(m));
      return;
    }
    
    // Dispose all possible texture maps
    const textureProps = [
      'map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap',
      'envMap', 'emissiveMap', 'alphaMap', 'aoMap', 'displacementMap',
      'metalnessMap', 'roughnessMap', 'gradientMap'
    ];
    
    for (const prop of textureProps) {
      if (material[prop]) {
        material[prop].dispose();
      }
    }
    
    material.dispose();
  }
}

export default SceneManager;
