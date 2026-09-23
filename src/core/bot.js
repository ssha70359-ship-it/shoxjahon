import { Telegraf } from 'telegraf';
import config from '../config/default.js';

export const bot = new Telegraf(config.bot.token, {
  // Odatda bo'sh qoladi. Faqat lokal Bot API serveri yoki test uchun kerak.
  telegram: config.bot.apiRoot ? { apiRoot: config.bot.apiRoot } : undefined,
});

bot.catch((error, ctx) => {
  console.error(`❌ Bot xatosi (${ctx?.updateType}):`, error?.message || error);
});

/**
 * Mijozga to'g'ridan-to'g'ri xabar yuborish (masalan buyurtma tasdiqlangach).
 */
export async function sendMessageToUser(telegramId, text, extra = {}) {
  try {
    await bot.telegram.sendMessage(telegramId, text, { parse_mode: 'HTML', ...extra });
    return true;
  } catch (error) {
    console.error(`⚠️  ${telegramId} ga xabar yuborilmadi:`, error.message);
    return false;
  }
}

/**
 * Adminlarga (ADMIN_IDS) xabar yuboradi. Bittasiga bormasa ham qolganlariga boradi.
 * Nechta adminga yetib borganini qaytaradi.
 */
export async function sendToAdmins(text, extra = {}) {
  const results = await Promise.all(
    config.admin.ids.map((id) => sendMessageToUser(id, text, extra)),
  );
  return results.filter(Boolean).length;
}

/** Buyurtma va to'lov usulini Telegram invoice payload'iga aylantiradi */
export function buildOrderPayload(orderId, method) {
  return method ? `order:${orderId}:${method}` : `order:${orderId}`;
}

/**
 * Invoice payload'ini o'qiydi. Eski format ("order:12") ham tushuniladi.
 * Noto'g'ri bo'lsa null qaytaradi.
 */
export function parseOrderPayload(payload) {
  const match = /^order:(\d+)(?::(CLICK|PAYME))?$/.exec(payload || '');
  if (!match) return null;

  return { orderId: Number(match[1]), method: match[2] || null };
}

export default bot;
