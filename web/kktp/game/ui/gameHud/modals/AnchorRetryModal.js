/**
 * AnchorRetryModal.js - Modal for anchor failure retry
 */

import { Logger } from "../../../core/Logger.js";
import { ToastManager } from "../notifications/ToastManager.js";
import { HUD_STYLES } from "../constants.js";

const log = Logger.create("AnchorRetryModal");

export class AnchorRetryModal {
  constructor() {
    this._element = null;
    this._onSuccess = null;
  }

  /**
   * Set success callback (called with txId when anchor succeeds)
   * @param {Function} callback
   */
  setSuccessCallback(callback) {
    this._onSuccess = callback;
  }

  /**
   * Show anchor retry modal
   * @param {Object} options
   * @param {string} options.error - Error message
   * @param {string} options.reason - Failure reason
   * @param {Function} options.onRetry - Callback when retry button clicked
   */
  show(options = {}) {
    const { error, reason, onRetry } = options;

    this.hide();

    this._element = document.createElement("div");
    this._element.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: ${HUD_STYLES.Z_INDEX.MODAL};
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 20px;
    `;

    const content = document.createElement("div");
    content.style.cssText = `
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      border: 2px solid #ff4757;
      border-radius: 16px;
      padding: 30px;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 0 40px rgba(255, 71, 87, 0.3);
    `;

    // Warning icon
    const icon = document.createElement("div");
    icon.textContent = "⚠️";
    icon.style.cssText = "font-size: 3.5rem; margin-bottom: 16px;";
    content.appendChild(icon);

    // Title
    const title = document.createElement("h2");
    title.textContent = "Anchor Failed!";
    title.style.cssText = `
      color: #ff4757;
      margin: 0 0 16px 0;
      font-size: 1.5rem;
      text-shadow: 0 0 10px rgba(255, 71, 87, 0.5);
    `;
    content.appendChild(title);

    // Message
    const message = document.createElement("p");
    message.style.cssText = `
      color: #ccc;
      margin: 0 0 16px 0;
      font-size: 0.95rem;
      line-height: 1.6;
    `;

    if (reason === "insufficient_funds") {
      message.innerHTML = `
        Your wallet doesn't have enough funds to anchor this game.<br><br>
        <strong style="color: #ffd700;">Please add at least 0.5 KAS to your wallet and try again.</strong>
      `;
    } else {
      message.innerHTML = `
        Failed to anchor your game to the blockchain.<br><br>
        <span style="color: #888; font-size: 0.85rem;">${error || "Unknown error"}</span>
      `;
    }
    content.appendChild(message);

    // Warning about importance
    const warning = document.createElement("p");
    warning.innerHTML = "⚡ <strong>Without this anchor, your game cannot be verified!</strong>";
    warning.style.cssText = `
      color: #ff8800;
      margin: 0 0 24px 0;
      font-size: 0.9rem;
      padding: 10px;
      background: rgba(255, 136, 0, 0.1);
      border-radius: 8px;
      border: 1px solid rgba(255, 136, 0, 0.3);
    `;
    content.appendChild(warning);

    // Retry button
    if (onRetry) {
      const retryBtn = this._createRetryButton(onRetry);
      content.appendChild(retryBtn);
    }

    this._element.appendChild(content);
    document.body.appendChild(this._element);

    log.info("Anchor retry modal shown", { reason });
  }

  _createRetryButton(onRetry) {
    const retryBtn = document.createElement("button");
    retryBtn.textContent = "🔄 Try Again";
    retryBtn.style.cssText = `
      padding: 14px 40px;
      font-size: 1.1rem;
      font-weight: bold;
      color: white;
      background: linear-gradient(135deg, #00d9ff, #9945ff);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 15px rgba(0, 217, 255, 0.3);
    `;

    retryBtn.onmouseenter = () => {
      retryBtn.style.transform = "scale(1.05)";
      retryBtn.style.boxShadow = "0 6px 25px rgba(0, 217, 255, 0.5)";
    };

    retryBtn.onmouseleave = () => {
      retryBtn.style.transform = "scale(1)";
      retryBtn.style.boxShadow = "0 4px 15px rgba(0, 217, 255, 0.3)";
    };

    let isRetrying = false;
    retryBtn.onclick = async () => {
      if (isRetrying) return;
      isRetrying = true;

      retryBtn.textContent = "⏳ Retrying...";
      retryBtn.style.opacity = "0.7";
      retryBtn.style.cursor = "wait";

      try {
        const result = await onRetry();
        if (result?.success) {
          this.hide();
          ToastManager.show("✅ Game anchored successfully!", "success");
          if (result.txId) {
            this._onSuccess?.(result.txId);
          }
        } else {
          ToastManager.show(`❌ Retry failed: ${result?.error || "Unknown"}`, "error");
        }
      } catch (e) {
        ToastManager.show(`❌ Retry failed: ${e.message}`, "error");
      } finally {
        isRetrying = false;
        retryBtn.textContent = "🔄 Try Again";
        retryBtn.style.opacity = "1";
        retryBtn.style.cursor = "pointer";
      }
    };

    return retryBtn;
  }

  /**
   * Hide anchor retry modal
   */
  hide() {
    this._element?.remove();
    this._element = null;
  }

  destroy() {
    this._element?.remove();
    this._element = null;
    this._onSuccess = null;
  }
}
