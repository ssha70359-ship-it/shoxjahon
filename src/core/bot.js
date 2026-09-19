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

/** Buyurtma ID'sini Telegram invoice payload'iga aylantiradi */
export function buildOrderPayload(orderId) {
  return `order:${orderId}`;
}

/** Invoice payload'idan buyurtma ID'sini ajratib oladi (noto'g'ri bo'lsa null) */
export function parseOrderPayload(payload) {
  const match = /^order:(\d+)$/.exec(payload || '');
  return match ? Number(match[1]) : null;
}

/**
 * Buyurtma uchun Payme (Telegram Payments) hisob-fakturasini yuboradi.
 * PAYMENT_PROVIDER_TOKEN sozlanmagan bo'lsa chaqirilmaydi.
 */
export async function sendOrderInvoice(telegramId, order) {
  const items = Array.isArray(order.items) ? order.items : [];

  const description =
    items.map((item) => `${item.name} × ${item.qty}`).join(', ').slice(0, 255) ||
    'Pizza buyurtmasi';

  const prices = items.map((item) => ({
    label: `${item.name} × ${item.qty}`,
    amount: Math.round(item.sum * 100),
  }));

  try {
    await bot.telegram.sendInvoice(telegramId, {
      title: `Buyurtma №${order.id}`,
      description,
      payload: buildOrderPayload(order.id),
      provider_token: config.bot.paymentProviderToken,
      currency: 'UZS',
      prices,
      photo_url: items[0]?.imageUrl || undefined,
      need_phone_number: false,
      need_shipping_address: false,
    });
    return true;
  } catch (error) {
    console.error(`⚠️  ${telegramId} ga hisob-faktura yuborilmadi:`, error.message);
    return false;
  }
}

export default bot;
