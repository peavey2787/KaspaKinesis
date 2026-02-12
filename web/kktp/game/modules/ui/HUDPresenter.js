/**
 * HUDPresenter.js - Bridge between game state and GameHUD
 * 
 * Responsibilities:
 * - Update HUD with coin counts
 * - Update progress bar
 * - Show countdown
 * - Show powerups
 * - Update integrity shield
 * - Handle game over display
 * - Manage globalState for GAME screen
 * 
 * This keeps DOM manipulation separate from WebGL rendering.
 */

import { EventEmitter } from '../../core/EventEmitter.js';
import { Logger } from '../../core/Logger.js';
import { GAME } from '../../core/Constants.js';
import { globalState, UIState } from '../../core/StateManager.js';
import { GameHUD, HUDEvent } from '../../ui/GameHUD.js';
import { AuditView, AuditEvent } from '../../ui/AuditView.js';

const log = Logger.create('HUDPresenter');

/**
 * HUD presenter events
 */
export const HUDPresenterEvent = Object.freeze({
  PAUSE_REQUESTED: 'pauseRequested',
  RESUME_REQUESTED: 'resumeRequested',
  QUIT_REQUESTED: 'quitRequested',
  RETRY_REQUESTED: 'retryRequested',
  AUDIT_REQUESTED: 'auditRequested',
  SETTINGS_REQUESTED: 'settingsRequested',
  MAIN_MENU_REQUESTED: 'mainMenuRequested',
});

export class HUDPresenter extends EventEmitter {
  constructor(container) {
    super();
    
    this._container = container;
    this._hud = null;
    this._auditView = null;
    this._walletHUD = null;
    this._visible = false;
  }

  /**
   * Initialize the HUD
   */
  init() {
    this._hud = new GameHUD(this._container);
    this._setupHUDListeners();
    log.info('HUDPresenter initialized');
  }

  /**
   * Set wallet HUD reference for gameplay mode control
   * @param {Object} walletHUD
   */
  setWalletHUD(walletHUD) {
    this._walletHUD = walletHUD;
  }

  /**
   * Show HUD for gameplay
   * @param {Object} options
   */
  show(options = {}) {
    // Update global UI state
    globalState.uiState = UIState.GAME;

    this._hud.show({
      isMultiplayer: options.isMultiplayer ?? false,
      showTouchControls: 'ontouchstart' in window,
    });
    this._visible = true;
    
    // Set wallet HUD to gameplay mode (hide balance, center cog)
    this._walletHUD?.setGameplayMode(true);
  }

  /**
   * Hide HUD
   */
  hide() {
    this._hud.hide();
    this._visible = false;
    
    // Restore wallet HUD to normal mode
    this._walletHUD?.setGameplayMode(false);
  }

  /**
   * Update coin display
   * @param {number} coins
   */
  updateCoins(coins) {
    this._hud?.updateCoins(coins);
  }

  /**
   * Update progress bar
   * @param {number} progress - 0 to 1
   * @param {number} [blocksRemaining]
   */
  updateProgress(progress, blocksRemaining) {
    this._hud?.updateProgress(progress, blocksRemaining);
  }

  /**
   * Update race timer display
   * @param {string} formattedTime - Formatted time string (MM:SS.mm)
   */
  updateRaceTime(formattedTime) {
    this._hud?.updateRaceTime(formattedTime);
  }

  /**
   * Update opponent progress (multiplayer)
   * @param {number} progress - 0 to 1
   */
  updateOpponentProgress(progress) {
    this._hud?.updateOpponentProgress(progress);
  }

  /**
   * Update multiplayer standings list.
   * @param {{players: Array}} data
   */
  updateStandings(data) {
    this._hud?.updateStandings(data);
  }

  /**
   * Update speed display
   * @param {number} speed
   */
  updateSpeed(speed) {
    this._hud?.updateSpeed(speed);
  }

  /**
   * Show countdown
   * @param {number} value - 3, 2, 1, or 0 (GO)
   * @param {number} [progress] - Optional 0-1 progress within current second
   */
  showCountdown(value, progress = 0) {
    this._hud?.showCountdown(value, progress);
  }

  /**
   * Show "Preparing Game" overlay with spinner
   */
  showPreparingGame() {
    this._hud?.showPreparingGame();
  }

  /**
   * Show "Waiting for Sync" overlay when live block hash is unavailable
   */
  showSyncWait() {
    this._hud?.showPreparingGame({
      title: 'Waiting for Sync...',
      subtitle: 'Reconnecting to live block stream',
    });
  }

  /**
   * Hide "Waiting for Sync" overlay
   */
  hideSyncWait() {
    this._hud?.hidePreparingGame();
  }

  /**
   * Hide "Preparing Game" overlay
   */
  hidePreparingGame() {
    this._hud?.hidePreparingGame();
  }

  /**
   * Update integrity shield state
   * @param {Object} stateInfo
   */
  updateIntegrityState(stateInfo) {
    this._hud?.updateIntegrityState(stateInfo);
  }

  /**
   * Show active powerup
   * @param {Object|null} powerup
   */
  showPowerup(powerup) {
    this._hud?.showPowerup(powerup);
  }

  /**
   * Show collection visual effect (floating text)
   * @param {Object} options
   * @param {string} options.type - 'coin', 'powerup', or 'powerdown'
   * @param {number} [options.value] - Value for coins
   * @param {string} [options.name] - Name for powerups
   */
  showCollectionEffect(options) {
    this._hud?.showCollectionEffect(options);
  }

  /**
   * Show game over screen
   * @param {Object} options
   */
  showGameOver(options) {
    this._hud?.showGameOver(options);
    
    // Restore wallet HUD to normal mode on game over
    this._walletHUD?.setGameplayMode(false);
  }

  /**
   * Update anchor status on game over screen
   * Called when background anchoring completes
   * @param {Object} status - {isAnchoring, success, txId, error}
   */
  updateAnchorStatus(status) {
    this._hud?.updateAnchorStatus(status);
  }

  /**
   * Hide game over screen
   */
  hideGameOver() {
    this._hud?.hideGameOver();
  }

  /**
   * Show pause menu
   */
  showPauseMenu() {
    this._hud?.showPauseMenu();
  }

  /**
   * Hide pause menu
   */
  hidePauseMenu() {
    this._hud?.hidePauseMenu();
  }

  /**
   * Show UTXO refresh notification
   */
  showUtxoRefresh() {
    this._hud?.showUtxoRefresh();
  }

  /**
   * Hide UTXO refresh notification
   */
  hideUtxoRefresh() {
    this._hud?.hideUtxoRefresh();
  }

  /**
   * Show test mode warning
   */
  showTestModeWarning() {
    this._hud?.showTestModeWarning();
  }

  /**
   * Hide test mode warning
   */
  hideTestModeWarning() {
    this._hud?.hideTestModeWarning();
  }

  /**
   * Show anchor retry modal
   * @param {Object} options
   */
  showAnchorRetryModal(options) {
    this._hud?.showAnchorRetryModal(options);
  }

  /**
   * Hide anchor retry modal
   */
  hideAnchorRetryModal() {
    this._hud?.hideAnchorRetryModal();
  }

  /**
   * Show toast notification
   * @param {string} message
   * @param {string} type
   */
  showToast(message, type = 'info') {
    this._hud?.showToast(message, type);
  }

  /**
   * Show audit view
   *
   * Shows the on-chain audit interface using kkGameEngine as the
   * single source of truth for all blockchain data.
   *
   * @param {Object} options
   * @param {Object} options.kkGameEngine - KKGameEngine instance (REQUIRED)
   * @param {Object} [options.gameResults] - Final game results
   * @param {string} [options.gameId] - Game identifier
   */
  async showAuditView(options) {
    if (!this._auditView) {
      this._auditView = new AuditView(this._container);
    }

    await this._auditView.show({
      kkGameEngine: options.kkGameEngine,
      gameResults: options.gameResults,
      gameId: options.gameId,
    });

    this._auditView.once(AuditEvent.CLOSE, () => {
      this._auditView.hide();
    });
  }

  /**
   * Destroy presenter
   */
  destroy() {
    this._hud?.destroy();
    this._auditView?.destroy();
    this.removeAllListeners();
    log.info('HUDPresenter destroyed');
  }

  // ─── Private Methods ───────────────────────────────────────────

  _setupHUDListeners() {
    this._hud.on(HUDEvent.PAUSE, () => {
      this.emit(HUDPresenterEvent.PAUSE_REQUESTED);
    });

    this._hud.on(HUDEvent.RESUME, () => {
      this.emit(HUDPresenterEvent.RESUME_REQUESTED);
    });

    this._hud.on(HUDEvent.QUIT, () => {
      this.emit(HUDPresenterEvent.QUIT_REQUESTED);
    });

    this._hud.on(HUDEvent.RETRY, () => {
      this.emit(HUDPresenterEvent.RETRY_REQUESTED);
    });

    this._hud.on(HUDEvent.AUDIT, () => {
      this.emit(HUDPresenterEvent.AUDIT_REQUESTED);
    });

    this._hud.on(HUDEvent.SETTINGS, () => {
      this.emit(HUDPresenterEvent.SETTINGS_REQUESTED);
    });

    this._hud.on(HUDEvent.MAIN_MENU, () => {
      this.emit(HUDPresenterEvent.MAIN_MENU_REQUESTED);
    });
  }
}

export default HUDPresenter;
