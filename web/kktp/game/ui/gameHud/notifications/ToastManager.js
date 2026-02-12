/**
 * ToastManager.js - Toast notification system
 */

import { HUD_LAYOUT, HUD_STYLES } from "../constants.js";

export class ToastManager {
  static COLORS = {
    success: "#49eacb",
    error: "#ff4757",
    info: "#00d9ff",
  };

  /**
   * Show toast notification
   * @param {string} message
   * @param {string} type - 'success', 'error', 'info'
   */
  static show(message, type = "info") {
    const color = ToastManager.COLORS[type] || ToastManager.COLORS.info;

    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed;
      bottom: ${HUD_LAYOUT.TOAST_BOTTOM}px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      padding: 14px 28px;
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      border: 2px solid ${color};
      border-radius: 10px;
      color: white;
      font-size: 1rem;
      font-weight: 500;
      z-index: ${HUD_STYLES.Z_INDEX.TOAST};
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      opacity: 0;
      transition: all 0.3s ease;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateX(-50%) translateY(0)";
    });

    // Animate out and remove
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-50%) translateY(-20px)";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}
