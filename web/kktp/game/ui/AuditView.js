/**
 * AuditView.js - Blockchain audit interface for anti-cheat verification
 *
 * Single Responsibility: Orchestrate audit UI components and coordinate
 * data collection through kkGameEngine (the single source of truth).
 *
 * All blockchain data is fetched through kkGameEngine — no direct
 * kaspaPortal or OnChainAuditCollector usage.
 */

import { EventEmitter } from '../core/EventEmitter.js';
import { Logger } from '../core/Logger.js';
import { COLORS } from '../core/Constants.js';

// Import modular components from audit folder
import {
  AuditDataCollector,
  createAuditHeader,
  createVerificationPanel,
  createNistSection,
  createRawDataSection,
  createRetrieveSection,
  CONTAINER_STYLES,
} from './audit/index.js';

const log = Logger.create('AuditView');

/**
 * Audit view events
 */
export const AuditEvent = {
  CLOSE: 'close',
  DOWNLOAD: 'download',
  VERIFICATION_COMPLETE: 'verificationComplete',
};

/**
 * AuditView - Main audit interface orchestrator
 *
 * Composes modular UI components to display blockchain audit data.
 * All data flows through kkGameEngine.
 */
export class AuditView extends EventEmitter {
  /**
   * @param {HTMLElement} container - Parent container element
   */
  constructor(container) {
    super();
    this._container = container;
    this._element = null;
    this._visible = false;
    this._auditData = null;
    this._verificationResults = null;
    this._verificationLog = [];
    this._kkGameEngine = null;
    this._gameId = null;
    this._gameResults = null;
    this._content = null;
    this._retrieveUi = null;
    this._verificationPanelEl = null;
    this._nistSectionEl = null;
    this._rawDataSectionEl = null;
  }

  /**
   * Show the audit view
   *
   * @param {Object} options
   * @param {Object} options.kkGameEngine - KKGameEngine instance (REQUIRED)
   * @param {Object} [options.gameResults] - Final game results
   * @param {string} [options.gameId] - Game identifier
   */
  async show(options = {}) {
    if (this._visible) return;

    const { kkGameEngine, gameResults, gameId } = options;

    if (!kkGameEngine) {
      log.error('AuditView.show() requires kkGameEngine');
      throw new Error('AuditView requires kkGameEngine.');
    }

    this._kkGameEngine = kkGameEngine;
    this._gameId = gameId || kkGameEngine.gameId || null;
    this._gameResults = gameResults || null;

    // Initialize with empty audit data; require explicit retrieval from Kaspa
    this._auditData = this._createEmptyAuditData();
    this._verificationResults = null;
    this._verificationLog = [];

    // Build and show UI
    this._createElement();
    this._container.appendChild(this._element);
    this._visible = true;

    requestAnimationFrame(() => {
      this._element.style.opacity = '1';
    });

    log.info('Audit view shown', {
      gameId: this._auditData.gameId,
      source: this._auditData.source,
    });
  }

  /**
   * Hide the audit view
   */
  hide() {
    if (!this._visible || !this._element) return;

    this._element.style.opacity = '0';

    setTimeout(() => {
      if (this._element?.parentNode) {
        this._element.parentNode.removeChild(this._element);
      }
      this._element = null;
      this._visible = false;
    }, 300);

    log.info('Audit view hidden');
  }

  /**
   * Is the audit view currently visible?
   */
  get isVisible() {
    return this._visible;
  }

  /**
   * Get the collected audit data
   */
  get auditData() {
    return this._auditData;
  }

  /**
   * Get verification results
   */
  get verificationResults() {
    return this._verificationResults;
  }

  // ============================================================
  // Private: Data Collection (via kkGameEngine)
  // ============================================================

  /**
   * Collect audit data using kkGameEngine
   * @private
   */
  async _collectAuditData() {
    log.info('Collecting audit data via kkGameEngine');

    try {
      return await AuditDataCollector.collectFromChain(this._kkGameEngine, {
        gameId: this._gameId,
        gameResults: this._gameResults,
        onProgress: (p) => log.debug('Collection:', p.message),
      });
    } catch (e) {
      log.error('Audit data collection failed', e);
      return {
        source: 'failed',
        gameId: this._gameId || 'unknown',
        timestamp: new Date().toISOString(),
        gameResults: this._gameResults || {},
        error: e.message,
        genesisEntropy: null,
        anchorChain: null,
      };
    }
  }

  /**
   * Build an empty audit data object for initial UI state.
   * @private
   */
  _createEmptyAuditData() {
    return {
      source: 'pending',
      gameId: this._gameId || 'unknown',
      timestamp: new Date().toISOString(),
      gameResults: this._gameResults || {},
      anchorChain: null,
      genesisEntropy: null,
      vrfProofs: null,
      v4MoveHistory: null,
    };
  }

  // ============================================================
  // Private: UI Creation (Composition of modular components)
  // ============================================================

  /**
   * Create the main audit view element
   * @private
   */
  _createElement() {
    this._element = document.createElement('div');
    this._element.className = 'ks-audit-view';
    this._element.style.cssText = CONTAINER_STYLES.overlay;

    // Header (fixed)
    this._element.appendChild(createAuditHeader({
      onDownload: () => this._downloadAudit(),
      onClose: () => {
        this.hide();
        this.emit(AuditEvent.CLOSE);
      },
    }));

    // Content area (scrollable)
    const content = document.createElement('div');
    content.className = 'audit-content';
    content.style.cssText = CONTAINER_STYLES.content;
    this._content = content;

    // Retrieve section (re-fetch with user-provided gameId / genesisBlockHashHex)
    const genesisTxId = this._kkGameEngine?.genesisTxId ?? '';
    const finalTxId = this._kkGameEngine?.lastAnchorTxId ?? '';
    this._retrieveUi = createRetrieveSection({
      genesisTxId,
      finalTxId,
      gameId: this._gameId || '',
      onRetrieve: () => this._retrieveFromKaspa(),
    });
    content.appendChild(this._retrieveUi.element);
    this._retrieveUi?.setStatus?.('Awaiting on-chain retrieval.', COLORS.PRIMARY_HEX);

    // Verification Panel (uses AuditVerifier)
    this._verificationPanelEl = createVerificationPanel(
      this._auditData,
      (results) => this._onVerificationComplete(results)
    );
    content.appendChild(this._verificationPanelEl);

    // NIST QRNG Section
    this._nistSectionEl = createNistSection(this._auditData);
    content.appendChild(this._nistSectionEl);

    // Collapsible Raw Data Section
    this._rawDataSectionEl = createRawDataSection(this._auditData);
    content.appendChild(this._rawDataSectionEl);

    this._element.appendChild(content);
  }

  /**
   * Re-retrieve audit data from Kaspa using user-provided values
   * @private
   */
  async _retrieveFromKaspa() {
    if (!this._kkGameEngine) return;

    const values = this._retrieveUi?.getValues?.() || {};
    const gameId = values.gameId || this._gameId || 'unknown';
    // The retrieve section has genesisTxId / finalTxId fields for reference,
    // but the actual data fetching goes through kkGameEngine using gameId + genesisBlockHashHex
    const genesisBlockHashHex = this._kkGameEngine.genesisBlockHashHex;

    if (!genesisBlockHashHex) {
      this._retrieveUi?.setStatus?.('No genesis block hash available for DAG scan.', '#ff6b6b');
      return;
    }

    this._retrieveUi?.setLoading?.(true);
    this._retrieveUi?.setStatus?.('Fetching on-chain audit data...', COLORS.PRIMARY_HEX);

    try {
      this._auditData = await AuditDataCollector.collectFromChain(this._kkGameEngine, {
        gameId,
        genesisBlockHashHex,
        forceDagScan: true,
        gameResults: this._gameResults,
        onProgress: (p) => {
          this._retrieveUi?.setStatus?.(p.message, COLORS.PRIMARY_HEX);
        },
      });

      this._gameId = gameId;

      // Rebuild sections with the new data
      this._replaceSection('verification');
      this._replaceSection('nist');
      this._replaceSection('raw');

      this._retrieveUi?.setStatus?.('On-chain data loaded successfully.', COLORS.NEON_GREEN_HEX);
    } catch (e) {
      this._retrieveUi?.setStatus?.(`Failed to retrieve data: ${e.message}`, '#ff6b6b');
    } finally {
      this._retrieveUi?.setLoading?.(false);
    }
  }

  /**
   * Replace UI sections when new audit data is loaded
   * @param {'verification'|'nist'|'raw'} section
   * @private
   */
  _replaceSection(section) {
    if (!this._content) return;

    if (section === 'verification') {
      const next = createVerificationPanel(
        this._auditData,
        (results) => this._onVerificationComplete(results)
      );
      if (this._verificationPanelEl?.parentNode) {
        this._verificationPanelEl.parentNode.replaceChild(next, this._verificationPanelEl);
      }
      this._verificationPanelEl = next;
      return;
    }

    if (section === 'nist') {
      const next = createNistSection(this._auditData);
      if (this._nistSectionEl?.parentNode) {
        this._nistSectionEl.parentNode.replaceChild(next, this._nistSectionEl);
      }
      this._nistSectionEl = next;
      return;
    }

    if (section === 'raw') {
      const next = createRawDataSection(this._auditData);
      if (this._rawDataSectionEl?.parentNode) {
        this._rawDataSectionEl.parentNode.replaceChild(next, this._rawDataSectionEl);
      }
      this._rawDataSectionEl = next;
    }
  }

  /**
   * Handle verification completion
   * @private
   */
  _onVerificationComplete(results) {
    this._verificationResults = results;
    this._verificationLog = results.log || [];
    this.emit(AuditEvent.VERIFICATION_COMPLETE, this._verificationResults);
  }

  // ============================================================
  // Private: Actions
  // ============================================================

  /**
   * Download audit data as JSON
   * @private
   */
  _downloadAudit() {
    const data = {
      ...this._auditData,
      verificationLog: this._verificationLog,
      verificationResults: this._verificationResults,
    };
    const json = JSON.stringify(
      data,
      (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
      2,
    );
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `kaspa-surfer-audit-${data.gameId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    log.info('Audit downloaded', { filename: a.download });
    this.emit(AuditEvent.DOWNLOAD, { filename: a.download });
  }

  // ============================================================
  // Public: Lifecycle
  // ============================================================

  /**
   * Clean up resources
   */
  destroy() {
    this.hide();
    this.removeAllListeners();
    log.info('AuditView destroyed');
  }
}

export default AuditView;
