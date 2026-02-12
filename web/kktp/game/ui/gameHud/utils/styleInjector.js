/**
 * styleInjector.js - CSS injection utilities
 */

/**
 * Inject HUD animations if not already present
 */
export function injectHudStyles() {
  if (document.getElementById("ks-hud-styles")) return;

  const style = document.createElement("style");
  style.id = "ks-hud-styles";
  style.textContent = `
    @keyframes shield-flash {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    @keyframes game-over-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Inject spin animation for spinners
 */
export function injectSpinAnimation() {
  if (document.getElementById("ks-spin-keyframes")) return;

  const style = document.createElement("style");
  style.id = "ks-spin-keyframes";
  style.textContent = `
    @keyframes ks-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Inject UTXO spin animation
 */
export function injectUtxoSpinAnimation() {
  if (document.getElementById("utxo-spin-style")) return;

  const style = document.createElement("style");
  style.id = "utxo-spin-style";
  style.textContent = `
    @keyframes utxo-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Inject anchor spinner animation
 */
export function injectAnchorSpinnerAnimation() {
  if (document.getElementById("ks-anchor-spinner-style")) return;

  const spinnerStyle = document.createElement("style");
  spinnerStyle.id = "ks-anchor-spinner-style";
  spinnerStyle.textContent = `
    @keyframes ks-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(spinnerStyle);
}
