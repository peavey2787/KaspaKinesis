/**
 * MenuPresenter.js - Bridge between game state and MainMenu/LobbyUI
 *
 * Responsibilities:
 * - Show/hide main menu
 * - Show/hide lobby UI
 * - Forward menu events to GameFacade
 * - Manage globalState for MENU/LOBBY screens
 */

import { EventEmitter } from "../../core/EventEmitter.js";
import { Logger } from "../../core/Logger.js";
import { globalState, UIState } from "../../core/StateManager.js";
import { MainMenu, MenuEvent } from "../../ui/MainMenu.js";
import { SettingsMenu, SettingsMenuEvent } from "../../ui/SettingsMenu.js";
import { LobbyUI, LobbyUIEvent } from "../../ui/LobbyUI.js";

const log = Logger.create("MenuPresenter");

/**
 * Menu presenter events
 */
export const MenuPresenterEvent = Object.freeze({
  SINGLE_PLAYER: "singlePlayer",
  MULTIPLAYER: "multiplayer",
  SETTINGS: "settings",
  SETTINGS_CLOSED: "settingsClosed",
  SETTINGS_QUIT: "settingsQuit",
  CREATE_LOBBY: "createLobby",
  SEARCH_LOBBIES: "searchLobbies",
  JOIN_LOBBY: "joinLobby",
  JOIN_BY_CODE: "joinByCode",
  LEAVE_LOBBY: "leaveLobby",
  SEND_CHAT: "sendChat",
  READY: "ready",
  START_GAME: "startGame",
  BACK: "back",
});

export class MenuPresenter extends EventEmitter {
  constructor(container) {
    super();

    this._container = container;
    this._mainMenu = null;
    this._lobbyUI = null;
    this._settingsMenu = null;
    this._audioManager = null;
  }

  /**
   * Initialize menus
   */
  init() {
    this._mainMenu = new MainMenu(this._container);
    this._lobbyUI = new LobbyUI(this._container);
    this._settingsMenu = new SettingsMenu(this._container);

    this._setupMenuListeners();
    this._setupLobbyListeners();
    this._setupSettingsListeners();

    log.info("MenuPresenter initialized");
  }

  setAudioManager(audioManager) {
    this._audioManager = audioManager;
    this._settingsMenu?.setAudioManager(audioManager);
  }

  /**
   * Show main menu
   */
  showMainMenu() {
    globalState.uiState = UIState.MENU;
    this._lobbyUI.hide();
    this._mainMenu.show();
  }

  /**
   * Hide main menu
   */
  hideMainMenu() {
    this._mainMenu.hide();
  }

  /**
   * Show lobby browser
   */
  showLobbyBrowser() {
    globalState.uiState = UIState.LOBBY;
    this._mainMenu.hide();
    this._lobbyUI.showBrowser();
  }

  /**
   * Show creating lobby overlay
   */
  showLobbyCreating() {
    this._lobbyUI.showCreating();
  }

  /**
   * Hide creating lobby overlay
   */
  hideLobbyCreating() {
    this._lobbyUI.hideCreating();
  }

  /**
   * Add discovered lobby to the browser
   * @param {Object} lobby - Lobby discovery data
   */
  addDiscoveredLobby(lobby) {
    this._lobbyUI.addDiscoveredLobby(lobby);
  }

  /**
   * Set lobby searching state
   * @param {boolean} isSearching
   */
  setLobbySearching(isSearching) {
    this._lobbyUI.setSearching(isSearching);
  }

  /**
   * Show lobby room
   * @param {Object} options
   */
  showLobbyRoom(options) {
    this._lobbyUI.hide();
    this._lobbyUI.showRoom(options);
  }

  /**
   * Hide lobby UI
   */
  hideLobbyUI() {
    this._lobbyUI.hide();
  }

  /**
   * Update players in lobby
   * @param {Array} players
   */
  updateLobbyPlayers(players) {
    this._lobbyUI.updatePlayers(players);
  }

  /**
   * Add chat message to lobby
   * @param {Object} message
   */
  addLobbyChat(message) {
    this._lobbyUI.addChatMessage(message);
  }

  setLobbyReadyState(isReady) {
    this._lobbyUI?.setReadyState?.(isReady);
  }

  setLobbyReadyPending(isPending) {
    this._lobbyUI?.setReadyPending?.(isPending);
  }

  /**
   * Hide all menus
   */
  hideAll() {
    this._mainMenu.hide();
    this._lobbyUI.hide();
    this._settingsMenu?.hide();
  }

  showSettings(options = {}) {
    this._mainMenu.hide();
    this._lobbyUI.hide();
    this._settingsMenu?.setAudioManager(this._audioManager);
    this._settingsMenu?.show(options);
  }

  hideSettings() {
    this._settingsMenu?.hide();
  }

  /**
   * Get the current display name from the lobby UI
   * @returns {string}
   */
  get displayName() {
    return this._lobbyUI?.displayName || '';
  }

  /**
   * Destroy presenter
   */
  destroy() {
    this._mainMenu?.destroy();
    this._lobbyUI?.destroy();
    this._settingsMenu?.destroy();
    this.removeAllListeners();
    log.info("MenuPresenter destroyed");
  }

  // ─── Private Methods ───────────────────────────────────────────

  _setupMenuListeners() {
    this._mainMenu.on(MenuEvent.SINGLE_PLAYER, () => {
      this.emit(MenuPresenterEvent.SINGLE_PLAYER);
    });

    this._mainMenu.on(MenuEvent.MULTIPLAYER, () => {
      this.emit(MenuPresenterEvent.MULTIPLAYER);
    });

    this._mainMenu.on(MenuEvent.SETTINGS, () => {
      this.emit(MenuPresenterEvent.SETTINGS);
    });
  }

  _setupLobbyListeners() {
    this._lobbyUI.on(LobbyUIEvent.CREATE_LOBBY, (data) => {
      this.emit(MenuPresenterEvent.CREATE_LOBBY, data);
    });

    this._lobbyUI.on(LobbyUIEvent.SEARCH_LOBBIES, () => {
      this.emit(MenuPresenterEvent.SEARCH_LOBBIES);
    });

    this._lobbyUI.on(LobbyUIEvent.JOIN_LOBBY, (lobbyDiscovery) => {
      this.emit(MenuPresenterEvent.JOIN_LOBBY, lobbyDiscovery);
    });

    this._lobbyUI.on(LobbyUIEvent.JOIN_BY_CODE, (code) => {
      this.emit(MenuPresenterEvent.JOIN_BY_CODE, code);
    });

    this._lobbyUI.on(LobbyUIEvent.LEAVE_LOBBY, () => {
      this.emit(MenuPresenterEvent.LEAVE_LOBBY);
    });

    this._lobbyUI.on(LobbyUIEvent.BACK, () => {
      this.emit(MenuPresenterEvent.BACK);
    });

    this._lobbyUI.on(LobbyUIEvent.SEND_CHAT, (text) => {
      this.emit(MenuPresenterEvent.SEND_CHAT, text);
    });

    this._lobbyUI.on(LobbyUIEvent.READY, (isReady) => {
      this.emit(MenuPresenterEvent.READY, isReady);
    });

    this._lobbyUI.on(LobbyUIEvent.START_GAME, () => {
      this.emit(MenuPresenterEvent.START_GAME);
    });
  }

  _setupSettingsListeners() {
    this._settingsMenu.on(SettingsMenuEvent.CLOSE, (data) => {
      this.hideSettings();
      this.emit(MenuPresenterEvent.SETTINGS_CLOSED, data);
    });

    this._settingsMenu.on(SettingsMenuEvent.QUIT, (data) => {
      this.hideSettings();
      this.emit(MenuPresenterEvent.SETTINGS_QUIT, data);
    });
  }
}

export default MenuPresenter;
