import { $ } from './dom-helpers.js';
import { t, applyLang, detectLangFromInput } from '../data/i18n.js';
import { searchCities } from '../services/geocoding-api.js';
import {
  getSavedCities, getSelectedCityId, cityId, reorderCities, saveCities
} from '../state/city-store.js';
import { loadSidebarWidth, saveSidebarWidth } from '../state/theme-store.js';
import { redrawChart } from './chart.js';

let callbacks = {};

function initSidebarToggle(sidebar) {
  const btn = document.getElementById("sidebar-toggle");
  if (!btn) return;

  // Start collapsed on mobile
  if (window.innerWidth <= 600) {
    sidebar.classList.add("collapsed");
  }

  btn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
  });
  sidebar.addEventListener("transitionend", (e) => {
    if (e.propertyName === "width" || e.propertyName === "transform") redrawChart();
  });
}

export function renderCityList() {
  const savedCities = getSavedCities();
  const selectedCityId = getSelectedCityId();
  const listEl = $("city-list");

  if (savedCities.length === 0) {
    listEl.innerHTML = `<div class="city-list-empty" id="city-list-empty">${t("emptyCities")}</div>`;
    return;
  }

  listEl.innerHTML = savedCities.map((c, idx) => {
    const id = cityId(c);
    const sel = id === selectedCityId ? " selected" : "";
    let weatherHtml = "";
    if (c.weatherCode != null) {
      const temp = `${c.currentTemp}\u00B0`;
      let diffCls = "", diffArrow = "";
      if (c.tempDiff > 0.5) { diffCls = "city-diff-warmer"; diffArrow = "\u2191"; }
      else if (c.tempDiff < -0.5) { diffCls = "city-diff-cooler"; diffArrow = "\u2193"; }
      else { diffCls = "city-diff-same"; diffArrow = "="; }
      weatherHtml = `<span class="city-item-weather"><span class="city-item-temp">${temp}</span><span class="city-item-diff ${diffCls}">${diffArrow}</span></span>`;
    }
    return `<div class="city-item${sel}" data-id="${id}" data-idx="${idx}">
      <span class="city-item-name">${c.name}</span>${weatherHtml}
    </div>`;
  }).join("");
}

export function initSidebar({ onSelect, onAdd, onRemove }) {
  callbacks = { onSelect, onAdd, onRemove };

  // City list click (suppressed after drag)
  let dragPreventsClick = false;

  $("city-list").addEventListener("click", e => {
    if (dragPreventsClick) { dragPreventsClick = false; return; }
    const item = e.target.closest(".city-item");
    if (item && item.dataset.id !== getSelectedCityId()) onSelect(item.dataset.id);
  });

  // Pointer-based drag reorder
  let drag = null;

  function startDrag(e) {
    const listEl = $("city-list");
    const items = Array.from(listEl.querySelectorAll(".city-item"));
    const rects = items.map(el => el.getBoundingClientRect());
    const rect = rects[drag.idx];

    const ghost = drag.item.cloneNode(true);
    ghost.classList.add("drag-ghost");
    ghost.style.position = "fixed";
    ghost.style.left = rect.left + "px";
    ghost.style.top = rect.top + "px";
    ghost.style.width = rect.width + "px";
    ghost.style.height = rect.height + "px";
    ghost.style.margin = "0";
    document.body.appendChild(ghost);

    drag.ghost = ghost;
    drag.items = items;
    drag.rects = rects;
    drag.itemH = rect.height;
    drag.offsetY = e.clientY - rect.top;
    drag.beforeIdx = drag.idx;
    drag.started = true;

    drag.item.classList.add("drag-source");
    listEl.classList.add("reordering");
  }

  function updateDrag(e) {
    drag.ghost.style.top = (e.clientY - drag.offsetY) + "px";

    const centerY = e.clientY - drag.offsetY + drag.itemH / 2;
    let beforeIdx = drag.rects.length;
    for (let i = 0; i < drag.rects.length; i++) {
      if (centerY < drag.rects[i].top + drag.rects[i].height / 2) {
        beforeIdx = i;
        break;
      }
    }
    if (beforeIdx === drag.beforeIdx) return;
    drag.beforeIdx = beforeIdx;

    const orig = drag.idx;
    drag.items.forEach((el, i) => {
      if (i === orig) return;
      let shift = 0;
      if (beforeIdx <= orig && i >= beforeIdx && i < orig) shift = drag.itemH;
      else if (beforeIdx > orig && i > orig && i < beforeIdx) shift = -drag.itemH;
      el.style.transform = shift ? `translateY(${shift}px)` : "";
    });
  }

  function endDrag() {
    const listEl = $("city-list");
    const ghost = drag.ghost;
    const sourceItem = drag.item;
    const items = drag.items;
    const origIdx = drag.idx;
    const beforeIdx = drag.beforeIdx;

    // Calculate where the gap is — the ghost should land there
    const targetY = beforeIdx <= origIdx
      ? drag.rects[beforeIdx].top
      : drag.rects[beforeIdx - 1].top;

    // Suppress the click that fires from this same pointerup
    dragPreventsClick = true;

    // Animate ghost into the slot
    ghost.style.transition = "top 0.2s ease, transform 0.2s ease";
    ghost.style.top = targetY + "px";
    ghost.style.transform = "scale(1)";

    let done = false;
    function finish() {
      if (done) return;
      done = true;

      ghost.remove();
      sourceItem.classList.remove("drag-source");
      listEl.classList.remove("reordering");
      items.forEach(el => el.style.transform = "");

      const toIdx = beforeIdx <= origIdx ? beforeIdx : beforeIdx - 1;
      if (toIdx !== origIdx) {
        reorderCities(origIdx, toIdx);
        renderCityList();
      }
    }

    ghost.addEventListener("transitionend", finish, { once: true });
    setTimeout(finish, 250); // fallback if transitionend doesn't fire
  }

  function cancelDrag() {
    drag.ghost.remove();
    drag.item.classList.remove("drag-source");
    $("city-list").classList.remove("reordering");
    drag.items.forEach(el => el.style.transform = "");
  }

  $("city-list").addEventListener("pointerdown", e => {
    const item = e.target.closest(".city-item");
    if (!item || e.button !== 0) return;
    drag = { item, idx: +item.dataset.idx, startY: e.clientY, started: false, pid: e.pointerId };
  });

  document.addEventListener("pointermove", e => {
    if (!drag || drag.pid !== e.pointerId) return;
    if (!drag.started) {
      if (Math.abs(e.clientY - drag.startY) < 5) return;
      e.preventDefault();
      window.getSelection().removeAllRanges();
      startDrag(e);
    }
    e.preventDefault();
    updateDrag(e);
  });

  document.addEventListener("pointerup", e => {
    if (!drag || drag.pid !== e.pointerId) return;
    if (drag.started) endDrag();
    drag = null;
  });

  document.addEventListener("pointercancel", e => {
    if (!drag || drag.pid !== e.pointerId) return;
    if (drag.started) cancelDrag();
    drag = null;
  });

  // Context menu
  let ctxMenu = null;

  function hideContextMenu() {
    if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; }
  }

  $("city-list").addEventListener("contextmenu", e => {
    const item = e.target.closest(".city-item");
    if (!item) return;
    e.preventDefault();
    hideContextMenu();

    const id = item.dataset.id;
    const menu = document.createElement("div");
    menu.className = "context-menu";
    menu.innerHTML = `<div class="context-menu-item" data-action="delete">${t("deleteCity") || "Delete"}</div>`;
    menu.style.left = e.clientX + "px";
    menu.style.top = e.clientY + "px";
    document.body.appendChild(menu);
    ctxMenu = menu;

    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 4) + "px";
    if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 4) + "px";

    menu.addEventListener("click", () => {
      hideContextMenu();
      onRemove(id);
    });
  });

  document.addEventListener("click", hideContextMenu);
  document.addEventListener("contextmenu", e => {
    if (!e.target.closest(".city-item")) hideContextMenu();
  });

  // Search / autocomplete
  const cityInput = $("city-input"), sugEl = $("suggestions");
  const searchWrap = cityInput.closest(".search-wrap");
  let timer, idx = -1, results = [], lastDetectedLang = "en";

  function hideSuggestions() { sugEl.className = "suggestions"; sugEl.style.display = "none"; }
  function showSuggestions() { sugEl.style.display = "block"; sugEl.className = "suggestions open"; }

  function renderSuggestionsList(r) {
    results = r; idx = -1;
    if (!r.length) { hideSuggestions(); return; }
    sugEl.innerHTML = r.map((c, i) => {
      const detail = [c.admin1, c.country].filter(Boolean).join(", ");
      return `<div class="suggestion-item" data-index="${i}"><span class="city-name">${c.name}</span><span class="city-detail">${detail}</span></div>`;
    }).join("");
    showSuggestions();
  }

  function pick(i) {
    const c = results[i]; if (!c) return;
    cityInput.value = "";
    hideSuggestions();
    applyLang(lastDetectedLang);
    const displayName = [c.name, c.admin1, c.country].filter(Boolean).join(", ");
    onAdd({ name: c.name, country: c.country, latitude: c.latitude, longitude: c.longitude, displayName });
  }

  cityInput.addEventListener("input", () => {
    const q = cityInput.value.trim();
    clearTimeout(timer);
    if (q.length < 2) { hideSuggestions(); return; }
    timer = setTimeout(async () => {
      searchWrap.classList.add("searching");
      try {
        lastDetectedLang = detectLangFromInput(q);
        const r = await searchCities(q, lastDetectedLang);
        renderSuggestionsList(r);
      } catch { hideSuggestions(); }
      finally { searchWrap.classList.remove("searching"); }
    }, 300);
  });

  cityInput.addEventListener("keydown", e => {
    const items = sugEl.querySelectorAll(".suggestion-item");
    if (!items.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); idx = Math.min(idx + 1, items.length - 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); idx = Math.max(idx - 1, 0); }
    else if (e.key === "Enter" && idx >= 0) { e.preventDefault(); pick(idx); return; }
    else if (e.key === "Escape") { hideSuggestions(); return; }
    else return;
    items.forEach((el, i) => el.classList.toggle("active", i === idx));
  });

  sugEl.addEventListener("click", e => { const el = e.target.closest(".suggestion-item"); if (el) pick(+el.dataset.index); });
  document.addEventListener("click", e => { if (!e.target.closest(".search-wrap")) hideSuggestions(); });

  // Sidebar resize
  const handle = $("sidebar-resize");
  const sidebar = handle.parentElement;
  let startX, startW;

  handle.addEventListener("mousedown", e => {
    e.preventDefault();
    startX = e.clientX;
    startW = sidebar.offsetWidth;
    handle.classList.add("active");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function onMove(e) {
      const w = Math.min(480, Math.max(160, startW + e.clientX - startX));
      sidebar.style.width = w + "px";
    }

    function onUp() {
      handle.classList.remove("active");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      saveSidebarWidth(sidebar.offsetWidth);
      redrawChart();
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });

  const savedWidth = loadSidebarWidth();
  if (savedWidth) sidebar.style.width = savedWidth + "px";

  // Sidebar toggle
  initSidebarToggle(sidebar);
}
