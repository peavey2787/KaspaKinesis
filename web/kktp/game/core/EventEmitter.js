/**
 * EventEmitter.js - Lightweight event emitter for game modules
 */

export class EventEmitter {
  constructor() {
    this._listeners = new Map();
  }

  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);
    return this;
  }

  once(event, handler) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      handler(...args);
    };
    return this.on(event, wrapper);
  }

  off(event, handler) {
    const handlers = this._listeners.get(event);
    if (!handlers) {
      return this;
    }
    if (handler) {
      handlers.delete(handler);
    } else {
      handlers.clear();
    }
    if (handlers.size === 0) {
      this._listeners.delete(event);
    }
    return this;
  }

  emit(event, ...args) {
    const handlers = this._listeners.get(event);
    if (!handlers) {
      return false;
    }
    for (const handler of [...handlers]) {
      try {
        handler(...args);
      } catch (err) {
        console.error("EventEmitter handler error", err);
      }
    }
    return true;
  }

  removeAllListeners() {
    this._listeners.clear();
  }
}

export default EventEmitter;
