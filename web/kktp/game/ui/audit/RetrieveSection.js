/**
 * RetrieveSection.js - On-demand retrieval of audit data from Kaspa
 *
 * Single Responsibility: Provide UI to retrieve game audit data by txId
 */

import { COLORS } from '../../core/Constants.js';
import { SECTION_STYLES } from './AuditStyles.js';
import { createButton } from './ButtonHelper.js';

/**
 * Creates the retrieve section
 *
 * @param {Object} options
 * @param {string} [options.genesisTxId]
 * @param {string} [options.finalTxId]
 * @param {string} [options.gameId]
 * @param {Function} options.onRetrieve
 * @returns {{ element: HTMLElement, getValues: Function, setStatus: Function }}
 */
export function createRetrieveSection({ genesisTxId = '', finalTxId = '', gameId = '', onRetrieve }) {
  const section = document.createElement('div');
  section.style.cssText = SECTION_STYLES.container;

  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    background: rgba(0,217,255,0.08);
    border-bottom: 1px solid #333;
  `;
  header.innerHTML = `
    <div>
      <span style="font-size: 15px; font-weight: bold; color: ${COLORS.PRIMARY_HEX};">
        🔎 Retrieve Game From Kaspa
      </span>
      <div style="font-size: 10px; color: #888; margin-top: 3px;">
        Fetch on-chain data to populate NIST and Raw Cryptographic Data
      </div>
    </div>
  `;

  const retrieveBtn = createButton('⬇ Retrieve Game', COLORS.NEON_GREEN_HEX);
  retrieveBtn.style.padding = '8px 14px';
  retrieveBtn.style.fontSize = '12px';
  retrieveBtn.onclick = () => {
    if (typeof onRetrieve === 'function') onRetrieve();
  };
  header.appendChild(retrieveBtn);

  section.appendChild(header);

  const content = document.createElement('div');
  content.style.cssText = 'padding: 14px 20px; display: flex; flex-direction: column; gap: 10px;';

  const inputRow = document.createElement('div');
  inputRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 10px;';

  const genesisInput = createTextInput('Genesis TxId', genesisTxId);
  const finalInput = createTextInput('Final TxId (optional)', finalTxId);
  inputRow.appendChild(genesisInput.container);
  inputRow.appendChild(finalInput.container);

  const gameIdInput = createTextInput('Game ID (optional)', gameId);
  gameIdInput.container.style.gridColumn = 'span 2';

  content.appendChild(inputRow);
  content.appendChild(gameIdInput.container);

  const status = document.createElement('div');
  status.style.cssText = 'font-size: 11px; color: #888;';
  status.textContent = 'Ready to fetch on-chain data.';
  content.appendChild(status);

  section.appendChild(content);

  return {
    element: section,
    getValues: () => ({
      genesisTxId: genesisInput.input.value.trim(),
      finalTxId: finalInput.input.value.trim(),
      gameId: gameIdInput.input.value.trim(),
    }),
    setStatus: (text, color = '#888') => {
      status.textContent = text;
      status.style.color = color;
    },
    setLoading: (isLoading) => {
      retrieveBtn.disabled = !!isLoading;
      retrieveBtn.style.opacity = isLoading ? '0.6' : '1';
      retrieveBtn.style.cursor = isLoading ? 'not-allowed' : 'pointer';
    },
  };
}

function createTextInput(label, value) {
  const container = document.createElement('div');
  container.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

  const labelEl = document.createElement('div');
  labelEl.textContent = label;
  labelEl.style.cssText = 'color: #aaa; font-size: 11px; font-weight: bold;';
  container.appendChild(labelEl);

  const input = document.createElement('input');
  input.type = 'text';
  input.value = value || '';
  input.placeholder = label;
  input.style.cssText = `
    padding: 8px 10px;
    background: rgba(0,0,0,0.4);
    border: 1px solid #333;
    color: #fff;
    border-radius: 6px;
    font-size: 11px;
    font-family: 'Consolas', 'Monaco', monospace;
  `;
  container.appendChild(input);

  return { container, input };
}

export default createRetrieveSection;
