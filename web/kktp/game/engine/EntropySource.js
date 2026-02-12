/**
 * EntropySource.js - VRF entropy and deterministic randomness
 *
 * Extracted from GameEngine.js for separation of concerns.
 * Handles:
 * - VRF-based deterministic random generation via kkGameEngine.getRandom()
 * - Prefetch queue to keep sync RNG fast
 * - Counter-based spawn determinism for replay verification
 *
 * This is the "Secret Sauce" - portable entropy for any game.
 */

import { Logger } from "../core/Logger.js";

const log = Logger.create("EntropySource");

/**
 * EntropySource mixin for GameEngine
 * Provides VRF entropy and deterministic randomness methods
 */
export const EntropySourceMixin = {
  /**
   * Initialize entropy source state
   * Called from GameEngine constructor
   */
  _initEntropySource() {
    // VRF
    this._initialSeed = null; // Seed input base
    this._spawnCounter = 0; // Increments per spawn for determinism
    this._vrfCounter = 0; // Increments per VRF prove call
    this._kkGameEngine = null; // KKGameEngine reference

    // VRF queue (async prove -> sync use)
    this._vrfQueue = [];
    this._vrfRefillInFlight = false;
    this._vrfMinQueue = 8;
    this._vrfBatchSize = 16;
    this._vrfCancelled = false;
  },

  /**
   * Setup entropy source with VRF seed and kkGameEngine
   * @param {Object} options
   * @param {string} options.vrfSeed - Initial VRF seed for obstacle generation
   * @param {Object} options.kkGameEngine - kkGameEngine instance for VRF
   */
  _setupEntropySource(options = {}) {
    // Store initial seed as fallback
    this._initialSeed = options.vrfSeed;
    this._spawnCounter = 0; // Reset per game for replay verification
    this._vrfCounter = 0;
    this._vrfQueue = [];
    this._vrfCancelled = false;

    this._kkGameEngine = options.kkGameEngine ?? null;

    if (this._kkGameEngine?.getRandom) {
      this._refillVrfQueue();
      log.debug("Entropy source connected to kkGameEngine.getRandom()");
    } else {
      log.warn("kkGameEngine.getRandom() unavailable - VRF disabled");
    }
  },

  /**
  * Get VRF random value using kkGameEngine.getRandom() outputs
   * @returns {number} Random value 0-1
   */
  _getVrfRandom() {
    if (this._vrfQueue.length < this._vrfMinQueue) {
      this._refillVrfQueue();
    }

    const outputHex = this._vrfQueue.shift();
    if (outputHex) {
      this._spawnCounter++;
      return this._hexToRandom(outputHex);
    }

    // Last-resort fallback (should not happen in production)
    log.warn("VRF queue empty - using fallback hash");
    this._spawnCounter++;
    return this._hashToRandom(`${this._initialSeed}:${this._spawnCounter}`);
  },

  /**
   * Get multiple VRF random values in one call
   * Useful for complex spawn decisions
   * @param {number} count - Number of random values needed
   * @returns {number[]} Array of random values 0-1
   */
  _getVrfRandomBatch(count) {
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(this._getVrfRandom());
    }
    return results;
  },

  /**
  * Refill VRF queue using kkGameEngine.getRandom()
   * @private
   */
  async _refillVrfQueue() {
    if (this._vrfRefillInFlight || this._vrfCancelled) return;

    this._vrfRefillInFlight = true;

    try {
      // Deterministic refill: only advance counter when an output is queued
      for (let i = 0; i < this._vrfBatchSize; i++) {
        const seedInput = `${this._initialSeed}:${this._vrfCounter}`;
        try {
          const res = await this._kkGameEngine.getRandom({ seed: seedInput });
          if (res?.value) {
            this._vrfQueue.push(res.value);
            this._vrfCounter++;
          } else {
            log.warn("VRF getRandom() returned no output", { seedInput });
            break;
          }
        } catch (e) {
          log.error("VRF getRandom() failed", e?.message);
          break;
        }
      }
    } catch (e) {
      log.error("VRF getRandom() refill failed", e?.message);
    } finally {
      this._vrfRefillInFlight = false;
    }
  },

  /**
   * Convert hex string to random value 0-1
   * @param {string} hex - Hex string
   * @returns {number} Random value 0-1
   */
  _hexToRandom(hex) {
    if (!hex || typeof hex !== "string") return 0.5;
    const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
    if (clean.length < 8) return 0.5;
    const head = clean.substring(0, 8);
    const tail = clean.length >= 16 ? clean.substring(clean.length - 8) : head;
    const headVal = parseInt(head, 16);
    const tailVal = parseInt(tail, 16);
    const value = (headVal ^ tailVal) >>> 0;
    if (Number.isNaN(value)) return 0.5;
    return value / 0xffffffff;
  },

  /**
   * Convert string to deterministic random value 0-1
   * Uses FNV-1a hash with MurmurHash3 finalizer for better distribution
   * @param {string} input - Input string to hash
   * @returns {number} Random value 0-1
   */
  _hashToRandom(input) {
    // FNV-1a hash - much better distribution than djb2
    let hash = 2166136261; // FNV offset basis
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      // FNV prime multiplication (use imul for proper 32-bit math)
      hash = Math.imul(hash, 16777619);
    }

    // MurmurHash3 finalizer - avalanche effect for better bit distribution
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 2246822507);
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 3266489909);
    hash ^= hash >>> 16;

    // Normalize to 0-1 (use unsigned 32-bit conversion)
    return (hash >>> 0) / 4294967295;
  },

  /**
   * Get current entropy state for audit/replay
   * @returns {Object} Entropy state snapshot
   */
  _getEntropyState() {
    return {
      initialSeed: this._initialSeed,
      spawnCounter: this._spawnCounter,
      vrfCounter: this._vrfCounter,
      vrfQueueSize: this._vrfQueue.length,
      hasKKGameEngine: !!this._kkGameEngine,
    };
  },

  /**
   * Reset entropy for new game
   */
  _resetEntropy() {
    this._spawnCounter = 0;
    this._vrfCounter = 0;
    this._vrfQueue = [];
    log.trace("Entropy reset");
  },

  /**
   * Cleanup entropy source
   */
  _destroyEntropySource() {
    this._vrfCancelled = true;
    this._kkGameEngine = null;
    this._initialSeed = null;
    this._vrfQueue = null;
    this._vrfQueue = [];

    log.debug("Entropy source destroyed");
  },
};

export default EntropySourceMixin;
