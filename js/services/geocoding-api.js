export async function reverseGeocode(lat, lon) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, { headers: { "Accept-Language": "en" } });
    const d = await r.json(), a = d.address || {};
    return a.city || a.town || a.village || a.county || "Your Location";
  } catch { return "Your Location"; }
}

export async function searchCities(query, lang) {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=${lang}`);
  return (await r.json()).results || [];
}
