/**
 * Farhadskaya Bulochka — do'kon ma'lumotlari.
 *
 * Manba: @farhadskaya_bulochka Instagram "Lokatsiya" va "Menyu" storylari.
 * Filial qo'shish yoki manzilni o'zgartirish uchun shu faylni tahrirlang.
 */
export const shop = {
  name: 'Farhadskaya Bulochka',
  tagline: 'Family Bakery \u{1F968} — est. 1996',
  slogan: 'Bolalikdagi hotiralaringizni his qiling',

  phone: '+998 98 141 77 77',
  phoneHref: 'tel:+998981417777',
  instagram: 'https://www.instagram.com/farhadskaya_bulochka',

  /** Har kuni 7:00 dan 19:00 gacha */
  hours: { open: 7, close: 19, text: 'Har kuni 7:00 – 19:00' },

  /** Narxlar Instagram menyusida "…so'mdan" deb beriladi */
  priceNote: 'Narxlar boshlang‘ich — hajmiga qarab o‘zgarishi mumkin',

  /** Filiallar — Mini App "Profil" bo'limida va botning /manzil buyrug'ida */
  branches: [
    {
      id: 'farhod',
      name: 'Farhod bozori (asosiy)',
      address: 'Farhod ko‘chasi, Farxod Dehqon bozori yonida',
    },
    {
      id: 'lutfiy',
      name: 'Lutfiy',
      address: 'Lutfiy ko‘chasi, 21a',
    },
    {
      id: 'pekarnya',
      name: 'Pekarnya (ishlab chiqarish)',
      address: 'Uchtepa tumani, Chilonzor massivi, 23-kvartal, 56A',
    },
    {
      id: 'jararyk',
      name: 'Jararyk',
      address: 'Jararyk massivi, 7/1',
    },
  ],

  delivery: {
    text: 'Yetkazib berish Yandex orqali',
    note: 'Yetkazib berish narxi alohida to‘lanadi',
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
