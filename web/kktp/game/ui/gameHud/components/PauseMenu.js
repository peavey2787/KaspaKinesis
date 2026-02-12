/**
 * PauseMenu.js - Pause menu overlay
 */

import { COLORS } from "../../../core/Constants.js";
import { createMenuButton } from "../utils/buttonFactory.js";
import { HUDEvent, HUD_STYLES } from "../constants.js";

export class PauseMenu {
  constructor() {
    this._element = null;
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
   * Show the pause menu
   * @param {HTMLElement} parent - Parent element to append to
   */
  show(parent) {
    if (this._element) return;

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
      background: rgba(0, 0, 0, 0.8);
      z-index: ${HUD_STYLES.Z_INDEX.PAUSE_MENU};
      pointer-events: auto;
    `;

    const title = document.createElement("div");
    title.textContent = "PAUSED";
    title.style.cssText = `
      font-size: 2rem;
      font-weight: bold;
      color: ${COLORS.PRIMARY};
      margin-bottom: 2rem;
    `;
    this._element.appendChild(title);

    const buttons = document.createElement("div");
    buttons.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 1rem;
    `;

    const resumeBtn = createMenuButton("RESUME", COLORS.PRIMARY);
    resumeBtn.addEventListener("click", () => {
      this.hide();
      this._onEvent?.(HUDEvent.RESUME);
    });
    buttons.appendChild(resumeBtn);

    const settingsBtn = createMenuButton("SETTINGS", COLORS.TEXT_SECONDARY);
    settingsBtn.addEventListener("click", () => {
      this.hide();
      this._onEvent?.(HUDEvent.SETTINGS);
    });
    buttons.appendChild(settingsBtn);

    const quitBtn = createMenuButton("QUIT", COLORS.INTEGRITY_RED);
    quitBtn.addEventListener("click", () => {
      this._onEvent?.(HUDEvent.QUIT);
    });
    buttons.appendChild(quitBtn);

    this._element.appendChild(buttons);
    parent.appendChild(this._element);
  }

  /**
   * Hide the pause menu
   */
  hide() {
    this._element?.remove();
    this._element = null;
  }

  get isVisible() {
    return this._element !== null;
  }

  destroy() {
    this._element?.remove();
    this._element = null;
    this._onEvent = null;
  }
}
