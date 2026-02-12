/**
 * LobbyController.js - Thin wrapper around kkGameEngine Lobby API
 * 
 * Responsibilities:
 * - Proxy to kkGameEngine lobby methods
 * - Wire kkGameEngine lobby events to game-specific events
 * - Forward chat and game messages
 */

import { EventEmitter } from '../../core/EventEmitter.js';
import { Logger } from '../../core/Logger.js';
import { MSG_TYPE } from '../../core/Constants.js';
import { GameEvent } from '../../../kkGameEngine.js';

const log = Logger.create('LobbyController');

/**
 * Lobby controller events
 */
export const LobbyEvent = Object.freeze({
  LOBBY_CREATED: 'lobbyCreated',
  LOBBY_JOINED: 'lobbyJoined',
  LOBBY_LEFT: 'lobbyLeft',
  LOBBY_FOUND: 'lobbyFound',
  PLAYER_JOINED: 'playerJoined',
  PLAYER_LEFT: 'playerLeft',
  CHAT_MESSAGE: 'chatMessage',
  READY_STATE: 'readyState',
  GAME_START: 'gameStart',
  GAME_ABORT: 'gameAbort',
  ERROR: 'error',
});

export class LobbyController extends EventEmitter {
  constructor() {
    super();
    
    this._kkGameEngine = null;
    this._searchUnsubscribe = null;
  }

  // ─── Getters (proxy to kkGameEngine) ────────────────────────────

  get lobbyId() {
    return this._kkGameEngine?.lobbyInfo?.lobbyId ?? null;
  }

  get isHost() {
    return this._kkGameEngine?.isLobbyHost ?? false;
  }

  get isInLobby() {
    return this._kkGameEngine?.isInLobby() ?? false;
  }

  get players() {
    return this._kkGameEngine?.getLobbyMembers() ?? [];
  }

  get lobbyInfo() {
    return this._kkGameEngine?.lobbyInfo ?? null;
  }

  /**
   * Set kkGameEngine reference and wire up events
   * @param {Object} engine - kkGameEngine instance
   */
  setKKGameEngine(engine) {
    this._kkGameEngine = engine;
    this._wireEngineEvents();
  }

  /**
   * Create (host) a new lobby
   * @param {string} lobbyName - Display name for the lobby
   * @param {string} [displayName] - Your display name
   * @param {number} [maxPlayers=2] - Maximum players allowed (2-8)
   * @returns {Promise<Object>} Lobby info
   */
  async create(lobbyName, displayName, maxPlayers = 2) {
    if (!this._kkGameEngine) {
      const error = new Error('Cannot create lobby without kkGameEngine');
      this.emit(LobbyEvent.ERROR, { error });
      throw error;
    }

    // Clamp maxPlayers to valid range (2-8)
    const clampedMaxPlayers = Math.max(2, Math.min(8, Number.isFinite(maxPlayers) ? maxPlayers : 2));

    log.info('Creating lobby', { lobbyName, displayName, maxPlayers: clampedMaxPlayers });

    try {
      const result = await this._kkGameEngine.createLobby({
        lobbyName: lobbyName || 'DAG Dasher Lobby',
        gameName: 'KaspaSurfer',
        maxMembers: clampedMaxPlayers,
        displayName: displayName || undefined,
      });

      log.info('Lobby created', result);

      this.emit(LobbyEvent.LOBBY_CREATED, {
        lobbyId: result.lobbyId,
        lobbyName: result.lobbyName,
        joinCode: result.joinCode || null,
        isHost: true,
        players: this.players,
      });

      // Prepare UTXO pool in background for instant game start
      // Host also needs this ready before starting the game
      this._kkGameEngine.prepareUtxoPool().then(poolResult => {
        if (poolResult.success) {
          log.info('UTXO pool ready for game', poolResult.poolStatus);
        } else {
          log.warn('UTXO pool preparation failed', poolResult.error);
        }
      }).catch(e => {
        log.warn('UTXO pool preparation error', e.message);
      });

      return {
        ...result,
        lobbyName: result.lobbyName ?? lobbyName,
      };
    } catch (e) {
      log.error('Failed to create lobby', e);
      this.emit(LobbyEvent.ERROR, { error: e });
      throw e;
    }
  }

  /**
   * Join an existing lobby
   * @param {Object} lobbyDiscovery - Discovery anchor from searchLobbies
   * @param {string} [displayName] - Your display name
   * @returns {Promise<Object>} Lobby info
   */
  async join(lobbyDiscovery, displayName) {
    if (!this._kkGameEngine) {
      const error = new Error('Cannot join lobby without kkGameEngine');
      this.emit(LobbyEvent.ERROR, { error });
      throw error;
    }

    log.info('Joining lobby', { lobbyDiscovery });

    try {
      const result = await this._kkGameEngine.joinLobby(lobbyDiscovery, displayName);

      log.info('Joined lobby', result);

      // Prepare UTXO pool in background for instant game start
      // This runs while user waits in lobby, ensuring zero-delay when game starts
      this._kkGameEngine.prepareUtxoPool().then(poolResult => {
        if (poolResult.success) {
          log.info('UTXO pool ready for game', poolResult.poolStatus);
        } else {
          log.warn('UTXO pool preparation failed', poolResult.error);
        }
      }).catch(e => {
        log.warn('UTXO pool preparation error', e.message);
      });

      this.emit(LobbyEvent.LOBBY_JOINED, {
        lobbyId: result.lobbyId,
        lobbyName: result.lobbyName,
        isHost: false,
        players: this.players,
      });

      return result;
    } catch (e) {
      log.error('Failed to join lobby', e);
      this.emit(LobbyEvent.ERROR, { error: e });
      throw e;
    }
  }

  /**
   * Leave current lobby
   * @param {string} [reason] - Optional reason
   */
  async leave(reason) {
    if (!this._kkGameEngine || !this.isInLobby) return;

    log.info('Leaving lobby');

    try {
      if (this.isHost) {
        await this._kkGameEngine.closeLobby(reason);
      } else {
        await this._kkGameEngine.leaveLobby(reason);
      }

      this.emit(LobbyEvent.LOBBY_LEFT, { reason });
    } catch (e) {
      log.warn('Error leaving lobby', e);
      this.emit(LobbyEvent.ERROR, { error: e });
    }
  }

  /**
   * Start searching for lobbies
   * @param {string} [lobbyPrefix] - Prefix to search for
   * @returns {Function} Unsubscribe function
   */
  startSearch(lobbyPrefix = null) {
    if (!this._kkGameEngine) {
      log.warn('Cannot search lobbies without kkGameEngine');
      return () => {};
    }

    this.stopSearch();

    log.info('Starting lobby search', { lobbyPrefix });

    this._searchUnsubscribe = this._kkGameEngine.searchLobbies((match) => {
      log.debug('Lobby found', match);
      this.emit(LobbyEvent.LOBBY_FOUND, match);
    }, lobbyPrefix);

    return this._searchUnsubscribe;
  }

  /**
   * Stop searching for lobbies
   */
  stopSearch() {
    if (typeof this._searchUnsubscribe === 'function') {
      this._searchUnsubscribe();
      this._searchUnsubscribe = null;
      log.info('Stopped lobby search');
    }
  }

  /**
   * Send a chat message to all lobby members (retries up to 3 times)
   * @param {string} text - Message text
   * @throws {Error} If all retry attempts fail
   */
  async sendChat(text) {
    if (!this._kkGameEngine || !this.isInLobby) return;

    const message = JSON.stringify({
      type: MSG_TYPE.CHAT,
      text,
      timestamp: Date.now(),
    });

    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this._kkGameEngine.sendLobbyMessage(message);
        return; // Success
      } catch (err) {
        lastError = err;
        log.warn(`Chat send attempt ${attempt}/${maxRetries} failed`, err);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }

    log.error('Chat send failed after all retries', lastError);
    throw lastError;
  }

  /**
   * Broadcast ready state to all lobby members
   * @param {boolean} isReady - Whether this player is ready
   * @returns {Promise<boolean>} True if sent successfully
   */
  async sendReadyState(isReady) {
    if (!this._kkGameEngine || !this.isInLobby) return false;

    const message = JSON.stringify({
      type: MSG_TYPE.READY_STATE,
      isReady,
      timestamp: Date.now(),
    });

    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this._kkGameEngine.sendLobbyMessage(message);
        return true;
      } catch (err) {
        lastError = err;
        log.warn(`Ready state send attempt ${attempt}/${maxRetries} failed`, err);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }

    log.error('Ready state send failed after all retries', lastError);
    return false;
  }

  /**
   * Start multiplayer game (host only)
   * @param {Object} gameData - Game initialization data
   */
  async startGame(gameData) {
    if (!this.isHost) {
      log.warn('Only host can start game');
      return;
    }

    const message = JSON.stringify({
      type: MSG_TYPE.GAME_START,
      gameId: gameData.gameId,
      startDaa: gameData.startDaa,
      vrfSeed: gameData.vrfSeed,
      timestamp: Date.now(),
    });

    await this._kkGameEngine.sendLobbyMessage(message);

    this.emit(LobbyEvent.GAME_START, gameData);
  }

  /**
   * Broadcast game abort to all lobby members
   * @param {string} reason - Reason for abort
   */
  async abortGame(reason) {
    if (!this._kkGameEngine || !this.isInLobby) return;

    const message = JSON.stringify({
      type: MSG_TYPE.GAME_ABORT,
      reason,
      timestamp: Date.now(),
    });

    await this._kkGameEngine.sendLobbyMessage(message);
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    this.stopSearch();
    this.removeAllListeners();
  }

  // ─── Private Methods ───────────────────────────────────────────

  /**
   * Wire kkGameEngine lobby events to controller events
   */
  _wireEngineEvents() {
    if (!this._kkGameEngine) return;

    // Use new event emitter pattern for all event subscriptions
    this._kkGameEngine.on(GameEvent.PLAYER_JOINED, (member) => {
      log.info('Player joined', member);
      this.emit(LobbyEvent.PLAYER_JOINED, member);
    });

    this._kkGameEngine.on(GameEvent.PLAYER_LEFT, (member) => {
      log.info('Player left', member);
      this.emit(LobbyEvent.PLAYER_LEFT, member);
    });

    this._kkGameEngine.on(GameEvent.LOBBY_UPDATED, (lobby) => {
      log.info('Lobby updated', lobby);
      // Optionally emit a LOBBY_UPDATED event if needed
    });

    this._kkGameEngine.on(GameEvent.LOBBY_CLOSED, (reason) => {
      log.info('Lobby closed', reason);
      this.emit(LobbyEvent.LOBBY_LEFT, { reason });
    });

    this._kkGameEngine.on(GameEvent.CHAT_MESSAGE, (msg) => {
      this.emit(LobbyEvent.CHAT_MESSAGE, msg);
    });

    this._kkGameEngine.on(GameEvent.READY_STATE, (data) => {
      this.emit(LobbyEvent.READY_STATE, data);
    });

    this._kkGameEngine.on(GameEvent.GAME_START, (data) => {
      this.emit(LobbyEvent.GAME_START, data);
    });

  }

  /**
   * Handle incoming group messages
   * @param {Object} msg - Message from kkGameEngine
   */
  _handleGroupMessage(msg) {
    let data;
    try {
      data = typeof msg.plaintext === 'string' 
        ? JSON.parse(msg.plaintext) 
        : msg.plaintext;
    } catch {
      log.warn('Failed to parse group message', msg);
      return;
    }

    switch (data.type) {
      case MSG_TYPE.CHAT:
        this.emit(LobbyEvent.CHAT_MESSAGE, {
          sender: msg.senderName || 'Unknown',
          senderId: msg.senderId,
          text: data.text,
          timestamp: data.timestamp,
        });
        break;

      case MSG_TYPE.GAME_START:
        this.emit(LobbyEvent.GAME_START, data);
        break;

      case MSG_TYPE.GAME_ABORT:
        this.emit(LobbyEvent.GAME_ABORT, data);
        break;

      case MSG_TYPE.READY_STATE:
        this.emit(LobbyEvent.READY_STATE, {
          senderId: msg.senderId,
          senderName: msg.senderName || 'Unknown',
          isReady: data.isReady,
          timestamp: data.timestamp,
        });
        break;

      default:
        log.debug('Unknown message type', { type: data.type });
    }
  }
}

export default LobbyController;
