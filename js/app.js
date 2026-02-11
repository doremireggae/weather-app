import { $ , showError, setTitle } from './ui/dom-helpers.js';
import { t } from './data/i18n.js';
import { reverseGeocode } from './services/geocoding-api.js';
import { fetchWeatherData, fetchCitySummaryData } from './services/weather-api.js';
import {
  getSavedCities, getSelectedCityId, setSelectedCityId,
  cityId, loadSavedCities, saveCities, addCityToStore, removeCityFromStore, findCity
} from './state/city-store.js';
import { initSidebar, renderCityList } from './ui/sidebar.js';
import { drawChart, cancelChartAnim } from './ui/chart.js';
import { renderTodayCard, renderHistoryCard, renderDiffBadge } from './ui/weather-cards.js';

// --- Orchestration ---

function resetUI() {
  cancelChartAnim();

  const els = [$("today-card"), $("history-card"), $("chart-container"), $("temp-diff")];
  const visible = els.filter(el => el.classList.contains("show"));

  if (visible.length === 0) {
    $("error").className = "";
    $("error").style.display = "none";
    $("status").className = "show";
    return Promise.resolve();
  }

  return new Promise(resolve => {
    visible.forEach(el => {
      el.classList.remove("show");
      el.classList.add("fade-out");
    });
    setTimeout(() => {
      $("today-card").className = "card";
      $("history-card").className = "card";
      $("chart-container").className = "chart-container";
      $("temp-diff").className = "diff";
      $("error").className = "";
      $("error").style.display = "none";
      $("status").className = "show";
      resolve();
    }, 250);
  });
}

async function loadWeather(lat, lon, name) {
  await resetUI();
  try {
    let data;
    if (name) {
      setTitle(name);
      data = await fetchWeatherData(lat, lon);
    } else {
      const [loc, d] = await Promise.all([reverseGeocode(lat, lon), fetchWeatherData(lat, lon)]);
      setTitle(loc);
      data = d;
    }

    renderTodayCard(data.weatherCode, data.todayMax, data.currentTemp);
    renderHistoryCard(data.hCode, data.historyTemp);
    renderDiffBadge(data.diff);
    drawChart(data.dates, data.thisYearTemps, data.lastYearTemps, data.todayIdx, true, data.diff);

    $("status").className = "";

    // Cache weather summary on the selected city
    const selectedId = getSelectedCityId();
    if (selectedId) {
      const city = findCity(selectedId);
      if (city) {
        city.weatherCode = data.weatherCode;
        city.currentTemp = data.currentTemp;
        city.tempDiff = data.diff;
        saveCities();
        renderCityList();
      }
    }
  } catch { showError(t("errorLoad")); }
}

function selectCity(id) {
  setSelectedCityId(id);
  const city = findCity(id);
  if (!city) return;
  renderCityList();
  loadWeather(city.latitude, city.longitude, city.displayName);
}

function addCity(city) {
  const id = addCityToStore(city);
  renderCityList();
  selectCity(id);
}

function removeCity(id) {
  removeCityFromStore(id);
  const selectedId = getSelectedCityId();

  if (selectedId === id) {
    setSelectedCityId(null);
    const cities = getSavedCities();
    if (cities.length > 0) {
      selectCity(cityId(cities[0]));
    } else {
      $("app-title").textContent = t("title");
      $("today-card").className = "card";
      $("history-card").className = "card";
      $("chart-container").className = "chart-container";
      $("temp-diff").className = "diff";
      $("status").className = "";
      $("error").style.display = "none";
    }
  }
  renderCityList();
}

async function refreshAllCitySummaries() {
  const cities = getSavedCities();
  if (cities.length === 0) return;
  await Promise.all(cities.map(async c => {
    try {
      const summary = await fetchCitySummaryData(c);
      if (summary) {
        c.weatherCode = summary.weatherCode;
        c.currentTemp = summary.currentTemp;
        c.tempDiff = summary.tempDiff;
      }
    } catch {}
  }));
  saveCities();
  renderCityList();
}

// --- Init ---
loadSavedCities();
renderCityList();
initSidebar({ onSelect: selectCity, onAdd: addCity, onRemove: removeCity });

const savedCities = getSavedCities();
if (savedCities.length > 0) {
  refreshAllCitySummaries();
  selectCity(cityId(savedCities[0]));
} else {
  $("status").className = "show";
  if (!navigator.geolocation) { showError(t("errorGeo")); }
  else navigator.geolocation.getCurrentPosition(
    async p => {
      const lat = p.coords.latitude, lon = p.coords.longitude;
      const name = await reverseGeocode(lat, lon);
      addCity({ name, country: "", latitude: lat, longitude: lon, displayName: name });
    },
    () => { $("status").className = ""; },
    { timeout: 10000 }
  );
}
