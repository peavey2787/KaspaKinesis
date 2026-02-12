/**
 * AudioManager.js - Web Audio API sound system for DAG Dasher
 * 
 * Features:
 * - Synthesized sound effects (no external files)
 * - Dynamic synthwave background music
 * - Spatial audio for obstacles
 * - Volume control and muting
 */

import { EventEmitter } from '../core/EventEmitter.js';
import { Logger } from '../core/Logger.js';
import { AUDIO } from '../constants/constants.js';

const log = Logger.create('AudioManager');

const AUDIO_STORAGE_KEYS = {
  SFX: "kaspaSurfer.audio.sfxVolume",
  MUSIC: "kaspaSurfer.audio.musicVolume",
};

export class AudioManager extends EventEmitter {
  constructor() {
    super();
    
    this._context = null;
    this._masterGain = null;
    this._sfxGain = null;
    this._musicGain = null;
    
    this._enabled = false;
    this._muted = false;
    this._musicPlaying = false;
    this._musicNodes = [];
    this._musicInterval = null;
    
    this._masterVolume = AUDIO.MASTER_VOLUME;
    this._sfxVolume = AUDIO.SFX_VOLUME;
    this._musicVolume = AUDIO.MUSIC_VOLUME;

    this._loadPersistedVolumes();
    
    // Speed multiplier for dynamic music
    this._speedMultiplier = 1;
    
    // MP3 music support
    this._musicBuffer = null;
    this._musicSource = null;
    this._musicLoaded = false;
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  async init() {
    if (this._context) return;
    
    try {
      this._context = new (window.AudioContext || window.webkitAudioContext)();
      
      // Master gain
      this._masterGain = this._context.createGain();
      this._masterGain.gain.value = this._masterVolume;
      this._masterGain.connect(this._context.destination);
      
      // SFX gain
      this._sfxGain = this._context.createGain();
      this._sfxGain.gain.value = this._sfxVolume;
      this._sfxGain.connect(this._masterGain);
      
      // Music gain
      this._musicGain = this._context.createGain();
      this._musicGain.gain.value = this._musicVolume;
      this._musicGain.connect(this._masterGain);
      
      this._enabled = true;
      log.info('Audio initialized');
    } catch (e) {
      log.error('Failed to initialize audio:', e);
    }
  }

  /**
   * Resume audio context (required after user gesture)
   */
  async resume() {
    if (this._context?.state === 'suspended') {
      await this._context.resume();
      log.debug('Audio context resumed');
    }
  }

  /**
   * Check if audio is enabled
   */
  get enabled() {
    return this._enabled && this._context?.state === 'running';
  }

  /**
   * Set master volume
   * @param {number} value - 0 to 1
   */
  setMasterVolume(value) {
    this._masterVolume = Math.max(0, Math.min(1, value));
    if (this._masterGain) {
      this._masterGain.gain.setValueAtTime(this._masterVolume, this._context.currentTime);
    }
  }

  /**
   * Set SFX volume
   * @param {number} value - 0 to 1
   */
  setSfxVolume(value) {
    this._sfxVolume = Math.max(0, Math.min(1, value));
    if (this._sfxGain) {
      this._sfxGain.gain.setValueAtTime(this._sfxVolume, this._context.currentTime);
    }
    this._persistVolume(AUDIO_STORAGE_KEYS.SFX, this._sfxVolume);
  }

  get sfxVolume() {
    return this._sfxVolume;
  }

  /**
   * Set music volume
   * @param {number} value - 0 to 1
   */
  setMusicVolume(value) {
    this._musicVolume = Math.max(0, Math.min(1, value));
    if (this._musicGain) {
      this._musicGain.gain.setValueAtTime(this._musicVolume, this._context.currentTime);
    }
    this._persistVolume(AUDIO_STORAGE_KEYS.MUSIC, this._musicVolume);
  }

  get musicVolume() {
    return this._musicVolume;
  }

  _loadPersistedVolumes() {
    const sfx = this._readStoredVolume(AUDIO_STORAGE_KEYS.SFX, this._sfxVolume);
    const music = this._readStoredVolume(
      AUDIO_STORAGE_KEYS.MUSIC,
      this._musicVolume,
    );

    this._sfxVolume = sfx;
    this._musicVolume = music;
  }

  _readStoredVolume(key, fallback) {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return fallback;
      }
      const raw = window.localStorage.getItem(key);
      if (raw === null) {
        return fallback;
      }
      const value = Number.parseFloat(raw);
      if (!Number.isFinite(value)) {
        return fallback;
      }
      return Math.max(0, Math.min(1, value));
    } catch (err) {
      return fallback;
    }
  }

  _persistVolume(key, value) {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return;
      }
      window.localStorage.setItem(key, String(value));
    } catch (err) {
      // Ignore storage failures.
    }
  }

  /**
   * Mute all audio
   */
  mute() {
    this._muted = true;
    if (this._masterGain) {
      this._masterGain.gain.setValueAtTime(0, this._context.currentTime);
    }
  }

  /**
   * Unmute audio
   */
  unmute() {
    this._muted = false;
    if (this._masterGain) {
      this._masterGain.gain.setValueAtTime(this._masterVolume, this._context.currentTime);
    }
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    if (this._muted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this._muted;
  }

  get isMuted() {
    return this._muted;
  }

  // ─── Sound Effects ─────────────────────────────────────────────

  /**
   * Play coin collect sound
   */
  playCoinCollect() {
    if (!this.enabled) return;
    
    const now = this._context.currentTime;
    const duration = AUDIO.COIN_DURATION;
    
    // Quick arpeggio
    AUDIO.COIN_FREQ.forEach((freq, i) => {
      const osc = this._context.createOscillator();
      const gain = this._context.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0.3, now + i * 0.03);
      gain.gain.exponentialDecayTo?.(0.01, now + i * 0.03 + duration) ||
        gain.gain.setTargetAtTime(0.01, now + i * 0.03, duration / 3);
      
      osc.connect(gain);
      gain.connect(this._sfxGain);
      
      osc.start(now + i * 0.03);
      osc.stop(now + i * 0.03 + duration);
    });
  }

  /**
   * Play collision sound
   */
  playCollision() {
    if (!this.enabled) return;
    
    const now = this._context.currentTime;
    const duration = AUDIO.COLLISION_DURATION;
    
    // Bass thud
    const osc = this._context.createOscillator();
    const gain = this._context.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(AUDIO.COLLISION_FREQ, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + duration);
    
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    osc.connect(gain);
    gain.connect(this._sfxGain);
    
    osc.start(now);
    osc.stop(now + duration);
    
    // Add noise burst
    const noise = this._createNoise(duration * 0.5);
    const noiseGain = this._context.createGain();
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.5);
    
    noise.connect(noiseGain);
    noiseGain.connect(this._sfxGain);
    
    noise.start(now);
    noise.stop(now + duration * 0.5);
  }

  /**
   * Play powerup collect sound
   */
  playPowerup() {
    if (!this.enabled) return;
    
    const now = this._context.currentTime;
    const duration = AUDIO.POWERUP_DURATION;
    
    // Rising chord
    AUDIO.POWERUP_FREQ.forEach((freq, i) => {
      const osc = this._context.createOscillator();
      const gain = this._context.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 0.5, now + i * 0.1);
      osc.frequency.exponentialRampToValueAtTime(freq, now + i * 0.1 + 0.1);
      
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.1 + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + i * 0.1 + duration);
      
      osc.connect(gain);
      gain.connect(this._sfxGain);
      
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + duration);
    });
  }

  /**
   * Play powerdown sound
   */
  playPowerdown() {
    if (!this.enabled) return;
    
    const now = this._context.currentTime;
    const duration = AUDIO.POWERUP_DURATION;
    
    // Descending minor
    AUDIO.POWERDOWN_FREQ.forEach((freq, i) => {
      const osc = this._context.createOscillator();
      const gain = this._context.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + i * 0.15 + duration);
      
      gain.gain.setValueAtTime(0.15, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0, now + i * 0.15 + duration);
      
      // Low-pass filter for murky sound
      const filter = this._context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this._sfxGain);
      
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + duration);
    });
  }

  /**
   * Play jump sound
   */
  playJump() {
    if (!this.enabled) return;
    
    const now = this._context.currentTime;
    
    const osc = this._context.createOscillator();
    const gain = this._context.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(AUDIO.JUMP_FREQ[0], now);
    osc.frequency.exponentialRampToValueAtTime(AUDIO.JUMP_FREQ[1], now + 0.1);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.connect(gain);
    gain.connect(this._sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Play lane switch sound
   */
  playLaneSwitch() {
    if (!this.enabled) return;
    
    const now = this._context.currentTime;
    
    const osc = this._context.createOscillator();
    const gain = this._context.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = 660;
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    
    osc.connect(gain);
    gain.connect(this._sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Play countdown tick sound (3, 2, 1)
   * @param {number} value - Countdown value (3, 2, 1) - higher pitch for lower numbers
   */
  playCountdownTick(value = 3) {
    if (!this.enabled) return;
    
    const now = this._context.currentTime;
    
    // Higher pitch as countdown gets lower (builds anticipation)
    const baseFreq = 440; // A4
    const freq = baseFreq * (1 + (4 - value) * 0.25); // 440, 550, 660 Hz
    
    // Main tick tone
    const osc = this._context.createOscillator();
    const gain = this._context.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    osc.connect(gain);
    gain.connect(this._sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.2);
    
    // Add a subtle harmonic
    const osc2 = this._context.createOscillator();
    const gain2 = this._context.createGain();
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, now);
    
    gain2.gain.setValueAtTime(0.15, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc2.connect(gain2);
    gain2.connect(this._sfxGain);
    
    osc2.start(now);
    osc2.stop(now + 0.15);
  }

  /**
   * Play countdown GO sound (triumphant chord)
   */
  playCountdownGo() {
    if (!this.enabled) return;
    
    const now = this._context.currentTime;
    const duration = 0.4;
    
    // Triumphant major chord: C5, E5, G5
    const frequencies = [523.25, 659.25, 783.99];
    
    frequencies.forEach((freq, i) => {
      const osc = this._context.createOscillator();
      const gain = this._context.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      
      // Stagger entry slightly for rich chord
      const delay = i * 0.02;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + delay + 0.03);
      gain.gain.setValueAtTime(0.25, now + delay + duration * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + duration);
      
      osc.connect(gain);
      gain.connect(this._sfxGain);
      
      osc.start(now + delay);
      osc.stop(now + delay + duration);
    });
    
    // Add a bright sweep
    const sweepOsc = this._context.createOscillator();
    const sweepGain = this._context.createGain();
    
    sweepOsc.type = 'sawtooth';
    sweepOsc.frequency.setValueAtTime(800, now);
    sweepOsc.frequency.exponentialRampToValueAtTime(2000, now + 0.15);
    
    sweepGain.gain.setValueAtTime(0.1, now);
    sweepGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    // Low-pass filter for smoother sweep
    const filter = this._context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3000;
    
    sweepOsc.connect(filter);
    filter.connect(sweepGain);
    sweepGain.connect(this._sfxGain);
    
    sweepOsc.start(now);
    sweepOsc.stop(now + 0.15);
  }

  // ─── Music ─────────────────────────────────────────────────────

  /**
   * Load background music MP3
   */
  async loadMusic() {
    if (this._musicLoaded || !this._context) return;
    
    try {
      const response = await fetch('./assets/audio/mind-on-my-kaspa.mp3');
      const arrayBuffer = await response.arrayBuffer();
      this._musicBuffer = await this._context.decodeAudioData(arrayBuffer);
      this._musicLoaded = true;
      log.info('Background music loaded: mind-on-my-kaspa.mp3');
    } catch (e) {
      log.error('Failed to load background music:', e);
      // Fall back to synthesized music
      this._musicLoaded = false;
    }
  }

  /**
   * Start background music
   */
  startMusic() {
    if (!this.enabled || this._musicPlaying) return;
    
    this._musicPlaying = true;
    
    // Use MP3 if loaded, otherwise fall back to synthesized
    if (this._musicLoaded && this._musicBuffer) {
      this._playMusicMP3();
    } else {
      this._playMusicLoop();
    }
    
    log.info('Music started');
  }

  /**
   * Play MP3 background music (loops)
   */
  _playMusicMP3() {
    if (!this._musicBuffer || !this.enabled) return;
    
    // Stop existing source if any
    if (this._musicSource) {
      try {
        this._musicSource.stop();
      } catch (e) { /* already stopped */ }
    }
    
    // Create new source node
    this._musicSource = this._context.createBufferSource();
    this._musicSource.buffer = this._musicBuffer;
    this._musicSource.loop = true;
    this._musicSource.connect(this._musicGain);
    this._musicSource.start();
    
    log.debug('MP3 music playback started');
  }

  /**
   * Stop background music
   * FIXED: Disconnect and clear ALL music nodes to prevent memory leak
   */
  stopMusic() {
    this._musicPlaying = false;
    
    // Stop MP3 source if playing
    if (this._musicSource) {
      try {
        this._musicSource.stop();
        this._musicSource.disconnect();
      } catch (e) { /* already stopped */ }
      this._musicSource = null;
    }
    
    // Stop AND disconnect all synthesized music nodes
    // This is critical - stopped nodes still hold references until disconnected
    const nodesToClean = this._musicNodes;
    this._musicNodes = []; // Reassign to new array immediately
    
    for (const node of nodesToClean) {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) { /* already stopped/disconnected */ }
    }
    
    if (this._musicInterval) {
      clearInterval(this._musicInterval);
      this._musicInterval = null;
    }
    
    log.info('Music stopped (all nodes disconnected)');
  }

  /**
   * Set speed multiplier for dynamic music intensity
   * @param {number} multiplier - Speed factor (1 = normal)
   */
  setSpeedMultiplier(multiplier) {
    this._speedMultiplier = multiplier;
  }

  _playMusicLoop() {
    if (!this._musicPlaying || !this.enabled) return;
    
    const bpm = AUDIO.MUSIC_BPM * this._speedMultiplier;
    const beatDuration = 60 / bpm;
    const barDuration = beatDuration * 4;
    
    // Schedule a bar of music
    this._playMusicBar(barDuration);
    
    // Schedule next bar
    this._musicInterval = setTimeout(() => {
      this._playMusicLoop();
    }, barDuration * 1000 * 0.95); // Slight overlap
  }

  _playMusicBar(barDuration) {
    const now = this._context.currentTime;
    const beatDuration = barDuration / 4;
    
    // Bass line (simple pattern)
    const bassNotes = [65.41, 65.41, 82.41, 73.42]; // C2, C2, E2, D2
    bassNotes.forEach((freq, i) => {
      this._playNote(freq, 'sawtooth', now + i * beatDuration, beatDuration * 0.8, 0.15, this._musicGain);
    });
    
    // Kick drum on beats
    for (let i = 0; i < 4; i++) {
      this._playKick(now + i * beatDuration);
    }
    
    // Hi-hat on off-beats
    for (let i = 0; i < 8; i++) {
      this._playHiHat(now + i * beatDuration * 0.5);
    }
    
    // Synth pad (sustained chord)
    const padFreqs = [130.81, 164.81, 196]; // C3, E3, G3
    padFreqs.forEach(freq => {
      this._playPad(freq, now, barDuration, 0.05);
    });
  }

  _playNote(freq, type, startTime, duration, volume, destination) {
    const osc = this._context.createOscillator();
    const gain = this._context.createGain();
    const filter = this._context.createBiquadFilter();
    
    osc.type = type;
    osc.frequency.value = freq;
    
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.setValueAtTime(volume, startTime + duration * 0.7);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
    
    this._musicNodes.push(osc);
  }

  _playKick(startTime) {
    const osc = this._context.createOscillator();
    const gain = this._context.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, startTime);
    osc.frequency.exponentialRampToValueAtTime(30, startTime + 0.1);
    
    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this._musicGain);
    
    osc.start(startTime);
    osc.stop(startTime + 0.15);
    
    this._musicNodes.push(osc);
  }

  _playHiHat(startTime) {
    const noise = this._createNoise(0.05);
    const gain = this._context.createGain();
    const filter = this._context.createBiquadFilter();
    
    filter.type = 'highpass';
    filter.frequency.value = 8000;
    
    gain.gain.setValueAtTime(0.08, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this._musicGain);
    
    noise.start(startTime);
    noise.stop(startTime + 0.05);
    
    this._musicNodes.push(noise);
  }

  _playPad(freq, startTime, duration, volume) {
    const osc = this._context.createOscillator();
    const gain = this._context.createGain();
    const filter = this._context.createBiquadFilter();
    
    osc.type = 'sine';
    osc.frequency.value = freq;
    
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + duration * 0.3);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this._musicGain);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
    
    this._musicNodes.push(osc);
  }

  _createNoise(duration) {
    const bufferSize = this._context.sampleRate * duration;
    const buffer = this._context.createBuffer(1, bufferSize, this._context.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const source = this._context.createBufferSource();
    source.buffer = buffer;
    return source;
  }

  /**
   * Clean up - FIXED: comprehensive disposal to prevent memory leaks
   */
  destroy() {
    this.stopMusic();
    
    // Clear music interval
    if (this._musicInterval) {
      clearInterval(this._musicInterval);
      this._musicInterval = null;
    }
    
    // Disconnect and clear music nodes
    for (const node of this._musicNodes) {
      try {
        node.disconnect();
        if (node.stop) node.stop();
      } catch (e) { /* ignore - may already be stopped */ }
    }
    this._musicNodes = [];
    
    // Clear music source
    if (this._musicSource) {
      try {
        this._musicSource.stop();
        this._musicSource.disconnect();
      } catch (e) { /* ignore */ }
      this._musicSource = null;
    }
    
    // Clear audio buffer (can be large - 10MB+)
    this._musicBuffer = null;
    
    // Disconnect gain nodes
    if (this._sfxGain) {
      try { this._sfxGain.disconnect(); } catch (e) {}
      this._sfxGain = null;
    }
    if (this._musicGain) {
      try { this._musicGain.disconnect(); } catch (e) {}
      this._musicGain = null;
    }
    if (this._masterGain) {
      try { this._masterGain.disconnect(); } catch (e) {}
      this._masterGain = null;
    }
    
    // Close audio context (releases system resources)
    if (this._context && this._context.state !== 'closed') {
      this._context.close().catch(() => {});
      this._context = null;
    }
    
    this._enabled = false;
    this._musicPlaying = false;
    this._musicLoaded = false;
    
    // Reset singleton so next getAudioManager() creates fresh instance
    instance = null;
    
    // Clear event listeners
    this.removeAllListeners();
    
    log.info('AudioManager destroyed with full cleanup');
  }
}

/**
 * Singleton instance
 */
let instance = null;

export function getAudioManager() {
  if (!instance) {
    instance = new AudioManager();
  }
  return instance;
}

export default AudioManager;
