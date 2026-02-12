/**
 * AuditStyles.js - CSS styling constants for audit UI components
 * 
 * Single Responsibility: Centralized style definitions
 */

import { COLORS } from '../../core/Constants.js';

/**
 * Base container styles
 */
export const CONTAINER_STYLES = {
  overlay: `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    background: rgba(10, 10, 20, 0.98);
    z-index: 250;
    opacity: 0;
    transition: opacity 0.3s ease;
    font-family: 'Consolas', 'Monaco', monospace;
    color: #fff;
    overflow: hidden;
  `,
  content: `
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-height: 0;
  `,
};

/**
 * Header styles
 */
export const HEADER_STYLES = {
  container: `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid ${COLORS.PRIMARY_HEX}44;
    background: linear-gradient(180deg, rgba(0,217,255,0.1) 0%, transparent 100%);
    flex-shrink: 0;
  `,
  title: `
    margin: 0 0 4px 0;
    color: ${COLORS.PRIMARY_HEX};
    font-size: 22px;
  `,
  subtitle: `color: #888; font-size: 11px;`,
  buttonGroup: `display: flex; gap: 10px;`,
};

/**
 * Panel styles (for verification panel, sections)
 */
export const PANEL_STYLES = {
  container: `
    background: linear-gradient(135deg, rgba(0,217,255,0.08) 0%, rgba(153,69,255,0.08) 100%);
    border: 2px solid ${COLORS.PRIMARY_HEX}55;
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
  `,
  header: `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 20px;
    background: ${COLORS.PRIMARY_HEX}22;
    border-bottom: 1px solid ${COLORS.PRIMARY_HEX}33;
  `,
  stepsContainer: `padding: 14px 20px;`,
  step: `
    display: flex;
    align-items: center;
    padding: 10px 12px;
    margin-bottom: 6px;
    background: rgba(0,0,0,0.3);
    border-radius: 8px;
    border-left: 4px solid #444;
    transition: all 0.3s ease;
  `,
  stepIndicator: `
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #333;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    margin-right: 14px;
    flex-shrink: 0;
    transition: all 0.3s ease;
  `,
  stepStatus: `
    font-size: 11px;
    color: #666;
    font-weight: bold;
    flex-shrink: 0;
    margin-left: 10px;
  `,
  logArea: `
    display: none;
    max-height: 300px;
    overflow-y: auto;
    background: #000;
    border-top: 1px solid ${COLORS.PRIMARY_HEX}33;
    padding: 12px 16px;
    font-size: 11px;
    font-family: monospace;
  `,
  summary: `
    display: none;
    padding: 14px 20px;
    text-align: center;
  `,
};

/**
 * Section styles (for NIST, Raw Data)
 */
export const SECTION_STYLES = {
  container: `
    background: rgba(0,0,0,0.4);
    border: 1px solid #333;
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
  `,
  header: `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    border-bottom: 1px solid #333;
    cursor: pointer;
    user-select: none;
  `,
  content: `padding: 16px 20px;`,
  collapsedContent: `display: none; padding: 16px 20px;`,
};

/**
 * NIST section specific styles
 */
export const NIST_STYLES = {
  headerBg: `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    background: rgba(255,136,0,0.1);
    border-bottom: 1px solid #333;
  `,
  pulseSummary: `
    padding: 10px 14px;
    background: rgba(255,136,0,0.1);
    border-radius: 6px;
    font-size: 12px;
    color: ${COLORS.NEON_ORANGE_HEX};
    margin-bottom: 4px;
  `,
  pulseCard: (isGenesis) => `
    border: 1px solid ${isGenesis ? COLORS.NEON_ORANGE_HEX : '#444'}44;
    border-radius: 8px;
    overflow: hidden;
    background: rgba(0,0,0,0.3);
  `,
  pulseHeader: (isGenesis) => `
    padding: 10px 14px;
    background: ${isGenesis ? 'rgba(255,136,0,0.15)' : 'rgba(100,100,100,0.1)'};
    border-bottom: 1px solid #333;
    font-weight: bold;
    font-size: 12px;
    color: ${isGenesis ? COLORS.NEON_ORANGE_HEX : '#888'};
  `,
  pulseContent: `padding: 12px 14px; display: flex; flex-direction: column; gap: 10px;`,
  noData: `color: #666; text-align: center; padding: 20px;`,
};

/**
 * Copyable field styles
 */
export const COPYABLE_STYLES = {
  card: `
    background: rgba(0,0,0,0.4);
    border: 1px solid #333;
    border-radius: 8px;
    overflow: hidden;
  `,
  cardHeader: `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: rgba(255,255,255,0.03);
    border-bottom: 1px solid #222;
  `,
  valueArea: (color) => `
    padding: 10px 14px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 10px;
    color: ${color};
    word-break: break-all;
    background: #000;
    max-height: 80px;
    overflow-y: auto;
  `,
  copyButton: (color) => `
    padding: 6px 12px;
    background: ${color}22;
    border: 1px solid ${color}66;
    border-radius: 4px;
    color: ${color};
    cursor: pointer;
    font-size: 11px;
    font-weight: bold;
    transition: all 0.2s ease;
  `,
};

/**
 * Raw data section styles
 */
export const RAW_DATA_STYLES = {
  headerBg: `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    background: rgba(153,69,255,0.1);
    border-bottom: 1px solid #333;
    cursor: pointer;
    user-select: none;
  `,
  subsection: `
    margin-bottom: 14px;
    background: rgba(0,0,0,0.3);
    border: 1px solid #222;
    border-radius: 8px;
    overflow: hidden;
  `,
  subsectionHeader: `
    padding: 8px 12px;
    background: ${COLORS.ACCENT_HEX}22;
    font-weight: bold;
    color: ${COLORS.ACCENT_HEX};
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
  `,
  subsectionBody: `
    padding: 12px;
    max-height: 220px;
    overflow-y: auto;
  `,
  infoRow: `display: flex; margin-bottom: 5px; font-size: 11px;`,
  codeBlock: `
    background: #000;
    padding: 8px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 10px;
    word-break: break-all;
  `,
  scrollableContainer: `
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid #333;
    border-radius: 4px;
  `,
};

/**
 * Button styles
 */
export const BUTTON_STYLES = {
  base: (color) => `
    padding: 8px 16px;
    font-size: 12px;
    font-weight: bold;
    color: white;
    background: ${color}33;
    border: 1px solid ${color};
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  `,
  hover: (color) => `${color}55`,
};

/**
 * Log entry colors (for verification log)
 */
export const LOG_COLORS = {
  header: COLORS.PRIMARY_HEX,
  step: COLORS.ACCENT_HEX,
  info: '#888',
  detail: '#aaa',
  pass: COLORS.NEON_GREEN_HEX,
  warn: '#ff6b6b',
};

/**
 * Status colors
 */
export const STATUS_COLORS = {
  pending: '#666',
  checking: COLORS.PRIMARY_HEX,
  pass: COLORS.NEON_GREEN_HEX,
  warn: '#ff6b6b',
};

export default {
  CONTAINER_STYLES,
  HEADER_STYLES,
  PANEL_STYLES,
  SECTION_STYLES,
  NIST_STYLES,
  COPYABLE_STYLES,
  RAW_DATA_STYLES,
  BUTTON_STYLES,
  LOG_COLORS,
  STATUS_COLORS,
};
