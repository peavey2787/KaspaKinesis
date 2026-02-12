/**
 * PreparingOverlay.js - "Preparing Game" spinner overlay
 */

import { COLORS } from "../../../core/Constants.js";
import { injectSpinAnimation } from "../utils/styleInjector.js";
import { HUD_STYLES } from "../constants.js";

export class PreparingOverlay {
  constructor() {
    this._element = null;
  }

  /**
   * Show the preparing game overlay
   * @param {HTMLElement} parent - Parent element to append to
   */
  show(parent, options = {}) {
    if (this._element) return;

    injectSpinAnimation();

    this._element = document.createElement("div");
    this._element.className = "ks-preparing-overlay";
    this._element.style.cssText = `
      position: absolute;
      top: 30%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      z-index: ${HUD_STYLES.Z_INDEX.COUNTDOWN};
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    // Spinner
    const spinner = document.createElement("div");
    spinner.style.cssText = `
      width: 60px;
      height: 60px;
      border: 4px solid ${COLORS.PRIMARY_HEX}30;
      border-top-color: ${COLORS.PRIMARY_HEX};
      border-radius: 50%;
      animation: ks-spin 1s linear infinite;
    `;

    // Text
    const text = document.createElement("div");
    text.style.cssText = `
      font-size: 1.5rem;
      font-weight: bold;
      color: ${COLORS.PRIMARY_HEX};
      text-shadow: 0 0 20px ${COLORS.PRIMARY_HEX}80;
      text-align: center;
    `;
    text.textContent = options.title ?? "Preparing Game...";

    // Subtext
    const subtext = document.createElement("div");
    subtext.style.cssText = `
      font-size: 0.9rem;
      color: ${COLORS.PRIMARY_HEX}99;
      text-align: center;
    `;
    subtext.textContent = options.subtitle ?? "Splitting UTXOs for rapid anchoring";

    this._element.appendChild(spinner);
    this._element.appendChild(text);
    this._element.appendChild(subtext);

    parent.appendChild(this._element);

    requestAnimationFrame(() => {
      if (this._element) {
        this._element.style.opacity = "1";
      }
    });
  }

  /**
   * Hide the preparing game overlay
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
