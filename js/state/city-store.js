let savedCities = [];
let selectedCityId = null;

export function getSavedCities() { return savedCities; }
export function getSelectedCityId() { return selectedCityId; }
export function setSelectedCityId(id) { selectedCityId = id; }

export function cityId(c) {
  return `${c.latitude.toFixed(2)}_${c.longitude.toFixed(2)}`;
}

export function loadSavedCities() {
  try { savedCities = JSON.parse(localStorage.getItem("weather-cities") || "[]"); } catch { savedCities = []; }
}

export function saveCities() {
  localStorage.setItem("weather-cities", JSON.stringify(savedCities));
}

export function addCityToStore(city) {
  const id = cityId(city);
  if (savedCities.some(c => cityId(c) === id)) return id;
  savedCities.push(city);
  saveCities();
  return id;
}

export function removeCityFromStore(id) {
  savedCities = savedCities.filter(c => cityId(c) !== id);
  saveCities();
}

export function findCity(id) {
  return savedCities.find(c => cityId(c) === id);
}

export function reorderCities(fromIdx, toIdx) {
  const [moved] = savedCities.splice(fromIdx, 1);
  savedCities.splice(toIdx, 0, moved);
  saveCities();
}
