/**
 * RenderPresenter.js - Encapsulates all Three.js/WebGL rendering logic
 * 
 * Responsibilities:
 * - Subscribe to SceneManager render callback
 * - Listen to GameEngine state and update visuals
 * - Update PlayerModel (lane, jump, duck)
 * - Update TrackGenerator (scrolling)
 * - Update ObstacleFactory (entity sync)
 * 
 * This completely decouples the Facade from Three.js knowledge.
 * The Facade no longer knows about lanes, jumpY, or track speed.
 */

import { EventEmitter } from '../../core/EventEmitter.js';
import { Logger } from '../../core/Logger.js';
import { GameState } from '../../engine/GameEngine.js';

const log = Logger.create('RenderPresenter');

/**
 * RenderPresenter events
 */
export const RenderPresenterEvent = Object.freeze({
  FRAME_RENDERED: 'frameRendered',
});

export class RenderPresenter extends EventEmitter {
  constructor() {
    super();

    // Dependencies (injected)
    this._sceneManager = null;
    this._gameEngine = null;
    this._playerModel = null;
    this._trackGenerator = null;
    this._obstacleFactory = null;

    // Bound callback
    this._onFrame = this._onFrame.bind(this);

    // State
    this._active = false;
    this._fogActive = false; // Track fog powerdown state
  }

  /**
   * Inject dependencies
   * @param {Object} deps
   */
  setDependencies(deps) {
    this._sceneManager = deps.sceneManager ?? this._sceneManager;
    this._gameEngine = deps.gameEngine ?? this._gameEngine;
    this._playerModel = deps.playerModel ?? this._playerModel;
    this._trackGenerator = deps.trackGenerator ?? this._trackGenerator;
    this._obstacleFactory = deps.obstacleFactory ?? this._obstacleFactory;
  }

  /**
   * Initialize and register render callback
   */
  init() {
    if (!this._sceneManager) {
      log.error('SceneManager not set');
      return;
    }

    this._sceneManager.addRenderCallback(this._onFrame);
    this._active = true;
    log.info('RenderPresenter initialized');
  }

  /**
   * Reset all render objects to initial state
   */
  reset() {
    this._playerModel?.reset();
    this._trackGenerator?.reset();
    this._obstacleFactory?.clearAll();
    this.hideCelebration();
    log.debug('Render objects reset');
  }

  /**
   * Start the render loop
   */
  start() {
    this._sceneManager?.startRenderLoop();
  }

  /**
   * Stop the render loop
   */
  stop() {
    this._sceneManager?.stopRenderLoop();
  }

  /**
   * Clear all obstacles/coins from scene
   */
  clearEntities() {
    this._obstacleFactory?.clearAll();
  }

  /**
   * Destroy presenter and cleanup
   */
  destroy() {
    if (this._sceneManager && this._active) {
      this._sceneManager.removeRenderCallback(this._onFrame);
    }
    this._active = false;
    this.removeAllListeners();
    log.info('RenderPresenter destroyed');
  }

  // ─── Private: Render Loop ──────────────────────────────────────

  /**
   * Frame callback - updates all render objects based on GameEngine state
   * @param {number} dt - Delta time in seconds
   * @private
   */
  _onFrame(dt) {
    if (!this._gameEngine) return;

    const state = this._gameEngine.state;

    // Only render during active game states
    if (state !== GameState.RUNNING && state !== GameState.COUNTDOWN) {
      return;
    }

    // Update player model from engine state
    this._updatePlayer(dt);

    // Update track scrolling
    this._updateTrack(dt, state);

    // Sync obstacles/coins/powerups
    this._updateEntities();
    
    // Check for finish line display
    this._updateFinishLine();
    
    // Update fog effect based on active powerdown
    this._updateFogEffect();

    this.emit(RenderPresenterEvent.FRAME_RENDERED, { dt });
  }

  /**
   * Update player model visuals
   * @param {number} dt
   * @private
   */
  _updatePlayer(dt) {
    if (!this._playerModel || !this._gameEngine) return;

    // Map engine state to player model
    this._playerModel.setLane(this._gameEngine.playerLane);
    this._playerModel.setJumpY(this._gameEngine.playerY);
    this._playerModel.setDucking(this._gameEngine.isDucking);
    this._playerModel.update(dt);
  }

  /**
   * Update track scrolling
   * @param {number} dt
   * @param {string} state
   * @private
   */
  _updateTrack(dt, state) {
    if (!this._trackGenerator || !this._gameEngine) return;

    // Only scroll during running state
    const speed = state === GameState.RUNNING ? this._gameEngine.speed : 0;
    this._trackGenerator.update(speed, dt);
  }

  /**
   * Sync obstacle/coin/powerup entities to 3D meshes
   * @private
   */
  _updateEntities() {
    if (!this._obstacleFactory || !this._gameEngine) return;

    this._obstacleFactory.updateEntities(this._gameEngine.entities);
  }
  
  /**
   * Update finish line visibility based on progress
   * @private
   */
  _updateFinishLine() {
    if (!this._trackGenerator || !this._gameEngine) return;
    
    const progress = this._gameEngine.progress;
    this._trackGenerator.showFinishLine(progress);
  }
  
  /**
   * Update fog effect based on fog powerdown
   * @private
   */
  _updateFogEffect() {
    if (!this._sceneManager || !this._gameEngine) return;
    
    const activePowerup = this._gameEngine.activePowerup;
    const isFogActive = activePowerup?.type?.id === 'fog';
    
    // Only update if state changed
    if (isFogActive !== this._fogActive) {
      this._fogActive = isFogActive;
      this._sceneManager.setFogIntense(isFogActive);
    }
  }
  
  /**
   * Show victory celebration (confetti + trophy)
   * Called when player completes the race
   */
  showCelebration() {
    this._trackGenerator?.showCelebration();
  }
  
  /**
   * Hide celebration
   */
  hideCelebration() {
    this._trackGenerator?.hideCelebration();
  }
}

export default RenderPresenter;
