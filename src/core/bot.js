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

export default bot;
