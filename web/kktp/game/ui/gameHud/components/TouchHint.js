/**
 * TouchHint.js - Touch controls hint overlay
 */

import { COLORS } from "../../../core/Constants.js";
import { HUD_LAYOUT } from "../constants.js";

export class TouchHint {
  constructor() {
    this._element = null;
  }

  /**
   * Create and return the touch hint element
   * @returns {HTMLElement}
   */
  create() {
    this._element = document.createElement("div");
    this._element.style.cssText = `
      position: absolute;
      bottom: ${HUD_LAYOUT.TOUCH_HINT_BOTTOM}px;
      left: 50%;
      transform: translateX(-50%);
      color: ${COLORS.TEXT_SECONDARY};
      font-size: 0.8rem;
      text-align: center;
      opacity: 0.7;
    `;
    this._element.innerHTML = `
      <div>⬅️ Swipe to move ➡️</div>
      <div>⬆️ Swipe up to jump</div>
    `;

    // Fade out after 3 seconds
    setTimeout(() => {
      if (this._element) {
        this._element.style.transition = "opacity 1s ease";
        this._element.style.opacity = "0";
      }
    }, 3000);

    return this._element;
  }

  destroy() {
    this._element?.remove();
    this._element = null;
  }
}
