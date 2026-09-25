// Mijoz buyruqlari: /start (davra va buyurtma havolalari bilan), /menu, /help, /orders

import { formatDate, formatMoney } from '../../../shared/format.js';
import { tr } from '../../../shared/menu.js';
import { STATUS_LABELS } from '../../../shared/status.js';
import type { BotContext } from '../context.js';
import { texts } from '../texts.js';

const GROUP_PAYLOAD = /^g_([A-Za-z0-9]{6})$/;
const ORDER_PAYLOAD = /^o_(\d+)$/;

export function registerCustomerHandlers(ctx: BotContext): void {
  const { bot, services, webAppUrl, safe, openButton } = ctx;

  bot.start(async (tg) => {
    const user = await services.users.upsertFromTelegram(tg.from);
    const t = texts(user.language);
    if (!webAppUrl) return void (await tg.reply(t.notConfigured));

    // Shu suhbatning menyu tugmasini joriy manzilga bog'laymiz — eski manzil qolib ketmasin
    await safe(
      tg.setChatMenuButton({ type: 'web_app', text: t.menuButton, web_app: { url: webAppUrl } }),
      'setChatMenuButton',
    );

    const payload = String(tg.payload ?? '');
    const group = payload.match(GROUP_PAYLOAD);
    const order = payload.match(ORDER_PAYLOAD);

    if (group?.[1]) {
      const code = group[1].toUpperCase();
      await tg.reply(t.groupInvite(code), {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[openButton(t.joinGroup, `?group=${code}`)]] },
      });
      return;
    }

    if (order?.[1]) {
      await tg.reply(`🧾 #${order[1]}`, {
        reply_markup: { inline_keyboard: [[openButton(t.track, `?order=${order[1]}`)]] },
      });
      return;
    }

    await tg.reply(t.welcome(tg.from.first_name), {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[openButton(t.open)]] },
    });
  });

  bot.command('menu', async (tg) => {
    const t = texts((await services.users.upsertFromTelegram(tg.from)).language);
    if (!webAppUrl) return void (await tg.reply(t.notConfigured));
    await tg.reply('🍕', { reply_markup: { inline_keyboard: [[openButton(t.open)]] } });
  });

  bot.help(async (tg) => {
    const t = texts((await services.users.upsertFromTelegram(tg.from)).language);
    await tg.reply(t.help, { parse_mode: 'HTML' });
  });

  // Til: 🇺🇿 / 🇷🇺 tugmalari. Tanlov bot xabarlari va Mini App uchun saqlanadi
  const languageKeyboard = {
    inline_keyboard: [
      [
        { text: '🇺🇿 Oʻzbekcha', callback_data: 'lang:uz' },
        { text: '🇷🇺 Русский', callback_data: 'lang:ru' },
      ],
    ],
  };

  bot.command('til', async (tg) => {
    const user = await services.users.upsertFromTelegram(tg.from);
    await tg.reply(texts(user.language).langPrompt, { reply_markup: languageKeyboard });
  });

  bot.action(/^lang:(uz|ru)$/, async (tg) => {
    const language = tg.match[1] === 'ru' ? 'ru' : 'uz';
    await services.users.upsertFromTelegram(tg.from);
    await services.users.update(tg.from.id, { language });
    const text = texts(language).langChanged;
    await tg.answerCbQuery(text);
    await safe(tg.editMessageText(text), 'lang edit');
  });

  bot.command('orders', async (tg) => {
    const user = await services.users.upsertFromTelegram(tg.from);
    const t = texts(user.language);
    const list = await services.orders.listByUser(user.id, 5);
    if (list.length === 0) return void (await tg.reply(t.noOrders));

    const lines = list.map(
      (order) =>
        `#${order.id} · ${formatDate(order.createdAt, user.language)} · ${formatMoney(order.total, user.language)} · ${tr(STATUS_LABELS[order.status], user.language)}`,
    );
    await tg.reply(`${t.ordersTitle}\n\n${lines.join('\n')}`, { parse_mode: 'HTML' });
  });
}
