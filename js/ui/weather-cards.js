import { $ } from './dom-helpers.js';
import { WMO_ICON } from '../data/wmo-codes.js';
import { t, wmoText } from '../data/i18n.js';

export function renderTodayCard(weatherCode, todayMax, currentTemp) {
  $("today-current").textContent = `${todayMax}\u00B0`;
  $("today-now").textContent = `(${currentTemp}\u00B0)`;
  $("today-icon").textContent = WMO_ICON[weatherCode] || "";
  $("today-desc").textContent = wmoText(weatherCode);
  $("today-card").className = "card show";
}

export function renderHistoryCard(hCode, historyTemp) {
  $("history-temp").textContent = `${historyTemp}\u00B0`;
  $("history-icon").textContent = WMO_ICON[hCode] || "";
  $("history-desc").textContent = wmoText(hCode);
  $("history-card").className = "card show";
}

export function renderDiffBadge(diff) {
  const diffEl = $("temp-diff"), abs = Math.abs(diff).toFixed(1);
  if (diff > 0.5) {
    diffEl.textContent = `\u2191 ${abs}\u00B0 ${t("warmer")}`;
    diffEl.className = "diff warmer show";
  } else if (diff < -0.5) {
    diffEl.textContent = `\u2193 ${abs}\u00B0 ${t("cooler")}`;
    diffEl.className = "diff cooler show";
  } else {
    diffEl.textContent = `\u2194 ${t("same")}`;
    diffEl.className = "diff same show";
  }
}
