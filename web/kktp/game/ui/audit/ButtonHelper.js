/**
 * ButtonHelper.js - Button creation helper
 * 
 * Single Responsibility: Create styled buttons
 */

import { BUTTON_STYLES } from './AuditStyles.js';

/**
 * Creates a styled button element
 * 
 * @param {string} text - Button text
 * @param {string} color - Button color (hex)
 * @returns {HTMLButtonElement}
 */
export function createButton(text, color) {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.style.cssText = BUTTON_STYLES.base(color);
  
  btn.onmouseenter = () => { btn.style.background = BUTTON_STYLES.hover(color); };
  btn.onmouseleave = () => { btn.style.background = `${color}33`; };
  
  return btn;
}

export default createButton;
