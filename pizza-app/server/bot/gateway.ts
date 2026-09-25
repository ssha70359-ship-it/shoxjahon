// Telegram bilan ishlash uchun interfeys. Controller'lar botning ichki
// tuzilishini bilmaydi — faqat shu interfeys orqali murojaat qiladi.

import type { Express } from 'express';
import type { Telegraf } from 'telegraf';

import type { GroupDto, GroupShareDto, Lang, UserDto } from '../../shared/types.js';
import type { OrderRecord } from '../services/mappers.js';

export interface TelegramGateway {
  readonly bot: Telegraf | null;
  readonly username: string | null;
  readonly canPay: boolean;
  appLink(param: string): string | null;
  createInvoiceLink(order: OrderRecord, lang: Lang): Promise<string>;
  prepareGroupShare(user: UserDto, group: GroupDto): Promise<GroupShareDto>;
  start(app: Express): Promise<void>;
  stop(): Promise<void>;
}
