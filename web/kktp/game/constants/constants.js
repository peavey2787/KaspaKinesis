/**
 * Constants.js - Game configuration and constants for DAG Dasher
 * 
 * Central configuration for all game parameters, colors, timings,
 * blockchain prefixes, and tuning values.
 */

// ═══════════════════════════════════════════════════════════════
// KASPA BRANDING COLORS
// ═══════════════════════════════════════════════════════════════

export const COLORS = Object.freeze({
  // Primary Kaspa brand
  KASPA_TEAL: 0x00d9ff,
  KASPA_TEAL_HEX: '#00d9ff',
  KASPA_PURPLE: 0x9945ff,
  KASPA_PURPLE_HEX: '#9945ff',
  
  // Semantic aliases (used throughout codebase)
  PRIMARY: 0x00d9ff,
  PRIMARY_HEX: '#00d9ff',
  ACCENT: 0x9945ff,
  ACCENT_HEX: '#9945ff',
  TEXT: '#ffffff',
  TEXT_SECONDARY: '#888888',
  
  // Integrity shield colors (all formats)
  INTEGRITY_GREEN: '#00ff88',
  INTEGRITY_ORANGE: '#ffa502',
  INTEGRITY_RED: '#ff4757',
  
  // Cyberpunk palette
  NEON_PINK: 0xff6b9d,
  NEON_PINK_HEX: '#ff6b9d',
  NEON_GREEN: 0x00ff88,
  NEON_GREEN_HEX: '#00ff88',
  NEON_ORANGE: 0xff8800,
  NEON_ORANGE_HEX: '#ff8800',
  NEON_YELLOW: 0xffcc00,
  NEON_YELLOW_HEX: '#ffcc00',
  
  // UI Colors
  BACKGROUND: 0x0a0a0f,
  BACKGROUND_DARK: 0x0a0a0f,
  BACKGROUND_DARK_HEX: '#0a0a0f',
  PANEL_BG: 'rgba(10, 10, 20, 0.85)',
  PANEL_BORDER: 'rgba(0, 217, 255, 0.3)',
  UI_PANEL: 'rgba(10, 10, 20, 0.85)',
  UI_BORDER: 'rgba(0, 217, 255, 0.3)',
  
  // Shield states
  SHIELD_GREEN: 0x00ff88,
  SHIELD_GREEN_HEX: '#00ff88',
  SHIELD_ORANGE: 0xffa502,
  SHIELD_ORANGE_HEX: '#ffa502',
  SHIELD_RED: 0xff4757,
  SHIELD_RED_HEX: '#ff4757',
  
  // Game elements
  COIN: '#ffd700',
  COIN_GOLD: 0xffd700,
  OBSTACLE_RED: 0xff3333,
  POWERUP_BLUE: 0x00ccff,
  POWERDOWN_MAGENTA: 0xff00ff,
  TRACK_DARK: 0x1a1a2e,
  TRACK_LINES: 0x00d9ff,
  FOG_COLOR: 0x0a0a1a,
});

// ═══════════════════════════════════════════════════════════════
// BLOCKCHAIN CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const BLOCKCHAIN = Object.freeze({
  // Payload prefixes
  PREFIX_LOBBY: 'KSRF:LOBBY:',
  PREFIX_MOVE: 'KSRF:MOVE:',
  PREFIX_BATCH: 'KSRF:BATCH:',
  PREFIX_HEARTBEAT: 'KSRF:HB:',
  PREFIX_TIP: 'KSRF:TIP:',
  PREFIX_GAME_START: 'KSRF:START:',
  PREFIX_GAME_END: 'KSRF:END:',
  
  // Game duration in DAA score
  DAA_GAME_DURATION: 10000,
  
  // Lobby search depth
  LOBBY_SEARCH_BLOCKS: 50,
  
  // Transaction amounts (in KAS)
  ANCHOR_AMOUNT: '0.5',
  TX_AMOUNT_MOVE: '0.001',
  TX_AMOUNT_LOBBY: '0.01',
  TX_AMOUNT_TIP_MIN: '0.001',
  
  // ─── Runway calculation ────────────────────────────────────────
  // Cost per anchor transaction (KAS) - used for runway calculation
  MOVE_COST_KAS: 0.5,
  // Full 3-minute race: 1,800 DAA blocks × 0.2 moves/block = 360 moves
  FULL_RACE_MOVES: 360,
  // Full race funding requirement: 360 × 0.5 KAS = 180 KAS
  FULL_RACE_COST_KAS: 180,
  // Move batch interval (ms) - how often we anchor moves
  MOVE_INTERVAL_MS: 500,
  
  // ─── UTXO management ───────────────────────────────────────────
  // Target number of UTXOs to maintain for parallel sends
  UTXO_SPLIT_COUNT: 15,
  // Heartbeat check interval (ms)
  UTXO_HEARTBEAT_MS: 15000,
  // Delay before first heartbeat check to let initial split confirm (ms)
  UTXO_HEARTBEAT_FIRST_DELAY_MS: 3000,
  // Number of private keys to retrieve for manual transactions
  UTXO_KEY_COUNT: 10,
  // Minimum UTXO size (KAS) to be considered "usable"
  UTXO_USABLE_THRESHOLD_KAS: 1.0,
  
  // Anchor batching
  ANCHOR_BATCH_MS: 500,
  ANCHOR_BATCH_MAX: 10,
});

// ═══════════════════════════════════════════════════════════════
// INTEGRITY MONITOR CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const INTEGRITY = Object.freeze({
  // Timing thresholds (ms)
  ORANGE_THRESHOLD_MS: 5000,    // 5 seconds for orange
  FORFEIT_THRESHOLD_MS: 15000, // 15 seconds for auto-forfeit
  
  // Flash interval for red shield
  RED_FLASH_INTERVAL_MS: 200,
});

// ═══════════════════════════════════════════════════════════════
// GAME MECHANICS
// ═══════════════════════════════════════════════════════════════

export const GAME = Object.freeze({

  NAME: "DAG Dasher",
  TAGLINE: "Anti-cheat runner on Kaspa's DAG",

  // Lanes
  LANE_COUNT: 3,
  LANE_WIDTH: 2.5,
  LANE_POSITIONS: [-2.5, 0, 2.5], // Left, Center, Right
  
  // Player
  PLAYER_START_LANE: 1, // Center
  PLAYER_START_COINS: 0,
  PLAYER_LANE_SWITCH_DURATION: 150, // ms
  PLAYER_JUMP_DURATION: 500, // ms
  PLAYER_DUCK_DURATION: 400, // ms
  PLAYER_INVINCIBILITY_DURATION: 1000, // ms after collision
  
  // Speed
  INITIAL_SPEED: 15, // units per second
  SPEED_INCREMENT: 0.5, // speed increase per 1000 DAA score
  MAX_SPEED: 40,
  
  // Collision slowdown
  COLLISION_SLOWDOWN_FACTOR: 0.5, // Speed multiplier on collision (50% speed)
  COLLISION_SLOWDOWN_DURATION: 1500, // How long slowdown lasts (ms)
  
  // Finish line
  FINISH_LINE_THRESHOLD: 0.98, // Show finish line when 98% complete
  
  // Scoring
  COIN_VALUE: 10,
  COLLISION_PENALTY: 3, // coins lost
  COLLISION_COIN_LOSS: 0.3, // 30% of coins lost on collision
  DISTANCE_MULTIPLIER: 1, // score per unit traveled
  
  // Spawning
  SPAWN_DISTANCE: 60, // spawn entities this far ahead
  DESPAWN_DISTANCE: -10, // remove entities behind player
  SPAWN_COOLDOWN_MS: 1500, // 1.5s between spawns for easy mode
  OBSTACLE_CHANCE: 0.4, // 40% chance for obstacle
  COIN_CHANCE: 0.35, // 35% chance for coin
  POWERUP_CHANCE: 0.15, // 15% chance for powerup
  // Remaining 10% = nothing spawns (easy mode breathing room)
  
  // Obstacles
  OBSTACLE_SPAWN_DISTANCE: 100,
  OBSTACLE_MIN_GAP: 15,
  OBSTACLE_TYPES: ['barrier', 'train', 'gap', 'low_barrier'],
  OBSTACLE_WIDTH: 2,
  OBSTACLE_HEIGHT: 1.5,
  
  // Lane bitmasks for multi-lane obstacles
  LANE_LEFT: 0b001,
  LANE_CENTER: 0b010,
  LANE_RIGHT: 0b100,
  LANE_ALL: 0b111,
  
  // Coins
  COIN_SPAWN_CHANCE: 0.3,
  COIN_CLUSTER_SIZE: [1, 5], // min, max coins per cluster
  
  // Collision
  COLLISION_DISTANCE: 1.5, // how close player must be to entity
  
  // Physics
  JUMP_VELOCITY: 12,
  GRAVITY: 30,
  
  // Track
  TRACK_SEGMENT_LENGTH: 50,
  TRACK_VISIBLE_SEGMENTS: 6,
  TRACK_CLEANUP_DISTANCE: -20,
  
  // DAA-based game duration
  DAA_DURATION: 1800, // game lasts 1,800 DAA score increments (~3 min at 10 score/sec)
  
  // Platforms (ramps/cubes you can jump onto)
  PLATFORM_CHANCE: 0.10, // 10% chance for platform (taken from obstacle pool)
  PLATFORM_HEIGHT: 1.2, // Height of platform surface
  PLATFORM_LENGTH: 4.0, // How long the platform is (z-axis)
  PLATFORM_WIDTH: 2.0, // Width matches lane
});

// ═══════════════════════════════════════════════════════════════
// BARRIER TYPES - Color-coded obstacle variants
// ═══════════════════════════════════════════════════════════════
// Colors: Jump=Cyan (0x00FFFF), Duck=Yellow (0xFFFF00), Move=Red (0xFF2244)

export const BARRIER_TYPES = Object.freeze({
  // Single lane barriers (player can move around)
  JUMP_SINGLE: {
    id: 'jump_single',
    action: 'jump',
    lanes: 0b010, // Center only
    color: 0x00FFFF,
    colorHex: '#00FFFF',
    emissive: 0x00AAAA,
    height: 1.5,
    y: 0,
    requiresJump: true,
    requiresDuck: false,
    showIndicator: true,
  },
  DUCK_SINGLE: {
    id: 'duck_single',
    action: 'duck',
    lanes: 0b010, // Center only
    color: 0xFFFF00,
    colorHex: '#FFFF00',
    emissive: 0xAAAA00,
    height: 0.8,
    y: 0.8, // Overhead
    requiresJump: false,
    requiresDuck: true,
    showIndicator: false,
  },
  MOVE_SINGLE: {
    id: 'move_single',
    action: 'move',
    lanes: 0b010, // Center only - forces lane switch
    color: 0xFF2244,
    colorHex: '#FF2244',
    emissive: 0xAA0022,
    height: 4.0, // Very tall - cannot jump over
    y: 0,
    requiresJump: false,
    requiresDuck: false,
    cannotJumpOver: true, // Unjumpable barrier
    showIndicator: true,
  },
  
  // Double lane barriers (player must move to specific lane)
  JUMP_DOUBLE: {
    id: 'jump_double',
    action: 'jump',
    lanes: 0b011, // Left + Center
    color: 0x00FFFF,
    colorHex: '#00FFFF',
    emissive: 0x00AAAA,
    height: 1.5,
    y: 0,
    requiresJump: true,
    requiresDuck: false,
    showIndicator: true,
  },
  DUCK_DOUBLE: {
    id: 'duck_double',
    action: 'duck',
    lanes: 0b110, // Center + Right
    color: 0xFFFF00,
    colorHex: '#FFFF00',
    emissive: 0xAAAA00,
    height: 0.8,
    y: 0.8, // Overhead
    requiresJump: false,
    requiresDuck: true,
    showIndicator: false,
  },
  WALL_DOUBLE: {
    id: 'wall_double',
    action: 'move',
    lanes: 0b101, // Left + Right (center is safe)
    color: 0xFF2244,
    colorHex: '#FF2244',
    emissive: 0xAA0022,
    height: 4.0, // Very tall - cannot jump over
    y: 0,
    requiresJump: false,
    requiresDuck: false,
    cannotJumpOver: true, // Unjumpable barrier
    showIndicator: true,
  },
  
  // Full lane barriers (MUST use the specified action)
  JUMP_FULL: {
    id: 'jump_full',
    action: 'jump',
    lanes: 0b111, // All lanes - MUST jump
    color: 0x00FFFF,
    colorHex: '#00FFFF',
    emissive: 0x00AAAA,
    height: 1.5,
    y: 0,
    requiresJump: true,
    requiresDuck: false,
    showIndicator: true,
  },
  DUCK_FULL: {
    id: 'duck_full',
    action: 'duck',
    lanes: 0b111, // All lanes - MUST duck
    color: 0xFFFF00,
    colorHex: '#FFFF00',
    emissive: 0xAAAA00,
    height: 0.8,
    y: 0.8, // Overhead covering all lanes
    requiresJump: false,
    requiresDuck: true,
    showIndicator: false,
  },

  // Strict duck-only barrier (purple) - cannot jump over
  DUCK_STRICT: {
    id: 'duck_strict',
    action: 'duck',
    lanes: 0b111, // All lanes - MUST duck
    color: 0x9945FF,
    colorHex: '#9945FF',
    emissive: 0x5A22AA,
    height: 2.2,
    y: 0.4, // Starts above duck height
    requiresJump: false,
    requiresDuck: true,
    showIndicator: true,
    strictDuck: true,
  },
});

// Array of barrier type keys for random selection
export const BARRIER_TYPE_KEYS = Object.keys(BARRIER_TYPES);

// ═══════════════════════════════════════════════════════════════
// PLATFORM TYPES - Elevated surfaces you can jump onto
// ═══════════════════════════════════════════════════════════════

export const PLATFORM_TYPES = Object.freeze({
  CUBE: {
    id: 'cube',
    width: 2.0,
    height: 1.2,
    length: 3.0,
    color: 0x8844FF,      // Purple
    emissive: 0x4422AA,
  },
  LONG_CUBE: {
    id: 'long_cube',
    width: 2.0,
    height: 1.0,
    length: 6.0,
    color: 0x44AAFF,      // Blue
    emissive: 0x2266AA,
  },
  EXTENDED_PLATFORM: {
    id: 'extended_platform',
    width: 2.0,
    height: 1.0,
    length: 12.0,         // Very long - gives time to jump again
    color: 0x00DDAA,      // Teal
    emissive: 0x00AA88,
  },
  MEGA_PLATFORM: {
    id: 'mega_platform',
    width: 2.0,
    height: 1.2,
    length: 18.0,         // Extra long runway
    color: 0xFFDD00,      // Gold
    emissive: 0xAA9900,
  },
});

export const PLATFORM_TYPE_KEYS = Object.keys(PLATFORM_TYPES);

// ═══════════════════════════════════════════════════════════════
// POWERUPS / POWERDOWNS
// ═══════════════════════════════════════════════════════════════

export const POWERUPS = Object.freeze({
  // Types
  TYPES: {
    // Powerups (positive)
    SPEED_BOOST: { id: 'speed_boost', duration: 5000, multiplier: 1.5, positive: true },
    COIN_MAGNET: { id: 'coin_magnet', duration: 8000, range: 5, positive: true },
    SHIELD: { id: 'shield', duration: 6000, positive: true },
    DOUBLE_COINS: { id: 'double_coins', duration: 5000, positive: true },
    
    // Powerdowns (negative)
    SLOW: { id: 'slow', duration: 4000, multiplier: 0.6, positive: false },
    REVERSE_CONTROLS: { id: 'reverse', duration: 3000, positive: false },
    FOG: { id: 'fog', duration: 5000, positive: false },
  },
  
  // Brief tips explaining each powerup/powerdown effect
  TIPS: {
    speed_boost: '⚡ Speed Boost: Moving faster!',
    coin_magnet: '🧲 Coin Magnet: Coins fly to you!',
    shield: '🛡️ Shield: Protected from next hit!',
    double_coins: '💰 Double Coins: 2× coin value!',
    slow: '🐢 Slowed Down: Harder to finish!',
    reverse: '🔄 Reversed: Controls flipped!',
    fog: '🌫️ Fog: Vision obscured!',
  },
  
  // Default duration in ms
  DURATION_MS: 5000,
  
  // Spawn distance ahead of player
  SPAWN_DISTANCE: 30,
  
  // 50% powerup, 50% powerdown (fair balance)
  POSITIVE_CHANCE: 0.5,
});

// ═══════════════════════════════════════════════════════════════
// INPUT CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const INPUT = Object.freeze({
  // Touch
  SWIPE_THRESHOLD_PX: 50,
  SWIPE_MAX_TIME_MS: 300,
  
  // Keyboard mappings
  KEYS: {
    LEFT: ['ArrowLeft', 'KeyA'],
    RIGHT: ['ArrowRight', 'KeyD'],
    JUMP: ['ArrowUp', 'KeyW', 'Space'],
    DUCK: ['ArrowDown', 'KeyS'],
    PAUSE: ['Escape', 'KeyP'],
  },
  
  // Debounce
  ACTION_COOLDOWN_MS: 100,
});

// ═══════════════════════════════════════════════════════════════
// AUDIO CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const AUDIO = Object.freeze({
  // Master volume (0-1)
  MASTER_VOLUME: 0.7,
  MUSIC_VOLUME: 0.4,
  SFX_VOLUME: 0.8,
  
  // Frequencies for synthesized sounds
  COIN_FREQ: [880, 1108.73], // A5, C#6 arpeggio
  COLLISION_FREQ: 110, // A2 bass thud
  POWERUP_FREQ: [523.25, 659.25, 783.99], // C5, E5, G5 major chord
  POWERDOWN_FREQ: [392, 311.13, 233.08], // G4, Eb4, Bb3 minor descent
  JUMP_FREQ: [440, 880], // A4 to A5 sweep
  
  // Durations
  COIN_DURATION: 0.1,
  COLLISION_DURATION: 0.3,
  POWERUP_DURATION: 0.4,
  
  // Music BPM
  MUSIC_BPM: 128,
});

// ═══════════════════════════════════════════════════════════════
// RENDERER CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const RENDERER = Object.freeze({
  // Quality presets
  QUALITY: {
    LOW: { bloom: false, fog: true, particles: 50, shadows: false },
    MEDIUM: { bloom: true, fog: true, particles: 200, shadows: false },
    HIGH: { bloom: true, fog: true, particles: 500, shadows: true },
  },
  
  // Default quality
  DEFAULT_QUALITY: 'MEDIUM',
  
  // Camera (with aliases)
  FOV: 75,
  CAMERA_FOV: 75,
  NEAR: 0.1,
  CAMERA_NEAR: 0.1,
  FAR: 1000,
  CAMERA_FAR: 1000,
  CAMERA_HEIGHT: 5,
  CAMERA_DISTANCE: 10,
  CAMERA_POSITION_Y: 5,
  CAMERA_POSITION_Z: 10,
  CAMERA_LOOK_AHEAD: 20,
  
  // Bloom
  BLOOM_ENABLED: true,
  BLOOM_STRENGTH: 1.5,
  BLOOM_RADIUS: 0.4,
  BLOOM_THRESHOLD: 0.6,
  
  // Fog
  FOG_NEAR: 30,
  FOG_FAR: 150,
  
  // Anti-aliasing
  ANTIALIAS: true,
  MAX_PIXEL_RATIO: 2,
});

// ═══════════════════════════════════════════════════════════════
// UI CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const UI = Object.freeze({
  // Breakpoints
  MOBILE_MAX_WIDTH: 768,
  TABLET_MAX_WIDTH: 1024,
  
  // Padding
  PADDING: 16,
  
  // Animation durations
  TRANSITION_FAST: 150,
  TRANSITION_NORMAL: 300,
  TRANSITION_SLOW: 500,
  
  // Z-indices
  Z_GAME: 1,
  Z_HUD: 100,
  Z_OVERLAY: 200,
  Z_MODAL: 300,
  Z_TOAST: 400,
  
  // Toast notifications
  TOAST_DURATION: 3000,
  
  // Chat
  CHAT_MAX_MESSAGES: 50,
  CHAT_MESSAGE_FADE: 10000,
});

// ═══════════════════════════════════════════════════════════════
// LOBBY STATES
// ═══════════════════════════════════════════════════════════════

export const LOBBY = Object.freeze({
  STATE: {
    IDLE: 'idle',
    HOSTING: 'hosting',
    JOINING: 'joining',
    WAITING: 'waiting',
    READY: 'ready',
    STARTING: 'starting',
    IN_GAME: 'in_game',
    GAME_OVER: 'game_over',
  },
  
  MAX_PLAYERS: 2,
  READY_COUNTDOWN_SEC: 3,
});

// ═══════════════════════════════════════════════════════════════
// MESSAGE TYPES (for group communication)
// ═══════════════════════════════════════════════════════════════

export const MSG_TYPE = Object.freeze({
  // Lobby
  READY_STATE: 'ready_state',
  CHAT: 'chat',
  PLAYER_JOIN: 'player_join',
  PLAYER_LEAVE: 'player_leave',
  
  // Game
  GAME_START: 'game_start',
  GAME_ABORT: 'game_abort',
  PLAYER_UPDATE: 'player_update',
  MOVE: 'move',
  GAME_END: 'game_end',
  
  // Integrity
  MERKLE_ROOT: 'merkle_root',
  CHEAT_DETECTED: 'cheat_detected',
});

// ═══════════════════════════════════════════════════════════════
// UI STRINGS (for localization-ready code)
// ═══════════════════════════════════════════════════════════════

export const STRINGS = Object.freeze({
  INTEGRITY: {
    OK: 'Game integrity: OK',
    WAITING: 'Waiting for opponent...',
    CHEAT: 'Cheat detected!',
    FORFEIT: 'Opponent forfeited',
    UNKNOWN: 'Game integrity: Unknown',
  },
  GAME_OVER: {
    COMPLETED: 'Race Complete!',
    COINS_DEPLETED: 'Out of Coins!',
    FORFEIT: 'Opponent Forfeited',
    CHEAT: 'Cheat Detected',
    TIMEOUT: 'Connection Lost',
  },
  LOBBY: {
    CREATED: 'Lobby created. Share the block hash with your opponent!',
    JOINED: 'Joined lobby. Waiting for host to start...',
    NO_LOBBIES: 'No active lobbies found',
  },
});

// ═══════════════════════════════════════════════════════════════
// ACTION TYPES (for moves)
// ═══════════════════════════════════════════════════════════════

export const ACTION = Object.freeze({
  NONE: 'none',
  LEFT: 'left',
  RIGHT: 'right',
  JUMP: 'jump',
  DUCK: 'duck',
  DUCK_RELEASED: 'duck_release',
  SLIDE: 'duck', // alias
  
  // Aliases for InputManager compatibility
  MOVE_LEFT: 'move_left',
  MOVE_RIGHT: 'move_right',
});

// ═══════════════════════════════════════════════════════════════
// BINARY ANCHOR PROTOCOL (v3) - Compact On-Chain Game Replay Data
// ═══════════════════════════════════════════════════════════════
// 
// All data needed for deterministic replay fits in ~1KB single tx.
// Header (55 bytes) + QRNG Pulses (12 bytes each) + Moves (6 bytes each)
//
// Binary Layout:
//   Header:
//     [0]       version (1 byte)
//     [1-8]     gameId (8 bytes, first 8 of hash)
//     [9-24]    startBlockHash (16 bytes, first 16)
//     [25-40]   endBlockHash (16 bytes, first 16)
//     [41-48]   vrfSeed (8 bytes, first 8)
//     [49]      moveCount (1 byte, max 255)
//     [50]      qrngPulseCount (1 byte, max 3)
//     [51-52]   finalScore (2 bytes, uint16)
//     [53-54]   coinsCollected (2 bytes, uint16)
//   
//   QRNG Pulses (12 bytes each):
//     [0-3]     pulseIndex (4 bytes, uint32)
//     [4-11]    pulseFragment (8 bytes, first 8 of output)
//   
//   Moves (6 bytes each):
//     [0]       actionLane (1 byte: upper 4 bits = action, lower 4 = lane)
//     [1]       timeDelta (1 byte, ms/4, max 255 = 1020ms)
//     [2-5]     vrfFragment (4 bytes, first 4 of VRF output)
//
// Action Codes (upper nibble):
//   0x0 = NONE/NOP (heartbeat for time delta overflow)
//   0x1 = JUMP
//   0x2 = DUCK
//   0x3 = MOVE_LEFT
//   0x4 = MOVE_RIGHT
//
// Time Delta Overflow:
//   If gap between moves > 1020ms, insert NOP heartbeat with timeDelta=255
//   Multiple NOPs can be inserted for very long gaps
// ═══════════════════════════════════════════════════════════════

export const ANCHOR = Object.freeze({
  VERSION: 4, // v4: Three-anchor system with full cryptographic proof chain
  
  // Header sizes (legacy v3)
  HEADER_SIZE: 55, // Total header bytes
  GAME_ID_BYTES: 8,
  BLOCK_HASH_BYTES: 16,
  VRF_SEED_BYTES: 8,
  
  // Move packet
  MOVE_PACKET_SIZE: 8,
  VRF_FRAGMENT_BYTES: 4,
  
  // QRNG pulse
  QRNG_PULSE_SIZE: 12,
  QRNG_PULSE_FRAGMENT_BYTES: 8,
  MAX_QRNG_PULSES: 3,
  
  // Time delta scaling (ms per tick)
  TIME_DELTA_SCALE: 4,
  TIME_DELTA_MAX: 255,
  NOP_HEARTBEAT_MS: 1020, // 255 * 4
  
  // Max moves per anchor (255 due to 1-byte count)
  MAX_MOVES: 255,
  
  // ═══════════════════════════════════════════════════════════════
  // V4 THREE-ANCHOR CRYPTOGRAPHIC PROOF SYSTEM
  // ═══════════════════════════════════════════════════════════════
  //
  // Three anchors form a cryptographic proof chain:
  // 1. GENESIS: Contract - commits all entropy sources BEFORE first move
  // 2. HEARTBEAT: Evidence - batched moves with merkle proofs + delta entropy
  // 3. FINAL: Verdict - final merkle root + results + chain reference
  //
  // Verification: Any auditor can:
  // 1. Fetch genesis tx → extract BTC hashes, NIST sig, DAA bounds
  // 2. Follow prevTxId chain through heartbeats → verify move merkle proofs
  // 3. Check final tx → verify results match merkle tree
  // 4. Replay game deterministically from anchored data
  // ═══════════════════════════════════════════════════════════════
  
  // Anchor types
  TYPE_GENESIS: 0x01,
  TYPE_HEARTBEAT: 0x02,
  TYPE_FINAL: 0x03,
  
  // Bitcoin entropy (6 most recent blocks at game start)
  BTC_BLOCK_COUNT: 6,
  BTC_BLOCK_HASH_SIZE: 32, // Full 32-byte block hash
  BTC_TOTAL_SIZE: 192, // 6 × 32 bytes
  
  // NIST QRNG beacon (RSA-PSS signature for non-repudiation)
  NIST_PULSE_INDEX_SIZE: 8, // uint64
  NIST_OUTPUT_HASH_SIZE: 64, // SHA-512 output
  NIST_SIGNATURE_SIZE: 512, // RSA-PSS 4096-bit signature
  
  // Kaspa block hash (injected per-move for cryptographic trap)
  KASPA_BLOCK_HASH_SIZE: 32,
  
  // SHA-256 hash sizes
  HASH_SIZE: 32,
  MERKLE_ROOT_SIZE: 32,
  
  // Canonical leaf hash formula (for auditor verification):
  // leafHash = SHA256(sequence || action || lane || timestamp || vrfOutput || kaspaBlockHash)
  // Where:
  //   sequence: 4 bytes uint32 BE
  //   action: 1 byte (ACTION_CODE)
  //   lane: 1 byte (0-2)
  //   timestamp: 8 bytes uint64 BE
  //   vrfOutput: 32 bytes (full VRF output, not fragment)
  //   kaspaBlockHash: 32 bytes (block hash at time of move)
  LEAF_HASH_PREIMAGE_SIZE: 78, // 4 + 1 + 1 + 8 + 32 + 32
  
  // Delta flags for heartbeat (bitfield in header)
  DELTA_FLAG_NONE: 0x00,
  DELTA_FLAG_BTC: 0x01, // New BTC block since last anchor
  DELTA_FLAG_NIST: 0x02, // New NIST pulse since last anchor (includes signature)
  DELTA_FLAG_BOTH: 0x03, // Both BTC and NIST changed
  
  // Genesis anchor binary layout (total: 890 bytes):
  // [0]       version (1 byte) = 5
  // [1]       anchorType (1 byte) = 0x01 (GENESIS)
  // [2-33]    gameIdHash (32 bytes) - SHA256(gameId) for privacy
  // [34-65]   hashedSeed (32 bytes) - SHA256(initial VRF seed)
  // [66-257]  btcBlockHashes (192 bytes) - 6 × 32-byte hashes
  // [258-265] startDaaScore (8 bytes) - uint64 BE
  // [266-273] endDaaScore (8 bytes) - uint64 BE
  // [274-281] nistPulseIndex (8 bytes) - uint64 BE
  // [282-345] nistOutputHash (64 bytes) - SHA-512
  // [346-857] nistSignature (512 bytes) - RSA-PSS signature
  // [858-889] vrfOutput (32 bytes) - full initial VRF output
  GENESIS_BASE_SIZE: 890,
  
  // Heartbeat anchor binary layout (v5 union protocol):
  // [0]       version (1 byte) = 5
  // [1]       anchorType (1 byte) = 0x02 (HEARTBEAT)
  // [2-33]    merkleRoot (32 bytes) - current merkle tree root
  // [34-65]   prevTxId (32 bytes) - previous anchor tx hash
  // [66]      deltaFlags (1 byte) - what changed since last anchor
  // [67]      moveCount (1 byte) - moves in this batch
  // [68-69]   movesSectionLength (2 bytes) - uint16 BE, total bytes of move packets
  // [70...]   moves (variable-length per action code):
  //             - Code 1 (MOVE): 16 bytes (extended with x/y/z coords)
  //             - Codes 0, 2-15: 8 bytes (standard: action+lane+timeDelta+vrfFragment+coinsTotal)
  //           DAG Dasher uses only standard 8-byte packets (codes 0, 2-9).
  // After moves:
  //   if DELTA_FLAG_BTC: +32 bytes (new BTC block hash)
  //   if DELTA_FLAG_NIST: +8 bytes (pulseIndex) + 64 bytes (outputHash) + 512 bytes (signature)
  HEARTBEAT_HEADER_SIZE: 70,
  HEARTBEAT_DELTA_BTC_SIZE: 32,
  HEARTBEAT_DELTA_NIST_SIZE: 584, // 8 + 64 + 512
  
  // Final anchor binary layout:
  // [0]       version (1 byte) = 5
  // [1]       anchorType (1 byte) = 0x03 (FINAL)
  // [2-33]    finalMerkleRoot (32 bytes)
  // [34-65]   genesisTxId (32 bytes) - reference to genesis for chain verification
  // [66-97]   prevTxId (32 bytes) - last heartbeat tx
  // [98-129]  resultLeafHash (32 bytes) - SHA256(RESULT:score:coins:outcome:raceTimeMs)
  // [130-133] finalScore (4 bytes) - uint32 BE
  // [134-137] coinsCollected (4 bytes) - uint32 BE
  // [138-141] raceTimeMs (4 bytes) - uint32 BE, race completion time in milliseconds
  // [142]     outcome (1 byte) - 0=complete, 1=forfeit, 2=timeout, 3=cheat
  // [143]     totalMoves (1 byte) - total moves in game
  FINAL_SIZE: 144,
  
  // Outcome codes
  OUTCOME_COMPLETE: 0x00,
  OUTCOME_FORFEIT: 0x01,
  OUTCOME_TIMEOUT: 0x02,
  OUTCOME_CHEAT: 0x03,
});

/**
 * Binary action codes for anchor encoding (v5 protocol).
 * Code 1 is reserved for extended 16-byte MOVE packets (x/y/z coords).
 * DAG Dasher is lane-based so all codes use standard 8-byte packets (0, 2-9).
 */
export const ACTION_CODE = Object.freeze({
  NONE: 0x0,      // NOP heartbeat for time overflow
  JUMP: 0x2,
  DUCK: 0x3,
  MOVE_LEFT: 0x4,
  MOVE_RIGHT: 0x5,
  // Game events (for spectator heartbeat updates)
  COIN_COLLECTED: 0x8,
  COLLISION: 0x6,
  POWERUP_COLLECTED: 0x7,
  POWERDOWN_COLLECTED: 0x9,
});

/**
 * Event type codes for game event anchoring (v5 protocol).
 * These are included in heartbeat anchors for spectator updates.
 */
export const EVENT_CODE = Object.freeze({
  COIN: 0x8,
  COLLISION: 0x6,
  POWERUP: 0x7,
  POWERDOWN: 0x9,
});

/**
 * Map string action names to binary codes
 */
export const ACTION_TO_CODE = Object.freeze({
  'none': ACTION_CODE.NONE,
  'jump': ACTION_CODE.JUMP,
  'duck': ACTION_CODE.DUCK,
  'move_left': ACTION_CODE.MOVE_LEFT,
  'move_right': ACTION_CODE.MOVE_RIGHT,
  'left': ACTION_CODE.MOVE_LEFT,
  'right': ACTION_CODE.MOVE_RIGHT,
  // Game events
  'coin_collected': ACTION_CODE.COIN_COLLECTED,
  'collision': ACTION_CODE.COLLISION,
  'powerup_collected': ACTION_CODE.POWERUP_COLLECTED,
  'powerdown_collected': ACTION_CODE.POWERDOWN_COLLECTED,
  // Uppercase aliases
  'NONE': ACTION_CODE.NONE,
  'JUMP': ACTION_CODE.JUMP,
  'DUCK': ACTION_CODE.DUCK,
  'MOVE_LEFT': ACTION_CODE.MOVE_LEFT,
  'MOVE_RIGHT': ACTION_CODE.MOVE_RIGHT,
  'LEFT': ACTION_CODE.MOVE_LEFT,
  'RIGHT': ACTION_CODE.MOVE_RIGHT,
  'COIN_COLLECTED': ACTION_CODE.COIN_COLLECTED,
  'COLLISION': ACTION_CODE.COLLISION,
  'POWERUP_COLLECTED': ACTION_CODE.POWERUP_COLLECTED,
  'POWERDOWN_COLLECTED': ACTION_CODE.POWERDOWN_COLLECTED,
});

/**
 * Map binary codes back to string action names
 */
export const CODE_TO_ACTION = Object.freeze({
  [ACTION_CODE.NONE]: 'none',
  [ACTION_CODE.JUMP]: 'jump',
  [ACTION_CODE.DUCK]: 'duck',
  [ACTION_CODE.MOVE_LEFT]: 'move_left',
  [ACTION_CODE.MOVE_RIGHT]: 'move_right',
  [ACTION_CODE.COIN_COLLECTED]: 'coin_collected',
  [ACTION_CODE.COLLISION]: 'collision',
  [ACTION_CODE.POWERUP_COLLECTED]: 'powerup_collected',
  [ACTION_CODE.POWERDOWN_COLLECTED]: 'powerdown_collected',
});

// ═══════════════════════════════════════════════════════════════
// UTILITY EXPORTS
// ═══════════════════════════════════════════════════════════════

export const CONFIG = Object.freeze({
  COLORS,
  BLOCKCHAIN,
  INTEGRITY,
  GAME,
  BARRIER_TYPES,
  BARRIER_TYPE_KEYS,
  PLATFORM_TYPES,
  PLATFORM_TYPE_KEYS,
  POWERUPS,
  INPUT,
  AUDIO,
  RENDERER,
  UI,
  LOBBY,
  MSG_TYPE,
  ACTION,
  ANCHOR,
  ACTION_CODE,
  EVENT_CODE,
  ACTION_TO_CODE,
  CODE_TO_ACTION,
  STRINGS,
});

export default CONFIG;
