/**
 * SpeedDisplay.js - Speed indicator display
 */

import { COLORS } from "../../../core/Constants.js";
import { HUD_LAYOUT } from "../constants.js";

export class SpeedDisplay {
  constructor() {
    this._element = null;
  }

  /**
   * Create and return the speed display element
   * @returns {HTMLElement}
   */
  create() {
    this._element = document.createElement("div");
    this._element.style.cssText = `
      position: absolute;
      bottom: ${HUD_LAYOUT.SPEED_BOTTOM}px;
      right: ${HUD_LAYOUT.PADDING}px;
      color: ${COLORS.TEXT_SECONDARY};
      font-size: 0.9rem;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    `;
    this._element.textContent = "0 km/h";

    return this._element;
  }

  /**
   * Update speed display
   * @param {number} speed
   */
  update(speed) {
    if (this._element) {
      this._element.textContent = `${Math.round(speed * 10)} km/h`;
    }
  }

  destroy() {
    this._element?.remove();
    this._element = null;
  }
}
