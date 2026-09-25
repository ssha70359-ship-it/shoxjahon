// Muhit o'zgaruvchilari: .env faylidan o'qiladi va Zod bilan tekshiriladi.
// Xato bo'lsa server ishga tushmaydi va aniq nima noto'g'riligini aytadi.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

const here = path.dirname(fileURLToPath(import.meta.url));
// server/config (ts) yoki build/server/config (js) — ikkalasida ham loyiha ildizini topamiz
export const ROOT = fs.existsSync(path.resolve(here, '../../package.json'))
  ? path.resolve(here, '../..')
  : path.resolve(here, '../../..');

/** .env faylini process.env ga yuklaydi. Muhitda bor qiymatlar ustun turadi. */
export function loadEnvFile(file = path.join(ROOT, '.env')): void {
  if (!fs.existsSync(file)) return;
  try {
    process.loadEnvFile(file);
  } catch {
    // Node .env ni o'qiy olmasa — muhitdagi qiymatlar bilan davom etamiz
  }
}

const bool = z
  .enum(['true', 'false', '1', '0', ''])
  .default('false')
  .transform((value) => value === 'true' || value === '1');

const trimmed = z.string().trim().default('');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),

    // Nisbiy yo'l prisma/schema.prisma ga nisbatan: file:./pizza.db → prisma/pizza.db
    DATABASE_URL: z.string().trim().min(1).default('file:./pizza.db'),

    BOT_TOKEN: trimmed.refine((v) => v === '' || /^\d+:[\w-]+$/.test(v), 'BOT_TOKEN formati noto‘g‘ri'),
    ADMIN_CHAT_ID: trimmed.refine((v) => v === '' || /^-?\d+$/.test(v), 'ADMIN_CHAT_ID raqam bo‘lishi kerak'),
    ADMIN_IDS: trimmed.transform((value) =>
      value
        .split(',')
        .map((part) => Number(part.trim()))
        .filter((id) => Number.isSafeInteger(id) && id > 0),
    ),

    PUBLIC_URL: trimmed,
    RENDER_EXTERNAL_URL: trimmed,
    WEBHOOK_SECRET: trimmed,
    MINIAPP_SHORT_NAME: trimmed,
    PAYMENT_PROVIDER_TOKEN: trimmed,
    TELEGRAM_API_ROOT: trimmed,

    ALLOW_DEV_USER: bool,
    IGNORE_WORKING_HOURS: bool,
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.BOT_TOKEN) {
      ctx.addIssue({
        code: 'custom',
        path: ['BOT_TOKEN'],
        message: 'productionda majburiy — usiz initData tekshirib bo‘lmaydi',
      });
    }
  });

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  isProduction: boolean;
  port: number;
  databaseUrl: string;
  botToken: string;
  adminChatId: string;
  adminIds: number[];
  publicUrl: string;
  useWebhook: boolean;
  webhookSecret: string;
  miniAppShortName: string;
  paymentProviderToken: string;
  telegramApiRoot: string;
  allowDevUser: boolean;
  ignoreHours: boolean;
  rateLimit: boolean;
  clientDir: string;
}

export function parseConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`.env sozlamalarida xato:\n${problems.join('\n')}`);
  }

  const env = result.data;
  // Render o'zi RENDER_EXTERNAL_URL beradi — u yerda PUBLIC_URL ni yozish shart emas
  const publicUrl = (env.PUBLIC_URL || env.RENDER_EXTERNAL_URL).replace(/\/+$/, '');
  const isProduction = env.NODE_ENV === 'production';

  return {
    env: env.NODE_ENV,
    isProduction,
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    botToken: env.BOT_TOKEN,
    adminChatId: env.ADMIN_CHAT_ID,
    adminIds: env.ADMIN_IDS,
    publicUrl,
    useWebhook: isProduction && publicUrl.startsWith('https://'),
    webhookSecret: env.WEBHOOK_SECRET,
    miniAppShortName: env.MINIAPP_SHORT_NAME,
    paymentProviderToken: env.PAYMENT_PROVIDER_TOKEN,
    telegramApiRoot: env.TELEGRAM_API_ROOT,
    // Telegram imzosisiz kirish — faqat lokal sinov uchun, productionda hech qachon
    allowDevUser: env.ALLOW_DEV_USER && !isProduction,
    ignoreHours: env.IGNORE_WORKING_HOURS,
    rateLimit: env.NODE_ENV !== 'test',
    clientDir: path.join(ROOT, 'dist', 'client'),
  };
}
