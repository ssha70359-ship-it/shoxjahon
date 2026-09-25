// Inline tugmalar: oshxona kartochkasi va stop-list.

import type { InlineKeyboardButton, InlineKeyboardMarkup } from 'telegraf/types';

import { ITEMS, PIZZAS, TOPPINGS, tr } from '../../shared/menu.js';
import type { OrderStatus } from '../../shared/types.js';
import type { OrderRecord } from '../services/mappers.js';

interface NextStep {
  to: OrderStatus;
  text: string;
}

function nextStep(order: OrderRecord): NextStep | null {
  switch (order.status) {
    case 'new':
      return { to: 'accepted', text: '✅ Qabul qilish' };
    case 'accepted':
      return { to: 'baking', text: '🔥 Pechga' };
    case 'baking':
      return order.mode === 'pickup'
        ? { to: 'ready', text: '📦 Tayyor' }
        : { to: 'delivering', text: '🛵 Kuryerga berildi' };
    case 'delivering':
      return { to: 'done', text: '🏁 Yetkazildi' };
    case 'ready':
      return { to: 'done', text: '🏁 Mijoz oldi' };
    default:
      return null;
  }
}

const CANCELLABLE: OrderStatus[] = ['pending_payment', 'new', 'accepted', 'baking'];

/** Callback formati: st:<buyurtma id>:<yangi holat> */
export const STATUS_CALLBACK = /^st:(\d+):([a-z_]+)$/;

export function adminKeyboard(order: OrderRecord): InlineKeyboardMarkup {
  const rows: InlineKeyboardButton[][] = [];
  const next = nextStep(order);

  const row: InlineKeyboardButton[] = [];
  if (next) row.push({ text: next.text, callback_data: `st:${order.id}:${next.to}` });
  if (CANCELLABLE.includes(order.status)) row.push({ text: '❌ Bekor', callback_data: `st:${order.id}:cancelled` });
  if (row.length) rows.push(row);

  const { address } = order;
  if (address?.lat != null && address.lng != null && order.status !== 'done' && order.status !== 'cancelled') {
    rows.push([
      { text: '🗺 Yandex xarita', url: `https://yandex.uz/maps/?pt=${address.lng},${address.lat}&z=17&l=map` },
      { text: '🧭 Google', url: `https://maps.google.com/?q=${address.lat},${address.lng}` },
    ]);
  }

  return { inline_keyboard: rows };
}

// --- Stop-list -------------------------------------------------------------

export const STOP_PAGES = [
  { title: 'Pitsalar', entries: PIZZAS.filter((pizza) => !pizza.hidden) },
  { title: 'Masalliqlar', entries: TOPPINGS },
  { title: 'Boshqa', entries: ITEMS },
];

export const STOP_PAGE_CALLBACK = /^slp:(\d)$/;
export const STOP_TOGGLE_CALLBACK = /^sl:(\d):([a-z0-9-]+)$/;

export function stopKeyboard(page: number, isStopped: (id: string) => boolean): InlineKeyboardMarkup {
  const { entries } = STOP_PAGES[page] ?? STOP_PAGES[0]!;
  const rows: InlineKeyboardButton[][] = [];

  for (let i = 0; i < entries.length; i += 2) {
    rows.push(
      entries.slice(i, i + 2).map((entry) => ({
        text: `${isStopped(entry.id) ? '⛔' : '✅'} ${tr(entry.name, 'uz')}`,
        callback_data: `sl:${page}:${entry.id}`,
      })),
    );
  }

  rows.push(STOP_PAGES.map((p, i) => ({ text: i === page ? `• ${p.title} •` : p.title, callback_data: `slp:${i}` })));
  return { inline_keyboard: rows };
}
