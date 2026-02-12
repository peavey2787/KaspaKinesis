/**
 * viewport.js - Responsive viewport utilities for mobile-first HUD
 *
 * Provides:
 * - Safe area CSS variable injection (--sat, --sab, --sal, --sar)
 * - View-mode attribute broadcasting (portrait / landscape / tablet)
 * - Debounced resize callback system
 * - Aspect-ratio factor for camera calculations
 */

const MOBILE_MAX = 768;
const TABLET_MAX = 1024;

let _listeners = [];
let _installed = false;
let _resizeTimer = null;

/**
 * Inject CSS custom properties for safe-area and HUD scaling onto a root element.
 * Call once after the game container is created.
 * @param {HTMLElement} root - The game container element
 */
export function installViewport(root) {
  if (_installed) return;
  _installed = true;

  // Inject CSS env() safe-area values via a probe element
  _applySafeAreas(root);

  // Set initial view mode + CSS vars
  _update(root);

  // Listen for size changes
  const handler = () => {
    if (_resizeTimer) clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => _update(root), 100);
  };

  window.addEventListener("resize", handler);
  window.addEventListener("orientationchange", () => {
    // Orientation change fires before layout settles; retry multiple times
    setTimeout(() => _update(root), 60);
    setTimeout(() => _update(root), 200);
    setTimeout(() => _update(root), 400);
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", handler);
  }
}

/**
 * Register a callback that fires on every viewport update (debounced).
 * Returns an unsubscribe function.
 * @param {Function} fn - callback(info) where info = { width, height, aspect, mode }
 * @returns {Function} unsubscribe
 */
export function onViewportChange(fn) {
  _listeners.push(fn);
  return () => {
    _listeners = _listeners.filter((f) => f !== fn);
  };
}

/**
 * Get current viewport mode string.
 * @returns {"portrait"|"landscape"|"tablet"}
 */
export function getViewMode() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w <= MOBILE_MAX && h > w) return "portrait";
  if (w <= TABLET_MAX) return "tablet";
  return "landscape";
}

/**
 * Check if the current viewport is a narrow mobile phone.
 * @returns {boolean}
 */
export function isMobile() {
  return window.innerWidth <= MOBILE_MAX;
}

// ─── Internals ────────────────────────────────────────────────

function _update(root) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const aspect = w / h;
  const mode = getViewMode();

  // data attribute for optional CSS selectors
  root.setAttribute("data-view-mode", mode);

  // CSS custom properties on the root element
  const s = root.style;
  s.setProperty("--vw", `${w}px`);
  s.setProperty("--vh", `${h}px`);
  s.setProperty("--aspect", aspect.toFixed(3));

  // HUD scale: smaller on phones, normal on desktop
  const scale = w <= 480 ? 0.7 : w <= MOBILE_MAX ? 0.82 : w <= TABLET_MAX ? 0.92 : 1;
  s.setProperty("--hud-scale", scale.toFixed(2));

  // Gutter: safe-area-aware edge inset
  s.setProperty("--gutter", `max(12px, env(safe-area-inset-left, 0px))`);
  s.setProperty("--gutter-r", `max(12px, env(safe-area-inset-right, 0px))`);

  // Notify subscribers
  const info = { width: w, height: h, aspect, mode, scale };
  for (const fn of _listeners) {
    try { fn(info); } catch (_) { /* swallow */ }
  }
}

function _applySafeAreas(root) {
  const s = root.style;
  s.setProperty("--sat", "env(safe-area-inset-top, 0px)");
  s.setProperty("--sab", "env(safe-area-inset-bottom, 0px)");
  s.setProperty("--sal", "env(safe-area-inset-left, 0px)");
  s.setProperty("--sar", "env(safe-area-inset-right, 0px)");
}
