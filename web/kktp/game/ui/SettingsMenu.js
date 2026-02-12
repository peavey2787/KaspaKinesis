/**
 * SettingsMenu.js - Audio settings overlay
 */

import { EventEmitter } from "../core/EventEmitter.js";
import { Logger } from "../core/Logger.js";
import { COLORS, AUDIO } from "../core/Constants.js";
import { createMenuButton } from "./gameHud/utils/buttonFactory.js";

const log = Logger.create("SettingsMenu");

export const SettingsMenuEvent = Object.freeze({
  CLOSE: "close",
  QUIT: "quit",
});

export class SettingsMenu extends EventEmitter {
  constructor(container) {
    super();

    this._container = container;
    this._element = null;
    this._audioManager = null;
    this._mode = "menu";
  }

  setAudioManager(audioManager) {
    this._audioManager = audioManager;
  }

  show(options = {}) {
    if (this._element) {
      this._element.remove();
      this._element = null;
    }

    this._mode = options.mode || "menu";

    this._element = document.createElement("div");
    this._element.style.cssText = `
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(6, 8, 16, 0.9);
      z-index: 120;
      opacity: 0;
      transition: opacity 0.25s ease;
      pointer-events: auto;
    `;

    const panel = document.createElement("div");
    panel.style.cssText = `
      width: min(90%, 420px);
      max-height: 90vh;
      overflow-y: auto;
      background: linear-gradient(180deg, rgba(12, 16, 32, 0.98), rgba(8, 10, 22, 0.98));
      border: 1px solid ${COLORS.UI_BORDER};
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
      border-radius: 10px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      color: ${COLORS.TEXT};
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    `;

    const title = document.createElement("div");
    title.textContent = "SETTINGS";
    title.style.cssText = `
      font-size: 1.4rem;
      font-weight: 700;
      color: ${COLORS.PRIMARY_HEX};
      text-align: center;
      letter-spacing: 0.2em;
    `;
    panel.appendChild(title);

    const sliders = document.createElement("div");
    sliders.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 16px;
    `;

    const sfxValue = Math.round(
      (this._audioManager?.sfxVolume ?? AUDIO.SFX_VOLUME) * 100,
    );
    const musicValue = Math.round(
      (this._audioManager?.musicVolume ?? AUDIO.MUSIC_VOLUME) * 100,
    );

    sliders.appendChild(
      this._createSlider("Sound Effects", sfxValue, (value) => {
        this._audioManager?.setSfxVolume(value / 100);
      }),
    );
    sliders.appendChild(
      this._createSlider("Background Music", musicValue, (value) => {
        this._audioManager?.setMusicVolume(value / 100);
      }),
    );

    panel.appendChild(sliders);

    // ── Node Connection section ──
    const nodeSection = document.createElement("div");
    nodeSection.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
      border-top: 1px solid ${COLORS.UI_BORDER};
      padding-top: 14px;
    `;

    const nodeTitle = document.createElement("div");
    nodeTitle.textContent = "NODE CONNECTION";
    nodeTitle.style.cssText = `
      font-size: 0.85rem;
      font-weight: 600;
      color: ${COLORS.PRIMARY_HEX};
      letter-spacing: 0.15em;
    `;
    nodeSection.appendChild(nodeTitle);

    const saved = JSON.parse(localStorage.getItem("ks-node-settings") || "{}");

    // Network ID dropdown
    nodeSection.appendChild(
      this._createDropdown("Network ID", [
        { value: "testnet-10", label: "testnet-10" },
        { value: "testnet-11", label: "testnet-11" },
        { value: "mainnet", label: "mainnet" },
      ], saved.networkId || "testnet-10", (value) => {
        this._saveNodeSetting("networkId", value);
      }),
    );

    // Custom IP:Port text input
    nodeSection.appendChild(
      this._createTextInput(
        "Custom Node (ip:port)",
        saved.rpcUrl || "",
        "e.g. 127.0.0.1:16210",
        (value) => {
          this._saveNodeSetting("rpcUrl", value.trim());
        },
      ),
    );

    const nodeHint = document.createElement("div");
    nodeHint.textContent = "Changes take effect on next app restart.";
    nodeHint.style.cssText = `
      font-size: 0.72rem;
      color: ${COLORS.TEXT_SECONDARY};
      opacity: 0.7;
      text-align: center;
    `;
    nodeSection.appendChild(nodeHint);

    const nodeDirectConnectHint = document.createElement("div");
    nodeDirectConnectHint.textContent =
      "For direct connection: host this web app locally for LAN use, or open/forward your node port and enter your public IP.";
    nodeDirectConnectHint.style.cssText = `
      font-size: 0.72rem;
      color: ${COLORS.TEXT_SECONDARY};
      opacity: 0.7;
      text-align: center;
      line-height: 1.35;
    `;
    nodeSection.appendChild(nodeDirectConnectHint);

    panel.appendChild(nodeSection);

    const buttons = document.createElement("div");
    buttons.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 6px;
    `;

    if (this._mode === "game") {
      const returnBtn = createMenuButton("RETURN TO GAME", COLORS.PRIMARY_HEX);
      returnBtn.addEventListener("click", () => {
        this.emit(SettingsMenuEvent.CLOSE, { mode: this._mode });
      });
      buttons.appendChild(returnBtn);

      const quitBtn = createMenuButton("QUIT TO MAIN MENU", COLORS.INTEGRITY_RED);
      quitBtn.addEventListener("click", () => {
        this.emit(SettingsMenuEvent.QUIT, { mode: this._mode });
      });
      buttons.appendChild(quitBtn);
    } else {
      const backBtn = createMenuButton("BACK", COLORS.PRIMARY_HEX);
      backBtn.addEventListener("click", () => {
        this.emit(SettingsMenuEvent.CLOSE, { mode: this._mode });
      });
      buttons.appendChild(backBtn);
    }

    panel.appendChild(buttons);
    this._element.appendChild(panel);
    this._container.appendChild(this._element);

    requestAnimationFrame(() => {
      if (this._element) {
        this._element.style.opacity = "1";
      }
    });

    log.info("Settings menu shown", { mode: this._mode });
  }

  hide() {
    if (!this._element) return;

    this._element.style.opacity = "0";
    setTimeout(() => {
      this._element?.remove();
      this._element = null;
    }, 200);
  }

  _createSlider(labelText, value, onChange) {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
    `;

    const labelRow = document.createElement("div");
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      color: ${COLORS.TEXT_SECONDARY};
    `;

    const label = document.createElement("span");
    label.textContent = labelText;

    const valueLabel = document.createElement("span");
    valueLabel.textContent = `${value}%`;

    labelRow.appendChild(label);
    labelRow.appendChild(valueLabel);

    const input = document.createElement("input");
    input.type = "range";
    input.min = "0";
    input.max = "100";
    input.step = "1";
    input.value = `${value}`;
    input.style.cssText = `
      width: 100%;
      accent-color: ${COLORS.PRIMARY_HEX};
    `;

    input.addEventListener("input", () => {
      const nextValue = Number.parseInt(input.value, 10) || 0;
      valueLabel.textContent = `${nextValue}%`;
      onChange?.(nextValue);
    });

    wrapper.appendChild(labelRow);
    wrapper.appendChild(input);

    return wrapper;
  }

  _createDropdown(labelText, options, currentValue, onChange) {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
    `;

    const label = document.createElement("label");
    label.textContent = labelText;
    label.style.cssText = `
      font-size: 0.85rem;
      color: ${COLORS.TEXT_SECONDARY};
    `;

    const select = document.createElement("select");
    select.style.cssText = `
      width: 100%;
      padding: 8px 10px;
      background: rgba(12, 16, 32, 0.95);
      color: ${COLORS.TEXT};
      border: 1px solid ${COLORS.UI_BORDER};
      border-radius: 6px;
      font-size: 0.85rem;
      font-family: inherit;
      outline: none;
      cursor: pointer;
      appearance: auto;
    `;

    for (const opt of options) {
      const optEl = document.createElement("option");
      optEl.value = opt.value;
      optEl.textContent = opt.label;
      if (opt.value === currentValue) optEl.selected = true;
      select.appendChild(optEl);
    }

    select.addEventListener("change", () => onChange?.(select.value));

    wrapper.appendChild(label);
    wrapper.appendChild(select);
    return wrapper;
  }

  _createTextInput(labelText, currentValue, placeholder, onChange) {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
    `;

    const label = document.createElement("label");
    label.textContent = labelText;
    label.style.cssText = `
      font-size: 0.85rem;
      color: ${COLORS.TEXT_SECONDARY};
    `;

    const input = document.createElement("input");
    input.type = "text";
    input.value = currentValue;
    input.placeholder = placeholder;
    input.style.cssText = `
      width: 100%;
      padding: 8px 10px;
      background: rgba(12, 16, 32, 0.95);
      color: ${COLORS.TEXT};
      border: 1px solid ${COLORS.UI_BORDER};
      border-radius: 6px;
      font-size: 0.85rem;
      font-family: inherit;
      outline: none;
      box-sizing: border-box;
    `;
    input.addEventListener("focus", () => {
      input.style.borderColor = COLORS.PRIMARY_HEX;
    });
    input.addEventListener("blur", () => {
      input.style.borderColor = COLORS.UI_BORDER;
      onChange?.(input.value);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        input.blur();
      }
    });

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    return wrapper;
  }

  _saveNodeSetting(key, value) {
    const settings = JSON.parse(localStorage.getItem("ks-node-settings") || "{}");
    if (value) {
      settings[key] = value;
    } else {
      delete settings[key];
    }
    localStorage.setItem("ks-node-settings", JSON.stringify(settings));
    log.info("Node setting saved", { key, value });
  }

  destroy() {
    this.hide();
    this._audioManager = null;
    this.removeAllListeners();
  }
}

export default SettingsMenu;
