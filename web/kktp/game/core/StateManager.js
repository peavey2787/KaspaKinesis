/**
 * StateManager.js - Global UI state management for DAG Dasher
 */
import { EventEmitter } from './EventEmitter.js';

/**
 * UI states for global state tracking
 */
export const UIState = {
  MENU: 'menu',
  LOBBY: 'lobby',
  GAME: 'game',
  AUDIT: 'audit',
};

/**
 * Global state singleton
 */
class GlobalState extends EventEmitter {
  constructor() {
    super();
    this._uiState = UIState.MENU;
    this._gameState = {};
    this._optimistic = new Map();
  }

  get uiState() {
    return this._uiState;
  }

  set uiState(state) {
    if (this._uiState !== state) {
      const prev = this._uiState;
      this._uiState = state;
      this.emit('uiStateChanged', { prev, current: state });
    }
  }

  resetGameState() {
    this._gameState = {};
    this.emit('gameStateReset');
  }

  setGameData(key, value) {
    this._gameState[key] = value;
  }

  getGameData(key) {
    return this._gameState[key];
  }

  optimistic(id, payload) {
    if (!id) {
      return {
        confirm() {},
        rollback() {},
      };
    }

    this._optimistic.set(id, {
      payload,
      createdAt: Date.now(),
    });
    this.emit("optimisticAdded", { id, payload });

    const finalize = (event) => {
      if (!this._optimistic.has(id)) {
        return;
      }
      this._optimistic.delete(id);
      this.emit(event, { id });
    };

    return {
      confirm: () => finalize("optimisticConfirmed"),
      rollback: () => finalize("optimisticRolledBack"),
    };
  }
}

export const globalState = new GlobalState();
export default globalState;
