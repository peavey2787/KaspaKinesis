/**
 * PowerupIndicator.js - Active powerup display with tips
 */

import { COLORS, POWERUPS } from "../../../core/Constants.js";
import { HUD_LAYOUT, HUD_STYLES } from "../constants.js";

export class PowerupIndicator {
  constructor() {
    this._element = null;
    this._tip = null;
    this._parentElement = null;
  }

  /**
   * Create and return the powerup indicator element
   * @returns {HTMLElement}
   */
  create() {
    this._element = document.createElement("div");
    this._element.style.cssText = `
      position: absolute;
      left: 50%;
      top: ${HUD_LAYOUT.POWERUP_TOP}px;
      transform: translateX(-50%);
      display: none;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: ${COLORS.UI_PANEL}80;
      border: 1px solid ${COLORS.UI_BORDER};
      border-radius: 4px;
    `;

    const icon = document.createElement("span");
    icon.className = "powerup-icon";
    icon.style.fontSize = "1.5rem";
    this._element.appendChild(icon);

    const timer = document.createElement("span");
    timer.className = "powerup-timer";
    timer.style.cssText = `
      color: ${COLORS.TEXT};
      font-size: 1rem;
      font-weight: bold;
    `;
    this._element.appendChild(timer);

    return this._element;
  }

  /**
   * Set the parent element for the tip
   * @param {HTMLElement} parent
   */
  setParent(parent) {
    this._parentElement = parent;
  }

  /**
   * Show active powerup with tip
   * @param {Object} powerup - {type, remainingMs}
   */
  show(powerup) {
    if (!this._element) return;

    if (!powerup) {
      this._element.style.display = "none";
      this._hideTip();
      return;
    }

    this._element.style.display = "flex";

    const icon = this._element.querySelector(".powerup-icon");
    const timer = this._element.querySelector(".powerup-timer");

    if (icon) {
      icon.textContent = this._getIcon(powerup.type);
      icon.style.color = this._getColor(powerup.type);
    }

    if (timer && powerup.remainingMs !== undefined) {
      timer.textContent = `${Math.ceil(powerup.remainingMs / 1000)}s`;
    }

    this._showTip(powerup.type);
  }

  _showTip(powerupType) {
    if (!this._tip) {
      this._createTip();
    }

    const typeId = powerupType?.id || powerupType;
    const tip = POWERUPS.TIPS?.[typeId];

    if (tip) {
      this._tip.textContent = tip;
      this._tip.style.display = "block";

      const isPositive = powerupType?.positive !== false;
      this._tip.style.background = isPositive
        ? "rgba(0, 255, 136, 0.15)"
        : "rgba(255, 68, 102, 0.15)";
      this._tip.style.borderColor = isPositive
        ? `${COLORS.NEON_GREEN_HEX}60`
        : `${COLORS.INTEGRITY_RED}60`;
      this._tip.style.color = isPositive
        ? COLORS.NEON_GREEN_HEX
        : COLORS.INTEGRITY_RED;

      requestAnimationFrame(() => {
        this._tip.style.opacity = "1";
      });
    }
  }

  _hideTip() {
    if (this._tip) {
      this._tip.style.opacity = "0";
      setTimeout(() => {
        if (this._tip) {
          this._tip.style.display = "none";
        }
      }, 300);
    }
  }

  _createTip() {
    this._tip = document.createElement("div");
    this._tip.className = "ks-powerup-tip";
    this._tip.style.cssText = `
      position: absolute;
      top: ${HUD_LAYOUT.POWERUP_TOP + HUD_LAYOUT.POWERUP_TIP_OFFSET}px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 16px;
      background: rgba(0, 255, 136, 0.15);
      border: 1px solid ${COLORS.NEON_GREEN_HEX}60;
      border-radius: 6px;
      color: ${COLORS.NEON_GREEN_HEX};
      font-size: 0.8rem;
      font-weight: 600;
      text-align: center;
      white-space: nowrap;
      z-index: ${HUD_STYLES.Z_INDEX.COUNTDOWN};
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease, background 0.3s ease, border-color 0.3s ease, color 0.3s ease;
      display: none;
      text-shadow: 0 0 8px currentColor;
      box-shadow: 0 0 12px rgba(0, 255, 136, 0.2);
    `;

    if (this._parentElement) {
      this._parentElement.appendChild(this._tip);
    }
  }

  _getIcon(type) {
    switch (type) {
      case POWERUPS.TYPES.SHIELD:
        return "🛡️";
      case POWERUPS.TYPES.DOUBLE_COINS:
        return "💰";
      case POWERUPS.TYPES.SPEED_BOOST:
        return "⚡";
      case POWERUPS.TYPES.MAGNET:
        return "🧲";
      default:
        return "✨";
    }
  }

  _getColor(type) {
    switch (type) {
      case POWERUPS.TYPES.SHIELD:
        return "#00aaff";
      case POWERUPS.TYPES.DOUBLE_COINS:
        return COLORS.COIN;
      case POWERUPS.TYPES.SPEED_BOOST:
        return "#ff6600";
      case POWERUPS.TYPES.MAGNET:
        return "#ff00ff";
      default:
        return COLORS.PRIMARY;
    }
  }

  destroy() {
    this._element?.remove();
    this._tip?.remove();
    this._element = null;
    this._tip = null;
    this._parentElement = null;
  }
}
