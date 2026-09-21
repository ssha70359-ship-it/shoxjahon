/**
 * Farhadskaya Bulochka — do'kon ma'lumotlari.
 *
 * Manba: ochiq internet ma'lumotlari (Instagram @farhadskaya_bulochka,
 * 2GIS, Yandex Karta). Aniqlik uchun o'zingiz tekshirib chiqing —
 * filial qo'shish/o'chirish uchun shu faylni tahrirlang.
 */
export const shop = {
  name: 'Farhadskaya Bulochka',
  tagline: 'Family Bakery \u{1F968} — est. 1996',
  slogan: 'Toshkentdagi eng mazali bulochkalar',

  phone: '+998 98 141 7777',
  phoneHref: 'tel:+998981417777',
  instagram: 'https://www.instagram.com/farhadskaya_bulochka',

  /** Har kuni 7:00 dan 19:00 gacha */
  hours: { open: 7, close: 19, text: 'Har kuni 7:00 – 19:00' },

  /** Filiallar — Mini App "Profil" bo'limida va botda ko'rsatiladi */
  branches: [
    {
      id: 'farhad',
      name: 'Farhad bozori (asosiy)',
      address: "Farhadskaya ko'chasi, 6a/1",
    },
    {
      id: 'lutfiy',
      name: 'Lutfiy',
      address: "Lutfiy ko'chasi, 21a",
    },
    {
      id: 'jararyk',
      name: 'Jararyk',
      address: 'Jararyk massivi, 7/1',
    },
    {
      id: 'uchtepa',
      name: 'Uchtepa 23-kvartal',
      address: 'Uchtepa, 23-kvartal, 56',
    },
  ],

  delivery: {
    text: 'Yetkazib berish Toshkent bo‘ylab',
    minutes: 40,
  },
};

/** Ish vaqti ichidamizmi? (Toshkent vaqti, UTC+5) */
export function isOpenNow(date = new Date()) {
  const tashkentHour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Tashkent',
      hour: '2-digit',
      hour12: false,
    }).format(date),
  );

  return tashkentHour >= shop.hours.open && tashkentHour < shop.hours.close;
}

export default shop;
