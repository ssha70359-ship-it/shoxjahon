// Buyurtmalar: yaratish, holatni o'zgartirish, to'lov, tilim kartasi, statistika.

import { describeLine, normalizeCart, summarize, unitPrice, assertAvailable } from '../../shared/pricing.js';
import type { CreateOrderInput } from '../../shared/schemas.js';
import { SHOP, distanceKm, estimateMinutes, isOpenAt, localMinutes, travelMinutes } from '../../shared/shop.js';
import { canTransition, customerCanCancel } from '../../shared/status.js';
import type { Address, CartLine, HistoryEntry, OrderItem, OrderStatus, UserDto } from '../../shared/types.js';
import type { Clock } from '../lib/clock.js';
import { AppError, DomainError } from '../lib/errors.js';
import type { EventBus } from '../lib/events.js';
import type { PrismaClient } from '../lib/prisma.js';
import type { GroupOrderLine, GroupService } from './group.service.js';
import { toJson, toOrderRecord, type OrderRecord } from './mappers.js';
import type { StoplistService } from './stoplist.service.js';
import type { UserService } from './user.service.js';

export interface OrderServiceOptions {
  onlinePayments: boolean;
  ignoreHours: boolean;
}

export interface TodayStats {
  count: number;
  cancelled: number;
  active: number;
  revenue: number;
  average: number;
  top: { title: string; qty: number }[];
}

type Line = CartLine & { by?: GroupOrderLine['by'] };

export class OrderService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly bus: EventBus,
    private readonly clock: Clock,
    private readonly users: UserService,
    private readonly groups: GroupService,
    private readonly stoplist: StoplistService,
    private readonly options: OrderServiceOptions,
  ) {}

  // --- O'qish ----------------------------------------------------------------

  async get(id: number): Promise<OrderRecord | null> {
    const row = await this.prisma.order.findUnique({ where: { id } });
    return row ? toOrderRecord(row) : null;
  }

  async listByUser(userId: number, limit = 30): Promise<OrderRecord[]> {
    const rows = await this.prisma.order.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { id: 'desc' },
      take: limit,
    });
    return rows.map(toOrderRecord);
  }

  /** Buyurtmani egasi yoki uning davradoshlari ko'ra oladi */
  async canView(order: OrderRecord, userId: number): Promise<boolean> {
    if (order.userId === userId) return true;
    return Boolean(order.groupCode && (await this.groups.isMember(order.groupCode, userId)));
  }

  // --- Yaratish ----------------------------------------------------------------

  async create(user: UserDto, input: CreateOrderInput): Promise<OrderRecord> {
    const now = this.clock();

    if (!this.options.ignoreHours && !isOpenAt(new Date(now))) throw new DomainError('closed');
    if (input.payment === 'online' && !this.options.onlinePayments) throw new DomainError('online_disabled');

    const address: Address | null = input.mode === 'delivery' && input.address ? input.address : null;
    const lines: Line[] = input.groupCode
      ? await this.groups.linesForOrder(input.groupCode, user.id)
      : normalizeCart(input.items);

    const stopped = this.stoplist.ids();
    for (const line of lines) assertAvailable(line.config, stopped);

    const summary = summarize(lines, { mode: input.mode, useReward: input.useReward, slices: user.slices });
    if (summary.belowMinimum) throw new DomainError('below_minimum');

    let km: number | null = null;
    if (address?.lat != null && address.lng != null) {
      km = Math.round(distanceKm(SHOP.location, { lat: address.lat, lng: address.lng }) * 10) / 10;
      if (km > SHOP.delivery.radiusKm) throw new DomainError('too_far');
    }

    const items: OrderItem[] = lines.map((line) => ({
      config: line.config,
      qty: line.qty,
      unit: unitPrice(line.config),
      ...(line.by ? { by: line.by } : {}),
    }));

    const status: OrderStatus = input.payment === 'online' ? 'pending_payment' : 'new';
    const history: HistoryEntry[] = [{ status, at: now }];

    const row = await this.prisma.$transaction(async (tx) => {
      if (summary.slicesUsed > 0 && !(await this.users.takeSlices(user.id, summary.slicesUsed, tx))) {
        throw new DomainError('not_enough_slices');
      }

      const created = await tx.order.create({
        data: {
          userId: BigInt(user.id),
          groupCode: input.groupCode ?? null,
          items: toJson(items),
          mode: input.mode,
          address: address ? toJson(address) : undefined,
          phone: input.phone,
          comment: input.comment,
          payment: input.payment,
          subtotal: summary.subtotal,
          deliveryFee: summary.deliveryFee,
          discount: summary.discount,
          total: summary.total,
          slicesUsed: summary.slicesUsed,
          slicesEarned: summary.slicesEarned,
          status,
          history: toJson(history),
          distanceKm: km,
          etaAt: new Date(now + estimateMinutes(input.mode, km) * 60_000),
          createdAt: new Date(now),
        },
      });

      if (input.groupCode) await this.groups.markOrdered(input.groupCode, created.id, tx);
      return created;
    });

    if (input.groupCode) this.groups.changed(input.groupCode);

    // Keyingi safar manzil va telefonni qayta yozmaslik uchun eslab qolamiz
    await this.users.update(user.id, { phone: input.phone, ...(address ? { address } : {}) });

    const order = toOrderRecord(row);
    this.bus.emit('order:created', order);
    return order;
  }

  // --- Holatlar ----------------------------------------------------------------

  /** Oshxona holatni o'zgartiradi (bot tugmalari orqali) */
  async setStatus(id: number, to: OrderStatus): Promise<OrderRecord> {
    const order = await this.mustGet(id);
    if (order.status === to) return order;
    if (!canTransition(order, to)) throw new DomainError('bad_transition');

    const now = this.clock();
    let etaAt = order.etaAt;
    if (to === 'delivering') etaAt = now + travelMinutes(order.distanceKm) * 60_000;
    if (to === 'ready' || to === 'done') etaAt = now;

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: to,
          history: toJson([...order.history, { status: to, at: now }]),
          etaAt: etaAt == null ? null : new Date(etaAt),
        },
      });

      // Tilim kartasi: yetkazilganda qo'shiladi, bekor qilinsa ishlatilgani qaytadi
      if (to === 'done' && order.slicesEarned > 0) await this.users.addSlices(order.userId, order.slicesEarned, tx);
      if (to === 'cancelled' && order.slicesUsed > 0) await this.users.addSlices(order.userId, order.slicesUsed, tx);
      return updated;
    });

    if ((to === 'done' && order.slicesEarned > 0) || (to === 'cancelled' && order.slicesUsed > 0)) {
      await this.users.announce(order.userId);
    }

    const updated = toOrderRecord(row);
    this.bus.emit('order:updated', updated, order.status);
    return updated;
  }

  async cancelByCustomer(id: number, userId: number): Promise<OrderRecord> {
    const order = await this.mustGet(id);
    if (order.userId !== userId) throw new AppError('forbidden');
    if (!customerCanCancel(order)) throw new DomainError('cannot_cancel');
    return this.setStatus(id, 'cancelled');
  }

  /** Telegram Payments orqali to'lov o'tdi */
  async markPaid(id: number): Promise<OrderRecord> {
    const order = await this.mustGet(id);
    if (order.paid) return order;
    if (order.status !== 'pending_payment') throw new DomainError('bad_transition');
    return this.confirmPending(order, { paid: true });
  }

  /** Onlayn to'lov o'tmasa — mijoz naqd pulga o'tkazishi mumkin */
  async switchToCash(id: number, userId: number): Promise<OrderRecord> {
    const order = await this.mustGet(id);
    if (order.userId !== userId) throw new AppError('forbidden');
    if (order.status !== 'pending_payment') throw new DomainError('bad_transition');
    return this.confirmPending(order, { payment: 'cash' });
  }

  async setAdminMessage(id: number, chatId: string, messageId: number): Promise<void> {
    await this.prisma.order.update({ where: { id }, data: { adminChatId: chatId, adminMessageId: messageId } });
  }

  // --- Statistika ----------------------------------------------------------------

  /** Bugungi statistika (Toshkent vaqti bo'yicha) */
  async todayStats(): Promise<TodayStats> {
    const now = this.clock();
    const date = new Date(now);
    const startOfDay = now - (localMinutes(date) * 60 + date.getUTCSeconds()) * 1000 - date.getUTCMilliseconds();

    const rows = await this.prisma.order.findMany({ where: { createdAt: { gte: new Date(startOfDay) } } });
    const orders = rows.map(toOrderRecord);
    const valid = orders.filter((order) => order.status !== 'cancelled' && order.status !== 'pending_payment');
    const revenue = valid.reduce((sum, order) => sum + order.total, 0);

    const top = new Map<string, number>();
    for (const order of valid) {
      for (const item of order.items) {
        const { title } = describeLine(item.config, 'uz');
        top.set(title, (top.get(title) ?? 0) + item.qty);
      }
    }

    return {
      count: valid.length,
      cancelled: orders.filter((order) => order.status === 'cancelled').length,
      active: valid.filter((order) => order.status !== 'done').length,
      revenue,
      average: valid.length ? Math.round(revenue / valid.length) : 0,
      top: [...top.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([title, qty]) => ({ title, qty })),
    };
  }

  // --- Yordamchilar --------------------------------------------------------------

  private async mustGet(id: number): Promise<OrderRecord> {
    const order = await this.get(id);
    if (!order) throw new AppError('order_not_found');
    return order;
  }

  private async confirmPending(order: OrderRecord, patch: { paid?: boolean; payment?: 'cash' }): Promise<OrderRecord> {
    const row = await this.prisma.order.update({
      where: { id: order.id },
      data: { ...patch, status: 'new', history: toJson([...order.history, { status: 'new', at: this.clock() }]) },
    });
    const updated = toOrderRecord(row);
    this.bus.emit('order:paid', updated);
    this.bus.emit('order:updated', updated, order.status);
    return updated;
  }
}
