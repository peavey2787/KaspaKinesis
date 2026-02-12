/**
 * NistSection.js - NIST QRNG verification section component
 * 
 * Single Responsibility: Display NIST pulse data with copy buttons
 */

import { COLORS } from '../../core/Constants.js';
import { bytesToHex } from '../../core/CryptoUtils.js';
import { SECTION_STYLES, NIST_STYLES } from './AuditStyles.js';
import { createCopyableField } from './CopyableField.js';
import { createButton } from './ButtonHelper.js';

/**
 * Creates the NIST QRNG verification section
 * 
 * @param {Object} auditData - The audit data containing NIST pulses
 * @returns {HTMLElement}
 */
export function createNistSection(auditData) {
  const section = document.createElement('div');
  section.style.cssText = SECTION_STYLES.container;
  
  // Header
  const header = document.createElement('div');
  header.style.cssText = NIST_STYLES.headerBg;
  
  header.innerHTML = `
    <div>
      <span style="font-size: 15px; font-weight: bold; color: ${COLORS.NEON_ORANGE_HEX};">
        🎲 NIST QRNG "Lazy Verification"
      </span>
      <div style="font-size: 10px; color: #888; margin-top: 3px;">
        Independently verify randomness at beacon.nist.gov
      </div>
    </div>
  `;
  
  const nistLink = createButton('🔗 NIST Beacon', COLORS.NEON_ORANGE_HEX);
  nistLink.style.padding = '8px 14px';
  nistLink.style.fontSize = '12px';
  nistLink.onclick = () => window.open('https://beacon.nist.gov/beacon/2.0/pulse/last', '_blank');
  header.appendChild(nistLink);
  
  section.appendChild(header);
  
  // Content
  const content = document.createElement('div');
  content.style.cssText = SECTION_STYLES.content;
  
  const allPulses = collectNistPulses(auditData);
  
  if (allPulses.length > 0) {
    content.appendChild(renderPulseCards(allPulses));
  } else {
    content.innerHTML = `
      <div style="${NIST_STYLES.noData}">
        <div style="font-size: 24px; margin-bottom: 10px;">🎲</div>
        No NIST QRNG data available for this session.<br>
        <span style="font-size: 11px;">This may be a test-mode session or the beacon was unavailable.</span>
      </div>
    `;
  }
  
  section.appendChild(content);
  return section;
}

/**
 * Collect all NIST pulses from audit data (genesis + gameplay)
 * 
 * @param {Object} auditData
 * @returns {Array}
 */
function collectNistPulses(auditData) {
  const nistData = auditData.genesisEntropy;
  const qrngPulses = auditData.qrngPulses || [];
  const allPulses = [];
  const seenPulseIndices = new Set();
  
  // Helper to convert pulse value to hex
  const pulseValueToHex = (value) => {
    if (value instanceof Uint8Array) {
      return bytesToHex(value);
    }
    if (typeof value === 'string') {
      return value.startsWith('0x') ? value.slice(2) : value;
    }
    return '';
  };
  
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
  
  // Add gameplay pulses (captured every ~1 min during gameplay), skip duplicates
  let gameplayCount = 0;
  qrngPulses.forEach((pulse) => {
    const idx = String(pulse.pulseIndex);
    if (seenPulseIndices.has(idx)) return;
    seenPulseIndices.add(idx);
    gameplayCount++;
    
    const outputHash = pulseValueToHex(pulse.pulseValue) || pulse.pulseFragment || '';
    allPulses.push({
      label: `Gameplay Pulse ${gameplayCount}`,
      pulseIndex: pulse.pulseIndex,
      outputHash: outputHash,
      signature: pulse.signature || null,
      hasSignature: !!pulse.signature,
      isFragment: pulse.isFragment,
      isGenesis: false,
    });
  });
  
  return allPulses;
}

/**
 * Render pulse cards container
 * 
 * @param {Array} allPulses
 * @returns {HTMLElement}
 */
function renderPulseCards(allPulses) {
  const cardsContainer = document.createElement('div');
  cardsContainer.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';
  
  // Pulse count summary
  const gameplayCount = allPulses.filter(p => !p.isGenesis).length;
  const summary = document.createElement('div');
  summary.style.cssText = NIST_STYLES.pulseSummary;
  summary.innerHTML = `
    <strong>📊 NIST Pulses Captured:</strong> ${allPulses.length}
    <span style="color: #888; font-size: 10px; margin-left: 8px;">
      (1 genesis + ${gameplayCount} during gameplay, ~1 per minute)
    </span>
  `;
  cardsContainer.appendChild(summary);
  
  // Render each pulse
  allPulses.forEach((pulse, idx) => {
    cardsContainer.appendChild(renderPulseCard(pulse, idx));
  });
  
  return cardsContainer;
}

/**
 * Render a single pulse card
 * 
 * @param {Object} pulse
 * @param {number} idx
 * @returns {HTMLElement}
 */
function renderPulseCard(pulse, idx) {
  const pulseSection = document.createElement('div');
  pulseSection.style.cssText = NIST_STYLES.pulseCard(pulse.isGenesis);
  
  // Pulse header
  const pulseHeader = document.createElement('div');
  pulseHeader.style.cssText = NIST_STYLES.pulseHeader(pulse.isGenesis);
  pulseHeader.textContent = `🎲 ${pulse.label}`;
  pulseSection.appendChild(pulseHeader);
  
  const pulseContent = document.createElement('div');
  pulseContent.style.cssText = NIST_STYLES.pulseContent;
  
  // Pulse Index
  pulseContent.appendChild(createCopyableField(
    'Pulse Index',
    pulse.pulseIndex.toString(),
    COLORS.NEON_ORANGE_HEX,
    `NIST beacon pulse #${pulse.pulseIndex}`
  ));
  
  // Output Hash
  if (pulse.outputHash) {
    pulseContent.appendChild(createCopyableField(
      'Output Hash (SHA-512)',
      pulse.outputHash,
      '#0f0',
      'The full 512-bit random output from NIST beacon'
    ));
  }
  
  // Signature
  if (pulse.signature) {
    pulseContent.appendChild(createCopyableField(
      'RSA-PSS Signature',
      pulse.signature,
      '#f0f',
      'NIST\'s cryptographic signature (verify at beacon.nist.gov)'
    ));
  }
  
  // Signature status (only for genesis)
  if (pulse.isGenesis) {
    const sigStatus = document.createElement('div');
    sigStatus.style.cssText = `
      padding: 8px 12px;
      background: ${pulse.hasSignature ? 'rgba(0,255,136,0.1)' : 'rgba(255,107,107,0.1)'};
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
    `;
    sigStatus.innerHTML = pulse.hasSignature
      ? `<span style="color: ${COLORS.NEON_GREEN_HEX};">✓</span> <span style="color: #aaa;">RSA-PSS signature captured</span>`
      : `<span style="color: #ff6b6b;">✗</span> <span style="color: #888;">No signature (test mode)</span>`;
    pulseContent.appendChild(sigStatus);
  } else if (pulse.isFragment) {
    const fragmentNote = document.createElement('div');
    fragmentNote.style.cssText = 'font-size: 10px; color: #666; font-style: italic;';
    fragmentNote.textContent = 'Note: Only 8-byte fragment stored to minimize on-chain data (~1KB total)';
    pulseContent.appendChild(fragmentNote);
  }
  
  pulseSection.appendChild(pulseContent);
  return pulseSection;
}

export default createNistSection;
