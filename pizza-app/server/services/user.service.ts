import type { Address, Lang, UserDto } from '../../shared/types.js';
import type { Clock } from '../lib/clock.js';
import type { EventBus } from '../lib/events.js';
import type { PrismaClient, Tx } from '../lib/prisma.js';
import type { TelegramUser } from '../utils/telegram-init-data.js';
import { pickLanguage, toJson, toUserDto } from './mappers.js';

export interface UserPatch {
  language?: Lang;
  phone?: string;
  address?: Address;
}

export class UserService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly bus: EventBus,
    private readonly clock: Clock,
  ) {}

  async get(id: number): Promise<UserDto | null> {
    const row = await this.prisma.user.findUnique({ where: { id: BigInt(id) } });
    return row ? toUserDto(row) : null;
  }

  /** Har bir so'rovda Telegram ma'lumotlari bilan yangilanadi; til faqat birinchi marta tanlanadi */
  async upsertFromTelegram(tg: TelegramUser): Promise<UserDto> {
    const profile = {
      firstName: tg.first_name.slice(0, 64),
      lastName: (tg.last_name ?? '').slice(0, 64),
      username: (tg.username ?? '').slice(0, 64),
    };
    const row = await this.prisma.user.upsert({
      where: { id: BigInt(tg.id) },
      create: { id: BigInt(tg.id), ...profile, language: pickLanguage(tg.language_code) },
      update: { ...profile, updatedAt: new Date(this.clock()) },
    });
    return toUserDto(row);
  }

  async update(id: number, patch: UserPatch): Promise<UserDto> {
    const row = await this.prisma.user.update({
      where: { id: BigInt(id) },
      data: {
        ...(patch.language ? { language: patch.language } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        ...(patch.address !== undefined ? { address: toJson(patch.address) } : {}),
      },
    });
    const user = toUserDto(row);
    this.bus.emit('user:updated', user);
    return user;
  }

  /** Tilim qo'shadi yoki ayiradi (tranzaksiya ichida ham ishlaydi). Hodisani chaqiruvchi chiqaradi. */
  async addSlices(id: number, delta: number, tx: Tx = this.prisma): Promise<void> {
    await tx.user.update({ where: { id: BigInt(id) }, data: { slices: { increment: delta } } });
  }

  /** Tilimlar yetarli bo'lsa ayiradi. Yetmasa false qaytaradi (poyga holatidan himoya) */
  async takeSlices(id: number, count: number, tx: Tx): Promise<boolean> {
    const result = await tx.user.updateMany({
      where: { id: BigInt(id), slices: { gte: count } },
      data: { slices: { decrement: count } },
    });
    return result.count === 1;
  }

  async announce(id: number): Promise<void> {
    const user = await this.get(id);
    if (user) this.bus.emit('user:updated', user);
  }
}
