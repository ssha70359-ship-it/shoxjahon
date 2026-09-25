// Telegram Payments (Click / Payme provayderlari): to'lovdan oldingi tekshiruv va tasdiq

import { message } from 'telegraf/filters';

import { SHOP } from '../../../shared/shop.js';
import type { BotContext } from '../context.js';
import { texts } from '../texts.js';

const orderIdFrom = (payload: string) => Number(payload.replace(/^order:/, ''));

export function registerPaymentHandlers(ctx: BotContext): void {
  const { bot, services, logger } = ctx;

  // Telegram to'lovni yechishdan oldin so'raydi: buyurtma hali ham to'lanishi kerakmi va summa to'g'rimi
  bot.on('pre_checkout_query', async (tg) => {
    const query = tg.preCheckoutQuery;
    const order = await services.orders.get(orderIdFrom(query.invoice_payload));
    const valid =
      order !== null &&
      order.status === 'pending_payment' &&
      query.currency === SHOP.currency &&
      query.total_amount === order.total * 100;

    if (valid) return void (await tg.answerPreCheckoutQuery(true));

    const user = await services.users.get(tg.from.id);
    await tg.answerPreCheckoutQuery(false, texts(user?.language).payProblem);
  });

  bot.on(message('successful_payment'), async (tg) => {
    const id = orderIdFrom(tg.message.successful_payment.invoice_payload);
    try {
      await services.orders.markPaid(id);
    } catch (error) {
      logger.error(`[bot] toʻlov #${id} belgilanmadi:`, error);
    }
  });
}
