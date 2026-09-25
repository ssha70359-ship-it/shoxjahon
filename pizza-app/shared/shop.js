// Pitsaxona haqidagi barcha ma'lumotlar shu yerda.
// Server ham, Mini App ham shu fayldan o'qiydi — o'zgartirsangiz ikkalasida
// birdaniga yangilanadi.

export const SHOP = {
  name: 'Olov Pizza',
  tagline: {
    uz: 'Oʻtin pechida, 90 soniyada',
    ru: 'Из дровяной печи за 90 секунд',
  },
  phone: '+998 90 000 00 00',
  address: {
    uz: 'Toshkent, Amir Temur koʻchasi, 1',
    ru: 'Ташкент, ул. Амира Темура, 1',
  },
  // Pitsaxona joylashuvi — masofa va yetkazish vaqti shundan hisoblanadi
  location: { lat: 41.311151, lng: 69.279737 },

  // Toshkent vaqti (UTC+5). Yopilish vaqti ochilishdan kichik bo'lsa —
  // ertasi kuni tungi soat degani (10:00 – 03:00).
  utcOffsetMinutes: 5 * 60,
  hours: { open: '10:00', close: '03:00' },

  currency: 'UZS',

  delivery: {
    fee: 15000,
    freeFrom: 150000,
    minOrder: 50000,
    radiusKm: 15,
    // Taxminiy vaqt: tayyorlash + masofa bo'yicha yo'l
    prepMinutes: 18,
    baseMinutes: 8,
    minutesPerKm: 3,
  },

  loyalty: {
    // Har bir yetkazilgan pitsa = 1 tilim. Shuncha tilim yig'ilsa — bitta pitsa bepul.
    slicesForReward: 8,
  },

  group: {
    // "Davra" (birgalikdagi buyurtma) necha soat ochiq turadi
    ttlHours: 3,
    maxMembers: 20,
    maxItems: 60,
  },
};

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Toshkent vaqti bo'yicha kun boshidan beri o'tgan daqiqalar */
export function localMinutes(date = new Date()) {
  const utc = date.getUTCHours() * 60 + date.getUTCMinutes();
  return (utc + SHOP.utcOffsetMinutes + 1440) % 1440;
}

export function isOpenAt(date = new Date()) {
  const now = localMinutes(date);
  const open = toMinutes(SHOP.hours.open);
  const close = toMinutes(SHOP.hours.close);

  if (open === close) return true;
  if (open < close) return now >= open && now < close;
  return now >= open || now < close;
}

/** Ikki nuqta orasidagi masofa (km), Haversine formulasi */
export function distanceKm(a, b) {
  const R = 6371;
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Yo'lda qancha vaqt ketadi (daqiqa) */
export function travelMinutes(km) {
  const { baseMinutes, minutesPerKm } = SHOP.delivery;
  return Math.round(baseMinutes + (km ?? 3) * minutesPerKm);
}

/** Buyurtma berilgandan qo'lga tekkuncha taxminiy vaqt (daqiqa) */
export function estimateMinutes(mode, km) {
  const prep = SHOP.delivery.prepMinutes;
  if (mode === 'pickup') return prep;
  return prep + travelMinutes(km);
}
