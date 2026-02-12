/**
 * TopBar.js - Top bar with coins and integrity shield
 */

import { COLORS } from "../../../core/Constants.js";
import { IntegrityState } from "../../../integrity/IntegrityMonitor.js";
import { HUD_LAYOUT } from "../constants.js";

export class TopBar {
  constructor() {
    this._element = null;
    this._coinDisplay = null;
    this._shieldIcon = null;
  }

  /**
   * Create and return the top bar element
   * @returns {HTMLElement}
   */
  create() {
    this._element = document.createElement("div");
    this._element.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: ${HUD_LAYOUT.TOP_BAR_HEIGHT}px;
      pointer-events: none;
      background: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%);
    `;

    this._createCoinDisplay();
    this._createShieldDisplay();

    return this._element;
  }

  _createCoinDisplay() {
    const coinContainer = document.createElement("div");
    coinContainer.style.cssText = `
      position: absolute;
      top: ${HUD_LAYOUT.COINS_TOP}px;
      left: ${HUD_LAYOUT.COINS_LEFT}px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 8px 12px;
      background: rgba(10, 10, 20, 0.7);
      border: 1px solid ${COLORS.UI_BORDER};
      border-radius: 8px;
      pointer-events: none;
    `;

    const coinIcon = document.createElement("span");
    coinIcon.textContent = "◆";
    coinIcon.style.cssText = `
      color: ${COLORS.COIN};
      font-size: 1.5rem;
      text-shadow: 0 0 10px ${COLORS.COIN};
    `;
    coinContainer.appendChild(coinIcon);

    this._coinDisplay = document.createElement("span");
    this._coinDisplay.textContent = "0";
    this._coinDisplay.style.cssText = `
      color: ${COLORS.TEXT};
      font-size: 1.25rem;
      font-weight: bold;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    `;
    coinContainer.appendChild(this._coinDisplay);

    this._element.appendChild(coinContainer);
  }

  _createShieldDisplay() {
    const shieldContainer = document.createElement("div");
    shieldContainer.style.cssText = `
      position: absolute;
      top: ${HUD_LAYOUT.PADDING}px;
      right: ${HUD_LAYOUT.PADDING}px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      pointer-events: auto;
    `;

    this._shieldIcon = document.createElement("span");
    this._shieldIcon.textContent = "🛡️";
    this._shieldIcon.style.cssText = `
      font-size: 1.5rem;
      color: ${COLORS.INTEGRITY_GREEN};
      transition: color 0.3s ease;
      cursor: help;
    `;
    this._shieldIcon.title = "Game integrity: OK";
    shieldContainer.appendChild(this._shieldIcon);

    this._element.appendChild(shieldContainer);
  }

  /**
   * Update coin display
   * @param {number} coins
   */
  updateCoins(coins) {
    if (this._coinDisplay) {
      this._coinDisplay.textContent = coins.toLocaleString();
    }
  }

  /**
   * Update integrity shield state
   * @param {Object} stateInfo - From IntegrityMonitor.getStateInfo()
   */
  updateIntegrityState(stateInfo) {
    if (!this._shieldIcon) return;

    this._shieldIcon.style.color = stateInfo.color;

    if (stateInfo.isFlashing) {
      this._shieldIcon.style.animation = "shield-flash 0.3s infinite";
    } else {
      this._shieldIcon.style.animation = "none";
    }

    this._shieldIcon.title = this._getIntegrityTooltip(stateInfo);
  }

  _getIntegrityTooltip(stateInfo) {
    switch (stateInfo.state) {
      case IntegrityState.GREEN:
        return "Game integrity: OK";
      case IntegrityState.ORANGE:
        const secs = Math.floor(stateInfo.timeSinceOpponentMove / 1000);
        return `Waiting for opponent (${secs}s)...`;
      case IntegrityState.RED:
        return "Cheat detected! Game ending...";
      case IntegrityState.FORFEIT:
        return "Game forfeited";
      default:
        return "Checking integrity...";
    }
  }

  destroy() {
    this._element?.remove();
    this._element = null;
    this._coinDisplay = null;
    this._shieldIcon = null;
  }
}
