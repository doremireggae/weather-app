import { toDateStr } from '../ui/dom-helpers.js';

export async function fetchWeatherData(lat, lon) {
  const today = new Date(), todayStr = toDateStr(today);
  const ago = new Date(today); ago.setFullYear(ago.getFullYear() - 1);
  const agoStr = toDateStr(ago);
  const ago14 = new Date(ago); ago14.setDate(ago14.getDate() - 13);
  const agoEnd = new Date(ago); agoEnd.setDate(agoEnd.getDate() + 14);

  const [fR, aR, cR] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto&past_days=13&forecast_days=15`),
    fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${agoStr}&end_date=${agoStr}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto`),
    fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${toDateStr(ago14)}&end_date=${toDateStr(agoEnd)}&daily=temperature_2m_max&timezone=auto`),
  ]);

  if (!fR.ok || !aR.ok || !cR.ok) throw new Error();
  const f = await fR.json(), a = await aR.json(), c = await cR.json();

  const todayIdx = f.daily.time.indexOf(todayStr);
  const weatherCode = f.daily.weather_code[todayIdx];
  const currentTemp = Math.round(f.current_weather.temperature);
  const todayMax = Math.round(f.daily.temperature_2m_max[todayIdx]);
  const hCode = a.daily.weather_code[0];
  const hAvg = (a.daily.temperature_2m_max[0] + a.daily.temperature_2m_min[0]) / 2;
  const historyTemp = Math.round(hAvg);
  const diff = f.current_weather.temperature - hAvg;

  return {
    weatherCode,
    currentTemp,
    todayMax,
    diff,
    hCode,
    historyTemp,
    todayIdx,
    dates: f.daily.time,
    thisYearTemps: f.daily.temperature_2m_max,
    lastYearTemps: c.daily.temperature_2m_max,
  };
}

export async function fetchCitySummaryData(city) {
  const today = new Date(), todayStr = toDateStr(today);
  const ago = new Date(today); ago.setFullYear(ago.getFullYear() - 1);
  const agoStr = toDateStr(ago);

  const [fR, aR] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current_weather=true&daily=temperature_2m_max,weather_code&timezone=auto&past_days=0&forecast_days=1`),
    fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${city.latitude}&longitude=${city.longitude}&start_date=${agoStr}&end_date=${agoStr}&daily=temperature_2m_max,temperature_2m_min&timezone=auto`),
  ]);

  if (!fR.ok || !aR.ok) return null;
  const f = await fR.json(), a = await aR.json();

  const weatherCode = f.daily.weather_code[0];
  const currentTemp = Math.round(f.current_weather.temperature);
  const hAvg = (a.daily.temperature_2m_max[0] + a.daily.temperature_2m_min[0]) / 2;
  const tempDiff = f.current_weather.temperature - hAvg;

  return { weatherCode, currentTemp, tempDiff };
}
