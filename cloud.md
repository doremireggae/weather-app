# Weather App

## Overview

Weather comparison app that shows today's weather alongside last year's data for saved cities. Features a 4-week temperature chart, multi-language support, and a resizable sidebar with drag-reorder.

**Live:** Vercel (auto-deploys from `main` branch)
**Repo:** `doremireggae/weather-app`

## Tech Stack

- Vanilla JS (ES modules, no bundler/framework)
- HTML Canvas (chart rendering)
- CSS custom properties (dark theme)
- Open-Meteo API (weather + geocoding)
- Nominatim API (reverse geocoding)
- localStorage (persistence)

## File Structure

```
index.html
css/
  theme.css           CSS variables, font, reset (shadcn/ui zinc dark)
  layout.css          Window, titlebar, sidebar, responsive breakpoints
  sidebar.css         Search, city list, context menu, drag-reorder
  components.css      Cards, badges, chart, skeleton loader
  animations.css      Keyframes: fadeIn, fadeOut, fadeInScale, spin, pulse
js/
  app.js              Main orchestrator: init, loadWeather, chart navigation
  ui/
    sidebar.js        City list, search autocomplete, drag-reorder, resize, toggle
    chart.js          Canvas chart with animation and hover tooltips
    weather-cards.js  Today/history cards and diff badge
    dom-helpers.js    $(), toDateStr(), showError(), setTitle()
  services/
    weather-api.js    Open-Meteo forecast + archive API calls
    geocoding-api.js  City search + reverse geocoding
  state/
    city-store.js     Saved cities in localStorage
    theme-store.js    Sidebar width persistence, chart data cache
  data/
    i18n.js           9 languages, auto-detection from input
    wmo-codes.js      WMO weather code to text/emoji mapping
```

## APIs

| API | Endpoint | Purpose |
|-----|----------|---------|
| Open-Meteo Forecast | `api.open-meteo.com/v1/forecast` | Current weather + 28-day forecast |
| Open-Meteo Archive | `archive-api.open-meteo.com/v1/archive` | Historical temperatures (last year) |
| Open-Meteo Geocoding | `geocoding-api.open-meteo.com/v1/search` | City search (up to 5 results) |
| Nominatim | `nominatim.openstreetmap.org/reverse` | Reverse geocoding (coords to name) |

All APIs are free, no keys required.

## Data Flow

```
User searches city
  -> searchCities(query, lang)        geocoding API
  -> User selects result
  -> addCity(city)                     save to localStorage
  -> loadWeather(lat, lon)
      -> fetchWeatherData()            forecast + archive APIs in parallel
      -> reverseGeocode()              Nominatim API
  -> renderTodayCard()                 today's weather
  -> renderHistoryCard()               same day last year
  -> renderDiffBadge()                 temperature difference
  -> drawChart()                       4-week canvas chart
  -> prefetchAdjacent()                cache month -1 and +1 chart data
```

## State (localStorage)

**`weather-cities`** — Array of saved cities:
```json
[{
  "name": "London",
  "country": "United Kingdom",
  "displayName": "London, England, United Kingdom",
  "latitude": 51.51,
  "longitude": -0.13,
  "weatherCode": 2,
  "currentTemp": 18,
  "tempDiff": 3.5
}]
```

**`weather-sidebar-width`** — Sidebar width in pixels (string).

City ID format: `"lat.toFixed(2)_lon.toFixed(2)"` (e.g. `"51.51_-0.13"`).

## Design System

shadcn/ui zinc-based dark theme:

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg` | `#09090b` | Window background |
| `--card` | `#18181b` | Card backgrounds |
| `--secondary` | `#27272a` | Hover/selected states |
| `--text` | `#fafafa` | Primary text |
| `--text2` | `#a1a1aa` | Secondary text |
| `--text3` | `#71717a` | Tertiary text |
| `--border` | `rgba(255,255,255,0.1)` | All borders |
| `--warmer` | `#34d399` | Temperature up (green) |
| `--cooler` | `#38bdf8` | Temperature down (blue) |
| `--same` | `#a1a1aa` | Temperature unchanged |

Font: Inter, system-ui, -apple-system, sans-serif.

## Features

### Weather Cards
- **Today card**: Current temp, daily high, weather icon + description
- **History card**: Same day last year
- **Diff badge**: Pill showing temperature difference (warmer/cooler/same with color coding)

### Chart
- HTML Canvas, auto-scaled to DPR
- Two lines: this year (solid bright) vs last year (dashed gray)
- Animated draw (1200ms, cubic ease-out)
- Today marker (vertical dashed line, color reflects diff)
- Hover tooltips with date + both temperatures
- Navigable by month (offset 0 to -11), with prefetch caching
- Skeleton loader while data loads

### Sidebar
- **Search**: 300ms debounced, 5 results, keyboard navigation (arrows/Enter/Escape)
- **City list**: Shows current temp + diff badge per city
- **Drag-reorder**: Pointer-based with ghost element, 5px threshold, snap animation
- **Context menu**: Right-click to delete city
- **Resize**: Drag handle, 160-480px range, triggers chart redraw
- **Toggle**: Hamburger button in titlebar

### i18n (9 languages)
Auto-detected from search input by Unicode block:

| Script | Language | Detection Range |
|--------|----------|-----------------|
| Latin (default) | English | — |
| CJK | Japanese | `\u3000-\u9fff` |
| Cyrillic | Russian | `\u0400-\u04ff` |
| Arabic | Arabic | `\u0600-\u06ff` |
| Hangul | Korean | `\uac00-\ud7af` |
| Thai | Thai | `\u0e00-\u0e7f` |
| Greek | Greek | `\u0370-\u03ff` |
| Devanagari | Hindi | `\u0900-\u097f` |

Switching language updates all UI text, document lang attribute, and date formatting locale.

### Responsive

| | Desktop | Mobile (<=600px) |
|-|---------|-------------------|
| Sidebar | Docked left, resizable | Overlay from left, starts collapsed |
| Cards | 2-column grid | 1-column stack |
| Sidebar width | 240px default (160-480px) | 280px fixed |
| Toggle | Hamburger in titlebar | Same |
| Resize handle | Visible | Hidden |

## Deployment

1. Push to `main` branch on GitHub
2. Vercel auto-deploys
3. Bump cache buster in `index.html` when changing JS:
   ```html
   <script type="module" src="js/app.js?v=N"></script>
   ```
