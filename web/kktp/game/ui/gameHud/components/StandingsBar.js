/**
 * StandingsBar.js - Left-side racing leaderboard
 */

import { COLORS } from "../../../core/Constants.js";
import { HUD_LAYOUT } from "../constants.js";

export class StandingsBar {
  constructor() {
    this._element = null;
    this._list = null;
  }

  create() {
    this._element = document.createElement("div");
    this._element.className = "ks-standings-panel";
    this._element.style.cssText = `
      position: absolute;
      top: ${HUD_LAYOUT.STANDINGS_TOP}px;
      left: ${HUD_LAYOUT.STANDINGS_LEFT}px;
      width: ${HUD_LAYOUT.STANDINGS_WIDTH};
      display: flex;
      flex-direction: column;
      gap: ${HUD_LAYOUT.ELEMENT_GAP}px;
      padding: 12px;
      background: rgba(10, 10, 20, 0.75);
      border: 1px solid ${COLORS.UI_BORDER};
      border-radius: 10px;
      color: ${COLORS.TEXT};
      font-size: 0.75rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(6px);
    `;

    const title = document.createElement("div");
    title.textContent = "STANDINGS";
    title.style.cssText = `
      font-size: 0.7rem;
      letter-spacing: 0.2em;
      color: ${COLORS.PRIMARY_HEX};
      font-weight: 700;
      text-transform: uppercase;
    `;
    this._element.appendChild(title);

    this._list = document.createElement("div");
    this._list.className = "ks-standings-list";
    this._list.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${HUD_LAYOUT.ELEMENT_GAP}px;
    `;
    this._element.appendChild(this._list);

    return this._element;
  }

  update({ players = [] } = {}) {
    if (!this._list) return;

    const ordered = [...players].sort((a, b) => {
      if (Number.isFinite(a.position) && Number.isFinite(b.position)) {
        return a.position - b.position;
      }
      const aProgress = a.progress ?? 0;
      const bProgress = b.progress ?? 0;
      if (aProgress !== bProgress) {
        return bProgress - aProgress;
      }
      const aCoins = a.coins ?? 0;
      const bCoins = b.coins ?? 0;
      return bCoins - aCoins;
    });

    this._list.innerHTML = "";

    ordered.slice(0, HUD_LAYOUT.STANDINGS_MAX_ROWS).forEach((player, index) => {
      const row = document.createElement("div");
      row.className = "ks-standings-row";
      row.style.cssText = `
        display: grid;
        grid-template-columns: 28px 1fr auto auto auto;
        align-items: center;
        gap: 8px;
        height: ${HUD_LAYOUT.STANDINGS_ROW_HEIGHT}px;
        padding: 4px 8px;
        background: rgba(16, 18, 30, 0.75);
        border: 1px solid ${COLORS.UI_BORDER};
        border-radius: 8px;
      `;

      const position = Number.isFinite(player.position) ? player.position : index + 1;
      const positionEl = document.createElement("div");
      positionEl.textContent = `#${position}`;
      positionEl.style.cssText = `
        font-weight: 700;
        color: ${position === 1 ? COLORS.NEON_GREEN_HEX : COLORS.TEXT_SECONDARY};
      `;

      const nameEl = document.createElement("div");
      nameEl.textContent = player.displayName || "Player";
      nameEl.style.cssText = `
        color: ${COLORS.TEXT};
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;

      const coinsEl = document.createElement("div");
      coinsEl.textContent = `${Math.max(0, player.coins ?? 0)}🪙`;
      coinsEl.style.cssText = `
        color: ${COLORS.COIN};
        font-weight: 600;
      `;

      const progressPct = Math.round((player.progress ?? 0) * 100);
      const progressEl = document.createElement("div");
      progressEl.textContent = `${progressPct}%`;
      progressEl.style.cssText = `
        color: ${COLORS.PRIMARY_HEX};
        font-weight: 600;
      `;

      const powerups = Array.isArray(player.powerups)
        ? player.powerups.join("")
        : player.powerupIcon || "";
      const powerEl = document.createElement("div");
      powerEl.textContent = powerups;
      powerEl.style.cssText = `
        width: 20px;
        text-align: center;
        opacity: ${powerups ? "1" : "0.2"};
      `;

      row.appendChild(positionEl);
      row.appendChild(nameEl);
      row.appendChild(coinsEl);
      row.appendChild(progressEl);
      row.appendChild(powerEl);

      this._list.appendChild(row);
    });
  }

  destroy() {
    this._element?.remove();
    this._element = null;
    this._list = null;
  }
}

export default StandingsBar;
