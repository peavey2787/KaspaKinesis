/**
 * SessionController.js - Orchestrates game session lifecycle
 *
 * Responsibilities:
 * - Single player / multiplayer session initialization
 * - DAA-based countdown management
 * - Block subscription for progress tracking
 * - Game start/end coordination
 * - VRF seed generation
 * - Game-specific event wiring (audio/HUD feedback)
 * - Powerup tick timer (100ms)
 * - Integrity state change handling
 * - UTXO refresh notifications
 */

import { EventEmitter } from "../../core/EventEmitter.js";
import { Logger } from "../../core/Logger.js";
import { GAME, BLOCKCHAIN } from "../../core/Constants.js";
import { bytesToHex, hexToBytes } from "../../core/CryptoUtils.js";
import {
  SessionState,
  SessionStateEvent,
  SessionPhase,
} from "./SessionState.js";
import { GameState, GameEvent } from "../../engine/GameEngine.js";
import { IntegrityEvent } from "../../integrity/IntegrityMonitor.js";
import { OpponentTelemetry } from "./OpponentTelemetry.js";
const AnchorEvent = Object.freeze({
  MOVE_PROCESSED: "moveProcessed",
  ANCHOR_SENT: "anchorSent",
  ANCHOR_FAILED: "anchorFailed",
  MOVE_RECEIVED: "moveReceived",
  VRF_GENERATED: "vrfGenerated",
  VRF_SYNC_WAIT: "vrfSyncWait",
  VRF_SYNC_RESOLVED: "vrfSyncResolved",
  VALIDATION_FAILED: "validationFailed",
  LOW_FUNDS_WARNING: "lowFundsWarning",
  UTXO_READY: "utxoReady",
  UTXO_REFRESHING: "utxoRefreshing",
  UTXO_REFRESH_COMPLETE: "utxoRefreshComplete",
  ANCHOR_COMPLETE: "anchorComplete",
  ANCHOR_BINARY_READY: "anchorBinaryReady",
  ANCHOR_RETRY_NEEDED: "anchorRetryNeeded",
  GENESIS_ANCHORED: "genesisAnchored",
  GENESIS_ANCHOR_FAILED: "genesisAnchorFailed",
  HEARTBEAT_ANCHORED: "heartbeatAnchored",
  DELTA_ENTROPY_DETECTED: "deltaEntropyDetected",
});

const log = Logger.create("SessionController");

/**
 * Session controller events
 */
export const SessionEvent = Object.freeze({
  SESSION_INITIALIZED: "sessionInitialized",
  COUNTDOWN_TICK: "countdownTick",
  GAME_START: "gameStart",
  GENESIS_ANCHORED: "genesisAnchored",
  PROGRESS_UPDATE: "progressUpdate",
  OPPONENT_STATE_UPDATED: "opponentStateUpdated",
  OPPONENT_END: "opponentEnd",
  SESSION_END: "sessionEnd",
  ERROR: "error",
  // HUD-related events (decoupled from direct HUD calls)
  HUD_COUNTDOWN: "hudCountdown",
  HUD_COINS_UPDATE: "hudCoinsUpdate",
  HUD_SPEED_UPDATE: "hudSpeedUpdate",
  HUD_INTEGRITY_UPDATE: "hudIntegrityUpdate",
  HUD_UTXO_REFRESH: "hudUtxoRefresh",
  HUD_UTXO_REFRESH_COMPLETE: "hudUtxoRefreshComplete",
  HUD_TEST_MODE_WARNING: "hudTestModeWarning",
  HUD_ANCHOR_COMPLETE: "hudAnchorComplete",
  HUD_ANCHOR_RETRY: "hudAnchorRetry",
  HUD_POWERUP_UPDATE: "hudPowerupUpdate",
  HUD_SYNC_WAIT: "hudSyncWait",
  HUD_SYNC_RESOLVED: "hudSyncResolved",
});

/**
 * Powerup tick interval (ms)
 */
const POWERUP_TICK_INTERVAL = 100;
const MULTIPLAYER_UTXO_READY_TIMEOUT_MS = 15000;

export class SessionController extends EventEmitter {
  constructor() {
    super();

    this._state = new SessionState();
    this._kkGameEngine = null;
    this._gameEngine = null;
    this._integrityMonitor = null;
    this._audioManager = null;
    this._hudPresenter = null;

    this._blockHandler = null;
    this._powerupTickInterval = null;
    this._feedbackWired = false;
    this._integrityWired = false;
    this._utxoEventsWired = false;
    this._opponentTelemetryWired = false;
    this._opponentMoveHandler = null;
    this._opponentHeartbeatHandler = null;

    // Stored event handlers for cleanup (prevent duplicate listeners)
    this._coinHandler = null;
    this._collisionHandler = null;
    this._powerupHandler = null;
    this._progressHandler = null;
    this._gameEndHandler = null;

    // Block hash stream for replay verification (binary packed - 32 bytes each)
    this._blockHashStream = [];

    // Start/end block hashes for deterministic replay window (binary packed - 32 bytes each)
    this._startBlockHash = null; // First block hash captured during RUNNING phase
    this._endBlockHash = null; // Last block hash captured during RUNNING phase

    // QRNG pulses for randomness verification (max 3 per game)
    this._qrngPulses = [];

    // Track last QRNG capture time for 60s interval (NIST updates every 60s)
    this._lastQrngCaptureTime = 0;

    // Latest block hash (for VRF fallback before RUNNING stream starts)
    this._latestBlockHash = null;
    this._latestBlockHashHex = "";

    // Last successful anchor transaction ID
    this._lastAnchorTxId = null;


    // Opponent telemetry (multiplayer only)
    this._opponentTelemetry = new OpponentTelemetry();


    // Wire internal state events
    this._setupStateListeners();
  }

  // ─── Replay Data Getters ───────────────────────────────────────

  /**
   * Get the VRF seed used for this session
   * @returns {string|null}
   */
  get vrfSeed() {
    return this._state.vrfSeed;
  }

  /**
   * Get the ordered block hash stream (binary packed)
   * Each hash is a Uint8Array(32) for 50% storage savings
   * @returns {Uint8Array[]}
   */
  get blockHashStream() {
    return this._blockHashStream;
  }

  /**
   * Get the first block hash captured during RUNNING phase (binary)
   * @returns {Uint8Array|null}
   */
  get startBlockHash() {
    return this._startBlockHash;
  }

  /**
   * Get the last block hash captured during RUNNING phase (binary)
   * @returns {Uint8Array|null}
   */
  get endBlockHash() {
    return this._endBlockHash;
  }

  /**
   * Get the latest observed block hash (binary)
   * @returns {Uint8Array|null}
   */
  get latestBlockHash() {
    return this._latestBlockHash;
  }

  /**
   * Get the latest observed block hash (hex)
   * @returns {string}
   */
  get latestBlockHashHex() {
    return this._latestBlockHashHex;
  }

  /**
   * Get QRNG pulses captured during the session
   * @returns {Array<{pulseIndex: number, pulseValue: Uint8Array}>}
   */
  get qrngPulses() {
    return this._qrngPulses;
  }

  /**
   * Get the last successful anchor transaction ID
   * @returns {string|null}
   */
  get lastAnchorTxId() {
    return this._lastAnchorTxId;
  }

  /**
   * Add a QRNG pulse manually
   * @param {number} pulseIndex - Sequential pulse index
   * @param {string} pulseValue - Hex string of QRNG output
   * @param {string} [signature] - Hex string of NIST signature
   */
  addQrngPulse(pulseIndex, pulseValue, signature = null) {
    // Check for duplicate by pulseIndex
    const isDuplicate = this._qrngPulses.some(
      (p) => p.pulseIndex === pulseIndex,
    );
    if (isDuplicate) {
      log.debug("Duplicate QRNG pulse, ignoring", { pulseIndex });
      return;
    }
    // Convert hex string to binary (full hash)
    const cleanHex = pulseValue.startsWith("0x")
      ? pulseValue.slice(2)
      : pulseValue;
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
    }
    this._qrngPulses.push({ pulseIndex, pulseValue: bytes, signature });
    log.debug("QRNG pulse added", {
      pulseIndex,
      outputLength: bytes.length,
      hasSignature: !!signature,
    });
  }

  /**
   * Get block hashes as hex strings for JSON serialization
   * @returns {string[]}
   */
  getBlockHashStreamHex() {
    return this._blockHashStream.map((bytes) => bytesToHex(bytes));
  }

  /**
   * Get start block hash as hex string
   * @returns {string|null}
   */
  getStartBlockHashHex() {
    if (!this._startBlockHash) return null;
    return bytesToHex(this._startBlockHash);
  }

  /**
   * Get end block hash as hex string
   * @returns {string|null}
   */
  getEndBlockHashHex() {
    if (!this._endBlockHash) return null;
    return bytesToHex(this._endBlockHash);
  }

  /**
   * Get session state
   */
  get state() {
    return this._state;
  }
  get gameId() {
    return this._state.gameId;
  }
  get playerId() {
    return this._state.playerId;
  }
  get isMultiplayer() {
    return this._state.isMultiplayer;
  }
  get phase() {
    return this._state.phase;
  }
  get progress() {
    return this._state.progress;
  }
  get blocksRemaining() {
    return this._state.blocksRemaining;
  }
  get lastResults() {
    return this._state.lastResults;
  }

  /**
   * Inject dependencies
   */
  setDependencies(deps) {
    this._kkGameEngine = deps.kkGameEngine ?? this._kkGameEngine;
    this._gameEngine = deps.gameEngine ?? this._gameEngine;
    this._integrityMonitor = deps.integrityMonitor ?? this._integrityMonitor;
    this._audioManager = deps.audioManager ?? this._audioManager;
    this._hudPresenter = deps.hudPresenter ?? this._hudPresenter;

    if (this._kkGameEngine?.setSessionController) {
      this._kkGameEngine.setSessionController(this);
    }

    // Wire game-specific events when dependencies are set
    this._wireGameFeedbackEvents();
    this._wireIntegrityEvents();
    this._wireUtxoEvents();
    this._wireOpponentTelemetry();
  }

  /**
   * Start a single player session
   * @param {string} playerId - Player ID
   * @returns {Promise<Object>} Session init data
   */
  async startSinglePlayer(playerId) {
    log.info("Starting single player session");

    const gameId = SessionState.generateGameId("SP");

    // Get current DAA score
    const startDaa = await this._fetchDaaScore();

    // Generate VRF seed (REQUIRED)
    let vrfSeed;
    try {
      vrfSeed = await this._generateVrfSeed(gameId, startDaa);
    } catch (e) {
      const message = e?.message || "VRF REQUIRED: unable to generate VRF seed";
      log.error(message, e);
      this.emit(SessionEvent.ERROR, { message, error: e });
      throw e;
    }

    // Reset replay data for new session
    this._blockHashStream = [];
    this._startBlockHash = null;
    this._endBlockHash = null;
    this._latestBlockHash = null;
    this._latestBlockHashHex = "";
    this._qrngPulses = [];

    // Initialize state
    this._state.initialize({
      gameId,
      playerId,
      opponentId: null,
      lobbyId: null,
      isMultiplayer: false,
      startDaaScore: startDaa,
      vrfSeed,
    });

    this._opponentTelemetry.reset();

    this.emit(SessionEvent.SESSION_INITIALIZED, {
      gameId,
      startDaa,
      vrfSeed,
      isMultiplayer: false,
    });

    return { gameId, startDaa, vrfSeed, isMultiplayer: false };
  }

  /**
   * Start a multiplayer session
   * @param {Object} options
   * @returns {Promise<Object>} Session init data
   */
  async startMultiplayer(options) {
    log.info("Starting multiplayer session", { lobbyId: options.lobbyId });

    const { playerId, opponentId, lobbyId } = options;

    // Use the host's startDaa if provided (joiner receives it via GAME_START message)
    // Otherwise fetch our own (we are the host)
    const startDaa = options.startDaa ?? await this._fetchDaaScore();
    const gameId = options.gameId ?? SessionState.generateGameId("MP", lobbyId);
    let vrfSeed;
    try {
      vrfSeed = await this._generateVrfSeed(gameId, startDaa);
    } catch (e) {
      const message = e?.message || "VRF REQUIRED: unable to generate VRF seed";
      log.error(message, e);
      this.emit(SessionEvent.ERROR, { message, error: e });
      throw e;
    }

    // Reset replay data for new session
    this._blockHashStream = [];
    this._startBlockHash = null;
    this._endBlockHash = null;
    this._qrngPulses = [];

    this._state.initialize({
      gameId,
      playerId,
      opponentId,
      lobbyId,
      isMultiplayer: true,
      startDaaScore: startDaa,
      vrfSeed,
    });

    this._opponentTelemetry.reset();

    this.emit(SessionEvent.SESSION_INITIALIZED, {
      gameId,
      startDaa,
      vrfSeed,
      isMultiplayer: true,
    });

    return { gameId, startDaa, vrfSeed, isMultiplayer: true };
  }

  /**
   * Begin the game (initializes engine and starts countdown)
   * Prepares UTXOs for move anchoring before starting
   */
  async beginGame() {
    if (!this._gameEngine) {
      log.error("GameEngine not set");
      return;
    }

    if (!this._kkGameEngine?.getRandom || !this._state.vrfSeed) {
      const message =
        "VRF REQUIRED: kkGameEngine.getRandom() unavailable or VRF seed missing";
      log.error(message);
      this._hudPresenter?.hidePreparingGame?.();
      this.emit(SessionEvent.ERROR, { message });
      return;
    }

    // Re-wire events for new game session (cleanup resets these flags)
    this._wireGameFeedbackEvents();
    this._wireIntegrityEvents();
    this._wireUtxoEvents();
    this._wireOpponentTelemetry();

    // Show preparing game overlay while UTXO pool and genesis are prepared
    this._hudPresenter?.showPreparingGame();

    if (this._state.isMultiplayer) {
      const ready = await this._ensureUtxoPoolReadyForMultiplayer();
      if (!ready) {
        this._hudPresenter?.hidePreparingGame?.();
        const error = new Error("UTXO pool not ready");
        error.fatal = true;
        throw error;
      }
    }

    // Start blockchain-backed game session via kkGameEngine
    if (this._kkGameEngine?.startGame) {
      try {
        const startResult = await this._kkGameEngine.startGame({
          gameId: this._state.gameId,
          playerId: this._state.playerId,
          opponentId: this._state.opponentId,
          // v5 protocol: remap DAG Dasher actions to standard 8-byte codes (avoiding code 1 = extended MOVE)
          customActionMap: {
            none: 0,
            jump: 2,
            duck: 3,
            move_left: 4,
            move_right: 5,
            left: 4,
            right: 5,
            coin_collected: 8,
            collision: 6,
            powerup_collected: 7,
            powerdown_collected: 9,
          },
        });
        const genesisTxId = startResult?.genesisAnchor?.txId ?? null;
        if (genesisTxId) {
          this._lastAnchorTxId = genesisTxId;
          this.emit(SessionEvent.GENESIS_ANCHORED, { txId: genesisTxId });
        }
      } catch (e) {
        log.error("Failed to start kkGameEngine session", e);
        // For multiplayer, genesis anchor failure is fatal
        if (this._state.isMultiplayer) {
          this._hudPresenter?.hidePreparingGame?.();
          const abortError = new Error("Genesis anchor failed");
          abortError.fatal = true;
          throw abortError;
        }
        // Single player: continue in degraded mode
      }
    }

    // Hide preparing overlay before countdown
    this._hudPresenter?.hidePreparingGame();

    // Initialize game engine
    this._gameEngine.init({
      startDaaScore: this._state.startDaaScore,
      vrfSeed: this._state.vrfSeed,
      isMultiplayer: this._state.isMultiplayer,
      kkGameEngine: this._kkGameEngine,
    });

    // Initialize integrity monitor
    this._integrityMonitor?.start({
      opponentPlayerId: this._state.opponentId,
      isSinglePlayer: !this._state.isMultiplayer,
    });

    // Subscribe to blocks for countdown and progress
    this._subscribeToBlocks();

    // Start powerup tick timer for HUD updates
    this._startPowerupTick();

    // Start countdown
    this._state.startCountdown();
    this._gameEngine.startCountdown();

    log.info("Game beginning", { gameId: this._state.gameId });
  }

  /**
   * End the current session
   * @param {Object} results - Game results
   */
  endSession(results) {
    if (this._state.phase === SessionPhase.ENDED) return;

    const endReason = results?.endReason || results?.reason || "unknown";

    log.info("Ending session", { reason: endReason });

    this._unsubscribeFromBlocks();
    this._stopPowerupTick();
    this._integrityMonitor?.stop();
    this._audioManager?.stopMusic();

    this._state.end({
      ...results,
      reason: endReason,
      endReason: endReason,
    });

    // Emit SESSION_END immediately with isAnchoring flag for instant UI
    // The HUD will show "Anchoring..." while we process in background
    const hasAnchorWork = !!this._kkGameEngine;
    this.emit(SessionEvent.SESSION_END, {
      ...this._state.lastResults,
      anchorTxId: null,
      isAnchoring: hasAnchorWork,
    });

    // Anchor final state in background (non-blocking)
    // Capture gameId at call time so background anchor knows which session it belongs to
    if (hasAnchorWork) {
      const endingGameId = this._state.gameId;
      this._pendingAnchorPromise = this._anchorFinalStateInBackground(results, endingGameId);
    } else if (this._kkGameEngine?.endGame) {
      this._kkGameEngine
        .endGame(results)
        .then((anchorResult) => {
          const txId = anchorResult?.txId ?? null;
          if (txId) {
            this._lastAnchorTxId = txId;
          }
          this.emit(SessionEvent.HUD_ANCHOR_COMPLETE, {
            success: !!txId,
            txId,
          });
        })
        .catch((e) => {
          log.warn("Final anchor skipped or failed", e?.message);
          this.emit(SessionEvent.HUD_ANCHOR_RETRY, {
            error: e?.message || "Anchor failed",
          });
        });
    }
  }

  /**
   * Anchor final game state in background (non-blocking)
   * Emits HUD_ANCHOR_COMPLETE or HUD_ANCHOR_RETRY when done
   * @param {Object} results - Game results
   * @param {string} gameId - Game ID at the time of end (for stale-session guard)
   * @private
   */
  async _anchorFinalStateInBackground(results, gameId) {
    this._lastAnchorTxId = null;

    try {
      if (!this._kkGameEngine?.endGame) {
        throw new Error("kkGameEngine.endGame() unavailable");
      }

      // Thread gameId into endState so kkGameEngine can detect stale calls
      const endStateWithGameId = { ...results, _gameId: gameId };
      const anchorResult = await this._kkGameEngine.endGame(endStateWithGameId);

      // If the endGame was skipped because a new session started, don't emit
      if (anchorResult?.stale) {
        log.warn("Background anchor skipped - new game already started", { gameId });
        return;
      }

      if (anchorResult?.success && anchorResult?.txId) {
        this._lastAnchorTxId = anchorResult.txId;
        log.info("Final anchor successful", { txId: anchorResult.txId });
        this.emit(SessionEvent.HUD_ANCHOR_COMPLETE, {
          success: true,
          txId: anchorResult.txId,
        });
      } else {
        log.warn("Final anchor returned no txId");
        this.emit(SessionEvent.HUD_ANCHOR_COMPLETE, {
          success: false,
          txId: null,
        });
      }
    } catch (e) {
      log.error("Failed to anchor final state", e);
      this.emit(SessionEvent.HUD_ANCHOR_RETRY, {
        error: e.message || "Anchor failed",
      });
    } finally {
      this._pendingAnchorPromise = null;
      // endGame() stops heartbeats internally; only call stopAnchorProcessor if exposed
      this._kkGameEngine?.stopAnchorProcessor?.();
    }
  }

  /**
   * Clean up and reset.
   * Awaits any in-flight background anchor (with timeout) to prevent
   * stale endGame() calls from clobbering the next session.
   * @returns {Promise<void>}
   */
  async cleanup() {
    // Await in-flight background anchor before tearing down
    if (this._pendingAnchorPromise) {
      try {
        await Promise.race([
          this._pendingAnchorPromise,
          new Promise((resolve) => setTimeout(resolve, 5000)),
        ]);
      } catch (e) {
        log.warn("Pending anchor settled with error during cleanup", e?.message);
      }
      this._pendingAnchorPromise = null;
    }

    this._unsubscribeFromBlocks();
    this._stopPowerupTick();
    this._kkGameEngine?.stopAnchorProcessor?.();
    this._integrityMonitor?.stop();
    this._unwireGameFeedbackEvents();
    this._feedbackWired = false;
    this._integrityWired = false;
    this._utxoEventsWired = false;
    this._unwireOpponentTelemetry();

    // Reset replay data for next game
    this._blockHashStream = [];
    this._startBlockHash = null;
    this._endBlockHash = null;
    this._qrngPulses = [];
    this._lastQrngCaptureTime = 0;
    this._lastAnchorTxId = null;

    this._opponentTelemetry.reset();

    this._state.reset();
    log.info("Session cleaned up");
  }

  // ─── Private Methods ───────────────────────────────────────────

  async _ensureUtxoPoolReadyForMultiplayer() {
    if (!this._kkGameEngine?.getPoolStatus) {
      log.warn("kkGameEngine missing pool status API");
      return false;
    }

    const status = this._kkGameEngine.getPoolStatus();
    if (status.isReady) {
      return true;
    }

    try {
      const result = await this._kkGameEngine.prepareUtxoPool();
      if (result?.success) {
        return true;
      }
    } catch (e) {
      log.warn("UTXO pool preparation failed", e.message);
    }

    return await this._waitForGameReady(MULTIPLAYER_UTXO_READY_TIMEOUT_MS);
  }

  _waitForGameReady(timeoutMs) {
    if (!this._kkGameEngine?.onGameReady) {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      let done = false;
      const finish = (value) => {
        if (done) return;
        done = true;
        clearTimeout(timeoutId);
        unsubscribe?.();
        resolve(value);
      };

      const unsubscribe = this._kkGameEngine.onGameReady(() => finish(true));
      const timeoutId = setTimeout(() => finish(false), timeoutMs);
    });
  }

  _setupStateListeners() {
    // Countdown tick - show visual, play sound, and trigger pre-fetch on first tick
    this._state.on(SessionStateEvent.COUNTDOWN_TICK, (data) => {
      this._gameEngine?.setCountdownValue(data.value);
      this._hudPresenter?.showCountdown(data.value, data.progress);

      // Play countdown sound when the number changes
      if (data.isStart || data.progress === 0) {
        this._audioManager?.playCountdownTick(data.value);
      }

      this.emit(SessionEvent.HUD_COUNTDOWN, {
        value: data.value,
        progress: data.progress,
      });
      this.emit(SessionEvent.COUNTDOWN_TICK, data);
    });

    // Countdown complete - proceed to game start
    this._state.on(SessionStateEvent.COUNTDOWN_COMPLETE, async (data) => {
      // Show "GO!" overlay and play GO sound
      this._hudPresenter?.showCountdown(0);
      this._audioManager?.playCountdownGo();
      this.emit(SessionEvent.HUD_COUNTDOWN, { value: 0, progress: 1 });

      // Set DAA scores and start game after genesis anchor is confirmed
      this._gameEngine?.setDaaScores(data.startDaa, data.endDaa);
      this._gameEngine?.startGame();
      this._audioManager?.startMusic();

      this.emit(SessionEvent.GAME_START, data);
    });

    this._state.on(SessionStateEvent.PROGRESS_UPDATE, (data) => {
      this.emit(SessionEvent.PROGRESS_UPDATE, data);
    });
  }

  async _fetchDaaScore() {
    if (!this._kkGameEngine) {
      throw new Error("kkGameEngine unavailable");
    }

    const toNumber = (value) => {
      if (typeof value === "bigint") return Number(value);
      if (typeof value === "number") return value;
      if (value == null) return null;
      const num = Number(value);
      return Number.isNaN(num) ? null : num;
    };

    if (this._kkGameEngine.getKaspaBlocks) {
      try {
        const blocks = await this._kkGameEngine.getKaspaBlocks(1);
        const first = Array.isArray(blocks) ? blocks[0] : blocks?.[0];
        const header = first?.header ?? first ?? {};
        const daaScore = toNumber(header.daaScore ?? header.blueScore);
        if (daaScore !== null) {
          return daaScore;
        }
      } catch (e) {
        log.warn("Failed to fetch DAA via getKaspaBlocks", e?.message);
      }
    }

    if (!this._kkGameEngine?.onBlock) {
      throw new Error("kkGameEngine.onBlock() unavailable");
    }

    return await new Promise((resolve) => {
      let resolved = false;
      let timeoutId = null;

      const handler = (block) => {
        const header = block?.header ?? block ?? {};
        const daaScore = toNumber(header.daaScore ?? header.blueScore);
        if (daaScore === null || resolved) return;

        resolved = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (this._kkGameEngine?.offBlock) {
          this._kkGameEngine.offBlock(handler);
        }
        resolve(daaScore);
      };

      timeoutId = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        if (this._kkGameEngine?.offBlock) {
          this._kkGameEngine.offBlock(handler);
        }
        log.warn("DAA score timeout, using timestamp");
        resolve(Date.now());
      }, 5000);

      this._kkGameEngine.onBlock(handler);
    });
  }

  async _generateVrfSeed(gameId, daaScore) {
    if (!this._kkGameEngine?.getRandom) {
      throw new Error("VRF REQUIRED: kkGameEngine.getRandom() unavailable");
    }
    const seedInput = `${gameId}:${daaScore}`;
    const vrfResult = await this._kkGameEngine.getRandom({ seed: seedInput });
    return vrfResult.value;
  }

  _subscribeToBlocks() {
    if (!this._kkGameEngine) {
      log.warn("No kkGameEngine available for block subscription");
      return;
    }

    const toNumber = (value) => {
      if (typeof value === "bigint") return Number(value);
      if (typeof value === "number") return value;
      if (value == null) return null;
      const num = Number(value);
      return Number.isNaN(num) ? null : num;
    };

    // Helper to convert hex string to Uint8Array (binary packing - 50% storage savings)
    const hexToBytes = (hex) => {
      if (!hex || typeof hex !== "string") return null;
      // Remove 0x prefix if present
      const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
      if (cleanHex.length !== 64) return null; // Must be 32 bytes = 64 hex chars
      const bytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
      }
      return bytes;
    };

    this._blockHandler = (block) => {
      const header = block?.header ?? block ?? {};
      const daaScore = toNumber(header.daaScore ?? header.blueScore);

      const rawHash = header.hash ?? header.blockHash ?? header.headerHash;
      if (rawHash) {
        const hashBytes = hexToBytes(rawHash);
        if (hashBytes) {
          this._latestBlockHash = hashBytes;
          this._latestBlockHashHex = rawHash;
        }
      }

      if (daaScore === null) return;

      const phase = this._state.phase;

      // Countdown phase
      if (phase === SessionPhase.COUNTDOWN) {
        const countdownResult = this._state.processCountdownBlock(daaScore);
        if (countdownResult?.isComplete) {
          return;
        }
        return;
      }

      // Running phase - only update if DAA is increasing
      if (phase === SessionPhase.RUNNING) {
        const prevDaa = this._state.currentDaaScore;
        if (daaScore > prevDaa) {
          // Capture block hash as binary for replay verification
          const blockHash = rawHash;
          if (blockHash) {
            const hashBytes = hexToBytes(blockHash);
            if (hashBytes) {
              // Cap stream size to prevent unbounded memory growth (500 blocks = ~50s @ 10 BPS)
              const MAX_BLOCK_STREAM_SIZE = 500;
              if (this._blockHashStream.length >= MAX_BLOCK_STREAM_SIZE) {
                this._blockHashStream.shift(); // Remove oldest
              }
              this._blockHashStream.push(hashBytes);

              // Capture start block hash (first block during RUNNING)
              if (!this._startBlockHash) {
                this._startBlockHash = hashBytes;
                log.debug("Start block hash captured", {
                  hash: blockHash.substring(0, 16) + "...",
                });
              }

              // Always update end block hash (last block during RUNNING)
              this._endBlockHash = hashBytes;
            }
          }

          // ═══════════════════════════════════════════════════════════════
          // QRNG CAPTURE: Fetch NIST pulse every ~60 seconds during gameplay
          // NIST beacon updates every 60s, typically 3 pulses for 3-min game
          // ═══════════════════════════════════════════════════════════════
          const now = Date.now();
          const QRNG_CAPTURE_INTERVAL = 60000; // 60 seconds
          if (now - this._lastQrngCaptureTime >= QRNG_CAPTURE_INTERVAL) {
            this._captureGameplayQrngPulse().catch((err) => {
              log.warn("Failed to capture gameplay QRNG pulse", err.message);
            });
          }

          this._state.updateDaaScore(daaScore);
          this._gameEngine?.updateDaaScore(daaScore);
        }
      }
    };

    this._kkGameEngine.onBlock(this._blockHandler);

    log.info("Block subscription established");
  }

  _unsubscribeFromBlocks() {
    if (this._blockHandler && this._kkGameEngine?.offBlock) {
      this._kkGameEngine.offBlock(this._blockHandler);
      this._blockHandler = null;
      log.info("Unsubscribed from block updates");
    }
  }

  /**
   * Capture a QRNG pulse during gameplay (called every ~60s)
   * Fetches current NIST beacon pulse and stores:
   * - pulseValue (Uint8Array) for blockchain anchoring binary packing
   * - signature (hex string) for AuditView display
   * Deduplicates by pulseIndex.
   * @private
   */
  async _captureGameplayQrngPulse() {
    try {
      if (!this._kkGameEngine?.getQRNG) {
        log.warn("kkGameEngine.getQRNG() unavailable");
        return;
      }

      const qrng = await this._kkGameEngine.getQRNG("nist", 32);

      if (!qrng || !qrng.pulseIndex) {
        log.warn("QRNG fetch returned invalid data");
        return;
      }

      // Check for duplicate pulse (NIST updates every 60s)
      const isDuplicate = this._qrngPulses.some(
        (p) => p.pulseIndex === qrng.pulseIndex,
      );
      if (isDuplicate) {
        log.debug("Duplicate NIST pulse, skipping", {
          pulseIndex: qrng.pulseIndex,
        });
        return;
      }

      // Extract full output hash
      const outputHash = qrng.outputValue ?? qrng.hash ?? "";
      const cleanHex =
        typeof outputHash === "string"
          ? outputHash.startsWith("0x")
            ? outputHash.slice(2)
            : outputHash
          : bytesToHex(outputHash);

      // Extract full signature
      const signature = qrng.signatureValue ?? qrng.signature ?? "";
      const signatureHex =
        typeof signature === "string"
          ? signature.startsWith("0x")
            ? signature.slice(2)
            : signature
          : bytesToHex(signature);

      // Convert full output hash to Uint8Array for anchor processor compatibility
      const pulseValue = hexToBytes(cleanHex);

      // Store NIST data:
      // - pulseValue (Uint8Array) for anchor binary packing
      // - signature (hex string) for AuditView display
      // Cap to 10 pulses (more than enough for any game - NIST updates every 60s)
      const MAX_QRNG_PULSES = 10;
      if (this._qrngPulses.length >= MAX_QRNG_PULSES) {
        this._qrngPulses.shift(); // Remove oldest
      }
      this._qrngPulses.push({
        pulseIndex: qrng.pulseIndex,
        pulseValue: pulseValue, // Uint8Array for anchor binary packing
        signature: signatureHex, // Full 4096-bit RSA-PSS signature (hex)
      });

      this._lastQrngCaptureTime = Date.now();

      log.info("Gameplay QRNG pulse captured", {
        pulseIndex: qrng.pulseIndex,
        pulseCount: this._qrngPulses.length,
        outputHashLength: cleanHex.length,
        signatureLength: signatureHex.length,
      });
    } catch (err) {
      log.warn("Failed to capture QRNG pulse", err.message);
      // Don't throw - this is non-critical for gameplay
    }
  }

  // ─── Game Feedback Wiring ──────────────────────────────────────

  /**
   * Wire game engine events to audio and HUD feedback
   * Also sends game events to anchor processor for heartbeat anchoring
   * @private
   */
  _wireGameFeedbackEvents() {
    if (!this._gameEngine) return;
    if (this._feedbackWired) return;
    this._feedbackWired = true;

    // Remove any existing handlers first (prevents duplicates)
    this._unwireGameFeedbackEvents();

    // Coin collected → audio + HUD + visual effect + anchor
    this._coinHandler = (data) => {
      this._audioManager?.playCoinCollect();
      const coinsTotal = Number.isFinite(data.total)
        ? data.total
        : this._gameEngine?.coins ?? 0;
      this._hudPresenter?.updateCoins(coinsTotal);
      this._hudPresenter?.showCollectionEffect({
        type: "coin",
        value: data.value,
      });
      this.emit(SessionEvent.HUD_COINS_UPDATE, {
        coins: coinsTotal,
        value: data.value,
      });
      // Anchor coin event for spectators
      this._kkGameEngine?.recordEvent?.("coin_collected", {
        value: data.value,
        total: coinsTotal,
        coinsRemaining: coinsTotal,
        lane: this._gameEngine?.playerLane ?? 1,
      });
    };
    this._gameEngine.on(GameEvent.COIN_COLLECTED, this._coinHandler);

    // Collision → audio + HUD + anchor
    this._collisionHandler = (data) => {
      this._audioManager?.playCollision();
      const coinsRemaining = Number.isFinite(data.coinsRemaining)
        ? data.coinsRemaining
        : this._gameEngine?.coins ?? 0;
      this._hudPresenter?.updateCoins(coinsRemaining);
      this.emit(SessionEvent.HUD_COINS_UPDATE, {
        coins: coinsRemaining,
        lost: data.coinsLost,
      });
      // Anchor collision event for spectators
      this._kkGameEngine?.recordEvent?.("collision", {
        coinsLost: data.coinsLost,
        coinsRemaining,
        total: coinsRemaining, // Include total for heartbeat packing
        lane: this._gameEngine?.playerLane ?? 1,
      });
    };
    this._gameEngine.on(GameEvent.COLLISION, this._collisionHandler);

    // Powerup collected → audio + visual effect + anchor
    this._powerupHandler = (data) => {
      const isPositive = data?.type?.positive !== false;
      const coinsTotal = this._gameEngine?.coins ?? 0;
      if (isPositive) {
        this._audioManager?.playPowerup();
        this._hudPresenter?.showCollectionEffect({
          type: "powerup",
          name: data?.type?.name,
        });
        // Anchor powerup event for spectators
        this._kkGameEngine?.recordEvent?.("powerup_collected", {
          type: data?.type,
          duration: data?.duration,
          total: coinsTotal,
          coinsRemaining: coinsTotal,
          lane: this._gameEngine?.playerLane ?? 1,
        });
      } else {
        this._audioManager?.playPowerdown();
        this._hudPresenter?.showCollectionEffect({
          type: "powerdown",
          name: data?.type?.name,
        });
        // Anchor powerdown event for spectators
        this._kkGameEngine?.recordEvent?.("powerdown_collected", {
          type: data?.type,
          duration: data?.duration,
          total: coinsTotal,
          coinsRemaining: coinsTotal,
          lane: this._gameEngine?.playerLane ?? 1,
        });
      }
    };
    this._gameEngine.on(GameEvent.POWERUP_COLLECTED, this._powerupHandler);

    // Progress update → HUD speed + audio speed multiplier
    this._progressHandler = (data) => {
      this._hudPresenter?.updateSpeed(data.speed);
      this.emit(SessionEvent.HUD_SPEED_UPDATE, { speed: data.speed });
      this._audioManager?.setSpeedMultiplier(data.speed / GAME.INITIAL_SPEED);
      // Push progress into heartbeat payload so opponent receives it
      this._kkGameEngine?.setProgress?.(data.progress);
    };
    this._gameEngine.on(GameEvent.PROGRESS_UPDATE, this._progressHandler);

    // Game end → trigger session end
    this._gameEndHandler = (data) => {
      this.endSession({
        ...data.results,
        reason: data.reason,
        endReason: data.reason,
      });
    };
    this._gameEngine.on(GameEvent.GAME_END, this._gameEndHandler);

    log.debug("Game feedback events wired (with anchor support)");
  }

  /**
   * Unwire game feedback events (prevents duplicate listeners)
   * @private
   */
  _unwireGameFeedbackEvents() {
    if (!this._gameEngine) return;

    if (this._coinHandler) {
      this._gameEngine.off?.(GameEvent.COIN_COLLECTED, this._coinHandler);
      this._coinHandler = null;
    }
    if (this._collisionHandler) {
      this._gameEngine.off?.(GameEvent.COLLISION, this._collisionHandler);
      this._collisionHandler = null;
    }
    if (this._powerupHandler) {
      this._gameEngine.off?.(GameEvent.POWERUP_COLLECTED, this._powerupHandler);
      this._powerupHandler = null;
    }
    if (this._progressHandler) {
      this._gameEngine.off?.(GameEvent.PROGRESS_UPDATE, this._progressHandler);
      this._progressHandler = null;
    }
    if (this._gameEndHandler) {
      this._gameEngine.off?.(GameEvent.GAME_END, this._gameEndHandler);
      this._gameEndHandler = null;
    }
  }

  /**
   * Wire integrity monitor events to HUD and game engine
   * @private
   */
  _wireIntegrityEvents() {
    if (!this._integrityMonitor) return;
    if (this._integrityWired) return;
    this._integrityWired = true;

    // State changed → update HUD shield
    this._integrityMonitor.on(IntegrityEvent.STATE_CHANGED, () => {
      const stateInfo = this._integrityMonitor.getStateInfo();
      this._hudPresenter?.updateIntegrityState(stateInfo);
      this.emit(SessionEvent.HUD_INTEGRITY_UPDATE, stateInfo);
    });

    // Cheat detected → force end game
    this._integrityMonitor.on(IntegrityEvent.CHEAT_DETECTED, (data) => {
      log.error("Cheat detected!", data);
      this._gameEngine?.forceEnd("cheat_detected");
    });

    // Forfeit → force end game
    this._integrityMonitor.on(IntegrityEvent.FORFEIT, (data) => {
      log.warn("Game forfeited", data);
      this._gameEngine?.forceEnd("forfeit");
    });

    log.debug("Integrity events wired");
  }

  /**
   * Wire opponent telemetry from anchored moves.
   * Also wires OPPONENT_HEARTBEAT to reset IntegrityMonitor even for 0-move heartbeats.
   * @private
   */
  _wireOpponentTelemetry() {
    if (!this._kkGameEngine?.onOpponentMoveAnchored) return;
    if (this._opponentTelemetryWired) return;

    this._opponentTelemetryWired = true;
    
    // Handler for individual moves (updates coins, progress)
    this._opponentMoveHandler = (move) => {
      if (!this._state.isMultiplayer) return;

      this._integrityMonitor?.recordOpponentMove?.(move);

      const result = this._opponentTelemetry.applyMove(move);
      if (!result) return;

      if (result.changed) {
        this._emitOpponentState();
      }

      if (result.endedNow) {
        this.emit(SessionEvent.OPPONENT_END, {
          reason: "coins_depleted",
          coins: this._opponentTelemetry.state.coins,
          progress: this._opponentTelemetry.state.progress,
          timestamp: Date.now(),
        });
      }
    };

    // Handler for heartbeat batches - resets IntegrityMonitor even for 0-move heartbeats
    this._opponentHeartbeatHandler = (heartbeat) => {
      if (!this._state.isMultiplayer) return;
      
      // Any heartbeat from opponent = opponent is alive, reset timeout
      // This is CRITICAL for 0-move heartbeats (player sitting still)
      log.debug("Opponent heartbeat received", {
        txId: heartbeat.txId,
        moveCount: heartbeat.moveCount,
      });
      
      // Record as opponent activity even if no moves
      this._integrityMonitor?.recordOpponentMove?.({
        type: "heartbeat",
        txId: heartbeat.txId,
        moveCount: heartbeat.moveCount,
        timestamp: heartbeat.timestamp,
      });
    };

    this._kkGameEngine.onOpponentMoveAnchored(this._opponentMoveHandler);
    this._kkGameEngine.onOpponentHeartbeat?.(this._opponentHeartbeatHandler);
  }

  /**
   * @private
   */
  _unwireOpponentTelemetry() {
    if (!this._opponentTelemetryWired) return;
    if (this._kkGameEngine?.off) {
      if (this._opponentMoveHandler) {
        this._kkGameEngine.off("opponentMoveAnchored", this._opponentMoveHandler);
      }
      if (this._opponentHeartbeatHandler) {
        this._kkGameEngine.off("opponentHeartbeat", this._opponentHeartbeatHandler);
      }
    }
    this._opponentMoveHandler = null;
    this._opponentHeartbeatHandler = null;
    this._opponentTelemetryWired = false;
  }

  /**
   * @private
   */
  _emitOpponentState() {
    const state = this._opponentTelemetry.state;
    const progress = Number.isFinite(state.progress)
      ? state.progress
      : this._state.progress;
    const coins = Number.isFinite(state.coins) ? state.coins : GAME.PLAYER_START_COINS;

    this.emit(SessionEvent.OPPONENT_STATE_UPDATED, {
      progress,
      coins,
      timestamp: Date.now(),
    });
  }

  /**
   * Wire anchor processor UTXO events to HUD
   * @private
   */
  _wireUtxoEvents() {
    const anchorProcessor = this._kkGameEngine?.anchorProcessor;
    if (!anchorProcessor) return;
    if (this._utxoEventsWired) return;
    this._utxoEventsWired = true;

    // UTXO refreshing → show HUD notification
    anchorProcessor.on(AnchorEvent.UTXO_REFRESHING, () => {
      this._hudPresenter?.showUtxoRefresh?.();
      this.emit(SessionEvent.HUD_UTXO_REFRESH);
    });

    // UTXO refresh complete → hide HUD notification
    anchorProcessor.on(AnchorEvent.UTXO_REFRESH_COMPLETE, () => {
      this._hudPresenter?.hideUtxoRefresh?.();
      this.emit(SessionEvent.HUD_UTXO_REFRESH_COMPLETE);
    });

    // Low funds warning → show test mode warning
    anchorProcessor.on(AnchorEvent.LOW_FUNDS_WARNING, (data) => {
      log.warn("Low funds warning", data);
      this._hudPresenter?.showTestModeWarning?.();
      this.emit(SessionEvent.HUD_TEST_MODE_WARNING, data);
    });

    // Anchor complete → hide retry modal (no toast - game over shows immediately)
    anchorProcessor.on(AnchorEvent.ANCHOR_COMPLETE, (data) => {
      log.info("Final anchor complete", { txId: data.txId });
      this._lastAnchorTxId = data.txId;
      this._hudPresenter?.hideAnchorRetryModal?.();
      this.emit(SessionEvent.HUD_ANCHOR_COMPLETE, {
        success: true,
        txId: data.txId,
      });
    });

    // Anchor retry needed → show retry modal with callback
    anchorProcessor.on(AnchorEvent.ANCHOR_RETRY_NEEDED, (data) => {
      log.warn("Anchor retry needed", data);
      this._hudPresenter?.showAnchorRetryModal?.({
        error: data.error,
        reason: data.reason,
        onRetry: async () => {
          return await this._kkGameEngine.retryFinalAnchor();
        },
      });
      this.emit(SessionEvent.HUD_ANCHOR_RETRY, {
        error: data.error,
        reason: data.reason,
      });
    });

    // VRF sync wait → show waiting overlay (non-fatal UI state)
    anchorProcessor.on(AnchorEvent.VRF_SYNC_WAIT, (data) => {
      log.warn("VRF sync wait", data);
      this._hudPresenter?.showSyncWait?.();
      this.emit(SessionEvent.HUD_SYNC_WAIT, data);
    });

    // VRF sync resolved → hide waiting overlay
    anchorProcessor.on(AnchorEvent.VRF_SYNC_RESOLVED, (data) => {
      log.info("VRF sync resolved", data);
      this._hudPresenter?.hideSyncWait?.();
      this.emit(SessionEvent.HUD_SYNC_RESOLVED, data);
    });

    log.debug("UTXO events wired");
  }

  /**
   * Start powerup tick timer (100ms interval for HUD countdown and race timer)
   * @private
   */
  _startPowerupTick() {
    this._stopPowerupTick();

    this._powerupTickInterval = setInterval(() => {
      if (!this._gameEngine || this._gameEngine.state !== GameState.RUNNING) {
        return;
      }

      // Update race timer
      const raceTime = this._gameEngine.raceTimeFormatted;
      this._hudPresenter?.updateRaceTime(raceTime);

      // Update powerup indicator
      const powerup = this._gameEngine.activePowerup;
      if (powerup) {
        const remaining = powerup.startTime + powerup.duration - Date.now();
        const powerupData = { type: powerup.type, remainingMs: remaining };
        this._hudPresenter?.showPowerup(powerupData);
        this.emit(SessionEvent.HUD_POWERUP_UPDATE, powerupData);
      } else {
        this._hudPresenter?.showPowerup(null);
        this.emit(SessionEvent.HUD_POWERUP_UPDATE, null);
      }
    }, POWERUP_TICK_INTERVAL);

    log.debug("Powerup tick started");
  }

  /**
   * Stop powerup tick timer
   * @private
   */
  _stopPowerupTick() {
    if (this._powerupTickInterval) {
      clearInterval(this._powerupTickInterval);
      this._powerupTickInterval = null;
    }
  }

  /**
   * Destroy controller - FIXED: comprehensive cleanup to prevent memory leaks
   */
  destroy() {
    this.cleanup();

    // Clear all references to external objects
    this._kkGameEngine = null;
    this._gameEngine = null;
    this._integrityMonitor = null;
    this._audioManager = null;
    this._hudPresenter = null;

    // Destroy internal state
    if (this._state) {
      this._state.destroy?.();
      this._state = null;
    }

    // Clear all event listeners
    this.removeAllListeners();

    log.info("SessionController destroyed");
  }
}

export default SessionController;
