/**
 * CountdownOverlay.js - Pre-game countdown display
 */

import { COLORS } from "../../../core/Constants.js";
import { HUD_STYLES } from "../constants.js";

export class CountdownOverlay {
  constructor() {
    this._element = null;
  }

  /**
   * Create and return the countdown overlay element
   * @returns {HTMLElement}
   */
  create() {
    this._element = document.createElement("div");
    this._element.style.cssText = `
      position: absolute;
      top: 30%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: ${HUD_STYLES.Z_INDEX.COUNTDOWN};
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
    `;

    const container = document.createElement("div");
    container.style.cssText = `
      position: relative;
      width: clamp(120px, 25vw, 180px);
      height: clamp(120px, 25vw, 180px);
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // SVG ring for radial progress
    const ringSize = 180;
    const strokeWidth = 8;
    const radius = (ringSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const svgRing = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgRing.setAttribute("width", "100%");
    svgRing.setAttribute("height", "100%");
    svgRing.setAttribute("viewBox", `0 0 ${ringSize} ${ringSize}`);
    svgRing.classList.add("countdown-ring");
    svgRing.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      transform: rotate(-90deg);
      transition: opacity 0.3s ease;
    `;

    // Background ring
    const bgCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bgCircle.setAttribute("cx", ringSize / 2);
    bgCircle.setAttribute("cy", ringSize / 2);
    bgCircle.setAttribute("r", radius);
    bgCircle.setAttribute("fill", "none");
    bgCircle.setAttribute("stroke", `${COLORS.PRIMARY_HEX}30`);
    bgCircle.setAttribute("stroke-width", strokeWidth);
    svgRing.appendChild(bgCircle);

    // Progress ring
    const progressCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    progressCircle.setAttribute("cx", ringSize / 2);
    progressCircle.setAttribute("cy", ringSize / 2);
    progressCircle.setAttribute("r", radius);
    progressCircle.setAttribute("fill", "none");
    progressCircle.setAttribute("stroke", COLORS.PRIMARY_HEX);
    progressCircle.setAttribute("stroke-width", strokeWidth);
    progressCircle.setAttribute("stroke-linecap", "round");
    progressCircle.setAttribute("stroke-dasharray", circumference);
    progressCircle.setAttribute("stroke-dashoffset", "0");
    progressCircle.style.cssText = `
      filter: drop-shadow(0 0 8px ${COLORS.PRIMARY_HEX});
      transition: stroke-dashoffset 0.05s linear;
    `;
    progressCircle.classList.add("countdown-progress");
    svgRing.appendChild(progressCircle);

    container.appendChild(svgRing);

    // Number display
    const numberDisplay = document.createElement("div");
    numberDisplay.className = "countdown-number";
    numberDisplay.style.cssText = `
      font-size: clamp(3rem, 12vw, 6rem);
      font-weight: bold;
      color: ${COLORS.PRIMARY_HEX};
      text-shadow: 0 0 30px ${COLORS.PRIMARY_HEX}, 0 0 60px ${COLORS.PRIMARY_HEX}80;
      z-index: 1;
      transition: color 0.2s ease, text-shadow 0.2s ease;
    `;
    numberDisplay.textContent = "3";
    container.appendChild(numberDisplay);

    this._element.appendChild(container);

    return this._element;
  }

  /**
   * Show countdown with value
   * @param {number} value - Countdown value (3, 2, 1, 0 for GO!)
   * @param {number} [progress] - Optional progress within current second (0-1)
   */
  show(value, progress = 0) {
    if (!this._element) return;

    this._element.style.display = "flex";

    const numberElement = this._element.querySelector(".countdown-number");
    const ringElement = this._element.querySelector(".countdown-ring");

    if (value <= 0) {
      this._showGo(numberElement, ringElement);
    } else {
      this._showNumber(value, numberElement, ringElement);
    }
  }

  _showGo(numberElement, ringElement) {
    if (numberElement) {
      numberElement.textContent = "GO!";
      numberElement.style.color = COLORS.NEON_GREEN_HEX;
      numberElement.style.textShadow = `0 0 30px ${COLORS.NEON_GREEN_HEX}, 0 0 60px ${COLORS.NEON_GREEN_HEX}80`;
    }

    if (ringElement) {
      ringElement.style.opacity = "0";
    }

    this._element.style.transform = "translate(-50%, -50%) scale(0.5)";
    this._element.style.opacity = "0";

    requestAnimationFrame(() => {
      this._element.style.transform = "translate(-50%, -50%) scale(1)";
      this._element.style.opacity = "1";
    });

    // Fade out after delay
    setTimeout(() => {
      if (this._element) {
        this._element.style.opacity = "0";
        this._element.style.transform = "translate(-50%, -50%) scale(1.3)";

        setTimeout(() => {
          if (this._element) {
            this._element.style.display = "none";
          }
        }, 300);
      }
    }, 1500);
  }

  _showNumber(value, numberElement, ringElement) {
    if (numberElement) {
      const currentNumber = numberElement.textContent;
      const newNumber = value.toString();

      if (currentNumber !== newNumber) {
        numberElement.textContent = newNumber;
        numberElement.style.color = COLORS.PRIMARY_HEX;
        numberElement.style.textShadow = `0 0 30px ${COLORS.PRIMARY_HEX}, 0 0 60px ${COLORS.PRIMARY_HEX}80`;

        this._element.style.transform = "translate(-50%, -50%) scale(0.7)";
        this._element.style.opacity = "0.5";

        requestAnimationFrame(() => {
          this._element.style.transform = "translate(-50%, -50%) scale(1)";
          this._element.style.opacity = "1";
        });
      }
    }

    if (ringElement) {
      ringElement.style.opacity = "1";
    }
  }

  hide() {
    if (this._element) {
      this._element.style.display = "none";
    }
  }

  destroy() {
    this._element?.remove();
    this._element = null;
  }
}
