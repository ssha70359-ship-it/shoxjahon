// Prisma qatorlari ↔ API DTO. BigInt id lar son (number) ga aylantiriladi:
// Telegram id lari 2^53 dan kichik, shuning uchun aniqlik yo'qolmaydi.

import type { Order, Prisma, User } from '@prisma/client';

import type {
  Address,
  HistoryEntry,
  Lang,
  OrderDto,
  OrderItem,
  OrderMode,
  OrderStatus,
  PaymentMethod,
  UserDto,
} from '../../shared/types.js';

/** Bazadagi to'liq buyurtma: DTO + faqat xodimlar uchun maydonlar */
export interface OrderRecord extends OrderDto {
  adminChatId: string | null;
  adminMessageId: number | null;
}

/** Ilova obyektini Prisma Json ustuniga yozish uchun */
export function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function toUserDto(row: User): UserDto {
  return {
    id: Number(row.id),
    firstName: row.firstName,
    lastName: row.lastName,
    username: row.username,
    language: row.language === 'ru' ? 'ru' : 'uz',
    phone: row.phone ?? '',
    slices: row.slices,
    address: (row.address as Address | null) ?? null,
  };
}

export function toOrderRecord(row: Order): OrderRecord {
  return {
    id: row.id,
    userId: Number(row.userId),
    groupCode: row.groupCode,
    status: row.status as OrderStatus,
    mode: row.mode as OrderMode,
    items: row.items as unknown as OrderItem[],
    address: (row.address as unknown as Address | null) ?? null,
    phone: row.phone,
    comment: row.comment,
    payment: row.payment as PaymentMethod,
    paid: row.paid,
    subtotal: row.subtotal,
    deliveryFee: row.deliveryFee,
    discount: row.discount,
    total: row.total,
    slicesUsed: row.slicesUsed,
    slicesEarned: row.slicesEarned,
    history: row.history as unknown as HistoryEntry[],
    distanceKm: row.distanceKm,
    etaAt: row.etaAt?.getTime() ?? null,
    adminChatId: row.adminChatId,
    adminMessageId: row.adminMessageId,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

/**
 * Mijozga yuboriladigan ko'rinish: xodimlarga oid maydonlarsiz.
 * Davradoshlar buyurtmani ko'radi, lekin hostning telefoni va izohini emas.
 */
export function toPublicOrder(order: OrderRecord, viewerId: number = order.userId): OrderDto {
  const { adminChatId: _chat, adminMessageId: _message, ...dto } = order;
  if (viewerId !== order.userId) return { ...dto, phone: '', comment: '' };
  return dto;
}

export function displayName(user: Pick<UserDto, 'id' | 'firstName' | 'lastName' | 'username'>): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || (user.username ? `@${user.username}` : `#${user.id}`);
}

/** Telegram tilidan ilova tilini tanlaydi: rus tilli qurilmalarga — ru, qolganlarga — uz */
export function pickLanguage(code: string | undefined): Lang {
  return /^(ru|be|kk|uk)/i.test(code ?? '') ? 'ru' : 'uz';
}
