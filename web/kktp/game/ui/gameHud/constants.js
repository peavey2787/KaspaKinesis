/**
 * constants.js - HUD constants, layout positions, and event types
 *
 * All HUD element positions are defined here to prevent overlaps
 * and ensure consistent spacing across single-player and multiplayer.
 */

export const HUDEvent = {
  PAUSE: "pause",
  RESUME: "resume",
  QUIT: "quit",
  RETRY: "retry",
  AUDIT: "audit",
  SETTINGS: "settings",
  MAIN_MENU: "mainMenu",
};

/**
 * HUD Layout constants - positioning for all elements
 *
 * Top Zone (stacked from top):
 *   ProgressBar: 56px
 *   Timer: 72px
 *   Warning: 95px
 *   PowerupIndicator: 130px
 *
 * Left Column:
 *   Settings button: 12px from top
 *   Coins panel: 64px from top
 *   Standings panel: 120px from top
 *
 * Bottom Zone (stacked from bottom):
 *   SpeedDisplay: 20px from bottom (right corner)
 *   UtxoNotification: 60px from bottom
 *   TouchHint: 110px from bottom
 *   Toast: 160px from bottom
 */
export const HUD_LAYOUT = Object.freeze({
  // Base spacing
  PADDING: 16,
  ELEMENT_GAP: 8,

  // Settings + coins (left column)
  SETTINGS_TOP: 12,
  SETTINGS_LEFT: 12,
  SETTINGS_BUTTON_SIZE: 36,
  COINS_TOP: 72,
  COINS_LEFT: 12,

  // Standings panel (left side)
  STANDINGS_TOP: 140,
  STANDINGS_LEFT: 12,
  STANDINGS_WIDTH: "min(40vw, 320px)",
  STANDINGS_ROW_HEIGHT: 32,
  STANDINGS_MAX_ROWS: 6,

  // Top zone - positions from top
  TOP_BAR_HEIGHT: 52,
  PROGRESS_BAR_TOP: 56,
  PROGRESS_BAR_HEIGHT: 8,
  TIMER_TOP: 72,
  TIMER_HEIGHT: 18,

  // Contextual elements (below timer)
  WARNING_TOP: 95, // TestModeWarning position

  // Powerup indicator - below standings area
  POWERUP_TOP: 130,
  POWERUP_TIP_OFFSET: 45, // Offset from POWERUP_TOP for tip

  // Bottom zone - positions from bottom
  SPEED_BOTTOM: 20,
  NOTIFICATION_BOTTOM: 60, // UtxoNotification
  TOUCH_HINT_BOTTOM: 110, // TouchHint (above notifications)
  TOAST_BOTTOM: 160, // Toast messages

  // Responsive widths
  PROGRESS_BAR_WIDTH: "clamp(200px, 60vw, 400px)",
});

export const HUD_STYLES = Object.freeze({
  FONT_FAMILY: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  TRANSITION_FAST: "0.2s ease",
  TRANSITION_MEDIUM: "0.3s ease",
  Z_INDEX: {
    HUD: 50,
    COUNTDOWN: 60,
    PAUSE_MENU: 70,
    NOTIFICATION: 100, // TestModeWarning, UtxoNotification
    GAME_OVER: 200,
    MODAL: 9999,
    TOAST: 10000,
  },
});
