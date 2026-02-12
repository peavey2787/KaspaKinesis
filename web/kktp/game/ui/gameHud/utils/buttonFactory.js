/**
 * buttonFactory.js - Reusable button creation utilities
 */

import { COLORS } from "../../../core/Constants.js";

/**
 * Create a styled menu button
 * @param {string} text - Button text
 * @param {string} color - Border/hover color
 * @returns {HTMLButtonElement}
 */
export function createMenuButton(text, color) {
  const button = document.createElement("button");
  button.textContent = text;
  button.style.cssText = `
    padding: 1rem 3rem;
    font-size: 1rem;
    font-weight: bold;
    color: ${COLORS.TEXT};
    background: transparent;
    border: 2px solid ${color};
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  `;

  button.addEventListener("mouseenter", () => {
    button.style.background = `${color}30`;
  });

  button.addEventListener("mouseleave", () => {
    button.style.background = "transparent";
  });

  return button;
}

/**
 * Create a game over screen button with gradient and glow
 * @param {string} text - Button text
 * @param {string} color - Theme color
 * @returns {HTMLButtonElement}
 */
export function createGameOverButton(text, color) {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.className = "ks-game-over-btn";
  btn.style.cssText = `
    padding: 15px 30px;
    font-size: 18px;
    font-weight: bold;
    color: white;
    background: linear-gradient(135deg, ${color}44, ${color}22);
    border: 2px solid ${color};
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-shadow: 0 0 10px ${color};
    touch-action: manipulation;
    -webkit-tap-highlight-color: rgba(0, 217, 255, 0.3);
    -webkit-appearance: none;
    appearance: none;
    pointer-events: auto;
    user-select: none;
  `;

  // Mouse events
  btn.onmouseenter = () => {
    btn.style.background = `linear-gradient(135deg, ${color}66, ${color}44)`;
    btn.style.transform = "scale(1.05)";
  };
  btn.onmouseleave = () => {
    btn.style.background = `linear-gradient(135deg, ${color}44, ${color}22)`;
    btn.style.transform = "scale(1)";
  };

  // Touch events for mobile
  btn.addEventListener("touchstart", () => {
    btn.style.background = `linear-gradient(135deg, ${color}66, ${color}44)`;
    btn.style.transform = "scale(1.05)";
  }, { passive: true });

  btn.addEventListener("touchend", () => {
    btn.style.background = `linear-gradient(135deg, ${color}44, ${color}22)`;
    btn.style.transform = "scale(1)";
  }, { passive: true });

  btn.addEventListener("touchcancel", () => {
    btn.style.background = `linear-gradient(135deg, ${color}44, ${color}22)`;
    btn.style.transform = "scale(1)";
  }, { passive: true });

  return btn;
}
