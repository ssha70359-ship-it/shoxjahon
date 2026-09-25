// "Davra" — do'stlar yoki hamkasblar bilan bitta umumiy buyurtma.
// Har kim o'z pitsasini qo'shadi, host rasmiylashtiradi, hisob esa
// har bir odamga alohida bo'lib ko'rsatiladi.

import crypto from 'node:crypto';

import type { Group, GroupItem, GroupMember } from '@prisma/client';

import { assertAvailable, normalizeLine, unitPrice } from '../../shared/pricing.js';
import { SHOP } from '../../shared/shop.js';
import type { GroupDto, GroupStatus, LineConfig, OrderItem, UserDto } from '../../shared/types.js';
import type { Clock } from '../lib/clock.js';
import { AppError, DomainError } from '../lib/errors.js';
import type { EventBus } from '../lib/events.js';
import type { PrismaClient, Tx } from '../lib/prisma.js';
import { displayName, toJson } from './mappers.js';
import type { StoplistService } from './stoplist.service.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // O/0 va I/1 chalkashmasin

type GroupWithRelations = Group & { members: GroupMember[]; items: GroupItem[] };

export interface GroupOrderLine {
  config: LineConfig;
  qty: number;
  by: NonNullable<OrderItem['by']>;
}

function newCode(): string {
  let code = '';
  for (let i = 0; i < 6; i += 1) code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return code;
}

export class GroupService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly bus: EventBus,
    private readonly clock: Clock,
    private readonly stoplist: StoplistService,
  ) {}

  // --- O'qish ----------------------------------------------------------------

  async view(code: string, viewerId: number): Promise<GroupDto> {
    return this.toDto(await this.load(code), viewerId);
  }

  async memberIds(code: string): Promise<number[]> {
    const members = await this.prisma.groupMember.findMany({ where: { groupCode: code }, select: { userId: true } });
    return members.map((member) => Number(member.userId));
  }

  async isMember(code: string, userId: number): Promise<boolean> {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupCode_userId: { groupCode: code, userId: BigInt(userId) } },
    });
    return Boolean(member);
  }

  /** Foydalanuvchining hozirgi (ochiq yoki yaqinda buyurtma qilingan) davrasi */
  async currentFor(userId: number): Promise<GroupDto | null> {
    const group = await this.prisma.group.findFirst({
      where: {
        expiresAt: { gt: new Date(this.clock()) },
        status: { in: ['open', 'ordered'] },
        members: { some: { userId: BigInt(userId) } },
      },
      orderBy: { createdAt: 'desc' },
      include: { members: { orderBy: { joinedAt: 'asc' } }, items: { orderBy: { id: 'asc' } } },
    });
    return group ? this.toDto(group, userId) : null;
  }

  // --- O'zgartirish ------------------------------------------------------------

  async create(user: UserDto): Promise<GroupDto> {
    const now = this.clock();
    const existing = await this.prisma.group.findFirst({
      where: { hostId: BigInt(user.id), status: 'open', expiresAt: { gt: new Date(now) } },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return this.view(existing.code, user.id);

    let code = newCode();
    while (await this.prisma.group.findUnique({ where: { code } })) code = newCode();

    await this.prisma.group.create({
      data: {
        code,
        hostId: BigInt(user.id),
        status: 'open',
        createdAt: new Date(now),
        expiresAt: new Date(now + SHOP.group.ttlHours * 3_600_000),
        members: { create: { userId: BigInt(user.id), name: displayName(user), joinedAt: new Date(now) } },
      },
    });

    this.changed(code);
    return this.view(code, user.id);
  }

  async join(code: string, user: UserDto): Promise<GroupDto> {
    const group = await this.load(code);
    if (group.members.some((member) => Number(member.userId) === user.id)) return this.toDto(group, user.id);

    this.requireOpen(group);
    if (group.members.length >= SHOP.group.maxMembers) throw new DomainError('group_full');

    await this.prisma.groupMember.create({
      data: {
        groupCode: group.code,
        userId: BigInt(user.id),
        name: displayName(user),
        joinedAt: new Date(this.clock()),
      },
    });
    this.changed(group.code);
    return this.view(group.code, user.id);
  }

  async leave(code: string, userId: number): Promise<void> {
    const group = await this.load(code);
    this.requireMember(group, userId);

    if (Number(group.hostId) === userId) {
      // Host chiqsa — davra yopiladi (agar hali buyurtma berilmagan bo'lsa)
      if (group.status === 'open') {
        await this.prisma.group.update({ where: { code: group.code }, data: { status: 'closed' } });
      }
    } else {
      await this.prisma.$transaction([
        this.prisma.groupItem.deleteMany({ where: { groupCode: group.code, userId: BigInt(userId) } }),
        this.prisma.groupMember.delete({
          where: { groupCode_userId: { groupCode: group.code, userId: BigInt(userId) } },
        }),
      ]);
    }

    this.changed(group.code);
  }

  async addItem(code: string, userId: number, rawConfig: unknown, qty: number): Promise<GroupDto> {
    const group = await this.load(code);
    this.requireOpen(group);
    this.requireMember(group, userId);

    const config = normalizeLine(rawConfig);
    assertAvailable(config, this.stoplist.ids());
    if (group.items.length >= SHOP.group.maxItems) throw new DomainError('group_full');

    await this.prisma.groupItem.create({
      data: {
        groupCode: group.code,
        userId: BigInt(userId),
        config: toJson(config),
        qty,
        createdAt: new Date(this.clock()),
      },
    });
    this.changed(group.code);
    return this.view(group.code, userId);
  }

  async updateItem(code: string, userId: number, itemId: number, qty: number): Promise<GroupDto> {
    const group = await this.load(code);
    this.requireOpen(group);
    this.requireMember(group, userId);

    const item = group.items.find((entry) => entry.id === itemId);
    if (!item) throw new AppError('item_not_found');
    // O'zinikini yoki (host bo'lsa) istalganini o'zgartirish mumkin
    if (Number(item.userId) !== userId && Number(group.hostId) !== userId) throw new AppError('forbidden');

    if (qty === 0) await this.prisma.groupItem.delete({ where: { id: item.id } });
    else await this.prisma.groupItem.update({ where: { id: item.id }, data: { qty } });

    this.changed(group.code);
    return this.view(group.code, userId);
  }

  /** Buyurtma uchun qatorlar: har biri kim qo'shgani bilan. Faqat host chaqira oladi. */
  async linesForOrder(code: string, hostId: number, tx: Tx = this.prisma): Promise<GroupOrderLine[]> {
    const group = await this.load(code, tx);
    this.requireOpen(group);
    if (Number(group.hostId) !== hostId) throw new AppError('not_group_host');

    const names = new Map(group.members.map((member) => [Number(member.userId), member.name]));
    const lines = group.items.map((item) => ({
      config: normalizeLine(item.config),
      qty: item.qty,
      by: { id: Number(item.userId), name: names.get(Number(item.userId)) ?? '' },
    }));

    if (lines.length === 0) throw new DomainError('empty_cart');
    return lines;
  }

  /** Davrani yopadi. Ikki marta bosilsa ikkinchisi xato oladi — bitta davradan bitta buyurtma */
  async markOrdered(code: string, orderId: number, tx: Tx = this.prisma): Promise<void> {
    const result = await tx.group.updateMany({ where: { code, status: 'open' }, data: { status: 'ordered', orderId } });
    if (result.count !== 1) throw new DomainError('group_closed');
  }

  /** Buyurtma tranzaksiyasi yakunlangandan keyin chaqiriladi */
  changed(code: string): void {
    this.bus.emit('group:changed', code);
  }

  // --- Yordamchilar --------------------------------------------------------------

  private async load(code: string, tx: Tx = this.prisma): Promise<GroupWithRelations> {
    const group = await tx.group.findUnique({
      where: { code: code.toUpperCase() },
      include: { members: { orderBy: { joinedAt: 'asc' } }, items: { orderBy: { id: 'asc' } } },
    });
    if (!group) throw new AppError('group_not_found');
    return group;
  }

  private statusOf(group: Group): GroupStatus {
    if (group.status === 'open' && group.expiresAt.getTime() <= this.clock()) return 'expired';
    return group.status as GroupStatus;
  }

  private requireOpen(group: Group): void {
    const status = this.statusOf(group);
    if (status === 'expired') throw new DomainError('group_expired');
    if (status !== 'open') throw new DomainError('group_closed');
  }

  private requireMember(group: GroupWithRelations, userId: number): void {
    if (!group.members.some((member) => Number(member.userId) === userId)) throw new AppError('not_group_member');
  }

  private toDto(group: GroupWithRelations, viewerId: number): GroupDto {
    const items = group.items.map((item) => {
      const config = item.config as unknown as LineConfig;
      return { id: item.id, userId: Number(item.userId), config, qty: item.qty, unit: unitPrice(config) };
    });

    const members = group.members.map((member) => {
      const id = Number(member.userId);
      const own = items.filter((item) => item.userId === id);
      return {
        id,
        name: member.name,
        isHost: id === Number(group.hostId),
        items: own.map(({ userId: _owner, ...rest }) => rest),
        subtotal: own.reduce((sum, item) => sum + item.unit * item.qty, 0),
      };
    });

    return {
      code: group.code,
      status: this.statusOf(group),
      hostId: Number(group.hostId),
      orderId: group.orderId,
      createdAt: group.createdAt.getTime(),
      expiresAt: group.expiresAt.getTime(),
      isHost: viewerId === Number(group.hostId),
      isMember: members.some((member) => member.id === viewerId),
      members,
      subtotal: members.reduce((sum, member) => sum + member.subtotal, 0),
      itemsCount: items.reduce((sum, item) => sum + item.qty, 0),
    };
  }
}
