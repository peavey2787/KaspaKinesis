/**
 * GameState.js - Game constants, enums, and state types
 * 
 * Extracted from GameEngine.js for separation of concerns.
 * Provides:
 * - Game state enum (IDLE, COUNTDOWN, RUNNING, PAUSED, ENDED)
 * - Game event types
 * - Lane definitions
 * - Entity types
 * - Timer/score formatting utilities
 */

/**
 * Game states
 */
export const GameState = Object.freeze({
  IDLE: 'idle',
  COUNTDOWN: 'countdown',
  RUNNING: 'running',
  PAUSED: 'paused',
  ENDED: 'ended',
});

/**
 * Game events
 */
export const GameEvent = Object.freeze({
  STATE_CHANGED: 'stateChanged',
  PLAYER_MOVED: 'playerMoved',
  COLLISION: 'collision',
  COIN_COLLECTED: 'coinCollected',
  POWERUP_COLLECTED: 'powerupCollected',
  PROGRESS_UPDATE: 'progressUpdate',
  GAME_START: 'gameStart',
  GAME_END: 'gameEnd',
  OBSTACLE_SPAWNED: 'obstacleSpawned',
  SPEED_CHANGED: 'speedChanged',
});

/**
 * Lane positions (3-lane runner)
 */
export const Lane = Object.freeze({
  LEFT: 0,
  CENTER: 1,
  RIGHT: 2,
});

/**
 * Entity types for spawning system
 */
export const EntityType = Object.freeze({
  OBSTACLE: 'obstacle',
  COIN: 'coin',
  POWERUP: 'powerup',
  PLATFORM: 'platform',
});

/**
 * Format race time as MM:SS.mm
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time string
 */
export function formatRaceTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor((ms % 1000) / 10); // 2 decimal places
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
}

/**
 * Calculate progress (0-1) from DAA scores
 * @param {number} current - Current DAA score
 * @param {number} start - Start DAA score
 * @param {number} end - End DAA score
 * @returns {number} Progress 0-1
 */
export function calculateProgress(current, start, end) {
  const total = end - start;
  if (total <= 0) return 0;
  const elapsed = current - start;
  return Math.min(1, Math.max(0, elapsed / total));
}

/**
 * Calculate speed from progress
 * @param {number} progress - Progress 0-1
 * @param {number} initialSpeed - Starting speed
 * @param {number} maxSpeed - Maximum speed
 * @returns {number} Current speed
 */
export function calculateSpeedFromProgress(progress, initialSpeed, maxSpeed) {
  return initialSpeed + (maxSpeed - initialSpeed) * progress;
}

export default {
  GameState,
  GameEvent,
  Lane,
  EntityType,
  formatRaceTime,
  calculateProgress,
  calculateSpeedFromProgress,
};
