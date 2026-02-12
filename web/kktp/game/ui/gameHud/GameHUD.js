/**
 * GameHUD.js - Main HUD orchestrator (refactored)
 *
 * This is now a thin coordination layer that delegates to specialized components.
 */

import { EventEmitter } from "../../core/EventEmitter.js";
import { Logger } from "../../core/Logger.js";
import { HUDEvent, HUD_STYLES } from "./constants.js";

// Components
import { TopBar } from "./components/TopBar.js";
import { ProgressBar } from "./components/ProgressBar.js";
import { PowerupIndicator } from "./components/PowerupIndicator.js";
import { SpeedDisplay } from "./components/SpeedDisplay.js";
import { TouchHint } from "./components/TouchHint.js";
import { CountdownOverlay } from "./components/CountdownOverlay.js";
import { PreparingOverlay } from "./components/PreparingOverlay.js";
import { PauseMenu } from "./components/PauseMenu.js";
import { GameOverScreen } from "./components/GameOverScreen.js";
import { StandingsBar } from "./components/StandingsBar.js";

// Effects
import { CollectionEffect } from "./effects/CollectionEffect.js";

// Notifications
import { ToastManager } from "./notifications/ToastManager.js";
import { UtxoNotification } from "./notifications/UtxoNotification.js";
import { TestModeWarning } from "./notifications/TestModeWarning.js";

// Modals
import { AnchorRetryModal } from "./modals/AnchorRetryModal.js";

// Utils
import { injectHudStyles } from "./utils/styleInjector.js";

const log = Logger.create("GameHUD");

export { HUDEvent };

export class GameHUD extends EventEmitter {
  constructor(container) {
    super();

    this._container = container;
    this._element = null;
    this._visible = false;

    // Components
    this._topBar = new TopBar();
    this._progressBar = new ProgressBar();
    this._powerupIndicator = new PowerupIndicator();
    this._speedDisplay = new SpeedDisplay();
    this._touchHint = null;
    this._countdownOverlay = new CountdownOverlay();
    this._preparingOverlay = new PreparingOverlay();
    this._pauseMenu = new PauseMenu();
    this._gameOverScreen = new GameOverScreen();
    this._standingsBar = new StandingsBar();

    // Notifications
    this._utxoNotification = new UtxoNotification();
    this._testModeWarning = new TestModeWarning();

    // Modals
    this._anchorRetryModal = new AnchorRetryModal();

    // Set up event callbacks
    this._setupEventCallbacks();
  }

  _setupEventCallbacks() {
    const emitEvent = (event) => this.emit(event);

    this._pauseMenu.setEventCallback(emitEvent);
    this._gameOverScreen.setEventCallback(emitEvent);
    this._anchorRetryModal.setSuccessCallback((txId) => {
      this._gameOverScreen.lastAnchorTxId = txId;
      this._gameOverScreen.addExplorerButton(txId);
    });
  }

  /**
   * Show the HUD
   * @param {Object} options
   * @param {boolean} options.isMultiplayer
   * @param {boolean} options.showTouchControls
   */
  show(options = {}) {
    if (this._visible) return;

    this._createElement(options);
    this._container.appendChild(this._element);
    this._visible = true;

    requestAnimationFrame(() => {
      this._element.style.opacity = "1";
    });

    log.info("HUD shown");
  }

  /**
   * Hide the HUD
   */
  hide() {
    if (!this._visible || !this._element) return;

    this._element.style.opacity = "0";

    setTimeout(() => {
      if (this._element?.parentNode) {
        this._element.parentNode.removeChild(this._element);
      }
      this._element = null;
      this._visible = false;
    }, 300);

    log.info("HUD hidden");
  }

  _createElement(options) {
    this._element = document.createElement("div");
    this._element.className = "ks-game-hud";
    this._element.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: ${HUD_STYLES.Z_INDEX.HUD};
      opacity: 0;
      transition: opacity ${HUD_STYLES.TRANSITION_MEDIUM};
      font-family: ${HUD_STYLES.FONT_FAMILY};
    `;

    // Add components
    this._element.appendChild(this._topBar.create());

    const { progressBar, timerContainer } = this._progressBar.create(options.isMultiplayer);
    this._element.appendChild(progressBar);
    this._element.appendChild(timerContainer);

    if (options.isMultiplayer) {
      this._element.appendChild(this._standingsBar.create());
    }

    const powerupEl = this._powerupIndicator.create();
    this._powerupIndicator.setParent(this._element);
    this._element.appendChild(powerupEl);

    this._element.appendChild(this._speedDisplay.create());

    if (options.showTouchControls) {
      this._touchHint = new TouchHint();
      this._element.appendChild(this._touchHint.create());
    }

    this._element.appendChild(this._countdownOverlay.create());

    injectHudStyles();
  }

  // ─── Delegate Methods ──────────────────────────────────────────

  updateCoins(coins) {
    this._topBar.updateCoins(coins);
  }

  updateRaceTime(formattedTime) {
    this._progressBar.updateRaceTime(formattedTime);
  }

  updateProgress(progress, blocksRemaining) {
    this._progressBar.updateProgress(progress, blocksRemaining);
  }

  updateOpponentProgress(progress) {
    this._progressBar.updateOpponentProgress(progress);
  }

  updateStandings(data) {
    this._standingsBar?.update(data);
  }

  updateIntegrityState(stateInfo) {
    this._topBar.updateIntegrityState(stateInfo);
  }

  showPowerup(powerup) {
    this._powerupIndicator.show(powerup);
  }

  updateSpeed(speed) {
    this._speedDisplay.update(speed);
  }

  showCountdown(value, progress = 0) {
    this._countdownOverlay.show(value, progress);
  }

  showCollectionEffect(options = {}) {
    CollectionEffect.show(this._element, options);
  }

  // ─── Overlays ──────────────────────────────────────────────────

  showPreparingGame(options = {}) {
    if (this._element) {
      this._preparingOverlay.show(this._element, options);
      log.debug("Preparing game overlay shown");
    }
  }

  hidePreparingGame() {
    this._preparingOverlay.hide();
    log.debug("Preparing game overlay hidden");
  }

  showPauseMenu() {
    if (this._element) {
      this._pauseMenu.show(this._element);
    }
  }

  hidePauseMenu() {
    this._pauseMenu.hide();
  }

  get isPaused() {
    return this._pauseMenu.isVisible;
  }

  // ─── Game Over ─────────────────────────────────────────────────

  showGameOver(options = {}) {
    if (this._element) {
      this._gameOverScreen.show(this._element, options);
    }
  }

  hideGameOver() {
    this._gameOverScreen.hide();
  }

  updateAnchorStatus(status) {
    this._gameOverScreen.updateAnchorStatus(status);
  }

  // ─── Notifications ─────────────────────────────────────────────

  showUtxoRefresh() {
    this._utxoNotification.show(this._element);
  }

  hideUtxoRefresh() {
    this._utxoNotification.hide();
  }

  showTestModeWarning() {
    this._testModeWarning.show(this._element);
  }

  hideTestModeWarning() {
    this._testModeWarning.hide();
  }

  showToast(message, type = "info") {
    ToastManager.show(message, type);
  }

  // ─── Modals ────────────────────────────────────────────────────

  showAnchorRetryModal(options = {}) {
    this._anchorRetryModal.show(options);
  }

  hideAnchorRetryModal() {
    this._anchorRetryModal.hide();
  }

  // ─── Cleanup ───────────────────────────────────────────────────

  destroy() {
    this.hide();

    // Destroy all components
    this._topBar.destroy();
    this._progressBar.destroy();
    this._standingsBar.destroy();
    this._powerupIndicator.destroy();
    this._speedDisplay.destroy();
    this._touchHint?.destroy();
    this._countdownOverlay.destroy();
    this._preparingOverlay.destroy();
    this._pauseMenu.destroy();
    this._gameOverScreen.destroy();
    this._utxoNotification.destroy();
    this._testModeWarning.destroy();
    this._anchorRetryModal.destroy();

    this.removeAllListeners();
    log.info("GameHUD destroyed");
  }
}

export default GameHUD;
