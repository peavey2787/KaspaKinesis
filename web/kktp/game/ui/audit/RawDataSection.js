/**
 * RawDataSection.js - Collapsible raw cryptographic data section
 * 
 * Single Responsibility: Display raw audit data (Game Info, Merkle, VRF, Moves, Anchor Chain)
 */

import { COLORS } from '../../core/Constants.js';
import { SECTION_STYLES, RAW_DATA_STYLES } from './AuditStyles.js';

function stringifySafe(value) {
  return JSON.stringify(
    value,
    (_key, val) => (typeof val === 'bigint' ? val.toString() : val),
    2,
  );
}

/**
 * Creates the collapsible raw data section
 * 
 * @param {Object} auditData - The audit data
 * @returns {HTMLElement}
 */
export function createRawDataSection(auditData) {
  const section = document.createElement('div');
  section.style.cssText = SECTION_STYLES.container;
  
  // Collapsible header
  const header = document.createElement('div');
  header.style.cssText = RAW_DATA_STYLES.headerBg;
  header.innerHTML = `
    <div>
      <span style="font-size: 15px; font-weight: bold; color: ${COLORS.ACCENT_HEX};">
        📊 Raw Cryptographic Data
      </span>
      <span style="font-size: 10px; color: #888; margin-left: 10px;">
        For Cryptographers (click to expand)
      </span>
    </div>
    <span class="toggle-icon" style="font-size: 16px; color: #888;">▶</span>
  `;
  
  const content = document.createElement('div');
  content.className = 'raw-data-content';
  content.style.cssText = 'display: none; padding: 16px 20px;';
  
  // Add each subsection
  content.appendChild(createSubsection('Collection Errors', renderErrors(auditData)));
  content.appendChild(createSubsection('Game Info', renderGameInfo(auditData)));
  content.appendChild(createSubsection('Merkle Tree', renderMerkleTree(auditData)));
  content.appendChild(createSubsection('VRF Proofs', renderVrfProofs(auditData)));
  content.appendChild(createSubsection('All Moves (JSON)', renderMoves(auditData)));
  content.appendChild(createSubsection('Anchor Chain', renderAnchorChain(auditData)));
  
  // Toggle behavior
  let isOpen = false;
  header.onclick = () => {
    isOpen = !isOpen;
    content.style.display = isOpen ? 'block' : 'none';
    header.querySelector('.toggle-icon').textContent = isOpen ? '▼' : '▶';
  };
  
  section.appendChild(header);
  section.appendChild(content);
  return section;
}

/**
 * Create a subsection with title and content
 */
function createSubsection(title, contentEl) {
  const sub = document.createElement('div');
  sub.style.cssText = RAW_DATA_STYLES.subsection;
  
  const subHeader = document.createElement('div');
  subHeader.textContent = title;
  subHeader.style.cssText = RAW_DATA_STYLES.subsectionHeader;
  sub.appendChild(subHeader);
  
  const body = document.createElement('div');
  body.style.cssText = RAW_DATA_STYLES.subsectionBody;
  body.appendChild(contentEl);
  sub.appendChild(body);
  
  return sub;
}

/**
 * Render game info section
 */
function renderGameInfo(auditData) {
  const container = document.createElement('div');
  const d = auditData;
  const anchorCounts = d.anchorCounts || {};
  const ge = d.genesisEntropy || {};
  
  const info = [
    ['Game ID', d.gameId],
    ['Timestamp', d.timestamp],
    ['Protocol Version', d.protocolVersion ?? 'v4'],
    ['Total Moves', d.context?.totalMoveCount ?? d.merkle?.leafCount ?? 0],
    ['Total Anchors', anchorCounts.total ?? d.anchorChain?.chainLength ?? 0],
    ['Genesis / Heartbeat / Final', `${anchorCounts.genesis ?? 0} / ${anchorCounts.heartbeats ?? 0} / ${anchorCounts.final ?? 0}`],
    ['Final Score', d.gameResults?.score ?? 'N/A'],
    ['Coins Collected', d.gameResults?.coins ?? 'N/A'],
    ['Race Time', d.header?.raceTimeMs ? `${(d.header.raceTimeMs / 1000).toFixed(1)}s` : 'N/A'],
    ['Outcome', d.gameResults?.endReason ?? 'N/A'],
    ['Start DAA Score', ge.startDaaScore ?? 'N/A'],
    ['End DAA Score', ge.endDaaScore ?? 'N/A'],
    ['Hashed Seed', ge.hashedSeed ? `${ge.hashedSeed.substring(0, 24)}...` : 'N/A'],
    ['VRF Output', ge.vrfOutput ? `${ge.vrfOutput.substring(0, 24)}...` : 'N/A'],
  ];
  
  info.forEach(([label, value]) => {
    const row = document.createElement('div');
    row.style.cssText = RAW_DATA_STYLES.infoRow;
    row.innerHTML = `
      <span style="color: #888; width: 140px; flex-shrink: 0;">${label}:</span>
      <span style="color: #fff; word-break: break-all;">${value}</span>
    `;
    container.appendChild(row);
  });

  // Genesis Tx as clickable explorer link
  const genesisTxId = d.anchorChain?.genesisTxId;
  if (genesisTxId) {
    const row = document.createElement('div');
    row.style.cssText = RAW_DATA_STYLES.infoRow;
    row.innerHTML = `
      <span style="color: #888; width: 140px; flex-shrink: 0;">Genesis Tx:</span>
      <span style="word-break: break-all;">${createExplorerLink(genesisTxId)}</span>
    `;
    container.appendChild(row);
  }

  // Final Tx as clickable explorer link
  const finalTxId = d.anchorChain?.lastAnchorTxId;
  if (finalTxId) {
    const row = document.createElement('div');
    row.style.cssText = RAW_DATA_STYLES.infoRow;
    row.innerHTML = `
      <span style="color: #888; width: 140px; flex-shrink: 0;">Final Tx:</span>
      <span style="word-break: break-all;">${createExplorerLink(finalTxId)}</span>
    `;
    container.appendChild(row);
  }
  
  return container;
}

/**
 * Render collection errors section
 */
function renderErrors(auditData) {
  const container = document.createElement('div');
  const errors = Array.isArray(auditData?.errors) ? auditData.errors : [];

  if (errors.length === 0) {
    const none = document.createElement('div');
    none.style.cssText = 'color: #666; font-size: 11px;';
    none.textContent = 'No collection errors reported.';
    container.appendChild(none);
    return container;
  }

  const list = document.createElement('ul');
  list.style.cssText = 'margin: 0; padding-left: 16px; color: #ff6b6b; font-size: 11px;';
  errors.forEach((err) => {
    const item = document.createElement('li');
    item.textContent = String(err);
    list.appendChild(item);
  });
  container.appendChild(list);
  return container;
}

/**
 * Render merkle tree section
 */
function renderMerkleTree(auditData) {
  const container = document.createElement('div');
  const d = auditData;
  
  // Root
  const rootDiv = document.createElement('div');
  rootDiv.style.cssText = 'margin-bottom: 12px;';
  rootDiv.innerHTML = `
    <div style="color: ${COLORS.NEON_GREEN_HEX}; font-weight: bold; margin-bottom: 4px; font-size: 11px;">
      🌳 Merkle Root:
    </div>
    <div style="${RAW_DATA_STYLES.codeBlock} color: #0f0;">${d.context?.merkleRoot || d.merkle?.root || 'No moves recorded'}</div>
  `;
  container.appendChild(rootDiv);
  
  // Leaves / Heartbeat merkle checkpoints
  const leaves = d.context?.merkleLeaves || d.merkle?.leaves || [];
  if (leaves.length > 0) {
    const isCheckpoints = leaves.some(l => typeof l === 'object' && l.label);
    const leavesTitle = document.createElement('div');
    leavesTitle.textContent = isCheckpoints
      ? `📄 Anchor Merkle Checkpoints (${leaves.length}):`
      : `📄 Leaf Hashes (${leaves.length}):`;
    leavesTitle.style.cssText = `
      color: ${COLORS.PRIMARY_HEX};
      font-weight: bold;
      margin-bottom: 8px;
      font-size: 11px;
    `;
    container.appendChild(leavesTitle);
    
    const table = document.createElement('table');
    table.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 9px;';
    
    let tableRows = `
      <thead>
        <tr style="color: #888; text-align: left;">
          <th style="padding: 4px; border-bottom: 1px solid #333; width: 30px;">#</th>
          ${isCheckpoints ? '<th style="padding: 4px; border-bottom: 1px solid #333; width: 140px;">Source</th>' : ''}
          <th style="padding: 4px; border-bottom: 1px solid #333;">Hash (Full)</th>
        </tr>
      </thead>
      <tbody>
    `;
    
    leaves.forEach((l, i) => {
      const hash = typeof l === 'string' ? l : l.hash || l.leafHash || 'N/A';
      const label = (typeof l === 'object' && l.label) ? l.label : '';
      tableRows += `
        <tr style="border-bottom: 1px solid #222;">
          <td style="padding: 4px; color: #666;">${i}</td>
          ${isCheckpoints ? `<td style="padding: 4px; color: ${COLORS.ACCENT_HEX};">${label}</td>` : ''}
          <td style="padding: 4px; color: #0f0; font-family: monospace; word-break: break-all;">${hash}</td>
        </tr>
      `;
    });
    
    tableRows += '</tbody>';
    table.innerHTML = tableRows;
    
    const tableWrapper = document.createElement('div');
    tableWrapper.style.cssText = RAW_DATA_STYLES.scrollableContainer;
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);
  } else {
    const noData = document.createElement('div');
    noData.textContent = 'No moves recorded';
    noData.style.cssText = 'color: #666; font-size: 11px;';
    container.appendChild(noData);
  }
  
  return container;
}

/**
 * Render VRF proofs section
 */
function renderVrfProofs(auditData) {
  const container = document.createElement('div');
  const proofs = auditData.vrfProofs || [];
  const moves = auditData.v4MoveHistory || auditData.moves || [];
  const fallbackProofs = proofs.length > 0
    ? proofs
    : moves.map((m) => ({
        moveIndex: m.moveIndex ?? m.sequence ?? null,
        action: m.action,
        lane: m.lane,
        vrfOutput: m.vrfFragment ?? m.vrfOutputHex ?? m.vrfOutput ?? '',
        vrfOutputHex: m.vrfOutputHex ?? m.vrfFragment ?? m.vrfOutput ?? '',
        timeDeltaMs: m.timeDeltaMs ?? null,
        rawDelta: m.rawDelta ?? null,
        timestamp: m.timestamp ?? null,
        sessionTimeMs: m.sessionTimeMs ?? null,
        kaspaBlockHashHex: m.kaspaBlockHashHex ?? null,
        kaspaBlockBlueScore: m.kaspaBlockBlueScore ?? null,
      }));
  
  if (fallbackProofs.length === 0) {
    const noData = document.createElement('div');
    noData.textContent = 'No VRF proofs available';
    noData.style.cssText = 'color: #666; font-size: 11px;';
    container.appendChild(noData);
    return container;
  }
  
  // Proof count header
  const countHeader = document.createElement('div');
  countHeader.style.cssText = 'color: #888; font-size: 11px; margin-bottom: 8px;';
  countHeader.textContent = `Total VRF Proofs: ${fallbackProofs.length}`;
  container.appendChild(countHeader);
  
  // Scrollable container for ALL proofs
  const listWrapper = document.createElement('div');
  listWrapper.style.cssText = 'max-height: 500px; overflow-y: auto; border: 1px solid #333; border-radius: 4px; padding: 4px;';
  
  const list = document.createElement('div');
  list.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

  fallbackProofs.forEach((p) => {
    list.appendChild(renderVrfProofRow(p));
  });

  listWrapper.appendChild(list);
  container.appendChild(listWrapper);
  return container;
}

/**
 * Render a single VRF proof row
 */
function renderVrfProofRow(p) {
  const row = document.createElement('div');
  row.style.cssText = `
    border: 1px solid #222;
    border-radius: 6px;
    background: rgba(0,0,0,0.4);
    overflow: hidden;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    cursor: pointer;
    user-select: none;
    font-size: 10px;
  `;

  const vrfOutput = p.vrfOutput || p.vrfOutputHex || '';
  const isGenesis = p.isGenesis || p.moveIndex === -1;
  const indexLabel = isGenesis ? '🌱' : `#${p.moveIndex ?? '?'}`;
  const actionLabel = p.action || 'MOVE';
  header.innerHTML = `
    <div style="display: flex; gap: 8px; align-items: center;">
      <span style="color: ${isGenesis ? COLORS.NEON_GREEN_HEX : '#666'};">${indexLabel}</span>
      <span style="color: ${COLORS.ACCENT_HEX}; font-weight: bold;">${actionLabel}</span>
      ${isGenesis ? '<span style="color: #888; font-size: 8px;">(initial VRF output)</span>' : ''}
    </div>
    <div style="color: #f80; font-family: monospace; font-size: 8px; word-break: break-all;">
      ${vrfOutput.substring(0, 24)}${vrfOutput.length > 24 ? '...' : ''}
    </div>
    <span class="toggle" style="color: #888;">▶</span>
  `;

  const details = document.createElement('pre');
  details.style.cssText = `
    display: none;
    margin: 0;
    padding: 8px;
    background: #000;
    color: #ccc;
    font-size: 9px;
    border-top: 1px solid #222;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 200px;
    overflow-y: auto;
  `;
  details.textContent = stringifySafe(p);

  header.addEventListener('click', () => {
    const isOpen = details.style.display === 'block';
    details.style.display = isOpen ? 'none' : 'block';
    header.querySelector('.toggle').textContent = isOpen ? '▶' : '▼';
  });

  row.appendChild(header);
  row.appendChild(details);
  return row;
}

/**
 * Render moves section
 */
function renderMoves(auditData) {
  const container = document.createElement('div');
  const moves = auditData.v4MoveHistory || auditData.moves || [];
  
  // Move count header
  const countHeader = document.createElement('div');
  countHeader.style.cssText = 'color: #888; font-size: 11px; margin-bottom: 8px;';
  countHeader.textContent = `Total Moves: ${moves.length}`;
  container.appendChild(countHeader);
  
  // Scrollable JSON
  const pre = document.createElement('pre');
  pre.style.cssText = `
    background: #000;
    padding: 10px;
    border-radius: 4px;
    font-size: 9px;
    overflow: auto;
    max-height: 500px;
    color: #ccc;
    margin: 0;
    word-break: break-all;
    white-space: pre-wrap;
  `;
  
  pre.textContent = stringifySafe(moves);
  container.appendChild(pre);
  
  return container;
}

/**
 * Render anchor chain section
 */
function renderAnchorChain(auditData) {
  const container = document.createElement('div');
  const chain = auditData.anchorChain;
  const counts = auditData.anchorCounts || {};
  
  if (!chain) {
    const noData = document.createElement('div');
    noData.textContent = 'No anchor chain data available';
    noData.style.cssText = 'color: #666; font-size: 11px;';
    container.appendChild(noData);
    return container;
  }
  
  // Show full TxIds
  const info = [
    ['Genesis TxId', chain.genesisTxId || 'N/A'],
    ['Last Anchor TxId', chain.lastAnchorTxId || 'N/A'],
    ['Chain Length', chain.chainLength ?? 0],
    ['Total Anchors', counts.total ?? chain.chain?.length ?? 0],
    ['Genesis Anchors', counts.genesis ?? 0],
    ['Heartbeat Anchors', counts.heartbeats ?? 0],
    ['Final Anchors', counts.final ?? 0],
  ];
  
  info.forEach(([label, value]) => {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; flex-wrap: wrap; margin-bottom: 8px; font-size: 10px;';
    row.innerHTML = `
      <span style="color: #888; width: 110px; flex-shrink: 0;">${label}:</span>
      <span style="color: #fff; word-break: break-all; font-family: monospace; flex: 1;">
        ${value}
      </span>
    `;
    container.appendChild(row);
  });
  
  // Chain items
  if (chain.chain && chain.chain.length > 0) {
    const chainList = document.createElement('div');
    chainList.style.cssText = 'margin-top: 10px;';
    chainList.innerHTML = `<div style="color: ${COLORS.PRIMARY_HEX}; font-weight: bold; margin-bottom: 6px; font-size: 11px;">All Chain Anchors (${chain.chain.length}):</div>`;
    
    const chainWrapper = document.createElement('div');
    chainWrapper.style.cssText = RAW_DATA_STYLES.scrollableContainer + ' padding: 4px;';
    
    chain.chain.forEach((item, i) => {
      chainWrapper.appendChild(renderAnchorItem(item, i));
    });
    
    chainList.appendChild(chainWrapper);
    container.appendChild(chainList);
  }
  
  return container;
}

/**
 * Render a single anchor item
 */
function renderAnchorItem(item, i) {
  const itemEl = document.createElement('div');
  itemEl.style.cssText = `
    padding: 8px 10px;
    margin-bottom: 4px;
    background: rgba(0,0,0,0.3);
    border-radius: 4px;
    font-size: 9px;
    border-left: 3px solid ${item.type === 'genesis' ? COLORS.ACCENT_HEX : item.type === 'final' ? COLORS.NEON_GREEN_HEX : COLORS.PRIMARY_HEX};
  `;
  
  const typeLabel = item.type === 'genesis' ? '🌱 GENESIS' : 
                   item.type === 'final' ? '🏁 FINAL' : 
                   item.type === 'heartbeat' ? '💓 HEARTBEAT' : '📦 ANCHOR';
  
  const headerDiv = document.createElement('div');
  headerDiv.style.cssText = 'display: flex; gap: 8px; margin-bottom: 4px;';
  headerDiv.innerHTML = `
    <span style="color: #666;">#${i}</span>
    <span style="color: ${COLORS.ACCENT_HEX}; font-weight: bold;">${typeLabel}</span>
  `;
  itemEl.appendChild(headerDiv);
  
  const txIdDiv = document.createElement('div');
  txIdDiv.style.cssText = 'color: #0f0; font-family: monospace; word-break: break-all; margin-left: 20px;';
  txIdDiv.innerHTML = createExplorerLink(item.txId);
  itemEl.appendChild(txIdDiv);
  
  if (item.prevTxId) {
    const prevDiv = document.createElement('div');
    prevDiv.style.cssText = 'color: #666; font-family: monospace; word-break: break-all; margin-left: 20px; margin-top: 2px; font-size: 8px;';
    prevDiv.innerHTML = `← prev: ${createExplorerLink(item.prevTxId, true)}`;
    itemEl.appendChild(prevDiv);
  }
  
  if (item.merkleRoot) {
    const merkleDiv = document.createElement('div');
    merkleDiv.style.cssText = 'color: #888; font-family: monospace; word-break: break-all; margin-left: 20px; margin-top: 2px; font-size: 8px;';
    merkleDiv.textContent = `merkle: ${item.merkleRoot}`;
    itemEl.appendChild(merkleDiv);
  }
  
  return itemEl;
}

/**
 * Create a clickable link to block explorer for a txId
 */
function createExplorerLink(txId, compact = false) {
  if (!txId || txId === 'pending') {
    return '<span style="color: #666;">pending...</span>';
  }
  
  const explorerUrl = `https://explorer-tn10.kaspa.org/txs/${txId}`;
  const displayText = compact ? `${txId.substring(0, 16)}...` : txId;
  
  return `<a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" style="
    color: ${COLORS.ACCENT_HEX};
    text-decoration: underline;
    cursor: pointer;
    transition: color 0.2s ease;
  " onmouseover="this.style.color='${COLORS.PRIMARY_HEX}'" onmouseout="this.style.color='${COLORS.ACCENT_HEX}'">${displayText}</a>`;
}

export default createRawDataSection;
