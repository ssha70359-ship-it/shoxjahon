// Oshxona (xodimlar): holat tugmalari, /stop (stop-list), /stats

import { formatMoney } from '../../../shared/format.js';
import { tr } from '../../../shared/menu.js';
import { ORDER_STATUSES, STATUS_LABELS } from '../../../shared/status.js';
import type { OrderStatus } from '../../../shared/types.js';
import { DomainError } from '../../lib/errors.js';
import type { BotContext } from '../context.js';
import { STATUS_CALLBACK, STOP_PAGES, STOP_PAGE_CALLBACK, STOP_TOGGLE_CALLBACK, stopKeyboard } from '../keyboards.js';
import { esc } from '../texts.js';

const STOP_TEXT =
  '⛔ <b>Stop-list</b>\n\nTugagan mahsulotni bosing — u Mini Appʼda «tugadi» deb koʻrinadi va buyurtma qilib boʻlmaydi. Yana bossangiz qaytadi.';

const isStatus = (value: string): value is OrderStatus => (ORDER_STATUSES as readonly string[]).includes(value);

export function registerKitchenHandlers(ctx: BotContext, refreshCard: (orderId: number) => Promise<void>): void {
  const { bot, services, safe, isStaff } = ctx;
  const staff = (tg: { chat?: { id: number }; from?: { id: number } }) => isStaff(tg.chat?.id, tg.from?.id);
  const pageOf = (raw: string | undefined) => Math.min(Number(raw ?? 0), STOP_PAGES.length - 1);
  const stopped = (id: string) => services.stoplist.has(id);

  bot.command('stats', async (tg) => {
    if (!staff(tg)) return;
    const s = await services.orders.todayStats();
    const top = s.top.length
      ? s.top.map((entry, i) => `${i + 1}. ${esc(entry.title)} — ${entry.qty} ta`).join('\n')
      : '—';

    await tg.reply(
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

  bot.command('stop', async (tg) => {
    if (!staff(tg)) return;
    await tg.reply(STOP_TEXT, { parse_mode: 'HTML', reply_markup: stopKeyboard(0, stopped) });
  });

  bot.action(STOP_PAGE_CALLBACK, async (tg) => {
    if (!staff(tg)) return void (await tg.answerCbQuery('Ruxsat yoʻq'));
    await safe(tg.editMessageReplyMarkup(stopKeyboard(pageOf(tg.match[1]), stopped)), 'stop page');
    await tg.answerCbQuery();
  });

  bot.action(STOP_TOGGLE_CALLBACK, async (tg) => {
    if (!staff(tg)) return void (await tg.answerCbQuery('Ruxsat yoʻq'));
    try {
      const isStopped = await services.stoplist.toggle(tg.match[2] ?? '');
      await safe(tg.editMessageReplyMarkup(stopKeyboard(pageOf(tg.match[1]), stopped)), 'stop toggle');
      await tg.answerCbQuery(isStopped ? '⛔ Toʻxtatildi' : '✅ Qaytarildi');
    } catch (error) {
      await tg.answerCbQuery(error instanceof Error ? error.message : 'Xatolik');
    }
  });

  bot.action(STATUS_CALLBACK, async (tg) => {
    if (!staff(tg)) return void (await tg.answerCbQuery('Ruxsat yoʻq', { show_alert: true }));

    const orderId = Number(tg.match[1]);
    const to = tg.match[2] ?? '';
    try {
      if (!isStatus(to)) throw new DomainError('bad_transition');
      const order = await services.orders.setStatus(orderId, to);
      await tg.answerCbQuery(`#${order.id}: ${tr(STATUS_LABELS[order.status], 'uz')}`);
    } catch (error) {
      // Kimdir allaqachon bosgan bo'lishi mumkin — kartochkani haqiqiy holatga keltiramiz
      await refreshCard(orderId);
      const reason = error instanceof DomainError ? 'Bu holatga oʻtkazib boʻlmaydi' : 'Xatolik';
      await tg.answerCbQuery(reason, { show_alert: true });
    }
  });
}
