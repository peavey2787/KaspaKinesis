# Modules - Presenter Layer

The `modules/` folder contains **presenters** that coordinate between game state and view components. This is NOT a duplication of other folders—each serves a distinct purpose.

## Architecture: Presenter Pattern

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           GAME STATE LAYER                              │
│                                                                         │
│  core/           - Constants, Logger, EventEmitter, StateManager        │
│  engine/         - GameEngine, PowerupSystem, PlayerPhysicsMixin        │
│  kkGameEngine    - Single facade for all blockchain interactions        │
│  integrity/      - IntegrityMonitor (anti-cheat)                        │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   PRESENTER LAYER     │
                    │   (modules/)          │
                    │                       │
                    │  Coordinates state    │
                    │  changes → view       │
                    │  updates              │
                    └───────────┬───────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│                            VIEW LAYER                                   │
│                                                                         │
│  renderer/       - Three.js views (SceneManager, PlayerModel, etc.)     │
│  ui/             - DOM views (MainMenu, LobbyUI, GameHUD, WalletHUD)    │
│  input/          - InputManager (raw keyboard/touch events)             │
└─────────────────────────────────────────────────────────────────────────┘
```

## Folder Breakdown

### `modules/session/`
**SessionController.js** - Orchestrates game session lifecycle
- Single/multiplayer session initialization
- DAA-based countdown management
- Block subscription for progress tracking
- VRF seed generation

**SessionState.js** - Internal state holder
- Game ID, player IDs
- DAA scores and countdown state
- Game progress and results

### `modules/ui/`
**HUDPresenter.js** - Bridge between game state and `ui/gameHud/GameHUD.js`
- Updates coin counts, progress bar, countdown
- Shows powerups, integrity shield state
- Handles game over display

**MenuPresenter.js** - Bridge between game state and `ui/MainMenu.js` / `ui/LobbyUI.js`
- Show/hide main menu and lobby UI
- Forward menu events to GameFacade
- Manage screen transitions

### `modules/renderer/`
**RenderPresenter.js** - Coordinates between engine and Three.js views
- Subscribes to SceneManager render callback
- Listens to GameEngine state and updates visuals
- Updates PlayerModel (lane, jump, duck)
- Updates TrackGenerator (scrolling)

### `modules/input/`
**PlayerController.js** - Connects InputManager to game actions
- Maps input events to game actions
- Applies actions to GameEngine
- Records moves via kkGameEngine
- Tracks optimistic updates

### `modules/lobby/`
**LobbyController.js** - Thin wrapper around kkGameEngine Lobby APIs
- Proxy to kkGameEngine lobby methods
- Wire lobby events to game-specific events
- Forward chat and game messages

## Why Not Just One Folder?

**Separation of Concerns:**

| Folder | Responsibility | Example |
|--------|----------------|---------|
| `renderer/` | THREE.js geometry, materials, animations | `PlayerModel.js` creates the 3D character mesh |
| `modules/renderer/` | When/how to update the 3D scene | `RenderPresenter.js` tells PlayerModel to change lanes |
| `ui/` | DOM elements, CSS, user interactions | `GameHUD.js` creates HUD elements |
| `modules/ui/` | When/what to show in the HUD | `HUDPresenter.js` tells GameHUD to update coin count |

**Benefits:**
- Views don't need to know about game logic
- Presenters can be tested without DOM/WebGL
- Easy to swap views (e.g., different themes)
- Clear dependency direction (state → presenter → view)

## Naming Clarification

| File | Purpose |
|------|---------|
| `engine/PlayerPhysicsMixin.js` | Physics calculations (jump height, gravity, lane switching) - Mixin for GameEngine |
| `modules/input/PlayerController.js` | Input → action mapping (keyboard W → jump action) - Class that wires input to engine |

## Import Pattern

```javascript
// From GameFacade or other orchestrators:
import { SessionController, SessionState } from './modules/session/index.js';
import { HUDPresenter, MenuPresenter } from './modules/ui/index.js';
import { RenderPresenter } from './modules/renderer/index.js';
import { PlayerController } from './modules/input/index.js';
import { LobbyController } from './modules/lobby/index.js';

// Or use the central export:
import { 
  SessionController, 
  HUDPresenter, 
  RenderPresenter,
  PlayerController 
} from './modules/index.js';
```
