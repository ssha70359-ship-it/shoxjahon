import crypto from 'node:crypto';

import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';

import { ITEMS, PIZZAS, TOPPINGS, tr } from '../shared/menu.js';
import { OrderError, describeLine } from '../shared/pricing.js';
import { formatDate, formatMoney } from '../shared/format.js';
import { SHOP } from '../shared/shop.js';
import { STATUS_LABELS } from '../shared/status.js';
import { displayName } from './services/users.js';
import { adminKeyboard, adminOrderText, esc, groupShares, texts } from './texts.js';

const STOP_PAGES = [
  { title: 'Pitsalar', entries: PIZZAS.filter((pizza) => !pizza.hidden) },
  { title: 'Masalliqlar', entries: TOPPINGS },
  { title: 'Boshqa', entries: ITEMS },
];

/**
 * Telegram bilan bog'liq hamma narsa: bot buyruqlari, oshxona kartochkalari,
 * mijozga xabarlar, to'lov va "Davra" ulashish.
 * BOT_TOKEN bo'lmasa — hech narsa qilmaydigan "stub" qaytaradi (API baribir ishlaydi).
 */
export function createTelegram({ config, services, bus, log = console }) {
  const { users, orders, stoplist } = services;
  const webAppUrl = config.publicUrl.startsWith('https://') ? config.publicUrl : '';

  const api = {
    bot: null,
    username: null,
    canPay: false,

    appLink(param) {
      if (!api.username) return null;
      if (config.miniAppShortName) {
        return `https://t.me/${api.username}/${config.miniAppShortName}?startapp=${param}`;
      }
      return `https://t.me/${api.username}?start=${param}`;
    },

    async createInvoiceLink() {
      throw new OrderError('online_disabled');
    },

    async prepareGroupShare(user, group) {
      return { preparedId: null, link: api.appLink(`g_${group.code}`), text: shareText(user, group) };
    },

    async start() {},
    async stop() {},
  };

  function shareText(user, group) {
    const lang = user.language;
    return lang === 'ru'
      ? `${displayName(user)} зовёт вас в давру ${group.code} — выберите себе пиццу 🍕`
      : `${displayName(user)} sizni ${group.code} davrasiga chaqiryapti — oʻzingizga pitsa tanlang 🍕`;
  }

  if (!config.botToken) {
    log.warn('⚠️  BOT_TOKEN yoʻq — bot oʻchiq, faqat API va Mini App ishlaydi');
    return api;
  }

  const bot = new Telegraf(
    config.botToken,
    config.telegramApiRoot ? { telegram: { apiRoot: config.telegramApiRoot } } : {},
  );
  api.bot = bot;
  api.canPay = Boolean(config.paymentProviderToken);

  const openButton = (text, query = '') => ({ text, web_app: { url: `${webAppUrl}${query}` } });

  function isStaff(ctx) {
    if (config.adminIds.length) return config.adminIds.includes(ctx.from?.id);
    return Boolean(config.adminChatId) && String(ctx.chat?.id) === config.adminChatId;
  }

  async function safe(promise, what) {
    try {
      return await promise;
    } catch (error) {
      const description = error?.response?.description || error.message;
      if (!/message is not modified/.test(description)) log.warn(`[bot] ${what}: ${description}`);
      return null;
    }
  }

  // --- Mijoz buyruqlari ----------------------------------------------------

  bot.start(async (ctx) => {
    const user = users.upsertFromTelegram(ctx.from);
    const t = texts(user.language);

    if (!webAppUrl) return ctx.reply(t.notConfigured);

    // Shu suhbatning menyu tugmasini joriy manzilga bog'laymiz — eski manzil qolib ketmasin
    await safe(
      ctx.setChatMenuButton({ type: 'web_app', text: t.menuButton, web_app: { url: webAppUrl } }),
      'setChatMenuButton',
    );

    const payload = String(ctx.payload || '');
    const group = payload.match(/^g_([A-Za-z0-9]{6})$/);
    const order = payload.match(/^o_(\d+)$/);

    if (group) {
      const code = group[1].toUpperCase();
      return ctx.reply(t.groupInvite(code), {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[openButton(t.joinGroup, `?group=${code}`)]] },
      });
    }

    if (order) {
      return ctx.reply(`🧾 #${order[1]}`, {
        reply_markup: { inline_keyboard: [[openButton(t.track, `?order=${order[1]}`)]] },
      });
    }

    return ctx.reply(t.welcome(ctx.from.first_name || ''), {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[openButton(t.open)]] },
    });
  });

  bot.command('menu', async (ctx) => {
    const t = texts(users.upsertFromTelegram(ctx.from).language);
    if (!webAppUrl) return ctx.reply(t.notConfigured);
    return ctx.reply(`${SHOP.name} 🔥`, { reply_markup: { inline_keyboard: [[openButton(t.open)]] } });
  });

  bot.help(async (ctx) => {
    const t = texts(users.upsertFromTelegram(ctx.from).language);
    return ctx.reply(t.help, { parse_mode: 'HTML' });
  });

  bot.command('orders', async (ctx) => {
    const user = users.upsertFromTelegram(ctx.from);
    const t = texts(user.language);
    const list = orders.listByUser(user.id, 5);
    if (list.length === 0) return ctx.reply(t.noOrders);

    const lines = list.map(
      (order) =>
        `#${order.id} · ${formatDate(order.createdAt, user.language)} · ${formatMoney(order.total, user.language)} · ${tr(STATUS_LABELS[order.status], user.language)}`,
    );
    return ctx.reply(`${t.ordersTitle}\n\n${lines.join('\n')}`, { parse_mode: 'HTML' });
  });

  // --- Oshxona (xodimlar) --------------------------------------------------

  bot.command('stats', async (ctx) => {
    if (!isStaff(ctx)) return;
    const s = orders.todayStats();
    const top = s.top.length
      ? s.top.map((entry, i) => `${i + 1}. ${esc(entry.title)} — ${entry.qty} ta`).join('\n')
      : '—';

    return ctx.reply(
      [
        '📊 <b>Bugun</b>',
        '',
        `Buyurtmalar: <b>${s.count}</b> (jarayonda: ${s.active}, bekor: ${s.cancelled})`,
        `Tushum: <b>${formatMoney(s.revenue, 'uz')}</b>`,
        `Oʻrtacha chek: ${formatMoney(s.average, 'uz')}`,
        '',
        '🏆 <b>Top</b>',
        top,
      ].join('\n'),
      { parse_mode: 'HTML' },
    );
  });

  function stopKeyboard(page) {
    const { entries } = STOP_PAGES[page];
    const rows = [];

    for (let i = 0; i < entries.length; i += 2) {
      rows.push(
        entries.slice(i, i + 2).map((entry) => ({
          text: `${stoplist.has(entry.id) ? '⛔' : '✅'} ${tr(entry.name, 'uz')}`,
          callback_data: `sl:${page}:${entry.id}`,
        })),
      );
    }

    rows.push(
      STOP_PAGES.map((p, i) => ({
        text: i === page ? `• ${p.title} •` : p.title,
        callback_data: `slp:${i}`,
      })),
    );

    return { inline_keyboard: rows };
  }

  const STOP_TEXT =
    '⛔ <b>Stop-list</b>\n\nTugagan mahsulotni bosing — u Mini Appʼda «tugadi» deb koʻrinadi va buyurtma qilib boʻlmaydi. Yana bossangiz qaytadi.';

  bot.command('stop', async (ctx) => {
    if (!isStaff(ctx)) return;
    return ctx.reply(STOP_TEXT, { parse_mode: 'HTML', reply_markup: stopKeyboard(0) });
  });

  bot.action(/^slp:(\d)$/, async (ctx) => {
    if (!isStaff(ctx)) return ctx.answerCbQuery('Ruxsat yoʻq');
    const page = Math.min(Number(ctx.match[1]), STOP_PAGES.length - 1);
    await safe(ctx.editMessageReplyMarkup(stopKeyboard(page)), 'stop page');
    return ctx.answerCbQuery();
  });

  bot.action(/^sl:(\d):([a-z0-9-]+)$/, async (ctx) => {
    if (!isStaff(ctx)) return ctx.answerCbQuery('Ruxsat yoʻq');
    const page = Math.min(Number(ctx.match[1]), STOP_PAGES.length - 1);

    try {
      const stopped = stoplist.toggle(ctx.match[2]);
      await safe(ctx.editMessageReplyMarkup(stopKeyboard(page)), 'stop toggle');
      return ctx.answerCbQuery(stopped ? '⛔ Toʻxtatildi' : '✅ Qaytarildi');
    } catch (error) {
      return ctx.answerCbQuery(error.message);
    }
  });

  bot.action(/^st:(\d+):([a-z_]+)$/, async (ctx) => {
    if (!isStaff(ctx)) return ctx.answerCbQuery('Ruxsat yoʻq', { show_alert: true });

    try {
      const order = orders.setStatus(Number(ctx.match[1]), ctx.match[2]);
      return ctx.answerCbQuery(`#${order.id}: ${tr(STATUS_LABELS[order.status], 'uz')}`);
    } catch (error) {
      const current = orders.get(Number(ctx.match[1]));
      if (current) await refreshAdminCard(current);
      const reason = error instanceof OrderError ? 'Bu holatga oʻtkazib boʻlmaydi' : 'Xatolik';
      return ctx.answerCbQuery(reason, { show_alert: true });
    }
  });

  // --- To'lov (Telegram Payments: Click / Payme provayderlari) --------------

  bot.on('pre_checkout_query', async (ctx) => {
    const query = ctx.preCheckoutQuery;
    const id = Number(String(query.invoice_payload).replace(/^order:/, ''));
    const order = orders.get(id);
    const valid =
      order &&
      order.status === 'pending_payment' &&
      query.currency === SHOP.currency &&
      query.total_amount === order.total * 100;

    if (valid) return ctx.answerPreCheckoutQuery(true);

    const t = texts(users.get(ctx.from.id)?.language);
    return ctx.answerPreCheckoutQuery(false, t.payProblem);
  });

  bot.on(message('successful_payment'), async (ctx) => {
    const payment = ctx.message.successful_payment;
    const id = Number(String(payment.invoice_payload).replace(/^order:/, ''));

    try {
      orders.markPaid(id);
    } catch (error) {
      log.error(`[bot] toʻlov #${id} belgilanmadi:`, error.message);
    }
  });

  bot.catch((error, ctx) => {
    log.error(`[bot] ${ctx?.updateType}:`, error);
  });

  // --- Xabarlar ------------------------------------------------------------

  async function sendAdminCard(order) {
    if (!config.adminChatId) {
      log.warn(`[bot] ADMIN_CHAT_ID yoʻq — #${order.id} oshxonaga yuborilmadi`);
      return;
    }

    const sent = await safe(
      bot.telegram.sendMessage(config.adminChatId, adminOrderText(order, users.get(order.userId)), {
        parse_mode: 'HTML',
        reply_markup: adminKeyboard(order),
        link_preview_options: { is_disabled: true },
      }),
      `admin card #${order.id}`,
    );
    if (!sent) return;

    orders.setAdminMessage(order.id, config.adminChatId, sent.message_id);

    if (order.address?.lat != null) {
      await safe(
        bot.telegram.sendLocation(config.adminChatId, order.address.lat, order.address.lng, {
          reply_parameters: { message_id: sent.message_id },
        }),
        'admin location',
      );
    }
  }

  async function refreshAdminCard(order) {
    const fresh = orders.get(order.id);
    if (!fresh?.adminMessageId) return;

    await safe(
      bot.telegram.editMessageText(
        fresh.adminChatId,
        fresh.adminMessageId,
        undefined,
        adminOrderText(fresh, users.get(fresh.userId)),
        {
          parse_mode: 'HTML',
          reply_markup: adminKeyboard(fresh),
          link_preview_options: { is_disabled: true },
        },
      ),
      `admin card edit #${fresh.id}`,
    );
  }

  async function notify(userId, html, orderId) {
    const user = users.get(userId);
    const t = texts(user?.language);
    const extra = { parse_mode: 'HTML' };

    if (webAppUrl && orderId) {
      extra.reply_markup = { inline_keyboard: [[openButton(t.track, `?order=${orderId}`)]] };
    }

    await safe(bot.telegram.sendMessage(userId, html, extra), `notify ${userId}`);
  }

  async function notifyCreated(order) {
    const host = users.get(order.userId);
    await notify(order.userId, texts(host?.language).created(order), order.id);

    if (!order.groupCode) return;

    const shares = new Map(groupShares(order).map((entry) => [entry.id, entry.amount]));
    const memberIds = new Set(order.items.map((item) => item.by?.id).filter(Boolean));
    memberIds.delete(order.userId);

    for (const id of memberIds) {
      const member = users.get(id);
      await notify(id, texts(member?.language).groupCreated(order, shares.get(id)), order.id);
    }
  }

  async function notifyStatus(order) {
    const recipients = new Set([order.userId]);
    // Davradoshlarga faqat eng muhim o'zgarishlar
    if (order.groupCode && ['delivering', 'ready', 'done'].includes(order.status)) {
      for (const item of order.items) if (item.by?.id) recipients.add(item.by.id);
    }

    for (const id of recipients) {
      const user = users.get(id);
      const template = texts(user?.language).status[order.status];
      if (!template) continue;
      // Tilimlar faqat buyurtma egasiga yoziladi
      const own = id === order.userId;
      const html = template(own ? order : { ...order, slicesEarned: 0 }, user?.slices ?? 0);
      await notify(id, html, order.status === 'done' || order.status === 'cancelled' ? null : order.id);
    }
  }

  bus.on('order:created', (order) => {
    if (order.status === 'pending_payment') return;
    sendAdminCard(order);
    notifyCreated(order);
  });

  bus.on('order:paid', async (order) => {
    const user = users.get(order.userId);
    if (order.paid) await notify(order.userId, texts(user?.language).paid(order));
    sendAdminCard(order);
    notifyCreated(order);
  });

  bus.on('order:updated', (order, from) => {
    if (from === 'pending_payment') return; // order:paid allaqachon hammasini qildi
    refreshAdminCard(order);
    notifyStatus(order);
  });

  // --- Tashqi API ----------------------------------------------------------

  api.createInvoiceLink = async (order, lang = 'uz') => {
    if (!api.canPay) throw new OrderError('online_disabled');
    const t = texts(lang);
    const description = order.items
      .map((item) => `${item.qty}× ${describeLine(item.config, lang).title}`)
      .join(', ')
      .slice(0, 250);

    return bot.telegram.createInvoiceLink({
      title: t.payTitle(order.id),
      description,
      payload: `order:${order.id}`,
      provider_token: config.paymentProviderToken,
      currency: SHOP.currency,
      prices: [{ label: t.payLabel, amount: order.total * 100 }],
    });
  };

  api.prepareGroupShare = async (user, group) => {
    const link = api.appLink(`g_${group.code}`);
    const t = texts(user.language);
    let preparedId = null;

    if (link) {
      // Bot API 8.0: chiroyli kartochka bilan ulashish (Telegram.WebApp.shareMessage)
      const prepared = await safe(
        bot.telegram.callApi('savePreparedInlineMessage', {
          user_id: user.id,
          result: {
            type: 'article',
            id: `g${group.code}${Date.now().toString(36)}`,
            title: t.shareTitle,
            description: t.shareDescription,
            input_message_content: {
              message_text: t.shareText(displayName(user), group.code),
              parse_mode: 'HTML',
            },
            reply_markup: { inline_keyboard: [[{ text: t.joinGroup, url: link }]] },
          },
          allow_user_chats: true,
          allow_group_chats: true,
        }),
        'savePreparedInlineMessage',
      );
      preparedId = prepared?.id ?? null;
    }

    return { preparedId, link, text: shareText(user, group) };
  };

  api.start = async (app) => {
    const me = await bot.telegram.getMe();
    api.username = me.username;
    log.info(`🤖 Bot: @${me.username}`);

    if (webAppUrl) {
      await safe(
        bot.telegram.setChatMenuButton({
          menuButton: { type: 'web_app', text: '🍕 Menyu', web_app: { url: webAppUrl } },
        }),
        'setChatMenuButton',
      );
    } else {
      log.warn('⚠️  PUBLIC_URL https emas — Mini App tugmasi oʻrnatilmadi');
    }

    await safe(
      bot.telegram.setMyCommands([
        { command: 'start', description: 'Bosh sahifa' },
        { command: 'orders', description: 'Soʻnggi buyurtmalar' },
        { command: 'help', description: 'Yordam' },
      ]),
      'setMyCommands',
    );
    await safe(
      bot.telegram.setMyCommands(
        [
          { command: 'start', description: 'Главная' },
          { command: 'orders', description: 'Последние заказы' },
          { command: 'help', description: 'Помощь' },
        ],
        { language_code: 'ru' },
      ),
      'setMyCommands ru',
    );
    if (config.adminChatId) {
      await safe(
        bot.telegram.setMyCommands(
          [
            { command: 'stats', description: 'Bugungi statistika' },
            { command: 'stop', description: 'Stop-list (tugagan mahsulotlar)' },
            { command: 'orders', description: 'Soʻnggi buyurtmalar' },
          ],
          { scope: { type: 'chat', chat_id: config.adminChatId } },
        ),
        'setMyCommands admin',
      );
    }

    if (config.useWebhook) {
      const secret =
        config.webhookSecret ||
        crypto.createHash('sha256').update(config.botToken).digest('hex').slice(0, 32);
      app.use(
        await bot.createWebhook({
          domain: config.publicUrl,
          path: `/telegram/${secret.slice(0, 16)}`,
          secret_token: secret,
          allowed_updates: ['message', 'callback_query', 'pre_checkout_query'],
        }),
      );
      log.info('🔗 Webhook rejimi');
    } else {
      await safe(bot.telegram.deleteWebhook(), 'deleteWebhook');
      bot
        .launch({ dropPendingUpdates: true, allowedUpdates: ['message', 'callback_query', 'pre_checkout_query'] })
        .catch((error) => log.error('[bot] polling toʻxtadi:', error.message));
      log.info('🔁 Polling rejimi');
    }
  };

  api.stop = async () => {
    try {
      bot.stop('shutdown');
    } catch {
      // polling ishga tushmagan bo'lishi mumkin
    }
  };

  return api;
}
