/**
 * AuditDataCollector.js - Audit data collection for DAG Dasher
 *
 * Single Responsibility: Collect and format audit data using kkGameEngine.
 *
 * All blockchain data is fetched through kkGameEngine (the single source of truth).
 * No direct kaspaPortal or OnChainAuditCollector usage — those are internal
 * implementation details hidden behind kkGameEngine's facade.
 */

import { Logger } from '../../core/Logger.js';
import { bytesToHex } from '../../core/CryptoUtils.js';

const log = Logger.create('AuditDataCollector');

/**
 * Collect and format audit data from game session
 */
export class AuditDataCollector {

  /**
   * Collect audit data from the Kaspa blockchain via kkGameEngine.
   *
   * kkGameEngine walks the DAG from genesisBlockHashHex, matching anchors
   * by gameIdTagHex prefix, and returns the authoritative anchor chain.
   *
   * @param {Object} kkGameEngine - KKGameEngine instance
   * @param {Object} [options] - Options
   * @param {string} [options.gameId] - Game identifier (defaults to engine's current gameId)
   * @param {string} [options.genesisBlockHashHex] - Genesis block hash (defaults to engine's)
   * @param {boolean} [options.forceDagScan] - Skip cached data, scan blockchain directly
   * @param {Object} [options.gameResults] - Game results to merge into output
   * @param {Function} [options.onProgress] - Progress callback ({ step, message })
   * @returns {Promise<Object>} Collected audit data formatted for verification UI
   */
  static async collectFromChain(kkGameEngine, options = {}) {
    const {
      gameId = kkGameEngine.gameId,
      genesisBlockHashHex = kkGameEngine.genesisBlockHashHex,
      forceDagScan = false,
      gameResults = {},
      onProgress,
    } = options;

    if (!kkGameEngine) {
      throw new Error('AuditDataCollector: kkGameEngine is required');
    }

    log.info('Collecting audit data via kkGameEngine', { gameId, genesisBlockHashHex });

    onProgress?.({ step: 'fetch', message: 'Fetching audit data from Kaspa...' });

    try {
      let auditData = null;
      if (genesisBlockHashHex && gameId) {
        onProgress?.({ step: 'dag', message: 'Scanning blockchain for anchors...' });
        auditData = await kkGameEngine.getAuditData({
          gameId,
          genesisBlockHashHex,
          forceDagScan,
        });
      }

      if (!auditData) {
        log.warn('No audit data returned from kkGameEngine');
        return AuditDataCollector._emptyAuditData(gameId, gameResults);
      }

      onProgress?.({ step: 'format', message: 'Formatting audit data...' });

      // Merge game results into the data
      return {
        source: 'blockchain',
        ...auditData,
        gameId: auditData.gameId ?? gameId ?? 'unknown',
        timestamp: auditData.timestamp ?? new Date().toISOString(),
        gameResults: {
          ...(auditData.gameResults ?? {}),
          ...gameResults,
        },
      };
    } catch (e) {
      log.error('Audit data collection failed', e);
      return {
        source: 'blockchain-failed',
        gameId: gameId ?? 'unknown',
        timestamp: new Date().toISOString(),
        gameResults,
        error: e.message,
        anchorChain: null,
        genesisEntropy: null,
      };
    }
  }

  /**
   * Return an empty audit data structure when no data is available.
   * @private
   */
  static _emptyAuditData(gameId, gameResults) {
    return {
      source: 'empty',
      gameId: gameId ?? 'unknown',
      timestamp: new Date().toISOString(),
      gameResults: gameResults ?? {},
      anchorChain: null,
      genesisEntropy: null,
    };
  }

  /**
   * Aggregate NIST pulses from genesis and gameplay
   * @param {Object} auditData - Collected audit data
   * @returns {Array} Aggregated unique pulses
   */
  static aggregateNistPulses(auditData) {
    const allPulses = [];
    const seenPulseIndices = new Set();
    const nistData = auditData.genesisEntropy;
    const qrngPulses = auditData.qrngPulses || [];

    // Add genesis pulse first
    if (nistData?.nistPulseIndex) {
      seenPulseIndices.add(String(nistData.nistPulseIndex));
      allPulses.push({
        label: 'Genesis Pulse',
        pulseIndex: nistData.nistPulseIndex,
        outputHash: nistData.nistOutputHash,
        signature: nistData.nistSignature,
        hasSignature: nistData.hasNistSignature,
        isGenesis: true,
      });
    }

    // Add gameplay pulses, skip duplicates
    let gameplayCount = 0;
    qrngPulses.forEach((pulse) => {
      const idx = String(pulse.pulseIndex);
      if (seenPulseIndices.has(idx)) return;
      seenPulseIndices.add(idx);
      gameplayCount++;

      const outputHash = AuditDataCollector.pulseValueToHex(pulse.pulseValue) || pulse.pulseFragment || '';
      allPulses.push({
        label: `Gameplay Pulse ${gameplayCount}`,
        pulseIndex: pulse.pulseIndex,
        outputHash: outputHash,
        signature: pulse.signature || null,
        hasSignature: !!pulse.signature,
        isGenesis: false,
      });
    });

    return allPulses;
  }

  /**
   * Convert pulse value to hex string
   * @param {Uint8Array|string} value
   * @returns {string}
   */
  static pulseValueToHex(value) {
    if (value instanceof Uint8Array) {
      return bytesToHex(value);
    }
    if (typeof value === 'string') {
      return value.startsWith('0x') ? value.slice(2) : value;
    }
    return '';
  }

  /**
   * Format data for JSON download
   * @param {Object} auditData
   * @param {Array} verificationLog
   * @param {Object} verificationResults
   * @returns {Object}
   */
  static formatForDownload(auditData, verificationLog = [], verificationResults = null) {
    return {
      ...auditData,
      verificationLog,
      verificationResults,
      exportedAt: new Date().toISOString(),
      exportVersion: 'v6',
    };
  }

  /**
   * Create explorer link for a transaction
   * @param {string} txId
   * @param {boolean} compact
   * @returns {Object} { url, displayText }
   */
  static getExplorerLink(txId, compact = false) {
    if (!txId || txId === 'pending') {
      return { url: null, displayText: 'pending...' };
    }

    // Kaspa testnet-10 explorer
    const url = `https://explorer-tn10.kaspa.org/txs/${txId}`;
    const displayText = compact ? `${txId.substring(0, 16)}...` : txId;

    return { url, displayText };
  }
}

export default AuditDataCollector;
