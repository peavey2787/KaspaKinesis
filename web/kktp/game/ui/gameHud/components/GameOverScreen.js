/**
 * GameOverScreen.js - Game over display with stats and actions
 */

import { COLORS } from "../../../core/Constants.js";
import { createGameOverButton } from "../utils/buttonFactory.js";
import { injectAnchorSpinnerAnimation } from "../utils/styleInjector.js";
import { HUDEvent, HUD_STYLES } from "../constants.js";
import { Logger } from "../../../core/Logger.js";

const log = Logger.create("GameOverScreen");

export class GameOverScreen {
  constructor() {
    this._element = null;
    this._anchorStatusContainer = null;
    this._lastAnchorTxId = null;
    this._onEvent = null;
  }

  /**
   * Set event callback
   * @param {Function} callback
   */
  setEventCallback(callback) {
    this._onEvent = callback;
  }

  /**
   * Show game over screen
   * @param {HTMLElement} parent
   * @param {Object} options
   */
  show(parent, options = {}) {
    const {
      reason,
      results = {},
      anchorTxId = null,
      isAnchoring = false,
      isVictory = false,
      isMultiplayer = false,
      endContext = "neutral",
    } = options;

    this._lastAnchorTxId = anchorTxId;
    this._isMultiplayer = isMultiplayer;

    const isLoss = endContext === "local";
    const title = isVictory ? "🏆 VICTORY!" : isLoss ? "YOU LOST" : "GAME OVER";
    const subtitle = this._getSubtitle(reason, endContext);

    this._element = document.createElement("div");
    this._element.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(10, 10, 20, 0.9);
      z-index: ${HUD_STYLES.Z_INDEX.GAME_OVER};
      pointer-events: auto;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    this._createTitle(title, isVictory, isLoss);
    this._createSubtitle(subtitle);
    this._createStats(results);
    this._createButtons(isAnchoring, anchorTxId, isMultiplayer);

    parent.appendChild(this._element);

    requestAnimationFrame(() => {
      this._element.style.opacity = "1";
    });

    log.info("Game over screen shown", { reason });
  }

  _getSubtitle(reason, endContext) {
    if (endContext === "opponent") {
      return "Opponent ran out of coins!";
    }

    switch (reason) {
      case "coins_depleted":
        return "Ran out of coins!";
      case "completed":
      case "daa_complete":
        return "Race Complete!";
      case "forfeit":
        return "Match ended.";
      default:
        return "";
    }
  }

  _createTitle(title, isVictory, isLoss) {
    const titleEl = document.createElement("div");
    titleEl.textContent = title;
    const titleColor = isVictory ? "#ffd700" : isLoss ? "#ff4757" : "#00d9ff";
    const titleGlow = isVictory ? "rgba(255, 215, 0, 0.5)" : isLoss ? "rgba(255, 71, 87, 0.5)" : "rgba(0, 217, 255, 0.5)";
    titleEl.style.cssText = `
      font-size: clamp(2rem, 10vw, 3rem);
      font-weight: bold;
      color: ${titleColor};
      text-shadow: 0 0 20px ${titleGlow};
      margin-bottom: 10px;
      animation: game-over-pulse 2s ease-in-out infinite;
      text-align: center;
    `;
    this._element.appendChild(titleEl);
  }

  _createSubtitle(subtitle) {
    if (!subtitle) return;

    const subtitleEl = document.createElement("div");
    subtitleEl.textContent = subtitle;
    subtitleEl.style.cssText = `
      font-size: clamp(0.9rem, 4vw, 1.25rem);
      color: #888;
      margin-bottom: 20px;
      text-align: center;
    `;
    this._element.appendChild(subtitleEl);
  }

  _createStats(results) {
    const statsEl = document.createElement("div");
    statsEl.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: clamp(15px, 5vw, 40px);
      margin-bottom: clamp(20px, 5vw, 40px);
      padding: 0 10px;
    `;

    const coins = results.coins ?? 0;
    const progress = Math.floor((results.progress ?? 0) * 100);
    const raceTime = results.raceTimeFormatted ?? "0:00.00";

    statsEl.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: clamp(1.5rem, 6vw, 2rem); color: #ffd700;">🪙 ${coins}</div>
        <div style="font-size: clamp(0.65rem, 2.5vw, 0.75rem); color: #888;">COINS</div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: clamp(1.5rem, 6vw, 2rem); color: #00d9ff;">${progress}%</div>
        <div style="font-size: clamp(0.65rem, 2.5vw, 0.75rem); color: #888;">PROGRESS</div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: clamp(1.5rem, 6vw, 2rem); color: #00ff88;">⏱️ ${raceTime}</div>
        <div style="font-size: clamp(0.65rem, 2.5vw, 0.75rem); color: #888;">RACE TIME</div>
      </div>
    `;
    this._element.appendChild(statsEl);
  }

  _createButtons(isAnchoring, anchorTxId, isMultiplayer = false) {
    const buttonsEl = document.createElement("div");
    buttonsEl.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: min(90%, 280px);
    `;

    if (isMultiplayer) {
      // Multiplayer: show "Back to Lobby" instead of Try Again / Main Menu
      const lobbyBtn = createGameOverButton("Back to Lobby", "#00d9ff");
      lobbyBtn.onclick = () => {
        this.hide();
        this._onEvent?.(HUDEvent.RETRY);
      };
      buttonsEl.appendChild(lobbyBtn);
    } else {
      // Single player: Try Again + Main Menu
      const retryBtn = createGameOverButton("Try Again", "#00d9ff");
      retryBtn.onclick = () => {
        this.hide();
        this._onEvent?.(HUDEvent.RETRY);
      };
      buttonsEl.appendChild(retryBtn);

      const menuBtn = createGameOverButton("Main Menu", "#9945ff");
      menuBtn.onclick = () => {
        this.hide();
        this._onEvent?.(HUDEvent.MAIN_MENU);
      };
      buttonsEl.appendChild(menuBtn);
    }

    // Audit button
    const auditBtn = createGameOverButton("Audit for Cheating", "#ff8800");
    auditBtn.onclick = () => {
      this._onEvent?.(HUDEvent.AUDIT);
    };
    buttonsEl.appendChild(auditBtn);

    // Anchor status container
    this._anchorStatusContainer = document.createElement("div");
    this._anchorStatusContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      min-height: 50px;
    `;

    if (isAnchoring) {
      this._showAnchoringSpinner();
    } else if (anchorTxId) {
      this._showExplorerButton(anchorTxId);
    }

    buttonsEl.appendChild(this._anchorStatusContainer);
    this._element.appendChild(buttonsEl);
  }

  _showAnchoringSpinner() {
    injectAnchorSpinnerAnimation();
    this._anchorStatusContainer.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; color: #888;">
        <div class="ks-anchor-spinner" style="
          width: 20px;
          height: 20px;
          border: 2px solid #333;
          border-top-color: #49eacb;
          border-radius: 50%;
          animation: ks-spin 1s linear infinite;
        "></div>
        <span>Anchoring to blockchain...</span>
      </div>
    `;
  }

  _showExplorerButton(txId) {
    const explorerBtn = createGameOverButton("🔗 View on Explorer", "#49eacb");
    explorerBtn.onclick = () => {
      const explorerUrl = `https://explorer-tn10.kaspa.org/txs/${txId}`;
      window.open(explorerUrl, "_blank", "noopener,noreferrer");
    };
    this._anchorStatusContainer.appendChild(explorerBtn);
  }

  /**
   * Update anchor status
   * @param {Object} status
   */
  updateAnchorStatus(status) {
    if (!this._anchorStatusContainer) return;

    const { success, txId, error } = status;

    this._anchorStatusContainer.innerHTML = "";

    if (success && txId) {
      this._lastAnchorTxId = txId;
      this._showExplorerButton(txId);
      log.info("Anchor status updated: success", { txId });
    } else {
      const errorMsg = document.createElement("div");
      errorMsg.style.cssText = `
        color: #ff4757;
        font-size: 12px;
        text-align: center;
      `;
      errorMsg.textContent = error || "Anchor not recorded";
      this._anchorStatusContainer.appendChild(errorMsg);
      log.warn("Anchor status updated: failed", { error });
    }
  }

  /**
   * Add explorer button (after successful retry)
   * @param {string} txId
   */
  addExplorerButton(txId) {
    if (!this._element) return;

    const buttonsContainer = this._element.querySelector("div:last-child");
    if (!buttonsContainer) return;

    if (buttonsContainer.querySelector("[data-explorer-btn]")) return;

    const explorerBtn = createGameOverButton("🔗 View on Explorer", "#49eacb");
    explorerBtn.setAttribute("data-explorer-btn", "true");
    explorerBtn.onclick = () => {
      const explorerUrl = `https://explorer-tn10.kaspa.org/txs/${txId}`;
      window.open(explorerUrl, "_blank", "noopener,noreferrer");
    };
    buttonsContainer.appendChild(explorerBtn);
  }

  /**
   * Hide game over screen
   */
  hide() {
    if (!this._element) return;

    this._element.style.opacity = "0";
    setTimeout(() => {
      this._element?.remove();
      this._element = null;
      this._anchorStatusContainer = null;
    }, 300);
  }

  get lastAnchorTxId() {
    return this._lastAnchorTxId;
  }

  set lastAnchorTxId(value) {
    this._lastAnchorTxId = value;
  }

  destroy() {
    this._element?.remove();
    this._element = null;
    this._anchorStatusContainer = null;
    this._onEvent = null;
  }
}
