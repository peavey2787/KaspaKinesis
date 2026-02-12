/**
 * WalletPasswordModal.js - Password input modal for wallet operations
 * 
 * Features:
 * - Password entry for wallet creation (with confirmation)
 * - Password entry for wallet unlock (existing wallet)
 * - Password verification for mnemonic reveal
 * - Auto-retry on wrong password without app restart
 * - Optional mnemonic display after verification
 */

import { EventEmitter } from '../core/EventEmitter.js';
import { Logger } from '../core/Logger.js';
import { COLORS, UI } from '../core/Constants.js';

const log = Logger.create('WalletPasswordModal');

export const WalletPasswordModalEvent = Object.freeze({
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
});

/**
 * Modal modes
 */
export const PasswordModalMode = Object.freeze({
  CREATE_WALLET: 'createWallet',
  UNLOCK_WALLET: 'unlockWallet',
  REVEAL_MNEMONIC: 'revealMnemonic',
  DELETE_WALLET: 'deleteWallet',
});

export class WalletPasswordModal extends EventEmitter {
  constructor(container) {
    super();
    
    this._container = container;
    this._overlay = null;
    this._modal = null;
    this._passwordInput = null;
    this._confirmInput = null;
    this._mnemonicDisplay = null;
    this._walletNameInput = null;
    
    this._mode = PasswordModalMode.CREATE_WALLET;
    this._visible = false;
    this._isLoading = false;
    this._onConfirmCallback = null;

    this._wallets = [];
    this._selectedWallet = null;
    this._defaultWalletName = '';
  }

  /**
   * Show the modal for wallet creation
   * @param {Object} [options]
   * @param {string} [options.defaultName]
   * @param {string[]} [options.wallets] - Existing wallet names for duplicate detection
   * @returns {Promise<{password: string, filename: string, mode: string}>} Resolves with details or rejects on cancel
   */
  showForCreate(options = {}) {
    return new Promise((resolve, reject) => {
      this._mode = PasswordModalMode.CREATE_WALLET;
      this._wallets = Array.isArray(options.wallets) ? options.wallets : [];
      this._selectedWallet = null;
      this._defaultWalletName = options.defaultName || this._generateWalletName('default_wallet');
      this._onConfirmCallback = { resolve, reject };
      this._show();
    });
  }

  /**
   * Show the modal for wallet unlock (existing wallet)
   * @param {Object} options
   * @param {string[]} options.wallets
   * @param {string} [options.selected]
   * @returns {Promise<{password: string, filename: string, mode: string}>} Resolves with details or rejects on cancel
   */
  showForUnlock(options = {}) {
    return new Promise((resolve, reject) => {
      this._mode = PasswordModalMode.UNLOCK_WALLET;
      this._wallets = Array.isArray(options.wallets) ? options.wallets : [];
      this._selectedWallet = options.selected || this._wallets[0] || null;
      this._defaultWalletName = this._generateWalletName('default_wallet');
      this._onConfirmCallback = { resolve, reject };
      this._show();
    });
  }

  /**
   * Show the modal for mnemonic reveal
   * @param {Function} verifyCallback - Async function that takes password and returns mnemonic
   * @returns {Promise<void>}
   */
  showForMnemonic(verifyCallback) {
    return new Promise((resolve, reject) => {
      this._mode = PasswordModalMode.REVEAL_MNEMONIC;
      this._verifyCallback = verifyCallback;
      this._onConfirmCallback = { resolve, reject };
      this._show();
    });
  }

  /**
   * Show the modal for wallet deletion.
   * @param {Function} verifyCallback - Async function that takes password and deletes the wallet
   * @returns {Promise<void>}
   */
  showForDelete(verifyCallback) {
    return new Promise((resolve, reject) => {
      this._mode = PasswordModalMode.DELETE_WALLET;
      this._verifyCallback = verifyCallback;
      this._onConfirmCallback = { resolve, reject };
      this._show();
    });
  }

  /**
   * Hide the modal
   */
  hide() {
    if (!this._visible || !this._overlay) return;
    
    this._overlay.style.opacity = '0';
    this._modal.style.transform = 'translate(-50%, -50%) scale(0.9)';
    
    setTimeout(() => {
      if (this._overlay?.parentNode) {
        this._overlay.parentNode.removeChild(this._overlay);
      }
      this._overlay = null;
      this._modal = null;
      this._passwordInput = null;
      this._confirmInput = null;
      this._mnemonicDisplay = null;
      this._walletNameInput = null;
      this._visible = false;
    }, 300);
    
    log.info('WalletPasswordModal hidden');
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
    log.info('WalletPasswordModal destroyed');
  }

  // ─── Private Methods ───────────────────────────────────────────

  _show() {
    if (this._visible) return;
    
    this._createElement();
    this._container.appendChild(this._overlay);
    this._visible = true;
    
    requestAnimationFrame(() => {
      this._overlay.style.opacity = '1';
      this._modal.style.transform = 'translate(-50%, -50%) scale(1)';
      this._passwordInput?.focus();
    });
    
    log.info('WalletPasswordModal shown', { mode: this._mode });
  }

  _createElement() {
    // Overlay
    this._overlay = document.createElement('div');
    this._overlay.className = 'ks-password-modal-overlay';
    this._overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      z-index: ${UI.Z_MODAL + 1000};
      opacity: 0;
      transition: opacity 0.3s ease;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    `;

    // Modal container
    this._modal = document.createElement('div');
    this._modal.className = 'ks-password-modal';
    this._modal.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.9);
      width: min(90%, 360px);
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

    // Content based on mode
    if (this._mode === PasswordModalMode.CREATE_WALLET) {
      this._createWalletContent();
    } else if (this._mode === PasswordModalMode.UNLOCK_WALLET) {
      this._createUnlockContent();
    } else if (this._mode === PasswordModalMode.REVEAL_MNEMONIC) {
      this._createMnemonicContent();
    } else {
      this._createDeleteContent();
    }

    this._overlay.appendChild(this._modal);
  }

  _createHeader() {
    const header = document.createElement('div');
    header.style.cssText = `
      text-align: center;
      margin-bottom: 24px;
    `;

    const icon = document.createElement('div');
    const iconText = {
      [PasswordModalMode.CREATE_WALLET]: '🔐',
      [PasswordModalMode.UNLOCK_WALLET]: '🔓',
      [PasswordModalMode.REVEAL_MNEMONIC]: '🔐',
      [PasswordModalMode.DELETE_WALLET]: '🗑️',
    };
    icon.textContent = iconText[this._mode] || '🔐';
    icon.style.cssText = `
      font-size: 2.5rem;
      margin-bottom: 12px;
    `;
    header.appendChild(icon);

    const title = document.createElement('h2');
    const titleText = {
      [PasswordModalMode.CREATE_WALLET]: 'Create Wallet Password',
      [PasswordModalMode.UNLOCK_WALLET]: 'Unlock Wallet',
      [PasswordModalMode.REVEAL_MNEMONIC]: 'Enter Password',
      [PasswordModalMode.DELETE_WALLET]: 'Delete Wallet',
    };
    title.textContent = titleText[this._mode] || 'Enter Password';
    title.style.cssText = `
      margin: 0 0 8px 0;
      color: ${COLORS.TEXT};
      font-size: 1.2rem;
      font-weight: 600;
    `;
    header.appendChild(title);

    const subtitle = document.createElement('p');
    const subtitleText = {
      [PasswordModalMode.CREATE_WALLET]: 'This password encrypts your wallet. Keep it safe!',
      [PasswordModalMode.UNLOCK_WALLET]: 'Enter your password to access your existing wallet',
      [PasswordModalMode.REVEAL_MNEMONIC]: 'Enter your wallet password to reveal recovery phrase',
      [PasswordModalMode.DELETE_WALLET]: 'Enter your password to permanently delete this wallet',
    };
    subtitle.textContent = subtitleText[this._mode] || '';
    subtitle.style.cssText = `
      margin: 0;
      color: ${COLORS.TEXT_SECONDARY};
      font-size: 0.85rem;
    `;
    header.appendChild(subtitle);

    return header;
  }

  _createWalletContent() {
    // Wallet name input
    const nameLabel = this._createLabel('Wallet Name');
    this._modal.appendChild(nameLabel);

    this._walletNameInput = this._createTextInput('Enter wallet name', this._defaultWalletName);
    this._modal.appendChild(this._walletNameInput);

    // Password input
    const passwordLabel = this._createLabel('Password');
    passwordLabel.style.marginTop = '16px';
    this._modal.appendChild(passwordLabel);

    this._passwordInput = this._createPasswordInput('Enter password (min 8 characters)');
    this._modal.appendChild(this._passwordInput);

    // Confirm password input
    const confirmLabel = this._createLabel('Confirm Password');
    confirmLabel.style.marginTop = '16px';
    this._modal.appendChild(confirmLabel);

    this._confirmInput = this._createPasswordInput('Confirm password');
    this._modal.appendChild(this._confirmInput);

    // Buttons
    const buttons = this._createButtons('Create Wallet');
    this._modal.appendChild(buttons);
  }

  _createUnlockContent() {
    // Wallet selector
    const walletLabel = this._createLabel('Select Wallet');
    this._modal.appendChild(walletLabel);

    const walletSelect = document.createElement('select');
    walletSelect.style.cssText = this._getInputBaseStyle();

    walletSelect.addEventListener('focus', () => {
      walletSelect.style.borderColor = COLORS.PRIMARY_HEX;
    });
    walletSelect.addEventListener('blur', () => {
      walletSelect.style.borderColor = COLORS.PANEL_BORDER;
    });

    for (const name of this._wallets) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      walletSelect.appendChild(opt);
    }

    const createOpt = document.createElement('option');
    createOpt.value = '__create__';
    createOpt.textContent = '➕ Create New Wallet';
    walletSelect.appendChild(createOpt);

    walletSelect.value = this._selectedWallet || (this._wallets[0] || '__create__');
    this._selectedWallet = walletSelect.value;

    this._modal.appendChild(walletSelect);

    // Password section (hidden when Create New is selected)
    this._passwordSection = document.createElement('div');
    this._passwordSection.className = 'password-section';

    const passwordLabel = this._createLabel('Password');
    passwordLabel.style.marginTop = '16px';
    this._passwordSection.appendChild(passwordLabel);

    this._passwordInput = this._createPasswordInput('Enter your wallet password');
    this._passwordSection.appendChild(this._passwordInput);

    this._modal.appendChild(this._passwordSection);

    // Update visibility based on selection
    const updatePasswordVisibility = () => {
      const isCreateNew = walletSelect.value === '__create__';
      this._passwordSection.style.display = isCreateNew ? 'none' : 'block';
      if (this._confirmBtn) {
        this._confirmBtn.textContent = isCreateNew ? 'Continue' : 'Unlock Wallet';
      }
    };

    walletSelect.addEventListener('change', () => {
      this._selectedWallet = walletSelect.value;
      // Persist selection (unless it's the create option)
      if (walletSelect.value !== '__create__') {
        localStorage.setItem('ks-wallet-filename', walletSelect.value);
      }
      updatePasswordVisibility();
    });

    // Initial visibility check
    updatePasswordVisibility();

    // Buttons
    const buttons = this._createButtons(this._selectedWallet === '__create__' ? 'Continue' : 'Unlock Wallet');
    this._modal.appendChild(buttons);
  }

  _createMnemonicContent() {
    // Password input
    const passwordLabel = this._createLabel('Wallet Password');
    this._modal.appendChild(passwordLabel);

    this._passwordInput = this._createPasswordInput('Enter your wallet password');
    this._modal.appendChild(this._passwordInput);

    // Mnemonic display (hidden initially)
    this._mnemonicDisplay = document.createElement('div');
    this._mnemonicDisplay.style.cssText = `
      display: none;
      margin-top: 20px;
      padding: 16px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid ${COLORS.INTEGRITY_ORANGE}40;
      border-radius: 8px;
    `;
    
    const mnemonicLabel = document.createElement('div');
    mnemonicLabel.textContent = 'Your Recovery Phrase';
    mnemonicLabel.style.cssText = `
      color: ${COLORS.INTEGRITY_ORANGE};
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 12px;
      text-align: center;
    `;
    this._mnemonicDisplay.appendChild(mnemonicLabel);

    this._mnemonicWords = document.createElement('div');
    this._mnemonicWords.style.cssText = `
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    `;
    this._mnemonicDisplay.appendChild(this._mnemonicWords);

    const copyMnemonicBtn = document.createElement('button');
    copyMnemonicBtn.textContent = '📋 Copy to Clipboard';
    copyMnemonicBtn.style.cssText = `
      width: 100%;
      margin-top: 12px;
      padding: 10px;
      background: transparent;
      border: 1px solid ${COLORS.PANEL_BORDER};
      border-radius: 6px;
      color: ${COLORS.TEXT_SECONDARY};
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    `;
    copyMnemonicBtn.addEventListener('click', () => this._copyMnemonic(copyMnemonicBtn));
    this._mnemonicDisplay.appendChild(copyMnemonicBtn);

    this._modal.appendChild(this._mnemonicDisplay);

    // Buttons
    const buttons = this._createButtons('Reveal Phrase');
    this._modal.appendChild(buttons);
  }

  _createDeleteContent() {
    const passwordLabel = this._createLabel('Wallet Password');
    this._modal.appendChild(passwordLabel);

    this._passwordInput = this._createPasswordInput('Enter your wallet password');
    this._modal.appendChild(this._passwordInput);

    const warning = document.createElement('div');
    warning.textContent = 'This action permanently deletes the wallet from this device.';
    warning.style.cssText = `
      margin-top: 12px;
      color: ${COLORS.INTEGRITY_ORANGE};
      font-size: 0.8rem;
      text-align: center;
    `;
    this._modal.appendChild(warning);

    const buttons = this._createButtons('Delete Wallet');
    this._modal.appendChild(buttons);
  }

  _createLabel(text) {
    const label = document.createElement('div');
    label.textContent = text;
    label.style.cssText = `
      color: ${COLORS.TEXT_SECONDARY};
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 8px;
    `;
    return label;
  }

  _createTextInput(placeholder, value = '') {
    const container = document.createElement('div');
    container.style.cssText = `
      position: relative;
      display: flex;
      align-items: center;
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    input.value = value || '';
    input.autocomplete = 'off';
    input.style.cssText = this._getInputBaseStyle();

    input.addEventListener('focus', () => {
      input.style.borderColor = COLORS.PRIMARY_HEX;
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = COLORS.PANEL_BORDER;
    });

    container.appendChild(input);
    container._input = input;
    return container;
  }

  _getInputBaseStyle() {
    return `
      width: 100%;
      padding: 12px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid ${COLORS.PANEL_BORDER};
      border-radius: 6px;
      color: ${COLORS.TEXT};
      font-size: 1rem;
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
    `;
  }

  _createPasswordInput(placeholder) {
    const container = document.createElement('div');
    container.style.cssText = `
      position: relative;
      display: flex;
      align-items: center;
    `;

    const input = document.createElement('input');
    input.type = 'password';
    input.placeholder = placeholder;
    input.autocomplete = 'new-password';
    input.style.cssText = `
      width: 100%;
      padding: 12px 40px 12px 12px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid ${COLORS.PANEL_BORDER};
      border-radius: 6px;
      color: ${COLORS.TEXT};
      font-size: 1rem;
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
    `;
    
    input.addEventListener('focus', () => {
      input.style.borderColor = COLORS.PRIMARY_HEX;
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = COLORS.PANEL_BORDER;
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._handleConfirm();
    });

    container.appendChild(input);

    // Toggle visibility button
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = '👁';
    toggleBtn.type = 'button';
    toggleBtn.style.cssText = `
      position: absolute;
      right: 8px;
      background: transparent;
      border: none;
      color: ${COLORS.TEXT_SECONDARY};
      font-size: 1rem;
      cursor: pointer;
      padding: 4px;
      opacity: 0.6;
      transition: opacity 0.2s;
    `;
    
    toggleBtn.addEventListener('mouseenter', () => {
      toggleBtn.style.opacity = '1';
    });
    toggleBtn.addEventListener('mouseleave', () => {
      toggleBtn.style.opacity = '0.6';
    });
    toggleBtn.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';
      toggleBtn.textContent = input.type === 'password' ? '👁' : '🙈';
    });

    container.appendChild(toggleBtn);

    // Store reference to actual input
    container._input = input;
    return container;
  }

  _createButtons(confirmText) {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      gap: 12px;
      margin-top: 24px;
    `;

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      flex: 1;
      padding: 12px;
      background: transparent;
      border: 1px solid ${COLORS.PANEL_BORDER};
      border-radius: 6px;
      color: ${COLORS.TEXT_SECONDARY};
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.2s;
    `;
    cancelBtn.addEventListener('click', () => {
      this._onConfirmCallback?.reject(new Error('Cancelled'));
      this.hide();
      this.emit(WalletPasswordModalEvent.CANCELLED);
    });
    container.appendChild(cancelBtn);

    // Confirm button
    this._confirmBtn = document.createElement('button');
    this._confirmBtn.textContent = confirmText;
    this._confirmBtn.style.cssText = `
      flex: 1;
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
    this._confirmBtn.addEventListener('click', () => this._handleConfirm());
    container.appendChild(this._confirmBtn);

    return container;
  }

  async _handleConfirm() {
    if (this._isLoading) return;

    const password = this._passwordInput?._input?.value || '';

    if (this._mode === PasswordModalMode.CREATE_WALLET) {
      const confirmPassword = this._confirmInput?._input?.value || '';
      const walletName = this._walletNameInput?._input?.value?.trim() || '';

      if (!walletName) {
        this._showError('Wallet name is required');
        return;
      }

      // Check for duplicate wallet name
      if (this._wallets.includes(walletName)) {
        this._showError('Wallet name already exists. Choose a different name.');
        return;
      }

      if (password.length < 8) {
        this._showError('Password must be at least 8 characters');
        return;
      }

      if (password !== confirmPassword) {
        this._showError('Passwords do not match');
        return;
      }

      // Show loading state - modal stays open until caller confirms success
      this._setLoading(true);

      this._onConfirmCallback?.resolve({
        mode: PasswordModalMode.CREATE_WALLET,
        password,
        filename: walletName,
      });
      this.emit(WalletPasswordModalEvent.CONFIRMED, { password });
    } else if (this._mode === PasswordModalMode.UNLOCK_WALLET) {
      const selected = this._selectedWallet || this._wallets[0];

      if (selected === '__create__') {
        this._mode = PasswordModalMode.CREATE_WALLET;
        this._resetAndRerender();
        return;
      }

      // Unlock existing wallet mode - keep modal open until verified
      if (!password) {
        this._showError('Please enter your password');
        return;
      }

      // Show loading state while wallet is being unlocked externally
      this._setLoading(true);
      
      // Resolve with password - caller will hide() on success or showErrorAndRetry() on failure
      this._onConfirmCallback?.resolve({
        mode: PasswordModalMode.UNLOCK_WALLET,
        password,
        filename: selected,
      });
      this.emit(WalletPasswordModalEvent.CONFIRMED, { password });
    } else if (this._mode === PasswordModalMode.REVEAL_MNEMONIC) {
      // Mnemonic reveal mode
      if (!password) {
        this._showError('Please enter your password');
        return;
      }

      this._setLoading(true);

      try {
        const mnemonic = await this._verifyCallback(password);
        this._displayMnemonic(mnemonic);
        this._confirmBtn.textContent = 'Done';
        this._confirmBtn.onclick = () => {
          this._onConfirmCallback?.resolve();
          this.hide();
        };
      } catch (err) {
        log.error('Password verification failed', err);
        this._showError('Invalid password');
      } finally {
        this._setLoading(false);
      }
    } else {
      // Delete wallet mode
      if (!password) {
        this._showError('Please enter your password');
        return;
      }

      this._setLoading(true);

      try {
        await this._verifyCallback(password);
        this._onConfirmCallback?.resolve();
        this.hide();
      } catch (err) {
        log.error('Wallet delete failed', err);
        this._showError(err?.message || 'Invalid password');
      } finally {
        this._setLoading(false);
      }
    }
  }

  _displayMnemonic(mnemonic) {
    if (!this._mnemonicDisplay || !this._mnemonicWords) return;

    this._currentMnemonic = mnemonic;
    const words = mnemonic.split(' ');
    
    this._mnemonicWords.innerHTML = '';
    
    words.forEach((word, index) => {
      const wordEl = document.createElement('div');
      wordEl.style.cssText = `
        background: rgba(0, 0, 0, 0.3);
        padding: 6px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
        color: ${COLORS.TEXT};
        text-align: center;
      `;
      wordEl.innerHTML = `<span style="color: ${COLORS.TEXT_SECONDARY}; font-size: 0.65rem;">${index + 1}.</span> ${word}`;
      this._mnemonicWords.appendChild(wordEl);
    });

    this._mnemonicDisplay.style.display = 'block';
    
    // Hide password input
    if (this._passwordInput) {
      this._passwordInput.style.display = 'none';
    }
    const label = this._modal.querySelector('div');
    if (label && label.textContent === 'Wallet Password') {
      label.style.display = 'none';
    }
  }

  async _copyMnemonic(button) {
    if (!this._currentMnemonic) return;

    try {
      await navigator.clipboard.writeText(this._currentMnemonic);
      
      const originalText = button.textContent;
      button.textContent = '✓ Copied!';
      button.style.color = COLORS.NEON_GREEN_HEX;
      button.style.borderColor = COLORS.NEON_GREEN_HEX;
      
      setTimeout(() => {
        button.textContent = originalText;
        button.style.color = COLORS.TEXT_SECONDARY;
        button.style.borderColor = COLORS.PANEL_BORDER;
      }, 2000);
    } catch (err) {
      log.error('Failed to copy mnemonic', err);
    }
  }

  _showError(message) {
    // Find or create error element
    let errorEl = this._modal.querySelector('.password-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'password-error';
      errorEl.style.cssText = `
        color: ${COLORS.INTEGRITY_RED};
        font-size: 0.85rem;
        text-align: center;
        margin-top: 12px;
        animation: shake 0.3s ease;
      `;
      
      // Add shake animation
      if (!document.getElementById('ks-shake-animation')) {
        const style = document.createElement('style');
        style.id = 'ks-shake-animation';
        style.textContent = `
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-5px); }
            40%, 80% { transform: translateX(5px); }
          }
        `;
        document.head.appendChild(style);
      }
      
      // Insert before buttons
      const buttons = this._modal.querySelector('div:last-child');
      this._modal.insertBefore(errorEl, buttons);
    }
    
    errorEl.textContent = message;
  }

  _setLoading(loading) {
    this._isLoading = loading;
    
    if (this._confirmBtn) {
      if (loading) {
        this._confirmBtn.textContent = 'Verifying...';
        this._confirmBtn.style.opacity = '0.7';
        this._confirmBtn.style.cursor = 'not-allowed';
      } else {
        const buttonText = {
          [PasswordModalMode.CREATE_WALLET]: 'Create Wallet',
          [PasswordModalMode.UNLOCK_WALLET]: 'Unlock Wallet',
          [PasswordModalMode.REVEAL_MNEMONIC]: 'Reveal Phrase',
          [PasswordModalMode.DELETE_WALLET]: 'Delete Wallet',
        };
        this._confirmBtn.textContent = buttonText[this._mode] || 'Confirm';
        this._confirmBtn.style.opacity = '1';
        this._confirmBtn.style.cursor = 'pointer';
      }
    }
  }

  _resetAndRerender() {
    if (!this._modal) return;

    // Keep the existing wallets list for duplicate checking
    this._defaultWalletName = this._generateWalletName('default_wallet');

    // Clear stale input references
    this._passwordInput = null;
    this._confirmInput = null;
    this._walletNameInput = null;
    this._passwordSection = null;

    this._modal.innerHTML = '';

    const header = this._createHeader();
    this._modal.appendChild(header);
    this._createWalletContent();

    // Focus wallet name input
    setTimeout(() => {
      this._walletNameInput?._input?.focus();
    }, 50);
  }

  _generateWalletName(base) {
    const existing = new Set(this._wallets);
    let name = base;
    let i = 1;

    while (existing.has(name)) {
      name = `${base}_${i}`;
      i += 1;
    }

    return name;
  }

  /**
   * Show an error and clear the password field for retry
   * @param {string} message
   * @returns {Promise<{password: string, filename: string, mode: string}>} Resolves with new details on retry
   */
  showErrorAndRetry(message) {
    return new Promise((resolve, reject) => {
      // Reset loading state
      this._setLoading(false);

      // Update callback for next attempt
      this._onConfirmCallback = { resolve, reject };

      // Clear password input
      if (this._passwordInput?._input) {
        this._passwordInput._input.value = '';
        this._passwordInput._input.focus();
      }

      this._showError(message);
    });
  }
}

export default WalletPasswordModal;
