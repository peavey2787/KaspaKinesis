/**
 * WalletModal.js - Wallet settings modal
 *
 * Features:
 * - Full wallet address display with copy button (PC + mobile)
 * - Send KAS form (address input, amount, send button)
 * - Reveal mnemonic button (requires password re-entry every time)
 */

import { EventEmitter } from "../core/EventEmitter.js";
import { Logger } from "../core/Logger.js";
import { COLORS, UI } from "../core/Constants.js";

const log = Logger.create("WalletModal");

export const WalletModalEvent = Object.freeze({
  CLOSE: "close",
  SEND_REQUESTED: "sendRequested",
  REVEAL_MNEMONIC: "revealMnemonic",
  DELETE_WALLET: "deleteWallet",
});

export class WalletModal extends EventEmitter {
  constructor(container) {
    super();

    this._container = container;
    this._overlay = null;
    this._modal = null;

    // Data
    this._address = "";
    this._balance = "0";
    this._kkGameEngine = null;

    // State
    this._visible = false;
    this._isSending = false;
    this._copyFeedback = null;
    this._deleteWalletBtn = null;
  }

  /**
   * Set kkGameEngine reference for operations
   * @param {Object} engine
   */
  setKKGameEngine(engine) {
    this._kkGameEngine = engine;
  }

  /**
   * Show the modal
   * @param {Object} options
   * @param {string} options.address - Wallet address
   * @param {string} options.balance - Current balance (formatted)
   */
  show(options = {}) {
    if (this._visible) return;

    this._address = options.address || "";
    this._balance = options.balance || "0";

    this._createElement();
    this._container.appendChild(this._overlay);
    this._visible = true;

    requestAnimationFrame(() => {
      this._overlay.style.opacity = "1";
      this._modal.style.transform = "translate(-50%, -50%) scale(1)";
    });

    log.info("WalletModal shown");
  }

  /**
   * Hide the modal
   */
  hide() {
    if (!this._visible || !this._overlay) return;

    this._overlay.style.opacity = "0";
    this._modal.style.transform = "translate(-50%, -50%) scale(0.9)";

    setTimeout(() => {
      if (this._overlay?.parentNode) {
        this._overlay.parentNode.removeChild(this._overlay);
      }
      this._overlay = null;
      this._modal = null;
      this._visible = false;
    }, 300);

    log.info("WalletModal hidden");
  }

  /**
   * Update the displayed balance
   * @param {string} balance
   */
  updateBalance(balance) {
    this._balance = balance ?? "0";
    const balanceEl = this._modal?.querySelector(".wallet-balance-value");
    if (balanceEl) {
      balanceEl.innerHTML = `
        <span style="color: ${COLORS.PRIMARY_HEX}; font-size: 1.2rem; font-weight: 600;">${this._balance}</span>
        <span style="color: ${COLORS.TEXT_SECONDARY}; font-size: 0.8rem; margin-left: 4px;">KAS</span>
      `;
    }
  }

  get isVisible() {
    return this._visible;
  }

  /**
   * Destroy the modal
   */
  destroy() {
    this.hide();
    this.removeAllListeners();
    log.info("WalletModal destroyed");
  }

  // ─── Private Methods ───────────────────────────────────────────

  _createElement() {
    // Overlay
    this._overlay = document.createElement("div");
    this._overlay.className = "ks-wallet-modal-overlay";
    this._overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: ${UI.Z_MODAL};
      opacity: 0;
      transition: opacity 0.3s ease;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
    `;

    this._overlay.addEventListener("click", (e) => {
      if (e.target === this._overlay) {
        this.hide();
        this.emit(WalletModalEvent.CLOSE);
      }
    });

    // Modal container
    this._modal = document.createElement("div");
    this._modal.className = "ks-wallet-modal";
    this._modal.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.9);
      width: min(90%, 400px);
      max-height: 90vh;
      overflow-y: auto;
      background: ${COLORS.PANEL_BG};
      border: 1px solid ${COLORS.PANEL_BORDER};
      border-radius: 12px;
      padding: 24px;
      transition: transform 0.3s ease;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;

    // Header
    const header = this._createHeader();
    this._modal.appendChild(header);

    // Address Section
    const addressSection = this._createAddressSection();
    this._modal.appendChild(addressSection);

    // Divider
    this._modal.appendChild(this._createDivider());

    // Balance Display
    const balanceSection = this._createBalanceSection();
    this._modal.appendChild(balanceSection);

    // Divider
    this._modal.appendChild(this._createDivider());

    // Testnet Faucet
    const faucetSection = this._createFaucetSection();
    this._modal.appendChild(faucetSection);

    // Divider
    this._modal.appendChild(this._createDivider());

    // Send Section
    const sendSection = this._createSendSection();
    this._modal.appendChild(sendSection);

    // Divider
    this._modal.appendChild(this._createDivider());

    // Mnemonic Section
    const mnemonicSection = this._createMnemonicSection();
    this._modal.appendChild(mnemonicSection);

    // Divider
    this._modal.appendChild(this._createDivider());

    // Delete wallet section
    const deleteSection = this._createDeleteSection();
    this._modal.appendChild(deleteSection);

    this._overlay.appendChild(this._modal);
  }

  _createHeader() {
    const header = document.createElement("div");
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    `;

    const title = document.createElement("h2");
    title.textContent = "Wallet Settings";
    title.style.cssText = `
      margin: 0;
      color: ${COLORS.TEXT};
      font-size: 1.3rem;
      font-weight: 600;
    `;
    header.appendChild(title);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.style.cssText = `
      background: transparent;
      border: none;
      color: ${COLORS.TEXT_SECONDARY};
      font-size: 1.2rem;
      cursor: pointer;
      padding: 4px 8px;
      transition: color 0.2s;
    `;
    closeBtn.addEventListener("mouseenter", () => {
      closeBtn.style.color = COLORS.INTEGRITY_RED;
    });
    closeBtn.addEventListener("mouseleave", () => {
      closeBtn.style.color = COLORS.TEXT_SECONDARY;
    });
    closeBtn.addEventListener("click", () => {
      this.hide();
      this.emit(WalletModalEvent.CLOSE);
    });
    header.appendChild(closeBtn);

    return header;
  }

  _createAddressSection() {
    const section = document.createElement("div");
    section.style.cssText = `margin-bottom: 16px;`;

    const label = document.createElement("div");
    label.textContent = "Your Address";
    label.style.cssText = `
      color: ${COLORS.TEXT_SECONDARY};
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 8px;
    `;
    section.appendChild(label);

    const addressContainer = document.createElement("div");
    addressContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid ${COLORS.PANEL_BORDER};
      border-radius: 6px;
      padding: 10px 12px;
    `;

    const addressText = document.createElement("div");
    addressText.textContent = this._address || "Not available";
    addressText.style.cssText = `
      flex: 1;
      color: ${COLORS.TEXT};
      font-size: 0.8rem;
      font-family: monospace;
      word-break: break-all;
      line-height: 1.4;
    `;
    addressContainer.appendChild(addressText);

    const copyBtn = document.createElement("button");
    copyBtn.innerHTML = "📋";
    copyBtn.title = "Copy to clipboard";
    copyBtn.style.cssText = `
      background: ${COLORS.PRIMARY_HEX}20;
      border: 1px solid ${COLORS.PRIMARY_HEX}40;
      color: ${COLORS.PRIMARY_HEX};
      font-size: 1rem;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
    `;

    copyBtn.addEventListener("mouseenter", () => {
      copyBtn.style.background = `${COLORS.PRIMARY_HEX}40`;
    });
    copyBtn.addEventListener("mouseleave", () => {
      copyBtn.style.background = `${COLORS.PRIMARY_HEX}20`;
    });
    copyBtn.addEventListener("click", () =>
      this._copyToClipboard(this._address, copyBtn),
    );

    addressContainer.appendChild(copyBtn);
    section.appendChild(addressContainer);

    return section;
  }

  _createBalanceSection() {
    const section = document.createElement("div");
    section.style.cssText = `margin-bottom: 16px;`;

    const row = document.createElement("div");
    row.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const label = document.createElement("div");
    label.textContent = "Balance";
    label.style.cssText = `
      color: ${COLORS.TEXT_SECONDARY};
      font-size: 0.85rem;
    `;
    row.appendChild(label);

    const value = document.createElement("div");
    value.className = "wallet-balance-value";
    value.innerHTML = `
      <span style="color: ${COLORS.PRIMARY_HEX}; font-size: 1.2rem; font-weight: 600;">${this._balance}</span>
      <span style="color: ${COLORS.TEXT_SECONDARY}; font-size: 0.8rem; margin-left: 4px;">KAS</span>
    `;
    row.appendChild(value);

    section.appendChild(row);
    return section;
  }

  _createFaucetSection() {
    const section = document.createElement("div");
    section.style.cssText = `margin-bottom: 16px;`;

    const label = document.createElement("div");
    label.textContent = "Testnet Faucet";
    label.style.cssText = `
      color: ${COLORS.TEXT_SECONDARY};
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 8px;
    `;
    section.appendChild(label);

    const message = document.createElement("div");
    message.style.cssText = `
      color: ${COLORS.TEXT};
      font-size: 0.85rem;
      line-height: 1.4;
    `;
    message.textContent = "Get free test coins to play:";
    section.appendChild(message);

    const link = document.createElement("a");
    link.href = "https://faucet-tn10.kaspanet.io";
    link.textContent = "https://faucet-tn10.kaspanet.io";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.style.cssText = `
      display: inline-block;
      margin-top: 6px;
      color: ${COLORS.PRIMARY_HEX};
      font-size: 0.85rem;
      text-decoration: none;
      word-break: break-all;
    `;

    link.addEventListener("mouseenter", () => {
      link.style.textDecoration = "underline";
    });

    link.addEventListener("mouseleave", () => {
      link.style.textDecoration = "none";
    });

    section.appendChild(link);
    return section;
  }

  _createSendSection() {
    const section = document.createElement("div");
    section.style.cssText = `margin-bottom: 16px;`;

    const label = document.createElement("div");
    label.textContent = "Send KAS";
    label.style.cssText = `
      color: ${COLORS.TEXT_SECONDARY};
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 12px;
    `;
    section.appendChild(label);

    // To Address input
    const toAddressInput = document.createElement("input");
    toAddressInput.type = "text";
    toAddressInput.placeholder = "Recipient address (kaspa:...)";
    toAddressInput.style.cssText = this._getInputStyle();
    section.appendChild(toAddressInput);

    // Amount input
    const amountContainer = document.createElement("div");
    amountContainer.style.cssText = `
      display: flex;
      gap: 8px;
      margin-top: 8px;
    `;

    const amountInput = document.createElement("input");
    amountInput.type = "number";
    amountInput.placeholder = "Amount";
    amountInput.step = "0.0001";
    amountInput.min = "0";
    amountInput.style.cssText = this._getInputStyle() + "flex: 1;";
    amountContainer.appendChild(amountInput);

    const kasLabel = document.createElement("span");
    kasLabel.textContent = "KAS";
    kasLabel.style.cssText = `
      color: ${COLORS.TEXT_SECONDARY};
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      padding: 0 8px;
    `;
    amountContainer.appendChild(kasLabel);

    section.appendChild(amountContainer);

    // Send button
    const sendBtn = document.createElement("button");
    sendBtn.textContent = "Send";
    sendBtn.style.cssText = `
      width: 100%;
      margin-top: 12px;
      padding: 12px;
      background: linear-gradient(135deg, ${COLORS.PRIMARY_HEX} 0%, ${COLORS.ACCENT_HEX} 100%);
      border: none;
      border-radius: 6px;
      color: #fff;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    `;

    sendBtn.addEventListener("mouseenter", () => {
      sendBtn.style.transform = "translateY(-1px)";
      sendBtn.style.boxShadow = `0 4px 20px ${COLORS.PRIMARY_HEX}40`;
    });
    sendBtn.addEventListener("mouseleave", () => {
      sendBtn.style.transform = "translateY(0)";
      sendBtn.style.boxShadow = "none";
    });

    sendBtn.addEventListener("click", async () => {
      if (this._isSending) return;

      const toAddress = toAddressInput.value.trim();
      const amount = amountInput.value.trim();

      if (!toAddress || !amount) {
        this._showToast("Please enter address and amount", "error");
        return;
      }

      // Accept both mainnet and testnet prefixes
      const isValidPrefix =
        toAddress.startsWith("kaspa:") || toAddress.startsWith("kaspatest:");
      if (!isValidPrefix) {
        this._showToast("Invalid address format", "error");
        return;
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        this._showToast("Invalid amount", "error");
        return;
      }

      await this._handleSend(toAddress, amount, sendBtn);
    });

    section.appendChild(sendBtn);

    return section;
  }

  _createMnemonicSection() {
    const section = document.createElement("div");

    const label = document.createElement("div");
    label.textContent = "Security";
    label.style.cssText = `
      color: ${COLORS.TEXT_SECONDARY};
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 12px;
    `;
    section.appendChild(label);

    const revealBtn = document.createElement("button");
    revealBtn.innerHTML = "🔐 Reveal Recovery Phrase";
    revealBtn.style.cssText = `
      width: 100%;
      padding: 12px;
      background: transparent;
      border: 1px solid ${COLORS.INTEGRITY_ORANGE};
      border-radius: 6px;
      color: ${COLORS.INTEGRITY_ORANGE};
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    `;

    revealBtn.addEventListener("mouseenter", () => {
      revealBtn.style.background = `${COLORS.INTEGRITY_ORANGE}20`;
    });
    revealBtn.addEventListener("mouseleave", () => {
      revealBtn.style.background = "transparent";
    });

    revealBtn.addEventListener("click", () => {
      this.emit(WalletModalEvent.REVEAL_MNEMONIC);
    });

    section.appendChild(revealBtn);

    const warning = document.createElement("div");
    warning.textContent = "⚠️ Never share your recovery phrase with anyone!";
    warning.style.cssText = `
      margin-top: 8px;
      color: ${COLORS.INTEGRITY_ORANGE};
      font-size: 0.75rem;
      text-align: center;
      opacity: 0.8;
    `;
    section.appendChild(warning);

    return section;
  }

  _createDeleteSection() {
    const section = document.createElement("div");

    const label = document.createElement("div");
    label.textContent = "Danger Zone";
    label.style.cssText = `
      color: ${COLORS.INTEGRITY_RED};
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 10px;
    `;
    section.appendChild(label);

    const warning = document.createElement("div");
    warning.textContent = "Deleting a wallet removes it from this device. This cannot be undone.";
    warning.style.cssText = `
      color: ${COLORS.TEXT_SECONDARY};
      font-size: 0.8rem;
      margin-bottom: 12px;
      line-height: 1.4;
    `;
    section.appendChild(warning);

    this._deleteWalletBtn = document.createElement("button");
    this._deleteWalletBtn.textContent = "Delete Wallet";
    this._deleteWalletBtn.style.cssText = `
      width: 100%;
      padding: 12px;
      background: transparent;
      border: 1px solid ${COLORS.INTEGRITY_RED};
      border-radius: 6px;
      color: ${COLORS.INTEGRITY_RED};
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    `;

    this._deleteWalletBtn.addEventListener("mouseenter", () => {
      this._deleteWalletBtn.style.background = `${COLORS.INTEGRITY_RED}20`;
    });
    this._deleteWalletBtn.addEventListener("mouseleave", () => {
      this._deleteWalletBtn.style.background = "transparent";
    });

    this._deleteWalletBtn.addEventListener("click", () => {
      this.emit(WalletModalEvent.DELETE_WALLET);
    });

    section.appendChild(this._deleteWalletBtn);
    return section;
  }

  _createDivider() {
    const divider = document.createElement("div");
    divider.style.cssText = `
      height: 1px;
      background: ${COLORS.PANEL_BORDER};
      margin: 16px 0;
    `;
    return divider;
  }

  _getInputStyle() {
    return `
      width: 100%;
      padding: 10px 12px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid ${COLORS.PANEL_BORDER};
      border-radius: 6px;
      color: ${COLORS.TEXT};
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
    `;
  }

  async _copyToClipboard(text, button) {
    if (!text) {
      this._showToast("Nothing to copy", "error");
      return;
    }

    try {
      // Modern API (works on HTTPS and localhost)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers / mobile
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.cssText =
          "position: fixed; left: -9999px; top: -9999px;";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      // Visual feedback
      const originalText = button.innerHTML;
      button.innerHTML = "✓";
      button.style.background = `${COLORS.NEON_GREEN_HEX}40`;
      button.style.borderColor = COLORS.NEON_GREEN_HEX;
      button.style.color = COLORS.NEON_GREEN_HEX;

      setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = `${COLORS.PRIMARY_HEX}20`;
        button.style.borderColor = `${COLORS.PRIMARY_HEX}40`;
        button.style.color = COLORS.PRIMARY_HEX;
      }, 1500);

      log.info("Address copied to clipboard");
    } catch (err) {
      log.error("Failed to copy", err);
      this._showToast("Failed to copy", "error");
    }
  }

  async _handleSend(toAddress, amount, button) {
    if (!this._kkGameEngine) {
      this._showToast("Wallet not initialized", "error");
      return;
    }

    this._isSending = true;
    const originalText = button.textContent;
    button.textContent = "Sending...";
    button.style.opacity = "0.7";
    button.style.cursor = "not-allowed";

    try {
      await this._kkGameEngine.send({
        toAddress,
        amount,
      });

      this._showToast(`Sent ${amount} KAS successfully!`, "success");

      // Clear inputs
      const inputs = this._modal.querySelectorAll("input");
      inputs.forEach((input) => (input.value = ""));

      log.info("Transaction sent", { toAddress, amount });
    } catch (err) {
      log.error("Send failed", err);
      this._showToast(err.message || "Transaction failed", "error");
    } finally {
      this._isSending = false;
      button.textContent = originalText;
      button.style.opacity = "1";
      button.style.cursor = "pointer";
    }
  }

  _showToast(message, type = "info") {
    const toast = document.createElement("div");
    const bgColor =
      type === "error"
        ? COLORS.INTEGRITY_RED
        : type === "success"
          ? COLORS.NEON_GREEN_HEX
          : COLORS.PRIMARY_HEX;

    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      background: ${bgColor};
      color: #fff;
      font-size: 0.9rem;
      font-weight: 500;
      border-radius: 8px;
      z-index: ${UI.Z_TOAST};
      animation: toast-in 0.3s ease;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;

    // Add animation keyframes if not present
    if (!document.getElementById("ks-toast-animations")) {
      const style = document.createElement("style");
      style.id = "ks-toast-animations";
      style.textContent = `
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

export default WalletModal;
