/**
 * CopyableField.js - Reusable copyable field component
 * 
 * Single Responsibility: Render a labeled field with copy-to-clipboard functionality
 */

import { COLORS } from '../../core/Constants.js';
import { COPYABLE_STYLES } from './AuditStyles.js';

/**
 * Creates a copyable field element with label, value, and copy button
 * 
 * @param {string} label - Field label
 * @param {string} value - Value to display and copy
 * @param {string} [valueColor='#0f0'] - Color for the value text
 * @param {string} [tooltip] - Optional tooltip text
 * @returns {HTMLElement}
 */
export function createCopyableField(label, value, valueColor = '#0f0', tooltip = null) {
  const card = document.createElement('div');
  card.style.cssText = COPYABLE_STYLES.card;
  
  const cardHeader = document.createElement('div');
  cardHeader.style.cssText = COPYABLE_STYLES.cardHeader;
  
  // Label section
  const labelEl = document.createElement('div');
  labelEl.innerHTML = `
    <span style="color: #888; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">${label}</span>
    ${tooltip ? `<div style="color: #555; font-size: 9px; margin-top: 2px;">${tooltip}</div>` : ''}
  `;
  cardHeader.appendChild(labelEl);
  
  // Copy button
  const copyBtn = document.createElement('button');
  copyBtn.innerHTML = '📋 Copy';
  copyBtn.style.cssText = COPYABLE_STYLES.copyButton(valueColor);
  
  copyBtn.onmouseenter = () => { copyBtn.style.background = `${valueColor}44`; };
  copyBtn.onmouseleave = () => { copyBtn.style.background = `${valueColor}22`; };
  
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(value);
    copyBtn.innerHTML = '✓ Copied!';
    copyBtn.style.background = COLORS.NEON_GREEN_HEX + '33';
    copyBtn.style.borderColor = COLORS.NEON_GREEN_HEX;
    copyBtn.style.color = COLORS.NEON_GREEN_HEX;
    
    setTimeout(() => {
      copyBtn.innerHTML = '📋 Copy';
      copyBtn.style.background = `${valueColor}22`;
      copyBtn.style.borderColor = `${valueColor}66`;
      copyBtn.style.color = valueColor;
    }, 1500);
  };
  
  cardHeader.appendChild(copyBtn);
  card.appendChild(cardHeader);
  
  // Value area
  const valueEl = document.createElement('div');
  valueEl.style.cssText = COPYABLE_STYLES.valueArea(valueColor);
  valueEl.textContent = value;
  card.appendChild(valueEl);
  
  return card;
}

export default createCopyableField;
