/**
 * TestModeWarning.js - Test mode warning indicator
 */

import { Logger } from "../../../core/Logger.js";
import { HUD_LAYOUT, HUD_STYLES } from "../constants.js";

const log = Logger.create("TestModeWarning");

export class TestModeWarning {
  constructor() {
    this._element = null;
  }

  /**
   * Show test mode warning
   * @param {HTMLElement} parent
   */
  show(parent) {
    if (this._element) return;

    this._element = document.createElement("div");
    this._element.style.cssText = `
      position: absolute;
      top: ${HUD_LAYOUT.WARNING_TOP}px;
      left: 50%;
      transform: translateX(-50%);
      padding: 6px 14px;
      background: rgba(255, 135, 0, 0.2);
      border: 1px solid #ff8800;
      border-radius: 6px;
      color: #ff8800;
      font-size: 0.75rem;
      font-weight: bold;
      text-shadow: 0 0 5px rgba(255, 136, 0, 0.5);
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: ${HUD_STYLES.Z_INDEX.NOTIFICATION};
    `;
    this._element.textContent = "⚠️ TEST MODE - Moves not anchored";

    parent?.appendChild(this._element);

    requestAnimationFrame(() => {
      if (this._element) {
        this._element.style.opacity = "1";
      }
    });

    log.info("Test mode warning shown");
  }

  /**
   * Hide test mode warning
   */
  hide() {
    if (!this._element) return;

    this._element.style.opacity = "0";
    setTimeout(() => {
      this._element?.remove();
      this._element = null;
    }, 300);
  }

  destroy() {
    this._element?.remove();
    this._element = null;
  }
}
