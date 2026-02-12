/**
 * ProgressBar.js - Progress bar with opponent tracking and race timer
 */

import { COLORS } from "../../../core/Constants.js";
import { HUD_LAYOUT } from "../constants.js";

export class ProgressBar {
  constructor() {
    this._element = null;
    this._progressFill = null;
    this._opponentProgress = null;
    this._blocksRemainingDisplay = null;
    this._raceTimer = null;
    this._timerContainer = null;
  }

  /**
   * Create and return the progress bar elements
   * @param {boolean} isMultiplayer
   * @returns {{ progressBar: HTMLElement, timerContainer: HTMLElement }}
   */
  create(isMultiplayer = false) {
    this._createProgressBar(isMultiplayer);
    this._createTimerContainer();

    return {
      progressBar: this._element,
      timerContainer: this._timerContainer,
    };
  }

  _createProgressBar(isMultiplayer) {
    this._element = document.createElement("div");
    this._element.style.cssText = `
      position: absolute;
      top: ${HUD_LAYOUT.PROGRESS_BAR_TOP}px;
      left: 50%;
      transform: translateX(-50%);
      width: ${HUD_LAYOUT.PROGRESS_BAR_WIDTH};
      height: ${HUD_LAYOUT.PROGRESS_BAR_HEIGHT}px;
      background: rgba(24, 26, 26, 0.78);
      border: 1px solid ${COLORS.UI_BORDER};
      border-radius: 4px;
      overflow: visible;
    `;

    this._progressFill = document.createElement("div");
    this._progressFill.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 0%;
      display: block;
      background: linear-gradient(90deg, ${COLORS.PRIMARY_HEX}, ${COLORS.ACCENT_HEX});
      border-radius: 4px;
      transition: width 0.2s linear;
    `;
    this._element.appendChild(this._progressFill);

    // Opponent progress marker (multiplayer)
    if (isMultiplayer) {
      this._createOpponentMarker();
    }

    // End marker
    const endMarker = document.createElement("div");
    endMarker.textContent = "🏁";
    endMarker.style.cssText = `
      position: absolute;
      right: -12px;
      top: -8px;
      font-size: 1.5rem;
    `;
    this._element.appendChild(endMarker);

    // Blocks remaining display
    this._blocksRemainingDisplay = document.createElement("div");
    this._blocksRemainingDisplay.textContent = "-- blocks";
    this._blocksRemainingDisplay.style.cssText = `
      position: absolute;
      right: 20px;
      top: -18px;
      font-size: 0.75rem;
      color: ${COLORS.PRIMARY_HEX};
      text-shadow: 0 0 5px ${COLORS.PRIMARY_HEX};
    `;
    this._element.appendChild(this._blocksRemainingDisplay);
  }

  _createOpponentMarker() {
    this._opponentProgress = document.createElement("div");
    this._opponentProgress.style.cssText = `
      position: absolute;
      top: -4px;
      left: 0%;
      width: 4px;
      height: 16px;
      background: ${COLORS.INTEGRITY_RED};
      border-radius: 2px;
      transition: left 0.3s ease;
      box-shadow: 0 0 10px ${COLORS.INTEGRITY_RED};
    `;
    this._element.appendChild(this._opponentProgress);

    const opponentLabel = document.createElement("div");
    opponentLabel.textContent = "Opponent";
    opponentLabel.style.cssText = `
      position: absolute;
      top: -20px;
      left: 0;
      font-size: 0.7rem;
      color: ${COLORS.INTEGRITY_RED};
    `;
    this._opponentProgress.appendChild(opponentLabel);
  }

  _createTimerContainer() {
    this._timerContainer = document.createElement("div");
    this._timerContainer.style.cssText = `
      position: absolute;
      top: ${HUD_LAYOUT.TIMER_TOP}px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 0.3rem;
      padding: 2px 8px;
      background: rgba(10, 10, 20, 0.6);
      border-radius: 4px;
    `;

    const timerIcon = document.createElement("span");
    timerIcon.textContent = "⏱️";
    timerIcon.style.cssText = "font-size: 0.9rem;";
    this._timerContainer.appendChild(timerIcon);

    this._raceTimer = document.createElement("span");
    this._raceTimer.textContent = "0:00.00";
    this._raceTimer.style.cssText = `
      color: ${COLORS.TEXT};
      font-size: 0.9rem;
      font-weight: bold;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 8px ${COLORS.PRIMARY_HEX};
      min-width: 60px;
    `;
    this._timerContainer.appendChild(this._raceTimer);
  }

  /**
   * Update progress bar
   * @param {number} progress - 0 to 1
   * @param {number} [blocksRemaining] - Optional blocks remaining count
   */
  updateProgress(progress, blocksRemaining) {
    if (this._progressFill) {
      this._progressFill.style.width = `${Math.min(100, progress * 100)}%`;
    }
    if (this._blocksRemainingDisplay && blocksRemaining !== undefined) {
      this._blocksRemainingDisplay.textContent = `${blocksRemaining} blocks`;
    }
  }

  /**
   * Update opponent progress (multiplayer)
   * @param {number} progress - 0 to 1
   */
  updateOpponentProgress(progress) {
    if (this._opponentProgress) {
      this._opponentProgress.style.left = `${Math.min(100, progress * 100)}%`;
    }
  }

  /**
   * Update race timer display
   * @param {string} formattedTime - Formatted time string (MM:SS.mm)
   */
  updateRaceTime(formattedTime) {
    if (this._raceTimer) {
      this._raceTimer.textContent = formattedTime;
    }
  }

  destroy() {
    this._element?.remove();
    this._timerContainer?.remove();
    this._element = null;
    this._progressFill = null;
    this._opponentProgress = null;
    this._blocksRemainingDisplay = null;
    this._raceTimer = null;
    this._timerContainer = null;
  }
}
