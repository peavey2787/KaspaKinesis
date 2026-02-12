/**
 * LobbyUI.js - Multiplayer lobby interface
 * 
 * Features:
 * - Create lobby with name input
 * - Search for lobbies button
 * - Dynamic lobby list from blockchain
 * - Player list with ready states
 * - Chat system
 */

import { EventEmitter } from '../core/EventEmitter.js';
import { Logger } from '../core/Logger.js';
import { COLORS } from '../core/Constants.js';
import { PreparingOverlay } from './gameHud/components/PreparingOverlay.js';

const log = Logger.create('LobbyUI');

export const LobbyUIEvent = Object.freeze({
  CREATE_LOBBY: 'createLobby',
  SEARCH_LOBBIES: 'searchLobbies',
  JOIN_LOBBY: 'joinLobby',
  JOIN_BY_CODE: 'joinByCode',
  LEAVE_LOBBY: 'leaveLobby',
  READY: 'ready',
  SEND_CHAT: 'sendChat',
  START_GAME: 'startGame',
  BACK: 'back',
});

export class LobbyUI extends EventEmitter {
  constructor(container) {
    super();
    
    this._container = container;
    this._element = null;
    this._chatContainer = null;
    this._chatInput = null;
    this._playerList = null;
    this._readyBtn = null;
    this._lobbyList = null;
    this._lobbyNameInput = null;
    this._usernameInput = null;
    this._searchingIndicator = null;
    
    this._isReady = false;
    this._readyPending = false;
    this._isHost = false;
    this._lobbyId = null;
    this._joinCode = null;
    this._isSearching = false;
    this._displayName = '';
    this._foundLobbies = new Map();

    // Load persisted display name
    try {
      const saved = localStorage.getItem('ks_display_name');
      if (saved) this._displayName = saved;
    } catch { /* localStorage unavailable */ }
    this._creatingOverlay = null;
    this._preparingOverlay = new PreparingOverlay();
    
    this._visible = false;
  }

  /**
   * Show a loading overlay while lobby is being created
   */
  showCreating() {
    this.hide();
    this.hideCreating();

    this._creatingOverlay = document.createElement('div');
    this._creatingOverlay.className = 'ks-lobby-creating';
    this._creatingOverlay.style.cssText = this._getBaseStyles();
    this._container.appendChild(this._creatingOverlay);

    this._preparingOverlay.show(this._creatingOverlay, {
      title: 'Creating Lobby...',
      subtitle: 'Broadcasting to the Kaspa network',
    });

    requestAnimationFrame(() => {
      if (this._creatingOverlay) this._creatingOverlay.style.opacity = '1';
    });
  }

  /**
   * Hide the creating lobby overlay
   */
  hideCreating() {
    if (!this._creatingOverlay) return;
    const el = this._creatingOverlay;
    this._creatingOverlay = null;
    this._preparingOverlay.hide();
    el.style.opacity = '0';
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 300);
  }

  /**
   * Show lobby browser with create/search functionality
   */
  showBrowser() {
    this._foundLobbies.clear();
    this._createBrowserView();
    this._show();
    log.info('Lobby browser shown');
  }

  /**
   * Add a discovered lobby to the list
   * @param {Object} lobby - Lobby discovery data
   */
  addDiscoveredLobby(lobby) {
    const id = lobby.txid || lobby.payload || Date.now().toString();
    
    if (this._foundLobbies.has(id)) return;
    
    this._foundLobbies.set(id, lobby);
    
    if (this._lobbyList) {
      // Remove "no lobbies" message if present
      const empty = this._lobbyList.querySelector('.ks-empty-message');
      if (empty) empty.remove();
      
      const item = this._createLobbyItem(lobby);
      this._lobbyList.appendChild(item);
    }
    
    log.info('Lobby discovered', { id });
  }

  /**
   * Set searching state
   * @param {boolean} isSearching
   */
  setSearching(isSearching) {
    this._isSearching = isSearching;
    
    if (this._searchingIndicator) {
      this._searchingIndicator.style.display = isSearching ? 'flex' : 'none';
    }
  }

  /**
   * Show lobby room
   * @param {Object} options
   * @param {string} options.lobbyId
   * @param {string} options.lobbyName
   * @param {boolean} options.isHost
   * @param {Array} options.players
   */
  showRoom(options) {
    this._lobbyId = options.lobbyId;
    this._joinCode = options.joinCode || null;
    this._isHost = options.isHost ?? false;
    this._isReady = false;
    this._readyPending = false;
    
    this._createRoomView(options);
    this._show();
    log.info('Lobby room shown', { lobbyId: this._lobbyId, isHost: this._isHost, joinCode: this._joinCode });
  }

  /**
   * Update player list
   * @param {Array} players - Player list [{id, name, displayName, isReady, isHost}]
   */
  updatePlayers(players) {
    if (!this._playerList) return;
    
    this._playerList.innerHTML = '';
    
    for (const player of players) {
      const item = document.createElement('div');
      item.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 1rem;
        background: ${COLORS.UI_PANEL}40;
        border-radius: 4px;
        margin-bottom: 0.5rem;
        border-left: 3px solid ${player.isReady ? COLORS.INTEGRITY_GREEN : COLORS.INTEGRITY_ORANGE};
      `;
      
      const name = document.createElement('span');
      name.textContent = (player.displayName || player.name || 'Player') + (player.isHost ? ' (Host)' : '');
      name.style.color = player.isHost ? COLORS.ACCENT_HEX : COLORS.TEXT;
      item.appendChild(name);
      
      const status = document.createElement('span');
      status.textContent = player.isReady ? '✓ Ready' : 'Waiting';
      status.style.cssText = `
        font-size: 0.8rem;
        color: ${player.isReady ? COLORS.INTEGRITY_GREEN : COLORS.TEXT_SECONDARY};
      `;
      item.appendChild(status);
      
      this._playerList.appendChild(item);
    }
  }

  /**
   * Add chat message
   * @param {Object} message - {sender, text, timestamp, isSystem}
   */
  addChatMessage(message) {
    if (!this._chatContainer) return;
    
    const msg = document.createElement('div');
    msg.style.cssText = `
      padding: 0.25rem 0;
      font-size: 0.85rem;
      word-wrap: break-word;
    `;
    
    if (message.isSystem) {
      msg.style.color = COLORS.TEXT_SECONDARY;
      msg.style.fontStyle = 'italic';
      msg.textContent = message.text;
    } else {
      msg.innerHTML = `
        <span style="color: ${COLORS.PRIMARY_HEX}; font-weight: bold;">${this._escapeHtml(message.sender)}:</span>
        <span style="color: ${COLORS.TEXT};">${this._escapeHtml(message.text)}</span>
      `;
    }
    
    this._chatContainer.appendChild(msg);
    this._chatContainer.scrollTop = this._chatContainer.scrollHeight;
  }

  /**
   * Hide the lobby UI
   */
  hide() {
    if (!this._visible || !this._element) return;
    
    const elementToRemove = this._element;
    elementToRemove.style.opacity = '0';
    
    setTimeout(() => {
      if (elementToRemove?.parentNode) {
        elementToRemove.parentNode.removeChild(elementToRemove);
      }
      if (this._element === elementToRemove) {
        this._element = null;
        this._visible = false;
      }
    }, 300);
    
    log.info('Lobby UI hidden');
  }

  get isVisible() {
    return this._visible;
  }

  /**
   * Get the current display name entered by the user
   * @returns {string}
   */
  get displayName() {
    return this._displayName || '';
  }

  _show() {
    if (this._element) {
      this._container.appendChild(this._element);
      this._visible = true;
      
      requestAnimationFrame(() => {
        this._element.style.opacity = '1';
      });
    }
  }

  _createBrowserView() {
    this._element = document.createElement('div');
    this._element.className = 'ks-lobby-browser';
    this._element.style.cssText = this._getBaseStyles();
    
    // Header
    const header = this._createHeader('MULTIPLAYER LOBBY');
    this._element.appendChild(header);
    
    // Content area
    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 100%;
      max-width: 600px;
      padding: 1rem;
      overflow: hidden;
    `;

    // ═══════════════════════════════════════════════════════════════
    // USERNAME SECTION
    // ═══════════════════════════════════════════════════════════════

    const usernameSection = document.createElement('div');
    usernameSection.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem;
      background: ${COLORS.UI_PANEL}30;
      border: 1px solid ${COLORS.UI_BORDER};
      border-radius: 4px;
    `;

    const usernameLabel = document.createElement('div');
    usernameLabel.textContent = 'Your Display Name';
    usernameLabel.style.cssText = `
      color: ${COLORS.TEXT};
      font-weight: bold;
      font-size: 0.9rem;
    `;
    usernameSection.appendChild(usernameLabel);

    this._usernameInput = document.createElement('input');
    this._usernameInput.type = 'text';
    this._usernameInput.placeholder = 'Enter your name...';
    this._usernameInput.maxLength = 24;
    this._usernameInput.value = this._displayName || '';
    this._usernameInput.style.cssText = `
      padding: 0.75rem;
      background: rgba(0,0,0,0.3);
      border: 1px solid ${COLORS.UI_BORDER};
      border-radius: 4px;
      color: ${COLORS.TEXT};
      font-size: 1rem;
    `;
    this._usernameInput.addEventListener('input', () => {
      this._displayName = this._usernameInput.value.trim();
      try {
        localStorage.setItem('ks_display_name', this._displayName);
      } catch { /* localStorage unavailable */ }
    });
    usernameSection.appendChild(this._usernameInput);

    content.appendChild(usernameSection);
    
    // ═══════════════════════════════════════════════════════════════
    // CREATE LOBBY SECTION
    // ═══════════════════════════════════════════════════════════════
    
    const createSection = document.createElement('div');
    createSection.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem;
      background: ${COLORS.UI_PANEL}30;
      border: 1px solid ${COLORS.UI_BORDER};
      border-radius: 4px;
    `;
    
    const createLabel = document.createElement('div');
    createLabel.textContent = 'Create New Lobby';
    createLabel.style.cssText = `
      color: ${COLORS.TEXT};
      font-weight: bold;
      font-size: 0.9rem;
    `;
    createSection.appendChild(createLabel);
    
    // Lobby name input
    this._lobbyNameInput = document.createElement('input');
    this._lobbyNameInput.type = 'text';
    this._lobbyNameInput.placeholder = 'Enter lobby name...';
    this._lobbyNameInput.maxLength = 32;
    this._lobbyNameInput.style.cssText = `
      padding: 0.75rem;
      background: rgba(0,0,0,0.3);
      border: 1px solid ${COLORS.UI_BORDER};
      border-radius: 4px;
      color: ${COLORS.TEXT};
      font-size: 1rem;
    `;
    createSection.appendChild(this._lobbyNameInput);

    // Max players row
    const maxPlayersRow = document.createElement('div');
    maxPlayersRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 0.75rem;
    `;

    const maxPlayersLabel = document.createElement('label');
    maxPlayersLabel.textContent = 'Max Players:';
    maxPlayersLabel.style.cssText = `
      color: ${COLORS.TEXT_MUTED};
      font-size: 0.85rem;
      white-space: nowrap;
    `;
    maxPlayersRow.appendChild(maxPlayersLabel);

    this._maxPlayersInput = document.createElement('input');
    this._maxPlayersInput.type = 'number';
    this._maxPlayersInput.min = 2;
    this._maxPlayersInput.max = 8;
    this._maxPlayersInput.value = 2;
    this._maxPlayersInput.style.cssText = `
      width: 60px;
      padding: 0.5rem;
      background: rgba(0,0,0,0.3);
      border: 1px solid ${COLORS.UI_BORDER};
      border-radius: 4px;
      color: ${COLORS.TEXT};
      font-size: 1rem;
      text-align: center;
    `;
    maxPlayersRow.appendChild(this._maxPlayersInput);

    const maxPlayersHint = document.createElement('span');
    maxPlayersHint.textContent = '(2-8)';
    maxPlayersHint.style.cssText = `
      color: ${COLORS.TEXT_MUTED};
      font-size: 0.75rem;
    `;
    maxPlayersRow.appendChild(maxPlayersHint);

    createSection.appendChild(maxPlayersRow);
    
    // Create button
    const createBtn = this._createButton('CREATE LOBBY', COLORS.PRIMARY_HEX);
    createBtn.addEventListener('click', () => {
      const name = this._lobbyNameInput.value.trim() || 'DAG Dasher Lobby';
      const maxPlayersRaw = parseInt(this._maxPlayersInput.value, 10);
      const maxPlayers = Number.isFinite(maxPlayersRaw) ? Math.max(2, Math.min(8, maxPlayersRaw)) : 2;
      this.emit(LobbyUIEvent.CREATE_LOBBY, { lobbyName: name, displayName: this._displayName || '', maxPlayers });
    });
    createSection.appendChild(createBtn);
    
    content.appendChild(createSection);

    // ═══════════════════════════════════════════════════════════════
    // JOIN BY CODE SECTION
    // ═══════════════════════════════════════════════════════════════

    const joinCodeSection = document.createElement('div');
    joinCodeSection.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem;
      background: ${COLORS.UI_PANEL}30;
      border: 1px solid ${COLORS.UI_BORDER};
      border-radius: 4px;
    `;

    const joinLabel = document.createElement('div');
    joinLabel.textContent = 'Join by Code';
    joinLabel.style.cssText = `
      color: ${COLORS.TEXT};
      font-weight: bold;
      font-size: 0.9rem;
    `;
    joinCodeSection.appendChild(joinLabel);

    const joinCodeRow = document.createElement('div');
    joinCodeRow.style.cssText = `
      display: flex;
      gap: 0.5rem;
    `;

    const joinCodeInput = document.createElement('input');
    joinCodeInput.type = 'text';
    joinCodeInput.placeholder = 'Paste join code...';
    joinCodeInput.style.cssText = `
      flex: 1;
      padding: 0.75rem;
      background: rgba(0,0,0,0.3);
      border: 1px solid ${COLORS.UI_BORDER};
      border-radius: 4px;
      color: ${COLORS.TEXT};
      font-size: 0.85rem;
      font-family: monospace;
    `;
    joinCodeRow.appendChild(joinCodeInput);

    const joinCodeBtn = this._createButton('JOIN', COLORS.ACCENT_HEX);
    joinCodeBtn.style.padding = '0.75rem 1.5rem';
    joinCodeBtn.addEventListener('click', () => {
      const code = joinCodeInput.value.trim();
      if (!code) return;
      this.emit(LobbyUIEvent.JOIN_BY_CODE, code);
    });
    joinCodeRow.appendChild(joinCodeBtn);

    joinCodeSection.appendChild(joinCodeRow);
    content.appendChild(joinCodeSection);
    
    // ═══════════════════════════════════════════════════════════════
    // SEARCH LOBBIES SECTION
    // ═══════════════════════════════════════════════════════════════
    
    const searchSection = document.createElement('div');
    searchSection.style.cssText = `
      display: flex;
      align-items: center;
      gap: 0.5rem;
    `;
    
    const listLabel = document.createElement('div');
    listLabel.textContent = 'Available Lobbies';
    listLabel.style.cssText = `
      color: ${COLORS.TEXT_SECONDARY};
      font-size: 0.9rem;
      flex: 1;
    `;
    searchSection.appendChild(listLabel);
    
    // Searching indicator
    this._searchingIndicator = document.createElement('div');
    this._searchingIndicator.style.cssText = `
      display: none;
      align-items: center;
      gap: 0.5rem;
      color: ${COLORS.PRIMARY_HEX};
      font-size: 0.8rem;
    `;
    this._searchingIndicator.innerHTML = `
      <span class="ks-spinner" style="
        width: 12px;
        height: 12px;
        border: 2px solid ${COLORS.PRIMARY_HEX}40;
        border-top-color: ${COLORS.PRIMARY_HEX};
        border-radius: 50%;
        animation: ks-spin 1s linear infinite;
      "></span>
      <span>Searching...</span>
    `;
    searchSection.appendChild(this._searchingIndicator);
    
    // Search button
    const searchBtn = this._createButton('SEARCH', COLORS.ACCENT_HEX);
    searchBtn.style.padding = '0.5rem 1rem';
    searchBtn.style.fontSize = '0.8rem';
    searchBtn.addEventListener('click', () => {
      this.emit(LobbyUIEvent.SEARCH_LOBBIES);
    });
    searchSection.appendChild(searchBtn);
    
    content.appendChild(searchSection);
    
    // Lobby list
    this._lobbyList = document.createElement('div');
    this._lobbyList.style.cssText = `
      flex: 1;
      overflow-y: auto;
      background: ${COLORS.UI_PANEL}20;
      border: 1px solid ${COLORS.UI_BORDER};
      border-radius: 4px;
      padding: 0.5rem;
      min-height: 150px;
    `;
    
    const empty = document.createElement('div');
    empty.className = 'ks-empty-message';
    empty.textContent = 'Click "Search" to find lobbies on the blockchain';
    empty.style.cssText = `
      color: ${COLORS.TEXT_SECONDARY};
      text-align: center;
      padding: 2rem;
    `;
    this._lobbyList.appendChild(empty);
    
    content.appendChild(this._lobbyList);
    
    // Back button
    const backBtn = this._createButton('BACK', COLORS.TEXT_SECONDARY);
    backBtn.addEventListener('click', () => {
      this.emit(LobbyUIEvent.BACK);
    });
    content.appendChild(backBtn);
    
    this._element.appendChild(content);
    
    // Add spinner animation
    this._addSpinnerStyles();
  }

  _createRoomView(options) {
    this._element = document.createElement('div');
    this._element.className = 'ks-lobby-room';
    this._element.style.cssText = this._getBaseStyles();
    
    // Header with lobby name
    const lobbyName = options.lobbyName || 'Lobby Room';
    const header = this._createHeader(lobbyName.toUpperCase());
    this._element.appendChild(header);
    
    // Join code display
    const codeToShow = this._joinCode || this._lobbyId;
    if (codeToShow) {
      const joinCodeBox = document.createElement('div');
      joinCodeBox.style.cssText = `
        padding: 0.75rem 1.25rem;
        background: linear-gradient(135deg, ${COLORS.PRIMARY_HEX}15, ${COLORS.ACCENT_HEX}10);
        border: 1px solid ${COLORS.PRIMARY_HEX}60;
        border-radius: 6px;
        margin-bottom: 1rem;
        max-width: 90%;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      `;

      const joinLabel = document.createElement('div');
      joinLabel.textContent = 'JOIN CODE';
      joinLabel.style.cssText = `
        font-size: 0.7rem;
        font-weight: bold;
        color: ${COLORS.TEXT_SECONDARY};
        letter-spacing: 0.15em;
      `;
      joinCodeBox.appendChild(joinLabel);

      const codeRow = document.createElement('div');
      codeRow.style.cssText = `
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
      `;

      const codeText = document.createElement('div');
      codeText.textContent = codeToShow;
      codeText.style.cssText = `
        flex: 1;
        font-family: monospace;
        font-size: 0.8rem;
        color: ${COLORS.TEXT};
        word-break: break-all;
        user-select: all;
        cursor: text;
      `;
      codeRow.appendChild(codeText);

      const copyBtn = document.createElement('button');
      copyBtn.innerHTML = '&#128203; Copy';
      copyBtn.style.cssText = `
        padding: 0.4rem 0.8rem;
        font-size: 0.8rem;
        font-weight: bold;
        background: ${COLORS.PRIMARY_HEX}30;
        border: 1px solid ${COLORS.PRIMARY_HEX};
        color: ${COLORS.TEXT};
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
      `;
      copyBtn.addEventListener('mouseenter', () => {
        copyBtn.style.background = `${COLORS.PRIMARY_HEX}50`;
      });
      copyBtn.addEventListener('mouseleave', () => {
        if (!copyBtn.dataset.copied) copyBtn.style.background = `${COLORS.PRIMARY_HEX}30`;
      });
      copyBtn.addEventListener('click', () => {
        navigator.clipboard?.writeText(codeToShow).then(() => {
          copyBtn.dataset.copied = '1';
          copyBtn.innerHTML = '&#10003; Copied!';
          copyBtn.style.background = `${COLORS.INTEGRITY_GREEN}40`;
          copyBtn.style.borderColor = COLORS.INTEGRITY_GREEN;
          setTimeout(() => {
            delete copyBtn.dataset.copied;
            copyBtn.innerHTML = '&#128203; Copy';
            copyBtn.style.background = `${COLORS.PRIMARY_HEX}30`;
            copyBtn.style.borderColor = COLORS.PRIMARY_HEX;
          }, 2000);
        });
      });
      codeRow.appendChild(copyBtn);

      joinCodeBox.appendChild(codeRow);

      const hint = document.createElement('div');
      hint.textContent = 'Share this code with a friend to join your lobby';
      hint.style.cssText = `
        font-size: 0.7rem;
        color: ${COLORS.TEXT_SECONDARY};
        font-style: italic;
      `;
      joinCodeBox.appendChild(hint);

      this._element.appendChild(joinCodeBox);
    }
    
    // Main content
    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 100%;
      max-width: 600px;
      padding: 0 1rem 1rem;
      overflow: hidden;
    `;
    
    // Split into players and chat
    const splitView = document.createElement('div');
    splitView.style.cssText = `
      flex: 1;
      display: flex;
      gap: 1rem;
      min-height: 0;
    `;
    
    // Player list panel
    const playersPanel = document.createElement('div');
    playersPanel.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      background: ${COLORS.UI_PANEL}20;
      border: 1px solid ${COLORS.UI_BORDER};
      border-radius: 4px;
      padding: 0.5rem;
    `;
    
    const playersLabel = document.createElement('div');
    playersLabel.textContent = 'Players';
    playersLabel.style.cssText = `
      color: ${COLORS.TEXT_SECONDARY};
      font-size: 0.8rem;
      margin-bottom: 0.5rem;
    `;
    playersPanel.appendChild(playersLabel);
    
    this._playerList = document.createElement('div');
    this._playerList.style.cssText = `
      flex: 1;
      overflow-y: auto;
    `;
    playersPanel.appendChild(this._playerList);
    this.updatePlayers(options.players ?? []);
    
    splitView.appendChild(playersPanel);
    
    // Chat panel
    const chatPanel = document.createElement('div');
    chatPanel.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      background: ${COLORS.UI_PANEL}20;
      border: 1px solid ${COLORS.UI_BORDER};
      border-radius: 4px;
      padding: 0.5rem;
    `;
    
    const chatLabel = document.createElement('div');
    chatLabel.textContent = 'Chat';
    chatLabel.style.cssText = `
      color: ${COLORS.TEXT_SECONDARY};
      font-size: 0.8rem;
      margin-bottom: 0.5rem;
    `;
    chatPanel.appendChild(chatLabel);
    
    this._chatContainer = document.createElement('div');
    this._chatContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
      background: rgba(0,0,0,0.2);
      border-radius: 2px;
    `;
    chatPanel.appendChild(this._chatContainer);
    
    // Chat input row
    const chatInputRow = document.createElement('div');
    chatInputRow.style.cssText = `
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    `;
    
    this._chatInput = document.createElement('input');
    this._chatInput.type = 'text';
    this._chatInput.placeholder = 'Type a message...';
    this._chatInput.style.cssText = `
      flex: 1;
      padding: 0.5rem;
      background: rgba(0,0,0,0.3);
      border: 1px solid ${COLORS.UI_BORDER};
      border-radius: 4px;
      color: ${COLORS.TEXT};
      font-size: 0.9rem;
    `;
    this._chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const text = this._chatInput.value.trim();
        if (!text) return;
        this.emit(LobbyUIEvent.SEND_CHAT, text);
        this._chatInput.value = '';
      }
    });
    chatInputRow.appendChild(this._chatInput);
    
    const sendBtn = document.createElement('button');
    sendBtn.textContent = 'Send';
    sendBtn.style.cssText = `
      padding: 0.5rem 1rem;
      background: ${COLORS.UI_PANEL};
      border: 1px solid ${COLORS.PRIMARY_HEX};
      color: ${COLORS.TEXT};
      border-radius: 4px;
      cursor: pointer;
    `;
    sendBtn.addEventListener('click', () => {
      const text = this._chatInput.value.trim();
      if (!text) return;
      this.emit(LobbyUIEvent.SEND_CHAT, text);
      this._chatInput.value = '';
    });
    chatInputRow.appendChild(sendBtn);
    
    chatPanel.appendChild(chatInputRow);
    splitView.appendChild(chatPanel);
    
    content.appendChild(splitView);
    
    // Bottom buttons
    const buttons = document.createElement('div');
    buttons.style.cssText = `
      display: flex;
      gap: 1rem;
      justify-content: space-between;
    `;
    
    // Leave button
    const leaveBtn = this._createButton('LEAVE', COLORS.INTEGRITY_RED);
    leaveBtn.style.flex = '1';
    leaveBtn.addEventListener('click', () => {
      this.emit(LobbyUIEvent.LEAVE_LOBBY);
    });
    buttons.appendChild(leaveBtn);
    
    // Ready button
    this._readyBtn = this._createButton('READY', COLORS.INTEGRITY_GREEN);
    this._readyBtn.style.flex = '1';
    this._readyBtn.addEventListener('click', () => {
      if (this._readyPending) return;
      const nextReady = !this._isReady;
      this.setReadyPending(true);
      this.emit(LobbyUIEvent.READY, nextReady);
    });
    buttons.appendChild(this._readyBtn);
    
    // Start button (host only)
    if (this._isHost) {
      const startBtn = this._createButton('START GAME', COLORS.PRIMARY_HEX);
      startBtn.style.flex = '1';
      startBtn.addEventListener('click', () => {
        this.emit(LobbyUIEvent.START_GAME);
      });
      buttons.appendChild(startBtn);
    }
    
    content.appendChild(buttons);
    this._element.appendChild(content);
  }

  _createLobbyItem(lobby) {
    const item = document.createElement('div');
    item.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background: ${COLORS.UI_PANEL}40;
      border: 1px solid ${COLORS.UI_BORDER};
      border-radius: 4px;
      margin-bottom: 0.5rem;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    
    item.addEventListener('mouseenter', () => {
      item.style.borderColor = COLORS.PRIMARY;
      item.style.background = `${COLORS.PRIMARY_HEX}20`;
    });
    
    item.addEventListener('mouseleave', () => {
      item.style.borderColor = COLORS.UI_BORDER;
      item.style.background = `${COLORS.UI_PANEL}40`;
    });
    
    item.addEventListener('click', () => {
      this.emit(LobbyUIEvent.JOIN_LOBBY, lobby);
    });
    
    // Parse lobby info from payload if available
    const lobbyName = lobby.lobbyName || this._extractLobbyName(lobby.payload) || 'Kaspa Lobby';
    
    const info = document.createElement('div');
    info.innerHTML = `
      <div style="color: ${COLORS.TEXT}; font-weight: bold;">${this._escapeHtml(lobbyName)}</div>
      <div style="color: ${COLORS.TEXT_SECONDARY}; font-size: 0.75rem;">
        TX: ${(lobby.txid || '').substring(0, 12)}...
      </div>
    `;
    item.appendChild(info);
    
    const joinBtn = document.createElement('button');
    joinBtn.textContent = 'JOIN';
    joinBtn.style.cssText = `
      padding: 0.4rem 1rem;
      background: ${COLORS.PRIMARY_HEX}40;
      border: 1px solid ${COLORS.PRIMARY_HEX};
      color: ${COLORS.TEXT};
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: bold;
    `;
    item.appendChild(joinBtn);
    
    return item;
  }

  _extractLobbyName(payload) {
    if (!payload) return null;
    try {
      // Try to extract name from payload JSON
      const match = payload.match(/"lobbyName"\s*:\s*"([^"]+)"/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  _updateReadyButton() {
    if (!this._readyBtn) return;

    if (this._readyPending) {
      this._readyBtn.textContent = 'SENDING...';
      this._readyBtn.style.borderColor = COLORS.TEXT_SECONDARY;
      this._readyBtn.style.opacity = '0.7';
      this._readyBtn.disabled = true;
      return;
    }

    this._readyBtn.disabled = false;
    this._readyBtn.style.opacity = '1';
    if (this._isReady) {
      this._readyBtn.textContent = 'NOT READY';
      this._readyBtn.style.borderColor = COLORS.INTEGRITY_ORANGE;
    } else {
      this._readyBtn.textContent = 'READY';
      this._readyBtn.style.borderColor = COLORS.INTEGRITY_GREEN;
    }
  }

  setReadyState(isReady) {
    this._isReady = !!isReady;
    this._readyPending = false;
    this._updateReadyButton();
  }

  setReadyPending(isPending) {
    this._readyPending = !!isPending;
    this._updateReadyButton();
  }

  _getBaseStyles() {
    return `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      background: linear-gradient(180deg, 
        rgba(10, 10, 20, 0.98) 0%, 
        rgba(20, 10, 30, 0.99) 100%);
      z-index: 100;
      opacity: 0;
      transition: opacity 0.3s ease;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      overflow: hidden;
    `;
  }

  _createHeader(text) {
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 1.5rem;
      text-align: center;
    `;
    header.innerHTML = `
      <div style="
        font-size: clamp(1.5rem, 5vw, 2rem);
        font-weight: bold;
        background: linear-gradient(135deg, ${COLORS.PRIMARY_HEX} 0%, ${COLORS.ACCENT_HEX} 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      ">${this._escapeHtml(text)}</div>
    `;
    return header;
  }

  _createButton(text, color) {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
      padding: 0.75rem 1.5rem;
      font-size: 0.9rem;
      font-weight: bold;
      letter-spacing: 0.1em;
      color: ${COLORS.TEXT};
      background: transparent;
      border: 2px solid ${color};
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    
    button.addEventListener('mouseenter', () => {
      button.style.background = `${color}20`;
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.background = 'transparent';
    });
    
    return button;
  }

  _addSpinnerStyles() {
    if (document.getElementById('ks-spinner-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'ks-spinner-styles';
    style.textContent = `
      @keyframes ks-spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clean up
   */
  destroy() {
    this.hideCreating();
    this._preparingOverlay?.destroy();
    this.hide();
    this.removeAllListeners();
    this._foundLobbies.clear();
    log.info('LobbyUI destroyed');
  }
}

export default LobbyUI;
