/** 39000 -> "39 000 so'm" */
export function money(value) {
  return `${Number(value || 0).toLocaleString('ru-RU').replace(/ /g, ' ')} so‘m`;
}

/** 39000 -> "39 000" */
export function num(value) {
  return Number(value || 0).toLocaleString('ru-RU').replace(/ /g, ' ');
}

/** ISO sana -> "17.09.2026, 14:30" */
export function date(value) {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** "Pomidor, Pishloq, Rayhon" -> ["Pomidor", "Pishloq", "Rayhon"] */
export function ingredients(description) {
  return String(description || '')
    .split(/[,;\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export const STATUS_LABEL = {
  KUTILMOQDA: 'Kutilmoqda',
  YETKAZILDI: 'Yetkazildi',
  BEKOR_QILINDI: 'Bekor qilindi',
};

export const PAYMENT_LABEL = {
  NAQD: 'Naqd',
  CLICK: 'Click',
  PAYME: 'Payme',
};

/** Karta orqali to'lanadigan usullar */
export const CARD_METHODS = ['CLICK', 'PAYME'];
