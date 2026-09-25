import { SHOP } from './shop.js';
import type { Lang } from './types.js';

// Raqam guruhlari va valyuta orasida uzilmas bo'sh joy — narx ikki qatorga bo'linib ketmasin
const NBSP = '\u00a0';
const MINUS = '\u2212';

const CURRENCY: Record<Lang, string> = { uz: 'soʻm', ru: 'сум' };

/** 89000 → "89 000 soʻm" */
export function formatMoney(value: number, lang: Lang = 'uz', { withCurrency = true } = {}): string {
  const sign = value < 0 ? MINUS : '';
  const digits = String(Math.abs(Math.round(value))).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return withCurrency ? `${sign}${digits}${NBSP}${CURRENCY[lang]}` : `${sign}${digits}`;
}

/** Toshkent vaqti bo'yicha "14:35" */
export function formatTime(ms: number): string {
  const date = new Date(ms + SHOP.utcOffsetMinutes * 60_000);
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

const MONTHS: Record<Lang, string[]> = {
  uz: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
  ru: [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ],
};

/** "23-sentabr, 14:35" / "23 сентября, 14:35" */
export function formatDate(ms: number, lang: Lang = 'uz'): string {
  const date = new Date(ms + SHOP.utcOffsetMinutes * 60_000);
  const day = date.getUTCDate();
  const month = (MONTHS[lang] ?? MONTHS.uz)[date.getUTCMonth()];
  const head = lang === 'ru' ? `${day} ${month}` : `${day}-${month}`;
  return `${head}, ${formatTime(ms)}`;
}

/** +998901234567 → "+998 90 123 45 67" */
export function formatPhone(phone: string | null | undefined): string {
  const match = String(phone || '').match(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return match ? `+998 ${match[1]} ${match[2]} ${match[3]} ${match[4]}` : String(phone || '');
}
