/**
 * Logger.js - Lightweight logger for game modules
 */

export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

let currentLevel = LogLevel.INFO;
let verboseMode = false;

class LoggerInstance {
  constructor(name) {
    this._name = name;
  }

  _prefix(level) {
    return `[${level}] ${this._name}:`;
  }

  _shouldLog(level) {
    return level >= currentLevel;
  }

  debug(...args) {
    if (this._shouldLog(LogLevel.DEBUG)) {
      console.debug(this._prefix("DEBUG"), ...args);
    }
  }

  info(...args) {
    if (this._shouldLog(LogLevel.INFO)) {
      console.info(this._prefix("INFO"), ...args);
    }
  }

  warn(...args) {
    if (this._shouldLog(LogLevel.WARN)) {
      console.warn(this._prefix("WARN"), ...args);
    }
  }

  error(...args) {
    console.error(this._prefix("ERROR"), ...args);
  }

  trace(...args) {
    if (verboseMode) {
      console.trace(this._prefix("TRACE"), ...args);
    }
  }
}

export class Logger {
  static create(name = "Game") {
    return new LoggerInstance(name);
  }

  static setLevel(level) {
    currentLevel = level;
  }

  static setVerbose(verbose) {
    verboseMode = verbose;
  }

  static setupHighFidelity() {
    currentLevel = LogLevel.DEBUG;
    verboseMode = true;
  }
}

export default Logger;
