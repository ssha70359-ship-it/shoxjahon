// Ilova hodisalarini Telegram xabarlariga aylantiradi:
//   - yangi buyurtma → oshxona guruhiga kartochka (+ xaritada nuqta)
//   - holat o'zgardi → kartochka yangilanadi, mijozga (va davradoshlarga) xabar
//   - to'lov o'tdi → oshxonaga yuboriladi

import type { OrderStatus } from '../../shared/types.js';
import type { EventBus } from '../lib/events.js';
import type { OrderRecord } from '../services/mappers.js';
import type { BotContext } from './context.js';
import { adminKeyboard } from './keyboards.js';
import { adminOrderText, groupShares, statusText, texts } from './texts.js';

// Davradoshlarga faqat eng muhim o'zgarishlar yuboriladi
const GROUP_STATUSES: OrderStatus[] = ['delivering', 'ready', 'done'];

export class Notifier {
  constructor(private readonly ctx: BotContext) {}

  subscribe(bus: EventBus): void {
    const run = (task: Promise<void>) => task.catch((error) => this.ctx.logger.error('[bot] notifier:', error));

    bus.on('order:created', (order) => {
      if (order.status === 'pending_payment') return; // to'lovdan keyin yuboriladi
      run(this.onPlaced(order));
    });
    bus.on('order:paid', (order) => run(this.onPaid(order)));
    bus.on('order:updated', (order, from) => {
      if (from === 'pending_payment') return; // order:paid allaqachon hammasini qildi
      run(this.onStatus(order));
    });
  }

  /** Oshxona kartochkasini bazadagi holatga moslab qayta chizadi */
  async refreshCard(orderId: number): Promise<void> {
    const { bot, services, safe } = this.ctx;
    const order = await services.orders.get(orderId);
    if (!order?.adminChatId || !order.adminMessageId) return;

    const customer = await services.users.get(order.userId);
    await safe(
      bot.telegram.editMessageText(
        order.adminChatId,
        order.adminMessageId,
        undefined,
        adminOrderText(order, customer),
        {
          parse_mode: 'HTML',
          reply_markup: adminKeyboard(order),
          link_preview_options: { is_disabled: true },
        },
      ),
      `admin card edit #${order.id}`,
    );
  }

  private async onPlaced(order: OrderRecord): Promise<void> {
    await this.sendAdminCard(order);
    await this.notifyCreated(order);
  }

  private async onPaid(order: OrderRecord): Promise<void> {
    const user = await this.ctx.services.users.get(order.userId);
    if (order.paid) await this.notify(order.userId, texts(user?.language).paid(order));
    await this.onPlaced(order);
  }

  private async onStatus(order: OrderRecord): Promise<void> {
    await this.refreshCard(order.id);

    const recipients = new Set([order.userId]);
    if (order.groupCode && GROUP_STATUSES.includes(order.status)) {
      for (const item of order.items) if (item.by) recipients.add(item.by.id);
    }

    for (const id of recipients) {
      const user = await this.ctx.services.users.get(id);
      const template = statusText(user?.language, order.status);
      if (!template) continue;
      // Tilimlar faqat buyurtma egasiga yoziladi
      const own = id === order.userId;
      const html = template(own ? order : { ...order, slicesEarned: 0 }, user?.slices ?? 0);
      const finished = order.status === 'done' || order.status === 'cancelled';
      await this.notify(id, html, finished ? undefined : order.id);
    }
  }

  private async sendAdminCard(order: OrderRecord): Promise<void> {
    const { bot, config, services, safe, logger } = this.ctx;
    if (!config.adminChatId) {
      logger.warn(`[bot] ADMIN_CHAT_ID yoʻq — #${order.id} oshxonaga yuborilmadi`);
      return;
    }

    const customer = await services.users.get(order.userId);
    const sent = await safe(
      bot.telegram.sendMessage(config.adminChatId, adminOrderText(order, customer), {
        parse_mode: 'HTML',
        reply_markup: adminKeyboard(order),
        link_preview_options: { is_disabled: true },
      }),
      `admin card #${order.id}`,
    );
    if (!sent) return;

    await services.orders.setAdminMessage(order.id, config.adminChatId, sent.message_id);

    const { address } = order;
    if (address?.lat != null && address.lng != null) {
      await safe(
        bot.telegram.sendLocation(config.adminChatId, address.lat, address.lng, {
          reply_parameters: { message_id: sent.message_id },
        }),
        'admin location',
      );
    }
  }

  private async notifyCreated(order: OrderRecord): Promise<void> {
    const { services } = this.ctx;
    const host = await services.users.get(order.userId);
    await this.notify(order.userId, texts(host?.language).created(order), order.id);

    if (!order.groupCode) return;

    const shares = new Map(groupShares(order).map((entry) => [entry.id, entry.amount]));
    const memberIds = new Set(order.items.flatMap((item) => (item.by ? [item.by.id] : [])));
    memberIds.delete(order.userId);

    for (const id of memberIds) {
      const member = await services.users.get(id);
      await this.notify(id, texts(member?.language).groupCreated(order, shares.get(id)), order.id);
    }
  }

  private async notify(userId: number, html: string, orderId?: number): Promise<void> {
    const { bot, services, safe, webAppUrl, openButton } = this.ctx;
    const user = await services.users.get(userId);
    const t = texts(user?.language);

    await safe(
      bot.telegram.sendMessage(userId, html, {
        parse_mode: 'HTML',
        ...(webAppUrl && orderId
          ? { reply_markup: { inline_keyboard: [[openButton(t.track, `?order=${orderId}`)]] } }
          : {}),
      }),
      `notify ${userId}`,
    );
  }
}
