/**
 * Koordinatadan o'qiladigan manzil (ko'cha, uy, mahalla, shahar).
 *
 * OpenStreetMap Nominatim ishlatiladi: bepul, kalit kerak emas. Qoidasi -
 * aniq User-Agent va sekundiga 1 tadan ko'p so'rov yubormaslik, shuning
 * uchun natijalar keshlanadi. Topilmasa null - mijoz manzilni o'zi yozadi.
 */
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'FarhadskayaBulochkaBot/1.0 (Telegram Mini App)';
const CACHE_LIMIT = 500;

const cache = new Map();

/** ~10 metr aniqlikda yaxlitlash - bir joydan kelgan so'rovlar keshdan olinadi */
const cacheKey = (lat, lng) => `${lat.toFixed(4)},${lng.toFixed(4)}`;

export function isValidCoords(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

/** Nominatim javobidan qisqa manzil yig'adi: "Amir Temur ko'chasi 15, Yunusobod, Toshkent" */
export function formatAddress(data) {
  const a = data?.address || {};

  const street = [a.road || a.pedestrian || a.footway, a.house_number].filter(Boolean).join(' ');
  const area = a.neighbourhood || a.quarter || a.suburb || a.residential;
  const city = a.city || a.town || a.village || a.city_district || a.county || a.state;

  const parts = [street || a.amenity || a.building, area, city].filter(Boolean);
  const unique = parts.filter((part, index) => parts.indexOf(part) === index);

  if (unique.length) return unique.join(', ');

  // Tuzilgan manzil bo'lmasa - to'liq nomning boshini olamiz (davlat/indekssiz)
  const display = String(data?.display_name || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return display.length ? display.slice(0, 3).join(', ') : null;
}

export async function reverseGeocode(lat, lng, { fetchImpl = fetch } = {}) {
  if (!isValidCoords(lat, lng)) return null;

  const key = cacheKey(lat, lng);
  if (cache.has(key)) return cache.get(key);

  const url = new URL(NOMINATIM_URL);
  url.search = new URLSearchParams({
    format: 'jsonv2',
    lat: String(lat),
    lon: String(lng),
    zoom: '18',
    addressdetails: '1',
    'accept-language': 'uz,ru',
  }).toString();

  try {
    const response = await fetchImpl(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return null;

    const address = formatAddress(await response.json());

    if (address) {
      if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
      cache.set(key, address);
    }
    return address;
  } catch (error) {
    console.error('⚠️  Manzil aniqlanmadi:', error.message);
    return null;
  }
}

/** Testlar uchun */
export function clearGeocodeCache() {
  cache.clear();
}
