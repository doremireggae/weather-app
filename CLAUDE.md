# Weather App

## Project Overview
Weather comparison app — shows today's weather vs last year for saved cities, with a 4-week temperature chart. Deployed on Vercel via GitHub (doremireggae/weather-app).

## Tech Stack
- Vanilla JS (ES modules), no framework
- CSS split into: theme.css, layout.css, sidebar.css, components.css, animations.css
- HTML Canvas for chart rendering
- Open-Meteo API for weather data
- i18n support (EN/RU auto-detected from input)

## Architecture
```
index.html
css/
  theme.css        — CSS variables (shadcn/ui zinc dark theme), font, reset
  layout.css       — Window, titlebar, sidebar structure, responsive
  sidebar.css      — Search input, suggestions, city list, context menu
  components.css   — Cards, badges, chart container, skeleton loader
  animations.css   — Fade in/out, spin keyframes
js/
  app.js           — Main orchestrator: init, loadWeather, selectCity, chart nav
  ui/
    sidebar.js     — City list rendering, search, drag reorder, resize, toggle
    chart.js       — Canvas chart drawing with animation and hover tooltips
    weather-cards.js — Render today/history cards and diff badge
    dom-helpers.js — $() helper, showError, setTitle
  services/
    weather-api.js — Open-Meteo API calls
    geocoding-api.js — Geocoding + reverse geocoding
  state/
    city-store.js  — Saved cities in localStorage
    theme-store.js — Sidebar width, chart data persistence
  data/
    i18n.js        — Translations and language detection
```

## Design System
shadcn/ui zinc-based dark theme:
- Background: #09090b, Cards: #18181b, Secondary: #27272a
- Text: #fafafa / #a1a1aa / #71717a
- Borders: rgba(255,255,255,0.1), always 1px solid
- Font: Inter, system-ui, -apple-system, sans-serif
- Cards and containers have visible borders, not just fills
- Badges are pill-shaped (border-radius: 9999px)
- Buttons use outline variant (transparent bg + border)
- No backdrop-filter blur — solid backgrounds on dropdowns/menus

## Key Behaviors
- Clicking an already-selected city does nothing (guard in sidebar.js + app.js)
- Sidebar toggle button (hamburger) in titlebar top-left
- Mobile (<=600px): sidebar overlays from left, starts collapsed
- Sidebar is resizable via drag handle
- Chart redraws on sidebar resize/toggle
- Cities reorderable via drag-and-drop

## Deployment
- GitHub: doremireggae/weather-app (main branch)
- Vercel auto-deploys on push to main
- Cache buster on script tag (js/app.js?v=N) — bump when changing JS
