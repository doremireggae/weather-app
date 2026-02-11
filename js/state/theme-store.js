let chartData = null;

export function getChartData() { return chartData; }

export function setChartData(data) { chartData = data; }

export function loadSidebarWidth() {
  return localStorage.getItem("weather-sidebar-width");
}

export function saveSidebarWidth(width) {
  localStorage.setItem("weather-sidebar-width", width);
}
