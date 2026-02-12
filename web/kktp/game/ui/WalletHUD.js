/**
 * WalletHUD.js - Persistent wallet balance display
 *
 * STRUCTURAL CHANGES:
 * - The HUD pill + test mode warning are wrapped in a flex-column
 *   container so the warning flows BELOW the pill and can NEVER
 *   overlap any other HUD element.
 * - During gameplay mode, the WalletHUD warning is hidden entirely
 *   (GameHUD's own TestModeWarning handles in-game warnings).
 * - updateBalance() auto-shows/hides the warning in menu mode so
 *   a fresh wallet with 0 balance shows the warning immediately.
 *
 * Features:
 * - Always visible (menus + gameplay)
 * - Shows wallet balance (truncated to 4 decimals)
 * - Settings cog opens WalletModal
 * - Test mode warning when balance is 0
 */

import { EventEmitter } from "../core/EventEmitter.js";
import { Logger } from "../core/Logger.js";
import { COLORS, UI } from "../core/Constants.js";

const log = Logger.create("WalletHUD");

export const WalletHUDEvent = Object.freeze({
  SETTINGS_CLICKED: "settingsClicked",
  GAME_SETTINGS_CLICKED: "gameSettingsClicked",
});

export class WalletHUD extends EventEmitter {
  constructor(container) {
    super();

    this._container = container;
    this._element = null;       // outer wrapper (position: absolute)
    this._pill = null;          // inner balance/buttons row
    this._balanceContainer = null;
    this._balanceDisplay = null;
    this._settingsBtn = null;
    this._gameSettingsBtn = null;
    this._buttonRow = null;
    this._testModeWarning = null;

    this._balance = "0";
    this._peakBalance = 0;    // Track highest balance seen (prevents false test mode during UTXO ops)
    this._isTestMode = true;
    this._visible = false;
    this._isGameplay = false;
  }

  /**
   * Initialize and show the wallet HUD
   */
  init() {
    if (this._element) return;

    this._createElement();
    this._container.appendChild(this._element);
    this._visible = true;

    // Auto-show warning if starting in test mode (fresh wallet with 0 balance)
    if (this._isTestMode && !this._isGameplay) {
      this.showTestModeWarning();
    }

    log.info("WalletHUD initialized");
  }

  /**
   * Update the displayed balance
   * @param {string} balanceKas - Balance as formatted string (e.g., "1.23456789")
   */
  updateBalance(balanceKas) {
    const normalized =
      typeof balanceKas === "string" ? balanceKas.replace(/,/g, "") : balanceKas;
    this._balance = normalized || "0";

    const truncated = this._truncateBalance(this._balance);

    if (this._balanceDisplay) {
      this._balanceDisplay.textContent = truncated;
    }

    // Track peak balance to avoid false test mode during UTXO operations
    // (balance temporarily shows 0 while coins are in-flight in mempool)
    const currentBalance = parseFloat(this._balance) || 0;
    if (currentBalance > this._peakBalance) {
      this._peakBalance = currentBalance;
    }

    // Test mode = never had funds (peak balance is 0)
    // This prevents test mode from triggering during UTXO splits
    const shouldBeTestMode = this._peakBalance === 0;
    if (shouldBeTestMode !== this._isTestMode) {
      this._isTestMode = shouldBeTestMode;
      this._updateTestModeWarning();
    }

    log.debug("Balance updated", {
      balance: truncated,
      peakBalance: this._peakBalance,
      testMode: this._isTestMode,
    });
  }

  /**
   * Reset peak balance tracking (call when wallet is deleted/reset)
   */
  resetPeakBalance() {
    this._peakBalance = 0;
    this._isTestMode = true;
    this._updateTestModeWarning();
    log.debug("Peak balance reset");
  }

  /**
   * Get current balance
   */
  get balance() {
    return this._balance;
  }

  /**
   * Check if in test mode (no funds)
   */
  get isTestMode() {
    return this._isTestMode;
  }

  /**
   * Show the test mode warning.
   * In menu mode: shows the big orange warning below the wallet pill.
   * In gameplay mode: does nothing (GameHUD handles in-game warnings).
   */
  showTestModeWarning() {
    if (!this._testModeWarning || !this._isTestMode) return;
    if (this._isGameplay) return; // GameHUD handles gameplay warnings
    this._testModeWarning.style.display = "flex";
  }

  /**
   * Hide the test mode warning
   */
  hideTestModeWarning() {
    if (!this._testModeWarning) return;
    this._testModeWarning.style.display = "none";
  }

  /**
   * Set gameplay mode (hides balance, shows game settings, hides warning)
   * @param {boolean} isGameplay
   */
  setGameplayMode(isGameplay) {
    this._isGameplay = isGameplay;

    if (!this._element) return;

    if (isGameplay) {
      // Gameplay: top-left settings button, hide balance + warning
      this._element.style.top = `max(clamp(8px, 2vw, 14px), env(safe-area-inset-top, 0px))`;
      this._element.style.right = "auto";
      this._element.style.left = `max(clamp(6px, 1.5vw, 12px), env(safe-area-inset-left, 0px))`;
      this._element.style.alignItems = "flex-start";

      if (this._pill) {
        this._pill.style.background = "rgba(10, 10, 20, 0.7)";
        this._pill.style.border = `1px solid ${COLORS.UI_BORDER}`;
        this._pill.style.padding = "4px 6px";
        this._pill.style.backdropFilter = "blur(6px)";
        this._pill.style.webkitBackdropFilter = "blur(6px)";
      }

      if (this._balanceContainer) {
        this._balanceContainer.style.display = "none";
      }
      if (this._settingsBtn) {
        this._settingsBtn.style.display = "none";
      }
      if (this._gameSettingsBtn) {
        this._gameSettingsBtn.style.display = "inline-flex";
      }
      // Hide warning — GameHUD handles in-game warnings
      if (this._testModeWarning) {
        this._testModeWarning.style.display = "none";
      }
    } else {
      // Menu: show full HUD with balance in top-right
      this._element.style.top = `${UI.PADDING}px`;
      this._element.style.right = `${UI.PADDING}px`;
      this._element.style.left = "auto";
      this._element.style.alignItems = "flex-end";

      if (this._pill) {
        this._pill.style.background = COLORS.PANEL_BG;
        this._pill.style.border = `1px solid ${COLORS.PANEL_BORDER}`;
        this._pill.style.padding = "8px 12px";
        this._pill.style.backdropFilter = "blur(10px)";
        this._pill.style.webkitBackdropFilter = "blur(10px)";
      }

      if (this._balanceContainer) {
        this._balanceContainer.style.display = "flex";
      }
      if (this._settingsBtn) {
        this._settingsBtn.style.display = "inline-flex";
      }
      if (this._gameSettingsBtn) {
        this._gameSettingsBtn.style.display = "none";
      }

      // Re-show warning if still in test mode
      if (this._isTestMode) {
        this.showTestModeWarning();
      }
    }

    log.debug('Gameplay mode set', { isGameplay });
  }

  /**
   * Destroy the HUD
   */
  destroy() {
    if (this._element?.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }
    this._element = null;
    this._pill = null;
    this._visible = false;
    this.removeAllListeners();
    log.info("WalletHUD destroyed");
  }

  // ─── Private Methods ───────────────────────────────────────────

  _truncateBalance(balance) {
    const normalized =
      typeof balance === "string" ? balance.replace(/,/g, "") : balance;
    const num = parseFloat(normalized);
    if (isNaN(num)) return "0.0000";

    const factor = 10000;
    const truncated = Math.floor(num * factor) / factor;
    return truncated.toFixed(4);
  }

  _createElement() {
    // ── Outer wrapper: flex column so warning flows below pill ──
    this._element = document.createElement("div");
    this._element.className = "ks-wallet-hud";
    this._element.style.cssText = `
      position: absolute;
      top: ${UI.PADDING}px;
      right: ${UI.PADDING}px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: clamp(6px, 1.5vw, 10px);
      z-index: ${UI.Z_OVERLAY};
      pointer-events: none;
    `;

    // ── Inner pill (balance + settings buttons) ──
    this._pill = document.createElement("div");
    this._pill.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: ${COLORS.PANEL_BG};
      border: 1px solid ${COLORS.PANEL_BORDER};
      border-radius: 8px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      user-select: none;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      pointer-events: auto;
      touch-action: manipulation;
    `;

    // Balance container (hidden during gameplay)
    this._balanceContainer = document.createElement("div");
    this._balanceContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      pointer-events: none;
    `;

    // Kaspa diamond icon
    const icon = document.createElement("span");
    icon.textContent = "◆";
    icon.style.cssText = `
      color: ${COLORS.PRIMARY_HEX};
      font-size: 1rem;
      text-shadow: 0 0 8px ${COLORS.PRIMARY_HEX}80;
    `;
    this._balanceContainer.appendChild(icon);

    // Balance display
    this._balanceDisplay = document.createElement("span");
    this._balanceDisplay.textContent = this._truncateBalance(this._balance);
    this._balanceDisplay.style.cssText = `
      color: ${COLORS.TEXT};
      font-size: 0.9rem;
      font-weight: 600;
      min-width: 60px;
    `;
    this._balanceContainer.appendChild(this._balanceDisplay);

    // KAS label
    const kasLabel = document.createElement("span");
    kasLabel.textContent = "KAS";
    kasLabel.style.cssText = `
      color: ${COLORS.TEXT_SECONDARY};
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    `;
    this._balanceContainer.appendChild(kasLabel);

    this._pill.appendChild(this._balanceContainer);

    this._buttonRow = document.createElement("div");
    this._buttonRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    // Wallet settings button
    this._settingsBtn = document.createElement("button");
    this._settingsBtn.innerHTML = "⚙";
    this._settingsBtn.title = "Wallet Settings";
    this._settingsBtn.className = "ks-wallet-settings-btn";
    this._settingsBtn.style.cssText = `
      background: transparent;
      border: none;
      color: ${COLORS.TEXT_SECONDARY};
      font-size: clamp(1.1rem, 3.5vw, 1.4rem);
      cursor: pointer;
      padding: clamp(6px, 1.5vw, 8px);
      transition: color 0.2s ease, transform 0.2s ease;
      line-height: 1;
      touch-action: manipulation;
      -webkit-tap-highlight-color: rgba(0, 217, 255, 0.3);
      -webkit-appearance: none;
      appearance: none;
      pointer-events: auto;
    `;

    this._settingsBtn.addEventListener("mouseenter", () => {
      this._settingsBtn.style.color = COLORS.PRIMARY_HEX;
      this._settingsBtn.style.transform = "rotate(45deg)";
    });
    this._settingsBtn.addEventListener("mouseleave", () => {
      this._settingsBtn.style.color = COLORS.TEXT_SECONDARY;
      this._settingsBtn.style.transform = "rotate(0deg)";
    });
    this._settingsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      log.debug("Settings button clicked");
      this.emit(WalletHUDEvent.SETTINGS_CLICKED);
    });
    this._settingsBtn.addEventListener("touchstart", () => {
      this._settingsBtn.style.color = COLORS.PRIMARY_HEX;
      this._settingsBtn.style.transform = "rotate(45deg) scale(1.1)";
    }, { passive: true });
    this._settingsBtn.addEventListener("touchend", () => {
      this._settingsBtn.style.color = COLORS.TEXT_SECONDARY;
      this._settingsBtn.style.transform = "rotate(0deg)";
    }, { passive: true });

    // Game settings button
    this._gameSettingsBtn = document.createElement("button");
    this._gameSettingsBtn.textContent = "Settings";
    this._gameSettingsBtn.title = "Game Settings";
    this._gameSettingsBtn.className = "ks-game-settings-btn";
    this._gameSettingsBtn.style.cssText = `
      background: ${COLORS.PRIMARY_HEX};
      border: none;
      color: #0a0a14;
      font-size: clamp(0.6rem, 1.8vw, 0.7rem);
      font-weight: 700;
      cursor: pointer;
      padding: clamp(4px, 1vw, 6px) clamp(6px, 1.5vw, 8px);
      border-radius: 999px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      line-height: 1;
      touch-action: manipulation;
      -webkit-tap-highlight-color: rgba(0, 217, 255, 0.3);
      -webkit-appearance: none;
      appearance: none;
      pointer-events: auto;
    `;
    this._gameSettingsBtn.style.display = "none";

    this._gameSettingsBtn.addEventListener("mouseenter", () => {
      this._gameSettingsBtn.style.transform = "translateY(-1px)";
      this._gameSettingsBtn.style.boxShadow = `0 6px 18px ${COLORS.PRIMARY_HEX}55`;
    });
    this._gameSettingsBtn.addEventListener("mouseleave", () => {
      this._gameSettingsBtn.style.transform = "translateY(0)";
      this._gameSettingsBtn.style.boxShadow = "none";
    });
    this._gameSettingsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      log.debug("Game settings button clicked");
      this.emit(WalletHUDEvent.GAME_SETTINGS_CLICKED);
    });

    this._buttonRow.appendChild(this._settingsBtn);
    this._buttonRow.appendChild(this._gameSettingsBtn);
    this._pill.appendChild(this._buttonRow);

    this._element.appendChild(this._pill);

    // Test mode warning — flows BELOW the pill, never overlaps anything
    this._createTestModeWarning();
  }

  _createTestModeWarning() {
    this._testModeWarning = document.createElement("div");
    this._testModeWarning.className = "ks-test-mode-warning";
    this._testModeWarning.style.cssText = `
      /* Centered banner in MENUS (fixed to viewport) */
      position: fixed;
      left: 50%;
      top: calc(env(safe-area-inset-top, 0px) + clamp(84px, 14vw, 120px));
      transform: translateX(-50%);
      display: none;
      align-items: center;
      gap: 6px;
      padding: clamp(6px, 1.5vw, 10px) clamp(10px, 3vw, 20px);
      background: linear-gradient(135deg, rgba(255, 71, 87, 0.9) 0%, rgba(255, 165, 2, 0.9) 100%);
      border-radius: 8px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      animation: pulse-warning 2s infinite;
      white-space: nowrap;
      max-width: min(90vw, 320px);
      pointer-events: none;
      z-index: ${UI.Z_OVERLAY};
    `;

    this._testModeWarning.innerHTML = `
      <span style="font-size: clamp(0.9rem, 2.5vw, 1.2rem);">⚠️</span>
      <span style="color: #fff; font-weight: bold; font-size: clamp(0.65rem, 2vw, 0.85rem);">
        Warning: Wallet has no funds! Test mode only!
      </span>
    `;

    // Add keyframe animation
    if (!document.getElementById("ks-wallet-animations")) {
      const style = document.createElement("style");
      style.id = "ks-wallet-animations";
      style.textContent = `
        @keyframes pulse-warning {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `;
      document.head.appendChild(style);
    }

    // Append to the wrapper (flows below the pill)
    this._element.appendChild(this._testModeWarning);
  }

  _updateTestModeWarning() {
    log.debug("Test mode status changed", { isTestMode: this._isTestMode });

    // Auto-show/hide warning in menu mode.
    // During gameplay, GameHUD's own TestModeWarning handles it.
    if (this._isGameplay) return;

    if (this._isTestMode) {
      this.showTestModeWarning();
    } else {
      this.hideTestModeWarning();
    }
  }
}

export default WalletHUD;
