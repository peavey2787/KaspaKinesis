/**
 * AuditHeader.js - Audit view header component
 * 
 * Single Responsibility: Render the header with title, subtitle, and action buttons
 */

import { COLORS } from '../../core/Constants.js';
import { HEADER_STYLES } from './AuditStyles.js';
import { createButton } from './ButtonHelper.js';

/**
 * Creates the audit view header
 * 
 * @param {Object} options
 * @param {Function} options.onDownload - Callback for download button
 * @param {Function} options.onClose - Callback for close button
 * @returns {HTMLElement}
 */
export function createAuditHeader({ onDownload, onClose }) {
  const header = document.createElement('div');
  header.style.cssText = HEADER_STYLES.container;
  
  // Title section
  const titleSection = document.createElement('div');
  
  const title = document.createElement('h2');
  title.textContent = '🔍 Anti-Cheat Audit Trail';
  title.style.cssText = HEADER_STYLES.title;
  
  const subtitle = document.createElement('div');
  subtitle.textContent = 'V4 Three-Anchor Cryptographic Proof System';
  subtitle.style.cssText = HEADER_STYLES.subtitle;
  
  titleSection.appendChild(title);
  titleSection.appendChild(subtitle);
  header.appendChild(titleSection);
  
  // Button group
  const buttonGroup = document.createElement('div');
  buttonGroup.style.cssText = HEADER_STYLES.buttonGroup;
  
  const downloadBtn = createButton('📥 Download', COLORS.NEON_GREEN_HEX);
  downloadBtn.onclick = onDownload;
  buttonGroup.appendChild(downloadBtn);
  
  const closeBtn = createButton('✕ Close', '#ff6b6b');
  closeBtn.onclick = onClose;
  buttonGroup.appendChild(closeBtn);
  
  header.appendChild(buttonGroup);
  return header;
}

export default createAuditHeader;
