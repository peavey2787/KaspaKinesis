/**
 * CollectionEffect.js - Floating collection effects (coins, powerups, powerdowns)
 */

import { COLORS } from "../../../core/Constants.js";

export class CollectionEffect {
  /**
   * Show a floating collection effect
   * @param {HTMLElement} parent - Parent element to append to
   * @param {Object} options
   * @param {string} options.type - 'coin', 'powerup', or 'powerdown'
   * @param {number} [options.value] - Value to display (for coins)
   * @param {string} [options.name] - Powerup name to display
   */
  static show(parent, options = {}) {
    const { type = "coin", value = 10 } = options;

    if (!parent) return;

    const floater = document.createElement("div");
    floater.className = "ks-collection-effect";

    const { text, color, glowColor, emoji } = CollectionEffect._getEffectStyle(type, value);

    // Random horizontal offset for variety
    const xOffset = (Math.random() - 0.5) * 60;

    floater.innerHTML = `<span class="emoji">${emoji}</span><span class="text">${text}</span>`;
    floater.style.cssText = `
      position: absolute;
      top: 40%;
      left: calc(50% + ${xOffset}px);
      transform: translateX(-50%) translateY(0);
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 2rem;
      font-weight: bold;
      color: ${color};
      text-shadow: 0 0 10px ${glowColor}, 0 0 20px ${glowColor}, 0 0 30px ${glowColor};
      z-index: 200;
      pointer-events: none;
      opacity: 1;
      transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.6s ease-out;
    `;

    // Style the emoji
    const emojiSpan = floater.querySelector(".emoji");
    if (emojiSpan) {
      emojiSpan.style.cssText = `
        font-size: 1.5rem;
        filter: drop-shadow(0 0 8px ${glowColor});
      `;
    }

    parent.appendChild(floater);

    // Trigger animation after append
    requestAnimationFrame(() => {
      floater.style.transform = `translateX(-50%) translateY(-80px) scale(1.2)`;
      floater.style.opacity = "0";
    });

    // Remove after animation
    setTimeout(() => {
      floater.remove();
    }, 700);
  }

  static _getEffectStyle(type, value) {
    switch (type) {
      case "coin":
        return {
          text: `+${value}`,
          color: "#FFD700",
          glowColor: "rgba(255, 215, 0, 0.6)",
          emoji: "🪙",
        };
      case "powerup":
        return {
          text: "+",
          color: COLORS.NEON_GREEN_HEX,
          glowColor: "rgba(0, 255, 136, 0.6)",
          emoji: "⚡",
        };
      case "powerdown":
        return {
          text: "−",
          color: COLORS.INTEGRITY_RED || "#FF4466",
          glowColor: "rgba(255, 68, 102, 0.6)",
          emoji: "💀",
        };
      default:
        return {
          text: "+",
          color: "#FFFFFF",
          glowColor: "rgba(255, 255, 255, 0.4)",
          emoji: "✨",
        };
    }
  }
}
