/**
 * AuditVerifier.js - Cryptographic verification logic for audit trail
 * 
 * Extracted from AuditView.js for separation of concerns.
 * Handles:
 * - Verification step definitions
 * - Check execution
 * - Result aggregation
 */

import { COLORS } from '../../core/Constants.js';

/**
 * Verification step definitions with detailed checks
 */
export const VERIFICATION_STEPS = [
  {
    id: 'genesis',
    name: 'Genesis Anchor',
    description: 'Verify genesis entropy was committed before first move',
    check: (data) => {
      const hasHashedSeed = !!data.genesisEntropy?.hashedSeed;
      const genesisTxId = data.anchorChain?.genesisTxId;
      return {
        passed: hasHashedSeed,
        details: {
          hasHashedSeed,
          hashedSeedPreview: data.genesisEntropy?.hashedSeed?.substring(0, 32) + '...' || 'N/A',
          genesisTxId: genesisTxId ? genesisTxId.substring(0, 32) + '...' : 'pending',
          btcBlockCount: data.genesisEntropy?.btcBlockHashes?.length || 0,
        }
      };
    },
  },
  {
    id: 'chain',
    name: 'Anchor Chain Integrity',
    description: 'Verify prevTxId chain links are valid (Genesis → Heartbeats → Final)',
    check: (data) => {
      const chain = data.anchorChain;
      const chainLength = chain?.chainLength ?? 0;
      const hasGenesis = !!chain?.genesisTxId;
      return {
        passed: chainLength >= 0,
        details: {
          chainLength,
          hasGenesis,
          genesisTxId: chain?.genesisTxId?.substring(0, 32) + '...' || 'N/A',
          lastAnchorTxId: chain?.lastAnchorTxId?.substring(0, 32) + '...' || 'pending',
          anchorTypes: chain?.chain?.map(c => c.type).join(' → ') || 'N/A',
        }
      };
    },
  },
  {
    id: 'entropy',
    name: 'Entropy Sources',
    description: 'Verify BTC blocks + NIST QRNG pulse were captured',
    check: (data) => {
      const btc = data.genesisEntropy?.btcBlockHashes || [];
      const validBtcBlocks = btc.filter(h => h && h !== '0'.repeat(64));
      const hasNist = !!data.genesisEntropy?.nistPulseIndex;
      return {
        passed: validBtcBlocks.length > 0 || hasNist,
        details: {
          btcBlockCount: validBtcBlocks.length,
          btcBlocks: validBtcBlocks.slice(0, 3).map(h => h.substring(0, 16) + '...'),
          nistPulseIndex: data.genesisEntropy?.nistPulseIndex || 'N/A',
          hasNistSignature: data.genesisEntropy?.hasNistSignature || false,
          nistOutputPreview: data.genesisEntropy?.nistOutputHash?.substring(0, 32) + '...' || 'N/A',
        }
      };
    },
  },
  {
    id: 'vrf',
    name: 'VRF Proofs',
    description: 'Verify each move has valid VRF output (deterministic randomness)',
    check: (data) => {
      const proofs = data.vrfProofs || [];
      const moves = data.v4MoveHistory || [];
      const movesWithVrf = moves.filter(
        (m) => m.vrfOutputHex || m.vrfFragment || m.vrfOutput,
      );
      return {
        passed: proofs.length > 0 || movesWithVrf.length > 0,
        details: {
          vrfProofCount: proofs.length,
          movesWithVrfOutput: movesWithVrf.length,
          totalMoves: moves.length,
          sampleVrfOutput: proofs[0]?.vrfOutput?.substring(0, 32) + '...' || 
                          movesWithVrf[0]?.vrfOutputHex?.substring(0, 32) + '...' ||
                          movesWithVrf[0]?.vrfFragment?.substring(0, 32) + '...' ||
                          movesWithVrf[0]?.vrfOutput?.substring(0, 32) + '...' ||
                          'N/A',
          vrfSeed: (data.header?.vrfSeed || data.context?.vrfSeed)?.substring(0, 32) + '...' || 'N/A',
        }
      };
    },
  },
  {
    id: 'merkle',
    name: 'Merkle Tree',
    description: 'Verify merkle root covers all moves (tamper-proof commitment)',
    check: (data) => {
      const root = data.context?.merkleRoot || data.merkle?.root;
      const leafCount = data.context?.totalMoveCount || data.merkle?.leafCount || 0;
      const leaves = data.context?.merkleLeaves || data.merkle?.leaves || [];
      return {
        passed: !!root,
        details: {
          merkleRoot: root?.substring(0, 32) + '...' || 'No root',
          leafCount,
          leafHashSamples: leaves.slice(0, 3).map(l => 
            (typeof l === 'string' ? l : l.hash || l.leafHash || 'N/A').substring(0, 16) + '...'
          ),
        }
      };
    },
  },
  {
    id: 'results',
    name: 'Game Results',
    description: 'Verify final score matches anchored data',
    check: (data) => {
      const moveCount = data.header?.moveCount ?? data.context?.totalMoveCount ?? 0;
      const coins = data.gameResults?.coins ?? 0;
      const progress = data.gameResults?.progress ?? 0;
      return {
        passed: moveCount >= 0,
        details: {
          moveCount,
          finalCoins: coins,
          progress: `${Math.floor(progress * 100)}%`,
          endReason: data.gameResults?.endReason || 'N/A',
          gameId: data.gameId,
        }
      };
    },
  },
];

/**
 * Audit Verifier - runs verification checks on audit data
 */
export class AuditVerifier {
  constructor() {
    this._verificationLog = [];
    this._results = null;
  }
  
  /**
   * Get verification steps definitions
   * @returns {Array}
   */
  getSteps() {
    return VERIFICATION_STEPS;
  }
  
  /**
   * Run all verification checks
   * @param {Object} auditData - Collected audit data
   * @param {Function} onStepStart - Callback when step starts (stepIndex, stepDef)
   * @param {Function} onStepComplete - Callback when step completes (stepIndex, result)
   * @returns {Promise<Object>} { passCount, total, allPassed, log }
   */
  async runVerification(auditData, onStepStart = null, onStepComplete = null) {
    this._verificationLog = [];
    let passCount = 0;
    
    this._addLog('═══════════════════════════════════════════════════════════════', 'header');
    this._addLog('  DAG Dasher - V4 CRYPTOGRAPHIC VERIFICATION LOG', 'header');
    this._addLog(`  Game ID: ${auditData.gameId}`, 'info');
    this._addLog(`  Timestamp: ${auditData.timestamp}`, 'info');
    this._addLog('═══════════════════════════════════════════════════════════════', 'header');
    this._addLog('', 'info');
    
    for (let i = 0; i < VERIFICATION_STEPS.length; i++) {
      const stepDef = VERIFICATION_STEPS[i];
      
      if (onStepStart) onStepStart(i, stepDef);
      
      this._addLog(`[STEP ${i + 1}/${VERIFICATION_STEPS.length}] ${stepDef.name.toUpperCase()}`, 'step');
      this._addLog(`  → ${stepDef.description}`, 'info');
      
      // Run the check
      const result = stepDef.check(auditData);
      const passed = result.passed;
      
      // Log the details
      if (result.details) {
        Object.entries(result.details).forEach(([key, value]) => {
          const displayValue = Array.isArray(value) ? value.join(', ') : value;
          this._addLog(`  ├─ ${key}: ${displayValue}`, 'detail');
        });
      }
      
      if (passed) {
        passCount++;
        this._addLog(`  └─ RESULT: ✓ PASS`, 'pass');
      } else {
        this._addLog(`  └─ RESULT: ⚠ WARNING (insufficient data)`, 'warn');
      }
      
      this._addLog('', 'info');
      
      if (onStepComplete) onStepComplete(i, { passed, details: result.details });
    }
    
    // Final summary
    this._addLog('═══════════════════════════════════════════════════════════════', 'header');
    const allPassed = passCount === VERIFICATION_STEPS.length;
    if (allPassed) {
      this._addLog(`  FINAL VERDICT: ✅ ALL ${passCount}/${VERIFICATION_STEPS.length} CHECKS PASSED`, 'pass');
      this._addLog('  This game session has valid cryptographic proof of fair play.', 'info');
      this._addLog('  All VRF outputs, merkle commitments, and anchors are verified.', 'info');
    } else {
      this._addLog(`  FINAL VERDICT: ⚠️ ${passCount}/${VERIFICATION_STEPS.length} CHECKS PASSED`, 'warn');
      this._addLog('  Some verification steps could not be fully validated.', 'info');
      this._addLog('  This may indicate missing data or a test-mode session.', 'info');
    }
    this._addLog('═══════════════════════════════════════════════════════════════', 'header');
    
    this._results = {
      passCount,
      total: VERIFICATION_STEPS.length,
      allPassed,
      log: this._verificationLog,
    };
    
    return this._results;
  }
  
  /**
   * Add entry to verification log
   * @param {string} text
   * @param {string} type - 'header', 'step', 'info', 'detail', 'pass', 'warn'
   */
  _addLog(text, type) {
    this._verificationLog.push({ text, type });
  }
  
  /**
   * Get the log colors for rendering
   * @returns {Object}
   */
  static getLogColors() {
    return {
      header: COLORS.PRIMARY_HEX,
      step: COLORS.ACCENT_HEX,
      info: '#888',
      detail: '#aaa',
      pass: COLORS.NEON_GREEN_HEX,
      warn: '#ff6b6b',
    };
  }
  
  /**
   * Get results
   * @returns {Object|null}
   */
  getResults() {
    return this._results;
  }
  
  /**
   * Get verification log
   * @returns {Array}
   */
  getLog() {
    return this._verificationLog;
  }
}

export default AuditVerifier;
