import config from '../config/default.js';
import { shop, isOpenNow } from '../config/shop.js';
import UserModel from '../models/User.js';
import OrderModel from '../models/Order.js';
import { sendMessageToUser, sendToAdmins, parseOrderPayload } from '../core/bot.js';
import { METHODS, toMinorUnits } from '../services/payments.js';

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

const sum = (value) => `${Number(value).toLocaleString('ru-RU')} so‘m`;

/**
 * Mijoz yozgan matnni (manzil, izoh, ism) HTML xabarga xavfsiz qo'yish.
 * Aks holda "<" belgisi Telegram'da xabarni buzadi va admin buyurtmani ko'rmaydi.
 */
const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

function itemLines(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  return items.map((item) => `  • ${esc(item.name)} × ${item.qty} — ${sum(item.sum)}`).join('\n');
}

function paymentLine(order) {
  const method = METHODS[order.paymentMethod] || METHODS.NAQD;
  const status = order.paymentStatus === 'TOLANGAN' ? '✅ to‘langan' : '⏳ to‘lanmagan';
  return method.card ? `\u{1F4B3} ${method.title} · ${status}` : '\u{1F4B5} Naqd · kuryerga';
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
        `\u{1F69A} ${shop.delivery.text}\n` +
        `\u{1F4B8} ${shop.delivery.note}`,
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
      const parsed = parseOrderPayload(query.invoice_payload);
      if (!parsed) {
        return ctx.answerPreCheckoutQuery(false, 'Buyurtma topilmadi. Qaytadan urinib ko‘ring.');
      }

      const order = await OrderModel.findById(parsed.orderId);
      if (!order) {
        return ctx.answerPreCheckoutQuery(false, 'Bunday buyurtma topilmadi.');
      }

      if (String(order.user?.telegramId) !== String(query.from.id)) {
        return ctx.answerPreCheckoutQuery(false, 'Bu buyurtma sizga tegishli emas.');
      }

      if (order.paymentStatus === 'TOLANGAN') {
        return ctx.answerPreCheckoutQuery(false, 'Bu buyurtma allaqachon to‘langan.');
      }

      if (order.status === 'BEKOR_QILINDI') {
        return ctx.answerPreCheckoutQuery(false, 'Bu buyurtma bekor qilingan.');
      }

      if (query.total_amount !== toMinorUnits(order.total)) {
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
      const parsed = parseOrderPayload(payment.invoice_payload);
      if (!parsed) return;

      const { order, firstTime } = await OrderModel.markPaid(parsed.orderId, {
        telegramChargeId: payment.telegram_payment_charge_id,
        providerChargeId: payment.provider_payment_charge_id,
        method: parsed.method,
      });

      // Telegram bir xil to'lovni qayta yuborsa - ikkinchi marta xabar bermaymiz
      if (!order || !firstTime) return;

      await ctx.reply(
        '✅ <b>To‘lov qabul qilindi!</b>\n\n' +
          `<b>Buyurtma №${order.id}</b>\n` +
          `${itemLines(order)}\n\n` +
          `Jami: <b>${sum(order.total)}</b>\n` +
          `${paymentLine(order)}\n\n` +
          'Buyurtmangiz tayyorlanmoqda. Kuryer tez orada bog‘lanadi \u{1F968}',
        { parse_mode: 'HTML' },
      );

      await botController.notifyAdmins(order);
    } catch (error) {
      console.error('⚠️  successful_payment xatosi:', error.message);
    }
  },

  /** Yangi buyurtma haqida adminlarga (naqd - darhol, karta - to'langach) */
  async notifyAdmins(order) {
    if (config.admin.ids.length === 0) return 0;

    const customer = order.user
      ? `${esc(order.user.firstName)}${order.user.username ? ` (@${esc(order.user.username)})` : ''}`
      : 'Mijoz';

    const map =
      Number.isFinite(order.lat) && Number.isFinite(order.lng)
        ? `\n\u{1F5FA} <a href="https://maps.google.com/?q=${Number(order.lat)},${Number(order.lng)}">Xaritada ochish</a>`
        : '';

    const text =
      `\u{1F195} <b>Yangi buyurtma №${order.id}</b>\n\n` +
      `${itemLines(order)}\n\n` +
      `Jami: <b>${sum(order.total)}</b>\n` +
      `${paymentLine(order)}\n\n` +
      `\u{1F464} ${customer}\n` +
      `\u{1F4DE} ${esc(order.phone || '—')}\n` +
      `\u{1F4CD} ${esc(order.location)}${map}` +
      (order.comment ? `\n\u{1F4AC} ${esc(order.comment)}` : '');

    return sendToAdmins(text, { disable_web_page_preview: true });
  },

  /** Buyurtma qabul qilingani haqida mijozga xabar */
  async notifyOrderAccepted(telegramId, order) {
    const text =
      `${config.messages.orderAccepted}\n\n` +
      `<b>Buyurtma №${order.id}</b>\n` +
      `${itemLines(order)}\n\n` +
      `Jami: <b>${sum(order.total)}</b>\n` +
      `${paymentLine(order)}\n` +
      `Manzil: ${esc(order.location)}`;

    return sendMessageToUser(telegramId, text);
  },
};

export default botController;
