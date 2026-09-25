import type { Telegraf } from 'telegraf';

import type { AppConfig } from '../config/env.js';
import type { Logger } from '../lib/logger.js';
import type { Services } from '../services/index.js';

/** Bot handler'lari uchun umumiy bog'liqliklar */
export interface BotContext {
  bot: Telegraf;
  config: AppConfig;
  services: Services;
  logger: Logger;
  webAppUrl: string;
  /** Telegram xatosida jim qoladi (foydalanuvchi botni bloklagan bo'lishi mumkin) */
  safe<T>(promise: Promise<T>, what: string): Promise<T | null>;
  isStaff(chatId: number | undefined, userId: number | undefined): boolean;
  openButton(text: string, query?: string): { text: string; web_app: { url: string } };
}
