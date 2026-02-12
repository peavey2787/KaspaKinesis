/**
 * GameFacade.js - Thin wrapper orchestrating
 *
 * This is the primary PUBLIC API for the game. It delegates to specialized modules:
 * - SessionController: Game lifecycle, DAA countdown, VRF, audio/HUD feedback
 * - LobbyController: Multiplayer lobbies, P2P messaging
 * - PlayerController: Input → GameEngine
 * - HUDPresenter: DOM-based UI (progress bar, coins, game over, globalState.GAME)
 * - MenuPresenter: Main menu and lobby UI (globalState.MENU/LOBBY)
 * - RenderPresenter: Three.js/WebGL rendering (lanes, track, obstacles)
 *
 * The facade uses kkGameEngine as the single entry point for all Kaspa blockchain
 * interactions (VRF, moves, anchoring, wallet, lobby). It no longer knows about:
 * - Three.js concepts (lanes, jumpY, track speed)
 * - Game-specific audio/HUD wiring (moved to SessionController)
 * - globalState management (handled by presenters)
 * - Direct blockchain operations (handled by kkGameEngine)
 */

import { EventEmitter } from "./core/EventEmitter.js";
import { Logger } from "./core/Logger.js";
import { STRINGS } from "./core/Constants.js";
import { globalState } from "./core/StateManager.js";

// Engine
import { GameEngine, GameState } from "./engine/GameEngine.js";
import { InputManager, InputEvent } from "./input/InputManager.js";
import { getAudioManager } from "./audio/AudioManager.js";
import { IntegrityMonitor } from "./integrity/IntegrityMonitor.js";

// Renderer (assets)
import { SceneManager } from "./renderer/SceneManager.js";
import { PlayerModel } from "./renderer/PlayerModel.js";
import { TrackGenerator } from "./renderer/TrackGenerator.js";
import { ObstacleFactory } from "./renderer/ObstacleFactory.js";

// Modules
import {
  SessionController,
  SessionEvent,
} from "./modules/session/SessionController.js";
import {
  LobbyController,
  LobbyEvent,
} from "./modules/lobby/LobbyController.js";
import { HUDPresenter, HUDPresenterEvent } from "./modules/ui/HUDPresenter.js";
import {
  MenuPresenter,
  MenuPresenterEvent,
} from "./modules/ui/MenuPresenter.js";
import { PlayerController } from "./modules/input/PlayerController.js";
import { RenderPresenter } from "./modules/renderer/RenderPresenter.js";

// Wallet UI
import { WalletHUD, WalletHUDEvent } from "./ui/WalletHUD.js";
import { WalletModal, WalletModalEvent } from "./ui/WalletModal.js";
import { WalletPasswordModal } from "./ui/WalletPasswordModal.js";

const log = Logger.create("GameFacade");

/**
 * Game facade events (public API)
 */
export const FacadeEvent = Object.freeze({
  INITIALIZED: "initialized",
  GAME_STARTED: "gameStarted",
  GAME_ENDED: "gameEnded",
  GAME_STARTING: "gameStarting",
  GAME_START_RETRY: "gameStartRetry",
  GAME_START_READY: "gameStartReady",
  GAME_START_FAILED: "gameStartFailed",
  ERROR: "error",
});

export class GameFacade extends EventEmitter {
  constructor(container, options = {}) {
    super();

    this._container = container;
    this._kkGameEngine = options.kkGameEngine ?? null;

    // Core systems
    this._gameEngine = null;
    this._inputManager = null;
    this._audioManager = null;
    this._integrityMonitor = null;

    // Renderer (assets - created here, orchestrated by RenderPresenter)
    this._sceneManager = null;
    this._playerModel = null;
    this._trackGenerator = null;
    this._obstacleFactory = null;

    // Controllers / Presenters (delegated modules)
    this._sessionController = null;
    this._lobbyController = null;
    this._playerController = null;
    this._hudPresenter = null;
    this._menuPresenter = null;
    this._renderPresenter = null;

    // Identity
    this._playerId = null;

    // Wallet UI
    this._walletHUD = null;
    this._walletModal = null;
    this._walletPasswordModal = null;
    this._walletPassword = null;
    this._walletDeletedOverlay = null;

    // State flags
    this._initialized = false;
    this._balanceSubscribed = false;
    this._gameEndHandled = false;
    this._readyStates = new Map();
    this._autoStartTimer = null;
    this._isMultiplayerHost = false;
    this._lastMultiplayerStartData = null;
    this._multiplayerStartInProgress = false;

    // Opponent state tracking (multiplayer)
    this._opponentProgress = 0;
    this._opponentCoins = 0;
    this._opponentEndReason = null;
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════

  /**
   * Initialize all systems
   */
  async init() {
    if (this._initialized) return;

    log.info("Initializing GameFacade...");

    try {
      this._setupContainer();
      await this._initRenderer();
      this._initCoreSystems();
      this._initModules();
      this._wireModuleEvents();
      this._wireWalletEvents();

      this._initialized = true;

      log.info("GameFacade initialized");
      this.emit(FacadeEvent.INITIALIZED);

      this.showMainMenu();
    } catch (e) {
      log.error("Initialization failed", e);
      this.emit(FacadeEvent.ERROR, {
        message: "Failed to initialize game",
        error: e,
      });
      throw e;
    }
  }

  /**
   * Show main menu
   */
  async showMainMenu() {
    this._hudPresenter.hide();
    this._menuPresenter.showMainMenu();

    if (this._gameEngine.state !== GameState.IDLE) {
      await this._cleanupGame();
    }
  }

  /**
   * Start single player game
   */
  async startSinglePlayer() {
    if (
      this._gameEngine.state !== GameState.IDLE &&
      this._gameEngine.state !== GameState.ENDED
    ) {
      log.warn("Game already starting or running");
      return;
    }

    log.info("Starting single player game");

    try {
      await this._audioManager.init();
      await this._audioManager.loadMusic();
      await this._audioManager.resume();

      // Ensure UTXO pool is ready before game start (avoid degraded/test mode)
      if (this._kkGameEngine?.prepareUtxoPool) {
        await this._kkGameEngine.prepareUtxoPool();
      }

      await this._startGameWithRetry("singlePlayer", async () => {
        return await this._sessionController.startSinglePlayer(this._playerId);
      });
    } catch (e) {
      const message = e?.message || "VRF REQUIRED: Unable to start game";
      log.error(message, e);
      this.emit(FacadeEvent.ERROR, { message, error: e, phase: "start" });
    }
  }

  /**
   * Show multiplayer lobby browser
   */
  async showLobbyBrowser() {
    log.info("Showing lobby browser");

    await this._audioManager.init();
    await this._audioManager.loadMusic();
    await this._audioManager.resume();

    this._menuPresenter.showLobbyBrowser();
  }

  /**
   * Retry a failed multiplayer game start.
   * Re-runs the same start flow (host or joiner) so the user doesn't
   * have to leave the lobby and re-create everything.
   */
  async retryMultiplayerStart() {
    log.info("Retrying multiplayer game start", {
      isHost: this._isMultiplayerHost,
    });

    if (this._isMultiplayerHost) {
      await this._startMultiplayerGame();
    } else if (this._lastMultiplayerStartData) {
      await this._onMultiplayerGameStart(this._lastMultiplayerStartData);
    } else {
      // Fallback: go back to main menu if we lost context
      log.warn("No multiplayer start context available, returning to menu");
      await this.showMainMenu();
    }
  }

  /**
   * Start searching for lobbies on the blockchain
   */
  startLobbySearch() {
    log.info("Starting lobby search");
    this._menuPresenter.setLobbySearching(true);

    this._lobbyController.startSearch();
  }

  /**
   * Stop searching for lobbies
   */
  stopLobbySearch() {
    this._lobbyController.stopSearch();
    this._menuPresenter.setLobbySearching(false);
  }

  /**
   * Create a new lobby
   * @param {string} lobbyName - Display name for the lobby
   * @param {string} [displayName] - Your display name
   * @param {number} [maxPlayers=2] - Maximum players allowed (2-8)
   */
  async createLobby(lobbyName, displayName, maxPlayers = 2) {
    this._menuPresenter.showLobbyCreating();
    this._readyStates.clear();

    try {
      const lobbyData = await this._lobbyController.create(lobbyName, displayName, maxPlayers);

      this._menuPresenter.hideLobbyCreating();

      this._menuPresenter.showLobbyRoom({
        lobbyId: lobbyData.lobbyId,
        lobbyName: lobbyData.lobbyName || lobbyName,
        joinCode: lobbyData.joinCode || null,
        isHost: true,
        players: this._lobbyController.players,
      });

      this._menuPresenter.addLobbyChat({
        isSystem: true,
        text: STRINGS.LOBBY.CREATED,
      });
    } catch (e) {
      this._menuPresenter.hideLobbyCreating();
      log.error('Failed to create lobby', e);
      this._hudPresenter.showToast('Failed to create lobby', 'error');
    }
  }

  /**
   * Join an existing lobby
   * @param {Object} lobbyDiscovery - Discovery anchor from search
   * @param {string} [displayName] - Your display name
   */
  async joinLobby(lobbyDiscovery, displayName) {
    this._menuPresenter.showLobbyCreating();
    this._readyStates.clear();

    try {
      const lobbyData = await this._lobbyController.join(lobbyDiscovery, displayName);

      this._menuPresenter.hideLobbyCreating();

      this._menuPresenter.showLobbyRoom({
        lobbyId: lobbyData.lobbyId,
        lobbyName: lobbyData.lobbyName,
        joinCode: lobbyData.joinCode || null,
        isHost: false,
        players: this._lobbyController.players,
      });

      this._menuPresenter.addLobbyChat({
        isSystem: true,
        text: STRINGS.LOBBY.JOINED,
      });
    } catch (e) {
      this._menuPresenter.hideLobbyCreating();
      log.error('Failed to join lobby', e);
      this._hudPresenter.showToast('Failed to join lobby', 'error');
    }
  }

  /**
   * Join a lobby by its join code (block hash)
   * @param {string} joinCode - Join code string
   * @param {string} [displayName] - Your display name
   */
  async joinLobbyByCode(joinCode, displayName) {
    log.info('Joining lobby by code', { joinCode: joinCode.substring(0, 16) + '...' });
    this._menuPresenter.showLobbyCreating();
    this._readyStates.clear();

    try {
      const lobbyData = await this._lobbyController.join(joinCode, displayName);

      this._menuPresenter.hideLobbyCreating();

      this._menuPresenter.showLobbyRoom({
        lobbyId: lobbyData.lobbyId,
        lobbyName: lobbyData.lobbyName,
        joinCode: joinCode,
        isHost: false,
        players: this._lobbyController.players,
      });

      this._menuPresenter.addLobbyChat({
        isSystem: true,
        text: STRINGS.LOBBY.JOINED,
      });
    } catch (e) {
      this._menuPresenter.hideLobbyCreating();
      log.error('Failed to join lobby by code', e);
      this._hudPresenter.showToast('Invalid join code or lobby not found', 'error');
    }
  }

  /**
   * Leave current lobby
   */
  async leaveLobby() {
    this.stopLobbySearch();
    await this._lobbyController.leave();
    this.showMainMenu();
  }

  /**
   * Set kkGameEngine reference
   * @param {Object} engine - KKGameEngine instance
   */
  setKKGameEngine(engine) {
    this._kkGameEngine = engine;
    this._sessionController?.setDependencies({ kkGameEngine: engine });
    this._lobbyController?.setKKGameEngine(engine);
    this._walletModal?.setKKGameEngine(engine);
    this._subscribeBalanceUpdates(engine);
    log.info("KKGameEngine set");
  }

  /**
   * Update wallet balance (called from onBalanceChange callback)
   * @param {string} balanceKas - Formatted balance string
   */
  updateWalletBalance(balanceKas) {
    this._walletHUD?.updateBalance(balanceKas);
    this._walletModal?.updateBalance(balanceKas);
  }

  /**
   * Subscribe to live balance updates from a kkGameEngine instance.
   * Safe to call multiple times — duplicates are ignored via the guard flag.
   * @param {Object|null} engine
   */
  _subscribeBalanceUpdates(engine) {
    if (!engine?.on || this._balanceSubscribed) return;
    this._balanceSubscribed = true;

    engine.on("balanceChanged", (data) => {
      const bal = data?.balance;
      if (bal == null) return;
      const formatted = typeof bal === "number" ? bal.toFixed(8) : String(bal);
      this.updateWalletBalance(formatted);
    });

    log.debug("Subscribed to kkGameEngine balance updates");
  }

  /**
   * Set wallet password (for mnemonic retrieval)
   * @param {string} password
   */
  setWalletPassword(password) {
    this._walletPassword = password;
  }

  /**
   * Initialize wallet HUD with current address and balance
   */
  async initWalletDisplay() {
    if (!this._kkGameEngine) return;

    const address = this._kkGameEngine.address || "";
    const balance = await this._kkGameEngine.getBalance();

    // Balance is already in KAS from kkGameEngine
    const balanceKas = balance ? balance.toFixed(8) : "0";

    this._walletHUD?.updateBalance(balanceKas);

    log.info("Wallet display initialized", {
      address: address?.toString().slice(0, 20) + "...",
      balance: balanceKas,
    });
  }

  /**
   * Clean up and destroy
   */
  async destroy() {
    log.info("Destroying GameFacade...");

    await this._cleanupGame();

    // Destroy renderer components (must be before SceneManager)
    this._obstacleFactory?.destroy();
    this._trackGenerator?.destroy();
    this._playerModel?.destroy();

    this._sceneManager?.destroy();
    this._inputManager?.destroy();
    this._audioManager?.destroy();
    this._gameEngine?.destroy();
    this._integrityMonitor?.destroy();

    this._sessionController?.destroy();
    this._lobbyController?.destroy();
    this._playerController?.destroy();
    this._hudPresenter?.destroy();
    this._menuPresenter?.destroy();
    this._renderPresenter?.destroy();

    // Wallet UI
    this._walletHUD?.destroy();
    this._walletModal?.destroy();
    this._walletPasswordModal?.destroy();
    if (this._walletDeletedOverlay?.parentNode) {
      this._walletDeletedOverlay.parentNode.removeChild(
        this._walletDeletedOverlay,
      );
    }
    this._walletDeletedOverlay = null;

    this._initialized = false;
    this.removeAllListeners();

    log.info("GameFacade destroyed");
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE - INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  _setupContainer() {
    // Force container dimensions for mobile (iOS Safari especially)
    const width = this._container.clientWidth || window.innerWidth;
    const height = this._container.clientHeight || window.innerHeight;

    log.info('Setting up container', {
      clientWidth: this._container.clientWidth,
      clientHeight: this._container.clientHeight,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      usingWidth: width,
      usingHeight: height
    });

    this._container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: #0a0a14;
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    `;
  }

  async _initRenderer() {
    // Cleanup-Before-Create: destroy existing renderer instances to prevent leaks
    if (this._obstacleFactory) {
      this._obstacleFactory.destroy();
      this._obstacleFactory = null;
    }
    if (this._trackGenerator) {
      this._trackGenerator.destroy();
      this._trackGenerator = null;
    }
    if (this._playerModel) {
      this._playerModel.destroy();
      this._playerModel = null;
    }
    if (this._sceneManager) {
      this._sceneManager.destroy();
      this._sceneManager = null;
    }

    // Create renderer assets
    this._sceneManager = new SceneManager(this._container);
    await this._sceneManager.init();

    this._playerModel = new PlayerModel(this._sceneManager);
    this._playerModel.init();

    this._trackGenerator = new TrackGenerator(this._sceneManager);
    this._trackGenerator.init();

    this._obstacleFactory = new ObstacleFactory(this._sceneManager);
    this._obstacleFactory.init();

    // RenderPresenter will be initialized in _initModules after GameEngine exists
  }

  _initCoreSystems() {
    this._audioManager = getAudioManager();
    this._inputManager = new InputManager({ target: this._container });
    this._inputManager.enable();

    this._gameEngine = new GameEngine();
    this._integrityMonitor = new IntegrityMonitor();
  }

  _initModules() {
    // HUD presenter (first - needed by SessionController)
    this._hudPresenter = new HUDPresenter(this._container);
    this._hudPresenter.init();

    // Menu presenter
    this._menuPresenter = new MenuPresenter(this._container);
    this._menuPresenter.init();
    this._menuPresenter.setAudioManager(this._audioManager);

    // Session controller (handles all game-specific audio/HUD wiring internally)
    this._sessionController = new SessionController();
    this._sessionController.setDependencies({
      kkGameEngine: this._kkGameEngine,
      gameEngine: this._gameEngine,
      integrityMonitor: this._integrityMonitor,
      audioManager: this._audioManager,
      hudPresenter: this._hudPresenter,
    });

    // Lobby controller
    this._lobbyController = new LobbyController();
    this._lobbyController.setKKGameEngine(this._kkGameEngine);

    // Player controller
    this._playerController = new PlayerController();
    this._playerController.setDependencies({
      inputManager: this._inputManager,
      gameEngine: this._gameEngine,
      playerModel: this._playerModel,
      audioManager: this._audioManager,
      kkGameEngine: this._kkGameEngine,
      integrityMonitor: this._integrityMonitor,
    });

    // Render presenter
    this._renderPresenter = new RenderPresenter();
    this._renderPresenter.setDependencies({
      sceneManager: this._sceneManager,
      gameEngine: this._gameEngine,
      playerModel: this._playerModel,
      trackGenerator: this._trackGenerator,
      obstacleFactory: this._obstacleFactory,
    });
    this._renderPresenter.init();

    // Wallet UI
    this._walletHUD = new WalletHUD(this._container);
    this._walletHUD.init();

    // Wire wallet HUD to HUD presenter for gameplay mode control
    this._hudPresenter.setWalletHUD(this._walletHUD);

    this._walletModal = new WalletModal(this._container);
    this._walletModal.setKKGameEngine(this._kkGameEngine);

    this._walletPasswordModal = new WalletPasswordModal(this._container);

    // Generate player ID from wallet address or random
    this._playerId =
      this._kkGameEngine?.address?.toString() ||
      `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    log.info("Modules initialized", { playerId: this._playerId });
  }

  _wireModuleEvents() {
    this._inputManager.on(InputEvent.PAUSE, () => {
      const isGameActive =
        this._gameEngine?.state === GameState.RUNNING ||
        this._gameEngine?.state === GameState.PAUSED ||
        this._gameEngine?.state === GameState.COUNTDOWN;
      if (!isGameActive) {
        return;
      }
      this._openSettingsMenu("game");
    });

    // ─── Session Lifecycle Events ────────────────────────────────
    this._sessionController.on(SessionEvent.COUNTDOWN_TICK, (data) => {
      this._hudPresenter.showCountdown(data.value);
    });

    this._sessionController.on(SessionEvent.GAME_START, () => {
      this._playerController.enable();
    });

    this._sessionController.on(SessionEvent.PROGRESS_UPDATE, (data) => {
      this._hudPresenter.updateProgress(data.progress, data.remaining);
      if (this._sessionController.isMultiplayer) {
        this._updateStandings({
          myProgress: data.progress,
          myCoins: this._gameEngine?.coins ?? 0,
        });
      }
    });

    // Update standings when local player coins change
    this._sessionController.on(SessionEvent.HUD_COINS_UPDATE, (data) => {
      if (this._sessionController.isMultiplayer && typeof data.coins === 'number') {
        this._updateStandings({
          myProgress: this._gameEngine?.progress ?? 0,
          myCoins: data.coins,
        });
      }
    });

    this._sessionController.on(SessionEvent.OPPONENT_STATE_UPDATED, (data) => {
      // Ignore updates if opponent has already ended (lost/quit)
      if (this._opponentEndReason) {
        return;
      }

      this._opponentProgress = data.progress ?? this._opponentProgress;
      this._opponentCoins = data.coins ?? this._opponentCoins;

      this._gameEngine?.updateOpponentState({
        progress: this._opponentProgress,
        coins: this._opponentCoins,
      });

      this._hudPresenter.updateOpponentProgress(this._opponentProgress);
      this._updateStandings({
        myProgress: this._gameEngine?.progress ?? 0,
        myCoins: this._gameEngine?.coins ?? 0,
      });
    });

    this._sessionController.on(SessionEvent.OPPONENT_END, (data) => {
      this._opponentEndReason = data?.reason ?? "unknown";
      this._opponentProgress = data?.progress ?? this._opponentProgress;
      this._opponentCoins = data?.coins ?? this._opponentCoins;

      this._gameEngine?.updateOpponentState({
        progress: this._opponentProgress,
        coins: this._opponentCoins,
      });

      this._hudPresenter.updateOpponentProgress(this._opponentProgress);
      this._updateStandings({
        myProgress: this._gameEngine?.progress ?? 0,
        myCoins: this._gameEngine?.coins ?? 0,
      });
    });

    this._sessionController.on(SessionEvent.HUD_POWERUP_UPDATE, (powerupData) => {
      const isReversed = powerupData?.type?.id === "reverse";
      this._inputManager?.setReverseControls(isReversed);
    });

    this._sessionController.on(SessionEvent.SESSION_END, (results) => {
      this._onGameEnd(results);
    });

    // Background anchor completion events
    this._sessionController.on(SessionEvent.HUD_ANCHOR_COMPLETE, (data) => {
      this._hudPresenter.updateAnchorStatus({
        isAnchoring: false,
        success: data.success,
        txId: data.txId,
      });
    });

    this._sessionController.on(SessionEvent.HUD_ANCHOR_RETRY, (data) => {
      this._hudPresenter.updateAnchorStatus({
        isAnchoring: false,
        success: false,
        error: data.error,
      });
    });

    // ─── Lobby Lifecycle Events ──────────────────────────────────
    this._lobbyController.on(LobbyEvent.LOBBY_FOUND, (lobby) => {
      this._menuPresenter.addDiscoveredLobby(lobby);
    });

    this._lobbyController.on(LobbyEvent.CHAT_MESSAGE, (msg) => {
      this._menuPresenter.addLobbyChat(msg);
    });

    this._lobbyController.on(LobbyEvent.PLAYER_JOINED, (member) => {
      this._menuPresenter.updateLobbyPlayers(this._lobbyController.players);
      this._menuPresenter.addLobbyChat({
        isSystem: true,
        text: `${member.displayName || member.name || "Player"} joined`,
      });
    });

    this._lobbyController.on(LobbyEvent.PLAYER_LEFT, (member) => {
      this._menuPresenter.updateLobbyPlayers(this._lobbyController.players);
      this._menuPresenter.addLobbyChat({
        isSystem: true,
        text: `${member.displayName || member.name || "Player"} left`,
      });
      // Clear their ready state
      if (this._readyStates) {
        this._readyStates.delete(member.id || member.pub_sig);
      }
    });

    this._lobbyController.on(LobbyEvent.READY_STATE, (data) => {
      if (!this._readyStates) this._readyStates = new Map();
      this._readyStates.set(data.senderId, data.isReady);

      // Update player list with ready states
      const players = this._lobbyController.players.map(p => ({
        ...p,
        isReady: this._readyStates.get(p.id || p.pub_sig) ?? false,
      }));
      this._menuPresenter.updateLobbyPlayers(players);

      // Show ready status in chat
      const readyText = data.isReady ? 'is ready!' : 'is no longer ready';
      this._menuPresenter.addLobbyChat({
        isSystem: true,
        text: `${data.senderName} ${readyText}`,
      });

      // Check if all players are ready for auto-start (host only)
      this._checkAllReady(players);
    });

    this._lobbyController.on(LobbyEvent.LOBBY_LEFT, () => {
      this.showMainMenu();
    });

    this._lobbyController.on(LobbyEvent.GAME_START, async (data) => {
      await this._onMultiplayerGameStart(data);
    });

    this._lobbyController.on(LobbyEvent.GAME_ABORT, async (data) => {
      await this._onMultiplayerGameAbort(data);
    });


    // ─── HUD Navigation Events ───────────────────────────────────
    this._hudPresenter.on(HUDPresenterEvent.PAUSE_REQUESTED, () => {
      this._gameEngine.pause();
      this._renderPresenter.stop();
      this._audioManager.stopMusic();
      this._hudPresenter.showPauseMenu();
    });

    this._hudPresenter.on(HUDPresenterEvent.RESUME_REQUESTED, () => {
      this._gameEngine.resume();
      this._renderPresenter.start();
      this._audioManager.startMusic();
    });

    this._hudPresenter.on(HUDPresenterEvent.QUIT_REQUESTED, async () => {
      this._hudPresenter.hidePauseMenu();
      await this._cleanupGame();
      await this.showMainMenu();
    });

    this._hudPresenter.on(HUDPresenterEvent.RETRY_REQUESTED, async () => {
      this._hudPresenter.hideGameOver();
      await this._cleanupGame();

      // In multiplayer, return to lobby instead of retrying
      if (this._lobbyController.isInLobby) {
        this._showLobbyFromGame();
        return;
      }

      try {
        await this.startSinglePlayer();
      } catch (err) {
        log.error('Failed to start new game after retry', err);
        await this.showMainMenu();
      }
    });

    this._hudPresenter.on(HUDPresenterEvent.AUDIT_REQUESTED, () => {
      this._showAuditView();
    });

    this._hudPresenter.on(HUDPresenterEvent.SETTINGS_REQUESTED, () => {
      this._openSettingsMenu("game");
    });

    this._hudPresenter.on(HUDPresenterEvent.MAIN_MENU_REQUESTED, async () => {
      this._hudPresenter.hideGameOver();
      await this._cleanupGame();

      // In multiplayer, return to lobby instead of main menu
      if (this._lobbyController.isInLobby) {
        this._showLobbyFromGame();
        return;
      }

      await this.showMainMenu();
    });

    // ─── Menu Navigation Events ──────────────────────────────────
    this._menuPresenter.on(MenuPresenterEvent.SINGLE_PLAYER, () => {
      this._menuPresenter.hideMainMenu();
      this.startSinglePlayer();
    });

    this._menuPresenter.on(MenuPresenterEvent.SETTINGS, () => {
      this._menuPresenter.showSettings({ mode: "menu" });
    });

    this._menuPresenter.on(MenuPresenterEvent.MULTIPLAYER, () => {
      this.showLobbyBrowser();
    });

    this._menuPresenter.on(MenuPresenterEvent.CREATE_LOBBY, (data) => {
      this.createLobby(data?.lobbyName, data?.displayName, data?.maxPlayers);
    });

    this._menuPresenter.on(MenuPresenterEvent.SEARCH_LOBBIES, () => {
      this.startLobbySearch();
    });

    this._menuPresenter.on(MenuPresenterEvent.JOIN_LOBBY, (lobbyDiscovery) => {
      this.joinLobby(lobbyDiscovery, this._menuPresenter.displayName);
    });

    this._menuPresenter.on(MenuPresenterEvent.JOIN_BY_CODE, (code) => {
      this.joinLobbyByCode(code, this._menuPresenter.displayName);
    });

    this._menuPresenter.on(MenuPresenterEvent.LEAVE_LOBBY, () => {
      this.leaveLobby();
    });

    this._menuPresenter.on(MenuPresenterEvent.BACK, () => {
      this.showMainMenu();
    });

    this._menuPresenter.on(MenuPresenterEvent.SEND_CHAT, async (text) => {
      try {
        await this._lobbyController.sendChat(text);
        // Show message only after successful send
        this._menuPresenter.addLobbyChat({ sender: 'Self', text, timestamp: Date.now() });
      } catch (err) {
        log.warn('Chat message failed to send', err);
        this._menuPresenter.addLobbyChat({
          isSystem: true,
          text: 'Message failed to send. Please try again.',
        });
      }
    });

    this._menuPresenter.on(MenuPresenterEvent.READY, async (isReady) => {
      this._menuPresenter.setLobbyReadyPending(true);

      const sent = await this._lobbyController.sendReadyState(isReady);
      if (!sent) {
        this._menuPresenter.setLobbyReadyPending(false);
        this._menuPresenter.addLobbyChat({
          isSystem: true,
          text: 'Failed to update ready state. Please try again.',
        });
        return;
      }

      this._menuPresenter.setLobbyReadyPending(false);
      this._menuPresenter.setLobbyReadyState(isReady);

      // Track local player's ready state (we don't receive our own messages)
      const localIsHost = this._lobbyController.isHost;
      const players = this._lobbyController.players;
      const localPlayer = players.find(p => p.isHost === localIsHost);
      if (localPlayer) {
        const localId = localPlayer.id || localPlayer.pub_sig;
        if (localId) {
          if (!this._readyStates) this._readyStates = new Map();
          this._readyStates.set(localId, isReady);
        }
      }

      // Update player list UI with ready states
      const updatedPlayers = players.map(p => ({
        ...p,
        isReady: this._readyStates.get(p.id || p.pub_sig) ?? false,
      }));
      this._menuPresenter.updateLobbyPlayers(updatedPlayers);

      // Check if all players are ready for auto-start
      this._checkAllReady(updatedPlayers);
    });

    this._menuPresenter.on(MenuPresenterEvent.START_GAME, () => {
      this._startMultiplayerGame();
    });

    this._menuPresenter.on(MenuPresenterEvent.SETTINGS_CLOSED, (data) => {
      const isGameActive =
        this._gameEngine?.state !== GameState.IDLE &&
        this._gameEngine?.state !== GameState.ENDED;
      const mode = data?.mode ?? (isGameActive ? "game" : "menu");

      if (mode === "menu") {
        this._menuPresenter.showMainMenu();
      }
    });

    this._menuPresenter.on(MenuPresenterEvent.SETTINGS_QUIT, async () => {
      await this._cleanupGame();
      await this.showMainMenu();
    });
  }

  _wireWalletEvents() {
    // Subscribe to live balance updates from kkGameEngine
    this._subscribeBalanceUpdates(this._kkGameEngine);

    // Open wallet settings modal
    this._walletHUD.on(WalletHUDEvent.SETTINGS_CLICKED, () => {
      this._walletModal.show({
        address: this._kkGameEngine?.address || "",
        balance: this._walletHUD.balance,
      });
    });

    this._walletHUD.on(WalletHUDEvent.GAME_SETTINGS_CLICKED, () => {
      const isGameActive =
        this._gameEngine?.state === GameState.RUNNING ||
        this._gameEngine?.state === GameState.PAUSED ||
        this._gameEngine?.state === GameState.COUNTDOWN;
      this._openSettingsMenu(isGameActive ? "game" : "menu");
    });

    // Handle mnemonic reveal request
    this._walletModal.on(WalletModalEvent.REVEAL_MNEMONIC, async () => {
      try {
        const mnemonic = await this._walletPasswordModal.showForMnemonic(
          async (password) => {
            // Verify password by attempting to get mnemonic
            if (!this._kkGameEngine) {
              throw new Error("Wallet not initialized");
            }
            return await this._kkGameEngine.getMnemonic({ password });
          },
        );
      } catch (err) {
        if (err.message !== "Cancelled") {
          log.error("Mnemonic reveal failed", err);
        }
      }
    });

    // Handle wallet delete request
    this._walletModal.on(WalletModalEvent.DELETE_WALLET, async () => {
      try {
        await this._walletPasswordModal.showForDelete(async (password) => {
          if (!this._kkGameEngine) {
            throw new Error("Wallet not initialized");
          }
          await this._kkGameEngine.deleteWallet({ password });
        });

        this._walletModal.hide();
        this._walletHUD?.resetPeakBalance(); // Reset peak balance on wallet deletion
        this._walletHUD?.updateBalance("0");
        this._removeDeletedWalletFromStorage();
        this._showWalletDeletedModal();
      } catch (err) {
        if (err.message !== "Cancelled") {
          log.error("Wallet delete failed", err);
        }
      }
    });

    log.debug("Wallet events wired");
  }

  _openSettingsMenu(mode) {
    this._hudPresenter.hidePauseMenu();
    this._menuPresenter.showSettings({ mode });
  }

  _removeDeletedWalletFromStorage() {
    if (typeof window === "undefined") return;

    const storedName = window.localStorage.getItem("ks-wallet-filename");
    const walletName = storedName || null;
    if (!walletName) return;

    const raw = window.localStorage.getItem("ks-wallets");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const next = parsed.filter((name) => name !== walletName);
          window.localStorage.setItem("ks-wallets", JSON.stringify(next));
        }
      } catch (err) {
        log.warn("Failed to update wallet list after delete", err);
      }
    }

    window.localStorage.removeItem("ks-wallet-filename");
  }

  _showWalletDeletedModal() {
    if (this._walletDeletedOverlay || typeof document === "undefined") return;

    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    `;

    const modal = document.createElement("div");
    modal.style.cssText = `
      width: min(90%, 420px);
      background: #0a0a14;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      color: #e5e7eb;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
    `;

    const title = document.createElement("h2");
    title.textContent = "Wallet Deleted";
    title.style.cssText = `
      margin: 0 0 8px 0;
      font-size: 1.25rem;
      font-weight: 600;
    `;

    const message = document.createElement("p");
    message.textContent = "Wallet deleted successfully. Refresh to update the wallet list.";
    message.style.cssText = `
      margin: 0 0 20px 0;
      color: rgba(229, 231, 235, 0.8);
      font-size: 0.95rem;
      line-height: 1.4;
    `;

    const refreshBtn = document.createElement("button");
    refreshBtn.textContent = "Refresh";
    refreshBtn.style.cssText = `
      width: 100%;
      padding: 12px 16px;
      background: linear-gradient(135deg, #00d9ff 0%, #00ffa3 100%);
      border: none;
      border-radius: 8px;
      color: #0a0a14;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
    `;
    refreshBtn.addEventListener("click", () => {
      window.location.reload();
    });

    modal.appendChild(title);
    modal.appendChild(message);
    modal.appendChild(refreshBtn);
    overlay.appendChild(modal);

    document.body.appendChild(overlay);
    this._walletDeletedOverlay = overlay;
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE - GAME LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  async _beginGame(sessionData) {
    log.info("Beginning game", { gameId: sessionData.gameId });

    this._gameEndHandled = false;

    // Reset render state for fresh game
    this._renderPresenter.reset();

    // Show HUD
    this._hudPresenter.show({
      isMultiplayer: sessionData.isMultiplayer,
    });

    // Hide menu
    this._menuPresenter.hideAll();

    // Show test mode warning if no funds
    // WalletHUD warning is hidden during gameplay (GameHUD handles it)
    if (this._walletHUD?.isTestMode) {
      this._hudPresenter.showTestModeWarning();
    }

    // ═══════════════════════════════════════════════════════════════
    // CHECKPOINT SYSTEM: Input DISABLED until genesis anchor + game start
    // This ensures VRF proofs are valid (genesis must be on-chain first)
    // ═══════════════════════════════════════════════════════════════
    this._playerController.setGameId(sessionData.gameId);
    this._playerController.disable(); // DISABLED until checkpoint

    // Start render presenter (visual countdown runs immediately)
    this._renderPresenter.start();

    // Track checkpoint flags
    let gameStarted = false;
    let genesisAnchored = false;

    const tryEnableInput = () => {
      if (gameStarted && genesisAnchored) {
        log.info("Checkpoint complete - enabling input", { gameStarted, genesisAnchored });
        this._playerController.enable();
      }
    };

    // Listen for genesis anchor completion
    this._sessionController.once(SessionEvent.GENESIS_ANCHORED, (data) => {
      log.info("Genesis anchor checkpoint passed", { txId: data?.txId });
      genesisAnchored = true;
      tryEnableInput();
    });

    // Listen for game start from session controller
    this._sessionController.once(SessionEvent.GAME_START, (data) => {
      log.info("Game start checkpoint passed", data);
      gameStarted = true;
      tryEnableInput();

      this.emit(FacadeEvent.GAME_STARTED, {
        gameId: sessionData.gameId,
        isMultiplayer: sessionData.isMultiplayer,
      });
    });

    // Begin session (prepares UTXOs, starts countdown via block subscription)
    await this._sessionController.beginGame();
  }

  async _startMultiplayerGame() {
    if (this._multiplayerStartInProgress) {
      log.warn("Multiplayer start already in progress - ignoring");
      return;
    }
    if (
      this._gameEngine.state !== GameState.IDLE &&
      this._gameEngine.state !== GameState.ENDED
    ) {
      log.warn("Game already starting or running - ignoring duplicate start");
      return;
    }

    log.info("Starting multiplayer game");
    this._isMultiplayerHost = true;
    this._lastMultiplayerStartData = null;
    this._multiplayerStartInProgress = true;

    const { playerId, opponentId } = this._resolveMultiplayerIds();

    try {
      await this._startGameWithRetry("multiplayer", async () => {
        const sessionData = await this._sessionController.startMultiplayer({
          playerId,
          opponentId,
          lobbyId: this._lobbyController.lobbyId,
        });

        // Broadcast game start with authoritative startDaa and gameId
        this._lobbyController.startGame({
          gameId: sessionData.gameId,
          startDaa: sessionData.startDaa,
          vrfSeed: sessionData.vrfSeed,
        });

        return sessionData;
      });
    } catch (e) {
      const message = e?.message || "VRF REQUIRED: Unable to start multiplayer game";
      log.error(message, e);

      // If genesis anchor failed, broadcast abort to all players
      if (e?.message === "Genesis anchor failed" || e?.fatal) {
        this._broadcastGameAbort("A player didn't successfully submit their starting transaction. Think of it as a false start, sorry for the inconvenience, please try again.");
      }

      this.emit(FacadeEvent.ERROR, { message, error: e, phase: "start" });
    } finally {
      this._multiplayerStartInProgress = false;
    }
  }

  async _onMultiplayerGameStart(data) {
    if (this._multiplayerStartInProgress) {
      log.warn("Multiplayer start already in progress - ignoring message");
      return;
    }
    if (
      this._gameEngine.state !== GameState.IDLE &&
      this._gameEngine.state !== GameState.ENDED
    ) {
      log.warn("Game already starting or running - ignoring message");
      return;
    }

    log.info("Multiplayer game starting from message", data);
    this._isMultiplayerHost = false;
    this._lastMultiplayerStartData = data;
    this._multiplayerStartInProgress = true;

    const { playerId, opponentId } = this._resolveMultiplayerIds();

    try {
      await this._startGameWithRetry("multiplayer", async () => {
        // Use the host's authoritative startDaa and gameId
        return await this._sessionController.startMultiplayer({
          playerId,
          opponentId,
          lobbyId: this._lobbyController.lobbyId,
          startDaa: data.startDaa,
          gameId: data.gameId,
        });
      });
    } catch (e) {
      const message = e?.message || "VRF REQUIRED: Unable to start multiplayer game";
      log.error(message, e);

      // If genesis anchor failed, broadcast abort to all players
      if (e?.message === "Genesis anchor failed" || e?.fatal) {
        this._broadcastGameAbort("A player didn't successfully submit their starting transaction. Think of it as a false start, sorry for the inconvenience, please try again.");
      }

      this.emit(FacadeEvent.ERROR, { message, error: e, phase: "start" });
    } finally {
      this._multiplayerStartInProgress = false;
    }
  }

  _resolveMultiplayerIds() {
    const players = this._lobbyController?.players ?? [];
    const localIsHost = this._lobbyController?.isHost ?? false;
    const localMember = players.find((p) => p.isHost === localIsHost) ?? null;
    const localId = this._getLobbyPlayerKey(localMember) ?? this._playerId;

    const opponentMember = players.find(
      (p) => this._getLobbyPlayerKey(p) && this._getLobbyPlayerKey(p) !== localId,
    ) ?? null;
    const opponentId = this._getLobbyPlayerKey(opponentMember) ?? null;

    return { playerId: localId, opponentId };
  }

  _getLobbyPlayerKey(member) {
    return (
      member?.playerId ||
      member?.id ||
      member?.pubSig ||
      member?.pub_sig ||
      member?.publicKey ||
      null
    );
  }

  async _startGameWithRetry(mode, startFn, maxAttempts = 3) {
    this._opponentProgress = 0;
    this._opponentCoins = 0;
    this._opponentEndReason = null;
    this.emit(FacadeEvent.GAME_STARTING, {
      mode,
      attempt: 1,
      maxAttempts,
    });

    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (attempt > 1) {
        this.emit(FacadeEvent.GAME_START_RETRY, {
          mode,
          attempt,
          maxAttempts,
        });
      }

      try {
        const sessionData = await startFn();
        await this._beginGame(sessionData);
        this.emit(FacadeEvent.GAME_START_READY, { mode });
        return;
      } catch (err) {
        lastError = err;
        if (!this._isRetriableStartError(err) || attempt >= maxAttempts) {
          break;
        }
        await this._delay(800 * attempt);
      }
    }

    const message = lastError?.message || "Failed to start game";
    this.emit(FacadeEvent.GAME_START_FAILED, {
      mode,
      message,
      error: lastError,
    });
    throw lastError;
  }

  _isRetriableStartError(error) {
    const message = String(error?.message || "").toLowerCase();
    return (
      message.includes("failed to fetch") ||
      message.includes("fetch") ||
      message.includes("api error") ||
      message.includes("nist") ||
      message.includes("qrng") ||
      message.includes("beacon") ||
      message.includes("btc") ||
      message.includes("bitcoin") ||
      message.includes("proxy") ||
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("throttled") ||
      message.includes("429") ||
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503")
    );
  }

  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if all players are ready and auto-start if so (host only)
   * @param {Array} players - Player list with isReady states
   */
  _checkAllReady(players) {
    if (!this._lobbyController.isHost) return;
    if (!players || players.length < 2) return;

    const allReady = players.every(p => p.isReady);
    if (!allReady) {
      // Cancel any pending auto-start
      if (this._autoStartTimer) {
        clearTimeout(this._autoStartTimer);
        this._autoStartTimer = null;
      }
      return;
    }

    // All players ready - countdown then auto-start
    log.info('All players ready, auto-starting in 3 seconds');

    // Show locally for host
    this._menuPresenter.addLobbyChat({
      isSystem: true,
      text: 'All players ready! Starting in 3 seconds...',
    });

    // Broadcast to all other players so they see the message too
    this._lobbyController.sendChat('🎮 All players ready! Starting in 3 seconds...').catch(() => {
      // Ignore chat send failures - game will still start
    });

    if (this._autoStartTimer) clearTimeout(this._autoStartTimer);
    this._autoStartTimer = setTimeout(() => {
      this._autoStartTimer = null;
      this._startMultiplayerGame();
    }, 3000);
  }

  _onGameEnd(results) {
    if (this._gameEndHandled) return;
    this._gameEndHandled = true;

    const endReason = results?.endReason || results?.reason || "unknown";
    const isMultiplayer = this._sessionController.isMultiplayer;

    // Determine victory based on game mode
    let isVictory;
    let endContext = "neutral";
    if (isMultiplayer) {
      const myProgress = results.progress ?? this._gameEngine?.progress ?? 0;
      const myCoins = results.coins ?? this._gameEngine?.coins ?? 0;
      const oppProgress = this._opponentProgress ?? this._gameEngine?.opponentProgress ?? 0;
      const oppCoins = this._opponentCoins ?? 0;

      const standings = this._compareStandings(
        myProgress,
        myCoins,
        oppProgress,
        oppCoins,
      );

      isVictory = standings.isVictory;

      if (endReason === "coins_depleted") {
        endContext = "local";
        isVictory = false;
      } else if (this._opponentEndReason === "coins_depleted") {
        endContext = "opponent";
        isVictory = true;
      }

      log.info("Multiplayer result", {
        myProgress,
        myCoins,
        oppProgress,
        oppCoins,
        isVictory,
      });
    } else {
      // Single player: crossing finish line = victory
      isVictory = endReason === "daa_complete" || endReason === "completed";
      endContext = endReason === "coins_depleted" ? "local" : "neutral";
    }

    log.info("Game ended", { ...results, endReason, isVictory, isMultiplayer });

    this._playerController.disable();
    this._renderPresenter.stop();

    // Show celebration only if player won (not coins_depleted or forfeit)
    if (isVictory) {
      this._renderPresenter.showCelebration();
    }

    this.emit(FacadeEvent.GAME_ENDED, results);

    // Show game over immediately - if anchoring is in progress, HUD shows spinner
    this._hudPresenter.showGameOver({
      reason: endReason,
      results: {
        coins: results.coins ?? 0,
        progress: results.progress ?? 0,
        raceTimeMs: results.raceTimeMs ?? 0,
        raceTimeFormatted: results.raceTimeFormatted ?? '0:00.00',
      },
      anchorTxId: results.anchorTxId ?? null,
      isAnchoring: results.isAnchoring ?? false,
      isVictory: isVictory,
      isMultiplayer: isMultiplayer,
      endContext,
    });

    // For multiplayer: clean up game in background so lobby is ready
    // when the player dismisses the game over screen
    if (isMultiplayer && this._lobbyController.isInLobby) {
      this._cleanupGameForLobbyReturn();
    }
  }

  _compareStandings(myProgress, myCoins, oppProgress, oppCoins) {
    // If opponent has ended (0 coins = lost), local player is ahead
    // regardless of progress (they're out of the race)
    if (this._opponentEndReason && oppCoins <= 0) {
      return {
        myRank: 1,
        opponentRank: 2,
        isVictory: true,
      };
    }

    // If local player has 0 coins, they lose regardless of progress
    if (myCoins <= 0) {
      return {
        myRank: 2,
        opponentRank: 1,
        isVictory: false,
      };
    }

    // Both players still in race - progress is primary ranking
    let myRank = 1;
    if (myProgress > oppProgress) {
      myRank = 1;
    } else if (myProgress < oppProgress) {
      myRank = 2;
    } else {
      // Progress tied - use coins as tiebreaker
      myRank = myCoins >= oppCoins ? 1 : 2;
    }

    return {
      myRank,
      opponentRank: myRank === 1 ? 2 : 1,
      isVictory: myRank === 1,
    };
  }

  _updateStandings({ myProgress, myCoins }) {
    if (!this._sessionController.isMultiplayer) return;

    const oppProgress = this._opponentProgress ?? 0;
    const oppCoins = this._opponentCoins ?? 0;
    const standings = this._compareStandings(
      myProgress,
      myCoins,
      oppProgress,
      oppCoins,
    );

    const { playerId, opponentId } = this._resolveMultiplayerIds();
    const lobbyPlayers = this._lobbyController?.players ?? [];
    const resolveName = (id, fallback) => {
      const match = lobbyPlayers.find(
        (player) => this._getLobbyPlayerKey(player) === id,
      );
      return match?.displayName || match?.name || fallback;
    };

    const players = [
      {
        id: playerId,
        position: standings.myRank,
        displayName: resolveName(playerId, "You"),
        coins: myCoins ?? 0,
        progress: myProgress ?? 0,
      },
      {
        id: opponentId || "opponent",
        position: standings.opponentRank,
        displayName: resolveName(opponentId, "Opponent"),
        coins: oppCoins ?? 0,
        progress: oppProgress ?? 0,
      },
    ];

    this._hudPresenter.updateStandings({ players });
  }

  /**
   * Clean up game state in background while game over screen is shown,
   * but DON'T touch HUD/menus — those are handled when user dismisses.
   */
  async _cleanupGameForLobbyReturn() {
    this._playerController.disable();
    await this._sessionController.cleanup();
    this._renderPresenter?.stop();
    this._renderPresenter?.reset();
    this._obstacleFactory?.clearAll();
    this._gameEngine?.reset();
    this._inputManager?.setReverseControls(false);
    this._audioManager?.stopMusic();
    this._walletHUD?.hideTestModeWarning();
    globalState.resetGameState();
    this._opponentProgress = 0;
    this._opponentCoins = 0;
    this._opponentEndReason = null;
    log.debug('Game cleanup for lobby return complete (background)');
  }

  _showAuditView() {
    if (!this._kkGameEngine) {
      this._hudPresenter.showToast("Audit unavailable: kkGameEngine not ready", "error");
      return;
    }

    // Resolve gameId from multiple sources (session may be cleaned up)
    const gameId = this._sessionController?.gameId
      ?? this._sessionController?.lastResults?.gameId
      ?? this._kkGameEngine?.gameId
      ?? null;

    this._hudPresenter.showAuditView({
      kkGameEngine: this._kkGameEngine,
      gameResults: this._sessionController.lastResults,
      gameId,
    });
  }

  async _cleanupGame() {
    this._playerController.disable();
    if (
      this._gameEngine?.state !== GameState.IDLE &&
      this._gameEngine?.state !== GameState.ENDED
    ) {
      this._sessionController?.endSession({
        reason: "quit",
        endReason: "quit",
        coins: this._gameEngine?.coins ?? 0,
        progress: this._gameEngine?.progress ?? 0,
      });
    }
    await this._sessionController.cleanup();
    this._renderPresenter?.stop();
    this._renderPresenter?.reset();

    // Clear all 3D entities from scene and pools
    this._obstacleFactory?.clearAll();

    // Reset game engine state (clears entity pools, physics, powerups)
    this._gameEngine?.reset();

    this._inputManager?.setReverseControls(false);

    // Stop music and disconnect all audio nodes
    this._audioManager?.stopMusic();
    this._walletHUD?.hideTestModeWarning();
    this._gameEndHandled = false;
    this._opponentProgress = 0;
    this._opponentCoins = 0;
    this._opponentEndReason = null;

    // Reset game-specific state to prevent history buildup
    globalState.resetGameState();

    log.debug('Game cleanup complete (all resources released)');
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE - MULTIPLAYER ABORT / LOBBY RETURN
  // ═══════════════════════════════════════════════════════════════

  /**
   * Broadcast a game abort message to all lobby members and return to lobby
   * @param {string} reason - Human-readable reason for the abort
   */
  async _broadcastGameAbort(reason) {
    try {
      await this._lobbyController.abortGame(reason);
    } catch (e) {
      log.warn('Failed to broadcast game abort', e);
    }

    // Clean up game state and return to lobby
    await this._cleanupGame();
    this._showLobbyFromGame();

    // Inform local user via lobby chat
    this._menuPresenter.addLobbyChat({
      isSystem: true,
      text: reason,
    });
  }

  /**
   * Handle a GAME_ABORT message from any player in the lobby
   * @param {Object} data - { reason, timestamp }
   */
  async _onMultiplayerGameAbort(data) {
    const reason = data?.reason || 'Game was aborted by a player.';
    log.warn('Multiplayer game aborted', { reason });

    // Clean up any game-in-progress
    await this._cleanupGame();
    this._showLobbyFromGame();

    // Show the reason in lobby chat
    this._menuPresenter.addLobbyChat({
      isSystem: true,
      text: reason,
    });
  }

  /**
   * Return to the lobby room view after a multiplayer game
   * Preserves lobby state so players can play again
   */
  _showLobbyFromGame() {
    const lobbyInfo = this._lobbyController.lobbyInfo;
    const lobbyId = this._lobbyController.lobbyId;
    const isHost = this._lobbyController.isHost;
    const players = this._lobbyController.players;
    const lobbyName = lobbyInfo?.lobbyName || 'Lobby';

    // Hide any game UI
    this._hudPresenter.hide();

    // Clear all ready states when returning to lobby (prevents auto-start on first click)
    this._readyStates?.clear();

    // Cancel any pending auto-start timer
    if (this._autoStartTimer) {
      clearTimeout(this._autoStartTimer);
      this._autoStartTimer = null;
    }

    // Broadcast not-ready state to opponent so they don't think we're still ready
    this._lobbyController.sendReadyState(false).catch(() => {
      // Ignore failures - best effort
    });

    // Show the lobby room view with all players marked as not ready
    const playersNotReady = players.map(p => ({ ...p, isReady: false }));
    this._menuPresenter.showLobbyRoom({
      lobbyId,
      lobbyName,
      joinCode: lobbyInfo?.joinCode || null,
      isHost,
      players: playersNotReady,
    });

    log.info('Returned to lobby from game');
  }
}

export default GameFacade;
