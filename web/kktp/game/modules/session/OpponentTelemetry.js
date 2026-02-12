/**
 * OpponentTelemetry.js - Derive opponent state from anchored moves
 *
 * Single responsibility: translate opponent move events into a
 * consistent opponent state (coins, progress, end).
 */

import { GAME } from "../../core/Constants.js";

/**
 * Action code to string mapping (v5 protocol codes).
 * Kept minimal for SRP - only codes needed for coin/collision telemetry.
 */
const CODE_TO_ACTION = Object.freeze({
  8: "coin_collected",  // v5 COLLECT_COIN
  6: "collision",       // v5 AMMO_CHANGE (remapped by DAG Dasher customActionMap)
});

/**
 * Sentinel value indicating no coin change (used for movement-only packets)
 */
const COINS_UNCHANGED_SENTINEL = 65535;

export class OpponentTelemetry {
  constructor({ startCoins = GAME.PLAYER_START_COINS, coinValue = GAME.COIN_VALUE } = {}) {
    this._startCoins = Number.isFinite(startCoins) ? startCoins : 0;
    this._coinValue = Number.isFinite(coinValue) ? coinValue : 0;
    this.reset();
  }

  reset() {
    this._coins = null;
    this._progress = null;
    this._ended = false;
    this._processedMoves = new Set();
    this._hasActivity = false;
  }

  /**
   * Check if opponent has ended (e.g., ran out of coins)
   * @returns {boolean}
   */
  get hasEnded() {
    return this._ended;
  }

  setProgress(progress) {
    // Don't update progress if opponent has ended
    if (this._ended) return false;

    if (!Number.isFinite(progress)) return false;
    const next = Math.max(0, Math.min(1, progress));
    if (this._progress === next) return false;
    this._progress = next;
    return true;
  }

  /**
   * Resolve action to a normalized string.
   * Handles both string actions and numeric action codes.
   * @param {string|number} action
   * @returns {string}
   * @private
   */
  _resolveAction(action) {
    if (typeof action === "string") {
      const normalized = action.toLowerCase();
      if (normalized === "coin") return "coin_collected";
      if (normalized === "hit") return "collision";
      return normalized;
    }
    if (typeof action === "number") return CODE_TO_ACTION[action] || "unknown";
    return "unknown";
  }

  applyMove(move) {
    if (!move) return null;

    // Don't process moves if opponent has already ended
    if (this._ended) return null;

    const moveId = move.moveId ?? this._buildFallbackId(move);
    if (moveId && this._processedMoves.has(moveId)) return null;
    if (moveId) this._processedMoves.add(moveId);

    const absoluteCoins = this._getAbsoluteCoins(move);
    let nextCoins = Number.isFinite(this._coins) ? this._coins : this._startCoins;
    let usedAbsolute = false;

    if (Number.isFinite(absoluteCoins)) {
      nextCoins = absoluteCoins;
      usedAbsolute = true;
      this._hasActivity = true;
    }

    if (!usedAbsolute) {
      // Resolve action from string or actionCode
      const action = this._resolveAction(move.action ?? move.actionCode ?? move.eventData?.action);

      const eventValue = Number.isFinite(move?.eventData?.value) ? move.eventData.value : null;
      const coinsLost = Number.isFinite(move?.eventData?.coinsLost) ? move.eventData.coinsLost : null;

      let delta = 0;
      if (action === "coin_collected") delta += eventValue ?? this._coinValue;
      if (action === "collision") delta -= coinsLost ?? this._coinValue;
      if (Number.isFinite(move.coinsDelta)) delta += move.coinsDelta;
      if (Number.isFinite(move.eventData?.coinsDelta)) delta += move.eventData.coinsDelta;
      if (delta !== 0) {
        this._hasActivity = true;
        nextCoins += delta;
      }
    }

    if (Number.isFinite(move.progress)) {
      this._progress = Math.max(0, Math.min(1, move.progress));
    }

    if (!Number.isFinite(nextCoins)) {
      nextCoins = this._startCoins;
    }

    if (nextCoins < 0) nextCoins = 0;
    const coinsChanged = nextCoins !== this._coins || this._coins === null;
    const progressChanged = Number.isFinite(move.progress) && move.progress !== this._progress;
    const changed = coinsChanged || progressChanged;
    this._coins = nextCoins;

    const endedNow = !this._ended && this._hasActivity && this._coins === 0;
    if (endedNow) this._ended = true;

    return {
      coins: this._coins,
      progress: this._progress,
      endedNow,
      changed,
      moveId,
    };
  }

  get state() {
    return {
      coins: this._coins,
      progress: this._progress,
      ended: this._ended,
    };
  }

  _getAbsoluteCoins(move) {
    const candidates = [
      move.coinsTotal,
      move.coinsRemaining,
      move.totalCoins,
      move.coins,
      // Support eventData wrapper format from some event sources
      move.eventData?.coinsTotal,
      move.eventData?.coinsRemaining,
      move.eventData?.coins,
      move.eventData?.value,
      move.eventData?.total,
    ];
    for (const value of candidates) {
      // Skip sentinel value (65535 = no coin change, used for movement-only packets)
      if (Number.isFinite(value) && value !== COINS_UNCHANGED_SENTINEL) return value;
    }
    return null;
  }

  _buildFallbackId(move) {
    const txId = move.txId ?? "";
    const seq = Number.isFinite(move.sequence) ? move.sequence : "";
    if (txId || seq !== "") return `${txId}-${seq}`;
    return null;
  }
}

export default OpponentTelemetry;
