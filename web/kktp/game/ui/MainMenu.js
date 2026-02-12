/**
 * MainMenu.js - Main menu UI component
 * 
 * Features:
 * - Single player / Multiplayer selection
 * - Settings access
 * - Cyberpunk styled buttons
 * - Kaspa branding
 */

import { EventEmitter } from '../core/EventEmitter.js';
import { Logger } from '../core/Logger.js';
import { COLORS, UI } from '../core/Constants.js';

const log = Logger.create('MainMenu');

export const MenuEvent = {
  SINGLE_PLAYER: 'singlePlayer',
  MULTIPLAYER: 'multiplayer',
  SETTINGS: 'settings',
  QUIT: 'quit'
};

export class MainMenu extends EventEmitter {
  constructor(container) {
    super();
    
    this._container = container;
    this._element = null;
    this._visible = false;
  }

  /**
   * Show the main menu
   */
  show() {
    if (this._visible) return;
    
    this._createElement();
    this._container.appendChild(this._element);
    this._visible = true;
    
    // Fade in
    requestAnimationFrame(() => {
      this._element.style.opacity = '1';
    });
    
    log.info('Main menu shown');
  }

  /**
   * Hide the main menu
   */
  hide() {
    if (!this._visible || !this._element) return;
    
    // Immediately disable pointer events so canvas is accessible
    this._element.style.pointerEvents = 'none';
    this._element.style.opacity = '0';
    
    setTimeout(() => {
      if (this._element && this._element.parentNode) {
        this._element.parentNode.removeChild(this._element);
      }
      this._element = null;
      this._visible = false;
    }, 300);
    
    log.info('Main menu hidden');
  }

  get isVisible() {
    return this._visible;
  }

  _createElement() {
    this._element = document.createElement('div');
    this._element.className = 'ks-main-menu';
    this._element.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(180deg, 
        rgba(10, 10, 20, 0.95) 0%, 
        rgba(20, 10, 30, 0.98) 100%);
      z-index: 100;
      opacity: 0;
      transition: opacity 0.3s ease;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      pointer-events: auto;
      overflow-y: auto;
      overflow-x: hidden;
    `;
    
    // Logo/Title
    const logo = document.createElement('div');
    logo.className = 'ks-logo';
    logo.innerHTML = `
      <div style="
        font-size: clamp(2rem, 8vw, 4rem);
        font-weight: bold;
        background: linear-gradient(135deg, ${COLORS.PRIMARY_HEX} 0%, ${COLORS.ACCENT_HEX} 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 0 30px ${COLORS.PRIMARY_HEX}40;
        margin-bottom: 0.5rem;
      ">DAG Dasher</div>
      <div style="
        font-size: clamp(0.8rem, 2vw, 1rem);
        color: ${COLORS.TEXT_SECONDARY};
        letter-spacing: 0.3em;
        text-transform: uppercase;
      ">BlockDAG Anti-Cheat Gaming</div>
    `;
    logo.style.cssText = `
      text-align: center;
      margin-bottom: clamp(1rem, 4vh, 3rem);
      pointer-events: none;
      flex-shrink: 0;
    `;

    // Menu buttons container
    const buttons = document.createElement('div');
    buttons.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: min(90%, 300px);
      pointer-events: auto;
      flex-shrink: 0;
    `;

    // Single Player button
    const singleBtn = this._createButton('SINGLE PLAYER', COLORS.PRIMARY_HEX);
    singleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      log.debug('Single player button clicked');
      this.emit(MenuEvent.SINGLE_PLAYER);
    });
    buttons.appendChild(singleBtn);
    
    // Multiplayer button
    const multiBtn = this._createButton('MULTIPLAYER', COLORS.ACCENT_HEX);
    multiBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      log.debug('Multiplayer button clicked');
      this.emit(MenuEvent.MULTIPLAYER);
    });
    buttons.appendChild(multiBtn);
    
    // Settings button
    const settingsBtn = this._createButton('SETTINGS', COLORS.TEXT_SECONDARY);
    settingsBtn.style.marginTop = '1rem';
    settingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      log.debug('Settings button clicked');
      this.emit(MenuEvent.SETTINGS);
    });
    buttons.appendChild(settingsBtn);

    // Wrapper that holds everything in a single flex column — no absolute positioning
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100%;
      width: 100%;
      padding: clamp(1rem, 3vh, 2rem) 1rem;
      gap: clamp(1rem, 3vh, 2rem);
    `;

    wrapper.appendChild(logo);
    wrapper.appendChild(buttons);

    // Logo container (no longer absolutely positioned)
    const logoContainer = document.createElement('div');
    logoContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      pointer-events: none;
      margin-top: clamp(1rem, 3vh, 2rem);
      flex-shrink: 0;
    `;
    
    // Powered by Kaspa logo (much larger for readability)
    const poweredLogo = document.createElement('img');
    poweredLogo.src = 'assets/images/powered-by-kas.jpg';
    poweredLogo.alt = 'Powered by Kaspa';
    poweredLogo.style.cssText = `
      height: clamp(100px, 25vw, 150px);
      width: auto;
      opacity: 0.9;
      border-radius: 8px;
      filter: drop-shadow(0 0 12px ${COLORS.PRIMARY_HEX}60);
    `;
    logoContainer.appendChild(poweredLogo);
    
    // Bottom row with KKTP and Kaspa logos
    const logoRow = document.createElement('div');
    logoRow.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1.5rem;
    `;
    
    // KKTP logo (circle)
    const kktpLogo = document.createElement('img');
    kktpLogo.src = 'assets/images/kktp-logo-circle.png';
    kktpLogo.alt = 'KKTP Protocol';
    kktpLogo.style.cssText = `
      height: 48px;
      width: auto;
      opacity: 0.85;
      filter: drop-shadow(0 0 8px ${COLORS.PRIMARY_HEX}40);
    `;
    logoRow.appendChild(kktpLogo);
    
    // Kaspa logo (vibrant) - slightly larger
    const kaspaLogo = document.createElement('img');
    kaspaLogo.src = 'assets/images/kaspa-logo-vibrant.webp';
    kaspaLogo.alt = 'Kaspa';
    kaspaLogo.style.cssText = `
      height: clamp(50px, 14vw, 65px);
      width: auto;
      opacity: 0.85;
      filter: drop-shadow(0 0 10px ${COLORS.ACCENT_HEX}50);
    `;
    logoRow.appendChild(kaspaLogo);
    
    logoContainer.appendChild(logoRow);
    wrapper.appendChild(logoContainer);
    
    // Version / Credits
    const footer = document.createElement('div');
    footer.style.cssText = `
      text-align: center;
      color: ${COLORS.TEXT_SECONDARY};
      font-size: 0.75rem;
      opacity: 0.6;
      pointer-events: none;
      flex-shrink: 0;
      padding-bottom: 0.5rem;
    `;
    footer.innerHTML = `
      Built on Kaspa • ꓘK Kaspa Kinesis • v1.0.0
    `;
    wrapper.appendChild(footer);

    this._element.appendChild(wrapper);
  }

  _createButton(text, color) {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = 'ks-menu-button';
    button.style.cssText = `
      padding: 1rem 2rem;
      font-size: clamp(0.9rem, 2.5vw, 1.1rem);
      font-weight: bold;
      letter-spacing: 0.1em;
      color: ${COLORS.TEXT};
      background: transparent;
      border: 2px solid ${color};
      border-radius: 4px;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: all 0.2s ease;
      text-transform: uppercase;
      touch-action: manipulation;
      -webkit-tap-highlight-color: rgba(0, 217, 255, 0.3);
      -webkit-appearance: none;
      appearance: none;
      user-select: none;
      pointer-events: auto;
    `;
    
    // Unified style functions
    const activateStyle = () => {
      button.style.background = `${color}20`;
      button.style.boxShadow = `0 0 20px ${color}40, inset 0 0 20px ${color}10`;
      button.style.transform = 'scale(1.02)';
    };
    
    const deactivateStyle = () => {
      button.style.background = 'transparent';
      button.style.boxShadow = 'none';
      button.style.transform = 'scale(1)';
    };
    
    const pressStyle = () => {
      button.style.transform = 'scale(0.98)';
    };
    
    // Mouse events
    button.addEventListener('mouseenter', activateStyle);
    button.addEventListener('mouseleave', deactivateStyle);
    button.addEventListener('mousedown', pressStyle);
    button.addEventListener('mouseup', activateStyle);
    
    // Touch events - passive for better performance
    button.addEventListener('touchstart', (e) => {
      activateStyle();
      pressStyle();
    }, { passive: true });
    
    button.addEventListener('touchend', (e) => {
      deactivateStyle();
    }, { passive: true });
    
    button.addEventListener('touchcancel', (e) => {
      deactivateStyle();
    }, { passive: true });
    
    return button;
  }

  /**
   * Clean up
   */
  destroy() {
    this.hide();
    this.removeAllListeners();
    log.info('MainMenu destroyed');
  }
}

export default MainMenu;
