/**
 * VerificationPanel.js - Cryptographic verification panel component
 * 
 * Single Responsibility: Display and run verification steps UI
 * Uses AuditVerifier for verification logic (no duplicate VERIFICATION_STEPS)
 */

import { COLORS } from '../../core/Constants.js';
import { PANEL_STYLES, STATUS_COLORS, LOG_COLORS, BUTTON_STYLES } from './AuditStyles.js';
import { VERIFICATION_STEPS, AuditVerifier } from './AuditVerifier.js';
import { createButton } from './ButtonHelper.js';

/**
 * Creates the verification panel element
 * 
 * @param {Object} auditData - The audit data to verify
 * @param {Function} onVerificationComplete - Callback when verification finishes
 * @returns {HTMLElement}
 */
export function createVerificationPanel(auditData, onVerificationComplete) {
  const panel = document.createElement('div');
  panel.style.cssText = PANEL_STYLES.container;
  
  // Panel header
  const panelHeader = document.createElement('div');
  panelHeader.style.cssText = PANEL_STYLES.header;
  
  const panelTitle = document.createElement('div');
  panelTitle.innerHTML = `
    <span style="font-size: 16px; font-weight: bold; color: ${COLORS.PRIMARY_HEX};">
      🛡️ Cryptographic Verification
    </span>
    <span style="color: #888; font-size: 11px; margin-left: 10px;">
      For Hackathon Judges
    </span>
  `;
  panelHeader.appendChild(panelTitle);
  
  const runBtn = createButton('▶ Run Verification', COLORS.NEON_GREEN_HEX);
  runBtn.style.padding = '10px 20px';
  runBtn.style.fontSize = '13px';
  runBtn.onclick = () => runVerification(panel, auditData, onVerificationComplete);
  panelHeader.appendChild(runBtn);
  
  panel.appendChild(panelHeader);
  
  // Steps container
  const stepsContainer = document.createElement('div');
  stepsContainer.className = 'verification-steps';
  stepsContainer.style.cssText = PANEL_STYLES.stepsContainer;
  
  VERIFICATION_STEPS.forEach((step, index) => {
    const stepEl = document.createElement('div');
    stepEl.className = `step-${step.id}`;
    stepEl.style.cssText = PANEL_STYLES.step;
    
    const indicator = document.createElement('div');
    indicator.className = 'step-indicator';
    indicator.style.cssText = PANEL_STYLES.stepIndicator;
    indicator.textContent = index + 1;
    
    const info = document.createElement('div');
    info.style.cssText = 'flex: 1; min-width: 0;';
    info.innerHTML = `
      <div style="font-weight: bold; color: #fff; margin-bottom: 2px; font-size: 13px;">${step.name}</div>
      <div style="font-size: 10px; color: #888;">${step.description}</div>
    `;
    
    const status = document.createElement('div');
    status.className = 'step-status';
    status.style.cssText = PANEL_STYLES.stepStatus;
    status.textContent = 'PENDING';
    
    stepEl.appendChild(indicator);
    stepEl.appendChild(info);
    stepEl.appendChild(status);
    stepsContainer.appendChild(stepEl);
  });
  
  panel.appendChild(stepsContainer);
  
  // Verification log area (hidden initially)
  const logArea = document.createElement('div');
  logArea.className = 'verification-log';
  logArea.style.cssText = PANEL_STYLES.logArea;
  panel.appendChild(logArea);
  
  // Results summary (hidden initially)
  const summary = document.createElement('div');
  summary.className = 'verification-summary';
  summary.style.cssText = PANEL_STYLES.summary;
  panel.appendChild(summary);
  
  return panel;
}

/**
 * Run verification with UI updates
 * 
 * @param {HTMLElement} panel - The panel element
 * @param {Object} auditData - Audit data to verify
 * @param {Function} onComplete - Callback with results
 */
async function runVerification(panel, auditData, onComplete) {
  const steps = panel.querySelectorAll('.verification-steps > div');
  const logArea = panel.querySelector('.verification-log');
  const summary = panel.querySelector('.verification-summary');
  
  // Show log area
  logArea.style.display = 'block';
  logArea.innerHTML = '';
  
  // Reset all steps
  steps.forEach((step, i) => {
    step.style.borderLeftColor = '#444';
    step.querySelector('.step-indicator').style.background = '#333';
    step.querySelector('.step-indicator').textContent = (i + 1).toString();
    step.querySelector('.step-status').textContent = 'PENDING';
    step.querySelector('.step-status').style.color = STATUS_COLORS.pending;
  });
  
  // Create verifier and run with UI callbacks
  const verifier = new AuditVerifier();
  
  const results = await verifier.runVerification(
    auditData,
    // onStepStart
    (stepIndex, stepDef) => {
      const stepEl = steps[stepIndex];
      const indicator = stepEl.querySelector('.step-indicator');
      const status = stepEl.querySelector('.step-status');
      
      stepEl.style.borderLeftColor = STATUS_COLORS.checking;
      indicator.style.background = STATUS_COLORS.checking;
      indicator.innerHTML = '⟳';
      status.textContent = 'CHECKING...';
      status.style.color = STATUS_COLORS.checking;
    },
    // onStepComplete
    (stepIndex, result) => {
      const stepEl = steps[stepIndex];
      const indicator = stepEl.querySelector('.step-indicator');
      const status = stepEl.querySelector('.step-status');
      
      if (result.passed) {
        stepEl.style.borderLeftColor = STATUS_COLORS.pass;
        indicator.style.background = STATUS_COLORS.pass;
        indicator.innerHTML = '✓';
        status.textContent = 'PASS';
        status.style.color = STATUS_COLORS.pass;
      } else {
        stepEl.style.borderLeftColor = STATUS_COLORS.warn;
        indicator.style.background = STATUS_COLORS.warn;
        indicator.innerHTML = '✗';
        status.textContent = 'WARN';
        status.style.color = STATUS_COLORS.warn;
      }
    }
  );
  
  // Render log entries
  results.log.forEach(entry => {
    addLogEntry(logArea, entry.text, entry.type);
  });
  
  // Show summary
  const { passCount, total, allPassed } = results;
  summary.style.display = 'block';
  summary.style.background = allPassed ? `${STATUS_COLORS.pass}22` : 'rgba(255,107,107,0.2)';
  summary.style.borderTop = `1px solid ${allPassed ? STATUS_COLORS.pass : STATUS_COLORS.warn}44`;
  summary.innerHTML = allPassed
    ? `<span style="font-size: 20px;">✅</span> <span style="font-size: 16px; font-weight: bold; color: ${STATUS_COLORS.pass};">All ${passCount} Checks Passed - Game Verified</span>`
    : `<span style="font-size: 20px;">⚠️</span> <span style="font-size: 16px; font-weight: bold; color: ${STATUS_COLORS.warn};">${passCount}/${total} Checks Passed</span>`;
  
  // Scroll log to bottom
  logArea.scrollTop = logArea.scrollHeight;
  
  if (onComplete) {
    onComplete(results);
  }
}

/**
 * Add a log entry to the log area
 * 
 * @param {HTMLElement} container - Log container
 * @param {string} text - Log text
 * @param {string} type - Log type (header, step, info, detail, pass, warn)
 */
function addLogEntry(container, text, type) {
  const entry = document.createElement('div');
  entry.style.cssText = 'margin-bottom: 2px; white-space: pre;';
  entry.style.color = LOG_COLORS[type] || '#888';
  
  if (type === 'header' || type === 'step') {
    entry.style.fontWeight = 'bold';
  }
  
  entry.textContent = text;
  container.appendChild(entry);
}

export default createVerificationPanel;
