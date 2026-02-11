import { $ } from './dom-helpers.js';
import { t, getCurrentLang } from '../data/i18n.js';
import { getChartData, setChartData } from '../state/theme-store.js';

let chartAnimId = null;
let hoverCleanup = null;

export function cancelChartAnim() {
  if (chartAnimId) { cancelAnimationFrame(chartAnimId); chartAnimId = null; }
}

export function drawChart(dates, thisYear, lastYear, todayIdx, animate, diffValue) {
  cancelChartAnim();
  setChartData({ dates, thisYear, lastYear, todayIdx, diffValue });

  // Remove previous hover listeners
  if (hoverCleanup) { hoverCleanup(); hoverCleanup = null; }

  const container = $("chart-container");
  container.className = "chart-container show";

  const canvas = $("temp-chart");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 180 * dpr;
  canvas.style.height = "180px";

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const w = rect.width, h = 180;
  const pad = { top: 20, right: 8, bottom: 28, left: 32 };
  const pw = w - pad.left - pad.right, ph = h - pad.top - pad.bottom;

  const all = [...thisYear, ...lastYear].filter(t => t != null);
  const min = Math.floor(Math.min(...all) - 2);
  const max = Math.ceil(Math.max(...all) + 2);
  const n = dates.length;

  const xPos = i => pad.left + (i / (n - 1)) * pw;
  const yPos = t => pad.top + ph - ((t - min) / (max - min)) * ph;

  const s = getComputedStyle(document.documentElement);
  const gridColor = s.getPropertyValue("--grid").trim();
  const labelColor = s.getPropertyValue("--chart-label").trim();
  const c1 = s.getPropertyValue("--line1").trim();
  const c2 = s.getPropertyValue("--line2").trim();
  const textColor = s.getPropertyValue("--text").trim();
  const fillColor = s.getPropertyValue("--fill2").trim();
  const todayMarkerColor = diffValue > 0.5
    ? s.getPropertyValue("--warmer").trim()
    : diffValue < -0.5
      ? s.getPropertyValue("--cooler").trim()
      : s.getPropertyValue("--same").trim();

  function drawStatic() {
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    ctx.fillStyle = labelColor;
    ctx.font = "500 11px -apple-system, 'SF Pro Text', sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 4; i++) {
      const temp = min + (i / 4) * (max - min);
      const yy = yPos(temp);
      ctx.beginPath(); ctx.moveTo(pad.left, yy); ctx.lineTo(w - pad.right, yy); ctx.stroke();
      ctx.fillText(`${Math.round(temp)}\u00B0`, pad.left - 5, yy);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const currentLang = getCurrentLang();
    for (let i = 0; i < n; i += 3) {
      const d = new Date(dates[i] + "T00:00:00");
      const locale = currentLang === "en" ? "en-US" : currentLang;
      ctx.fillText(d.toLocaleDateString(locale, { month: "short", day: "numeric" }), xPos(i), h - pad.bottom + 6);
    }

    if (todayIdx >= 0 && todayIdx < n) {
      const tx = xPos(todayIdx);
      ctx.strokeStyle = todayMarkerColor;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(tx, pad.top);
      ctx.lineTo(tx, h - pad.bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = todayMarkerColor;
      ctx.font = "600 10px -apple-system, 'SF Pro Text', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(t("today"), tx, pad.top - 4);
    }
  }

  function getPoints(temps, maxIdx) {
    const pts = [];
    for (let i = 0; i <= maxIdx && i < temps.length; i++) {
      if (temps[i] != null) pts.push({ x: xPos(i), y: yPos(temps[i]), i });
    }
    return pts;
  }

  function pathLen(pts) {
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      len += Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
    }
    return len;
  }

  function drawPartialLine(pts, frac, color, dashed) {
    if (pts.length === 0) return;
    const total = pathLen(pts);
    const target = total * frac;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.setLineDash(dashed ? [5, 4] : []);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    let drawn = 0;
    for (let i = 1; i < pts.length; i++) {
      const seg = Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
      if (drawn + seg <= target) {
        ctx.lineTo(pts[i].x, pts[i].y);
        drawn += seg;
      } else {
        const rem = target - drawn;
        const ratio = rem / seg;
        const ex = pts[i-1].x + (pts[i].x - pts[i-1].x) * ratio;
        const ey = pts[i-1].y + (pts[i].y - pts[i-1].y) * ratio;
        ctx.lineTo(ex, ey);
        break;
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);

    let d2 = 0;
    for (let i = 0; i < pts.length; i++) {
      if (i > 0) d2 += Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
      if (d2 <= target) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawForecastDots(frac, color) {
    const forecastPts = [];
    for (let i = todayIdx + 1; i < thisYear.length; i++) {
      if (thisYear[i] != null) forecastPts.push({ x: xPos(i), y: yPos(thisYear[i]) });
    }
    const count = Math.floor(forecastPts.length * frac);
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(forecastPts[i].x, forecastPts[i].y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  const lastYearPts = getPoints(lastYear, lastYear.length - 1);
  const pastTemps = thisYear.map((v, i) => i <= todayIdx ? v : null);
  const thisYearPts = getPoints(pastTemps, todayIdx);

  function drawFullFrame() {
    drawStatic();
    drawPartialLine(lastYearPts, 1, c2, true);
    drawPartialLine(thisYearPts, 1, c1, false);
    drawForecastDots(1, c1);
  }

  function pill(x, y, pw, ph, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + pw - r, y);
    ctx.arcTo(x + pw, y, x + pw, y + r, r);
    ctx.lineTo(x + pw, y + ph - r);
    ctx.arcTo(x + pw, y + ph, x + pw - r, y + ph, r);
    ctx.lineTo(x + r, y + ph);
    ctx.arcTo(x, y + ph, x, y + ph - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function drawHover(hoverIdx) {
    drawFullFrame();

    const hx = xPos(hoverIdx);

    // Vertical line
    ctx.strokeStyle = fillColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(hx, pad.top);
    ctx.lineTo(hx, h - pad.bottom);
    ctx.stroke();

    // Date label at bottom
    const currentLang = getCurrentLang();
    const locale = currentLang === "en" ? "en-US" : currentLang;
    const dateObj = new Date(dates[hoverIdx] + "T00:00:00");
    const dateLabel = dateObj.toLocaleDateString(locale, { month: "short", day: "numeric" });
    ctx.font = "600 11px -apple-system, 'SF Pro Text', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = textColor;
    ctx.fillText(dateLabel, hx, h - pad.bottom + 6);

    // Highlighted dots + temperature pills
    const pairs = [
      { temp: thisYear[hoverIdx], color: c1, textColor: "#000" },
      { temp: lastYear[hoverIdx], color: c2, textColor: "#fff" },
    ];

    for (const p of pairs) {
      if (p.temp == null) continue;
      const py = yPos(p.temp);

      // Larger dot
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(hx, py, 4, 0, Math.PI * 2);
      ctx.fill();

      // Temperature pill
      const text = `${Math.round(p.temp)}\u00B0`;
      ctx.font = "600 11px -apple-system, 'SF Pro Text', sans-serif";
      const tw = ctx.measureText(text).width;
      const pillW = tw + 8;
      const pillH = 18;
      const gap = 8;

      let px = hx + gap;
      if (px + pillW > w - pad.right) px = hx - gap - pillW;
      const pillY = py - pillH / 2;

      ctx.fillStyle = p.color;
      pill(px, pillY, pillW, pillH, 4);
      ctx.fill();

      ctx.fillStyle = p.textColor;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(text, px + 4, py);
    }
  }

  // --- Hover listeners (attached per draw, cleaned up on next draw) ---

  function onMouseMove(e) {
    if (chartAnimId) return;
    const canvasRect = canvas.getBoundingClientRect();
    const mx = e.clientX - canvasRect.left;
    if (mx < pad.left || mx > w - pad.right) { drawFullFrame(); return; }
    const frac = (mx - pad.left) / (w - pad.left - pad.right);
    const idx = Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1))));
    drawHover(idx);
  }

  function onMouseLeave() {
    if (chartAnimId) return;
    drawFullFrame();
  }

  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseleave", onMouseLeave);

  hoverCleanup = () => {
    canvas.removeEventListener("mousemove", onMouseMove);
    canvas.removeEventListener("mouseleave", onMouseLeave);
  };

  // --- Draw ---

  if (!animate) {
    drawFullFrame();
    return;
  }

  const duration = 1200;
  const start = performance.now();

  function frame(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);

    drawStatic();
    drawPartialLine(lastYearPts, ease, c2, true);
    drawPartialLine(thisYearPts, ease, c1, false);

    const dotProgress = Math.max(0, (progress - 0.7) / 0.3);
    drawForecastDots(dotProgress, c1);

    if (progress < 1) {
      chartAnimId = requestAnimationFrame(frame);
    } else {
      chartAnimId = null;
    }
  }

  chartAnimId = requestAnimationFrame(frame);
}

export function redrawChart() {
  const data = getChartData();
  if (data) drawChart(data.dates, data.thisYear, data.lastYear, data.todayIdx, false, data.diffValue);
}
