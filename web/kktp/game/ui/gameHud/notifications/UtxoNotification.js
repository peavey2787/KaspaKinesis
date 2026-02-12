/**
 * UtxoNotification.js - UTXO refresh notification
 */

import { COLORS } from "../../../core/Constants.js";
import { injectUtxoSpinAnimation } from "../utils/styleInjector.js";
import { Logger } from "../../../core/Logger.js";
import { HUD_LAYOUT, HUD_STYLES } from "../constants.js";

const log = Logger.create("UtxoNotification");

export class UtxoNotification {
  constructor() {
    this._element = null;
  }

  /**
   * Show UTXO refresh notification
   * @param {HTMLElement} parent
   */
  show(parent) {
    if (this._element) return;

    injectUtxoSpinAnimation();

    this._element = document.createElement("div");
    this._element.style.cssText = `
      position: absolute;
      bottom: ${HUD_LAYOUT.NOTIFICATION_BOTTOM}px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: ${COLORS.UI_PANEL};
      border: 1px solid ${COLORS.PRIMARY_HEX};
      border-radius: 8px;
      color: ${COLORS.PRIMARY_HEX};
      font-size: 0.85rem;
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: ${HUD_STYLES.Z_INDEX.NOTIFICATION};
    `;

    // Spinner
    const spinner = document.createElement("div");
    spinner.style.cssText = `
      width: 16px;
      height: 16px;
      border: 2px solid ${COLORS.PRIMARY_HEX}44;
      border-top-color: ${COLORS.PRIMARY_HEX};
      border-radius: 50%;
      animation: utxo-spin 0.8s linear infinite;
    `;
    this._element.appendChild(spinner);

    // Text
    const text = document.createElement("span");
    text.textContent = "Replenishing UTXOs...";
    this._element.appendChild(text);

    parent?.appendChild(this._element);

    requestAnimationFrame(() => {
      if (this._element) {
        this._element.style.opacity = "1";
      }
    });

    log.debug("UTXO refresh notification shown");
  }

  /**
   * Hide UTXO refresh notification
   */
  hide() {
    if (!this._element) return;

    this._element.style.opacity = "0";
    setTimeout(() => {
      this._element?.remove();
      this._element = null;
    }, 300);

    log.debug("UTXO refresh notification hidden");
  }

  destroy() {
    this._element?.remove();
    this._element = null;
  }
}
