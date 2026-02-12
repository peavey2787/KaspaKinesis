> ### 📍 Navigation
> * [🏠 Project Hub](../../README.md)
> * [🏛️ Facade Guide](../engine/kaspa/FACADE_GUIDE.md)
> * [🔍 Intelligence Guide](../engine/kaspa/intelligence/README.md)
> * [🔍 Low Level Guide](../engine/kaspa/LOW_LEVEL_SDK.md)
> * [📡 KKTP Protocol](../protocol/docs/KKTP_PROTOCOL.md)

# DAG Dasher 🛹

A blockchain-verified "endless" runner game built on Kaspa with VRF-based anti-cheat mechanics.

## Features

### Gameplay
- **3-Lane Runner**: Swipe or use arrow keys to dodge obstacles
- **DAA Score Timing**: Game duration based on Kaspa's DAA score (+10,000 blocks)
- **VRF-Seeded Obstacles**: Deterministic obstacle generation via Kaspa VRF
- **Coin Collection**: Collect coins, avoid obstacles to keep them

## Using the Network as the Clock:
Unlike centralized games that rely on system time, DAG Dasher uses the Kaspa BlockDAG's Difficulty Adjustment Algorithm (DAA) score as a global, uncheatable game timer.

### Anti-Cheat System
- **Merkle Tree Moves**: Every player move is hashed into an incremental merkle tree
- **VRF Verification**: Moves are folded with VRF output for randomness proof
- **Immediate Anchoring**: Moves are anchored to Kaspa blockchain every 500ms
- **Integrity Shield**: Visual indicator showing game state
  - 🟢 Green: All OK
  - 🟠 Orange: 5s since last opponent move
  - 🔴 Red (flashing): Cheat detected
  - Auto-forfeit after 15s timeout

### Multiplayer
- **Lobby System**: Create/join lobbies with join code sharing as a fall back
- **Real-time Chat**: Secure in-lobby chat system
- **Spectator Mode**: Watch games and tip players (not yet implemented)
- **Progress Tracking**: See opponent's progress/coins

### Technical
- **Three.js Renderer**: Procedural geometry with cyberpunk aesthetics
- **Web Audio API**: Synthesized sounds and dynamic music
- **Touch + Keyboard**: 50px swipe threshold, full keyboard support
- **Responsive**: Works on both portrait and landscape orientations

## Quick Start

```bash
# Serve the game directory
cd kktp/game
npx serve .

# Open in browser
# http://localhost:3000
```

## URL Parameters

- `?debug` - Enable debug logging
- `?verbose` - Enable verbose logging
- `?trace` - Enable high-fidelity trace logging

## Project Structure

```
game/
├── index.html              # Entry point
├── GameFacade.js           # Main orchestrator
├── core/
│   ├── Logger.js           # Configurable logging
│   ├── Constants.js        # Game configuration
│   ├── EventEmitter.js     # Pub/sub pattern
│   ├── StateManager.js     # UI state with optimistic updates
│   └── CryptoUtils.js      # Hash utilities
├── engine/
│   ├── GameEngine.js       # Core game logic
│   └── EntropySource.js    # VRF entropy (uses kkGameEngine.prove())
├── input/
│   └── InputManager.js     # Touch + keyboard input
├── audio/
│   └── AudioManager.js     # Web Audio synthesizer
├── integrity/
│   └── IntegrityMonitor.js # Anti-cheat shield
├── renderer/
│   ├── SceneManager.js     # Three.js scene setup
│   ├── PlayerModel.js      # Procedural player
│   ├── TrackGenerator.js   # Infinite track
│   └── ObstacleFactory.js  # Entity generation
├── modules/                # Presenter layer
│   ├── session/            # SessionController (VRF, blocks, anchors)
│   ├── lobby/              # LobbyController (multiplayer)
│   ├── input/              # PlayerController (actions → kkGameEngine)
│   ├── ui/                 # HUDPresenter, MenuPresenter
│   └── renderer/           # RenderPresenter
└── ui/
    ├── MainMenu.js         # Main menu
    ├── LobbyUI.js          # Multiplayer lobby
    ├── GameHUD.js          # In-game HUD
    ├── AuditView.js        # Blockchain audit display
    └── WalletModal.js      # Wallet send functionality
```

## Controls

### Keyboard
- ← / A: Move left
- → / D: Move right
- ↑ / W / Space: Jump
- ↓ / S: Slide

### Touch
- Swipe left/right: Change lanes (50px threshold)
- Swipe up: Jump
- Swipe down: Slide

## Blockchain Integration

The game integrates with `kkGameEngine` for:

```javascript
// VRF for randomness
const vrfOutput = await kkGameEngine.prove(input);

// Anchoring moves
await kkGameEngine.recordMove(moveMessage);

// DAA score polling
const info = await kkGameEngine.runRpcCommand({ method: 'getBlockDagInfo', params: [] });

// Lobby management
await kkGameEngine.joinLobby(lobbyId);
```

### Message Prefixes
- `KSRF:LOBBY:` - Lobby messages
- `KSRF:MOVE:` - Player moves
- `KSRF:TIP:` - Spectator tips
- `KSRF:START:` - Game start
- `KSRF:END:` - Game end

## Powerups

| Powerup | Effect | Icon |
|---------|--------|------|
| Shield | Absorb one collision | 🛡️ |
| Double Coins | 2x coin value | 💰 |
| Speed Boost | Temporary speed increase | ⚡ |
| Magnet | Attract nearby coins | 🧲 |

*Note: VRF determines 50/50 powerup vs powerdown on collection meaning the player can audit that the power ups/downs weren't rigged against them after the game.*

## Configuration

Edit [Constants.js](core/Constants.js) to customize:

```javascript
// Game timing
DAA_GAME_DURATION: 1800,  // DAA blocks

// Integrity thresholds
ORANGE_THRESHOLD_MS: 5000, // Warning at 5s
FORFEIT_THRESHOLD_MS: 15000, // Forfeit at 15s

// Input
SWIPE_THRESHOLD_PX: 50,    // Swipe detection
```

## Credits

Built for the Kaspa ecosystem with:
- [Three.js](https://threejs.org/) for 3D rendering
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) for sound
- Kaspa VRF for verifiable randomness

## License

MIT License - see project root for details.
