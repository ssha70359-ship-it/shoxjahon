import config from '../config/default.js';
import { shop, isOpenNow } from '../config/shop.js';
import UserModel from '../models/User.js';
import OrderModel from '../models/Order.js';
import { sendMessageToUser, parseOrderPayload } from '../core/bot.js';

/** Mini App tugmasi bo'lgan klaviatura */
function mainKeyboard() {
  const url = config.bot.webAppUrl;

  if (!url || !url.startsWith('https://')) {
    return {
      reply_markup: {
        keyboard: [[{ text: '\u{1F4DE} Telefon raqamni yuborish', request_contact: true }]],
        resize_keyboard: true,
      },
    };
  }

  return {
    reply_markup: {
      keyboard: [
        [{ text: '\u{1F968} Buyurtma berish', web_app: { url } }],
        [{ text: '\u{1F4DE} Telefon raqamni yuborish', request_contact: true }],
      ],
      resize_keyboard: true,
    },
  };
}

/**
 * Shu suhbatning "Menu" tugmasini joriy Mini App manziliga bog'laydi.
 * Chat uchun qo'yilgan tugma BotFather'dagi umumiy sozlamadan ustun turadi,
 * shuning uchun eski manzil (masalan example.com) ochilib qolmaydi.
 */
async function syncMenuButton(ctx) {
  const url = config.bot.webAppUrl;
  const chatId = ctx.chat?.id;

  if (!chatId) return;

  const menuButton =
    url && url.startsWith('https://')
      ? { type: 'web_app', text: '\u{1F968} Buyurtma berish', web_app: { url } }
      : { type: 'commands' };

  try {
    await ctx.telegram.setChatMenuButton({ chat_id: chatId, menu_button: menuButton });
  } catch (error) {
    console.error('⚠️  Menyu tugmasi yangilanmadi:', error.message);
  }
}

export const botController = {
  /** /start */
  async start(ctx) {
    const from = ctx.from;

    await UserModel.upsert({
      telegramId: from.id,
      firstName: from.first_name,
      lastName: from.last_name,
      username: from.username,
    });

    const url = config.bot.webAppUrl;
    const hasWebApp = url?.startsWith('https://');

    // Eski (BotFather'da qolgan) manzilni har "/start" da yangilaymiz
    await syncMenuButton(ctx);

    const text =
      `Salom, <b>${from.first_name}</b>! \u{1F44B}\n\n` +
      '<b>Farhadskaya Bulochka</b> — Family Bakery \u{1F968}\n' +
      'Issiqqina bulochka va nonlarni uyingizgacha yetkazib beramiz.\n' +
      'Har kuni 7:00 – 19:00 \u{23F0}\n\n' +
      (hasWebApp
        ? 'Buyurtma berish uchun pastdagi <b>\u{1F968} Buyurtma berish</b> tugmasini bosing.'
        : '⚠️ Mini App hali sozlanmagan. Kompyuterda <code>npm start</code> ni qayta ishga tushiring.');

    const extra = { parse_mode: 'HTML', ...mainKeyboard() };

    await ctx.reply(text, extra);

    // Qo'shimcha ishonchli yo'l: xabar ichidagi tugma har doim joriy manzilni oladi
    if (hasWebApp) {
      await ctx.reply('Yoki shu tugma orqali oching \u{1F447}', {
        reply_markup: {
          inline_keyboard: [[{ text: '\u{1F968} Buyurtma qilish', web_app: { url } }]],
        },
      });
    }
  },

  /** /help */
  async help(ctx) {
    await ctx.reply(
      'ℹ️ <b>Yordam</b>\n\n' +
        '/start — Botni qayta ishga tushirish\n' +
        '/manzil — Filiallar, telefon va ish vaqti\n' +
        '/help — Yordam\n\n' +
        'Buyurtma berish uchun pastdagi tugmadan foydalaning \u{1F968}',
      { parse_mode: 'HTML', ...mainKeyboard() },
    );
  },

  /** /manzil — filiallar, telefon va ish vaqti */
  async branches(ctx) {
    const list = shop.branches
      .map((branch, index) => `${index + 1}. <b>${branch.name}</b>\n   ${branch.address}`)
      .join('\n\n');

    const status = isOpenNow() ? '\u{1F7E2} Hozir ochiq' : '\u{1F534} Hozir yopiq';

    await ctx.reply(
      `\u{1F4CD} <b>${shop.name}</b> — filiallarimiz\n\n` +
        `${list}\n\n` +
        `\u{1F551} ${shop.hours.text}\n` +
        `${status}\n` +
        `\u{1F4DE} ${shop.phone}\n` +
        `\u{1F69A} ${shop.delivery.text}`,
      { parse_mode: 'HTML', ...mainKeyboard() },
    );
  },

  /** Telefon raqam yuborilganda */
  async contact(ctx) {
    const phone = ctx.message?.contact?.phone_number;
    if (!phone) return;

    await UserModel.upsert({
      telegramId: ctx.from.id,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
      username: ctx.from.username,
      phone,
    });

    await ctx.reply(`✅ Rahmat! Raqamingiz saqlandi: <b>${phone}</b>`, {
      parse_mode: 'HTML',
      ...mainKeyboard(),
    });
  },

  /** /admin — faqat adminlar uchun panel manzili */
  async admin(ctx) {
    if (!config.admin.ids.includes(String(ctx.from.id))) return;

    await ctx.reply(
      `\u{1F5A5}️ Admin panel: ${config.admin.panelUrl}\n` +
        'Barcha buyurtmalar va mahsulotlar shu yerda boshqariladi.',
    );
  },

  /** Boshqa matnlar */
  async fallback(ctx) {
    await ctx.reply('Buyurtma berish uchun pastdagi tugmani bosing \u{1F447}', mainKeyboard());
  },

  /** Telegram to'lov tasdig'idan oldin (10 soniya ichida javob berish shart) */
  async preCheckout(ctx) {
    const query = ctx.preCheckoutQuery;

    try {
      const orderId = parseOrderPayload(query.invoice_payload);
      if (!orderId) {
        return ctx.answerPreCheckoutQuery(false, 'Buyurtma topilmadi. Qaytadan urinib ko‘ring.');
      }

      const order = await OrderModel.findById(orderId);
      if (!order) {
        return ctx.answerPreCheckoutQuery(false, 'Bunday buyurtma topilmadi.');
      }

      if (order.paymentStatus === 'TOLANGAN') {
        return ctx.answerPreCheckoutQuery(false, 'Bu buyurtma allaqachon to‘langan.');
      }

      const expectedAmount = Math.round(order.total * 100);
      if (query.total_amount !== expectedAmount) {
        return ctx.answerPreCheckoutQuery(false, 'Buyurtma summasi mos kelmadi. Qaytadan buyurtma bering.');
      }

      return ctx.answerPreCheckoutQuery(true);
    } catch (error) {
      console.error('⚠️  pre_checkout xatosi:', error.message);
      try {
        await ctx.answerPreCheckoutQuery(false, 'Ichki xatolik. Qaytadan urinib ko‘ring.');
      } catch {
        /* javob ham bormadi - Telegram 10s dan keyin o'zi bekor qiladi */
      }
    }
  },

  /** To'lov muvaffaqiyatli yakunlangach */
  async successfulPayment(ctx) {
    try {
      const payment = ctx.message.successful_payment;
      const orderId = parseOrderPayload(payment.invoice_payload);
      if (!orderId) return;

      const order = await OrderModel.markPaid(orderId, {
        telegramChargeId: payment.telegram_payment_charge_id,
        providerChargeId: payment.provider_payment_charge_id,
      });

      await ctx.reply(
        '✅ To‘lov muvaffaqiyatli qabul qilindi!\n\n' +
          `<b>Buyurtma №${order.id}</b>\n` +
          `Jami: <b>${order.total.toLocaleString('ru-RU')} so‘m</b>\n\n` +
          'Kuryerimiz tez orada bog‘lanadi \u{1F968}',
        { parse_mode: 'HTML' },
      );
    } catch (error) {
      console.error('⚠️  successful_payment xatosi:', error.message);
    }
  },

  /** Buyurtma qabul qilingani haqida mijozga xabar */
  async notifyOrderAccepted(telegramId, order) {
    const items = Array.isArray(order.items) ? order.items : [];
    const list = items
      .map((item) => `  • ${item.name} × ${item.qty}`)
      .join('\n');

    const text =
      `${config.messages.orderAccepted}\n\n` +
      `<b>Buyurtma №${order.id}</b>\n` +
      `${list}\n\n` +
      `Jami: <b>${order.total.toLocaleString('ru-RU')} so‘m</b>\n` +
      `Manzil: ${order.location}`;

    return sendMessageToUser(telegramId, text);
  },
};

export default botController;
