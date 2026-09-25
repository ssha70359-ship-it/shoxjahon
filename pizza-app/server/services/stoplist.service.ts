// Stop-list: vaqtincha tugagan pitsa, mahsulot yoki masalliqlar.
// Oshxona uni botdagi /stop buyrug'i orqali boshqaradi. Tez tekshirish uchun xotirada ham saqlanadi.

import { ITEM_BY_ID, PIZZA_BY_ID, TOPPING_BY_ID } from '../../shared/menu.js';
import type { EventBus } from '../lib/events.js';
import { AppError } from '../lib/errors.js';
import type { PrismaClient } from '../lib/prisma.js';

export class StoplistService {
  private readonly cache = new Set<string>();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly bus: EventBus,
  ) {}

  async load(): Promise<void> {
    const rows = await this.prisma.stopItem.findMany({ select: { id: true } });
    this.cache.clear();
    for (const row of rows) this.cache.add(row.id);
  }

  has(id: string): boolean {
    return this.cache.has(id);
  }

  ids(): ReadonlySet<string> {
    return new Set(this.cache);
  }

  static isKnown(id: string): boolean {
    return Boolean(PIZZA_BY_ID[id] || ITEM_BY_ID[id] || TOPPING_BY_ID[id]);
  }

  /** Holatni almashtiradi va yangi holatni qaytaradi (true — to'xtatilgan) */
  async toggle(id: string): Promise<boolean> {
    if (!StoplistService.isKnown(id)) throw new AppError('not_found', 404, `Nomaʼlum mahsulot: ${id}`);

    if (this.cache.has(id)) {
      await this.prisma.stopItem.delete({ where: { id } });
      this.cache.delete(id);
    } else {
      await this.prisma.stopItem.create({ data: { id } });
      this.cache.add(id);
    }

    this.bus.emit('stoplist:changed', [...this.cache]);
    return this.cache.has(id);
  }
}
