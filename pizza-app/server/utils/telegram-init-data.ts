// Telegram Mini App initData imzosini tekshirish.
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
//
// Algoritm:
//   secret = HMAC_SHA256(key = "WebAppData", data = BOT_TOKEN)
//   hash   = HEX(HMAC_SHA256(key = secret, data = data_check_string))
// data_check_string — "hash" dan boshqa barcha maydonlar, alifbo tartibida, "key=value\n" bilan.

import crypto from 'node:crypto';

import { z } from 'zod';

const DEFAULT_MAX_AGE_SECONDS = 24 * 60 * 60;

export const telegramUserSchema = z.object({
  id: z.number().int().positive(),
  first_name: z.string().default(''),
  last_name: z.string().optional(),
  username: z.string().optional(),
  language_code: z.string().optional(),
  is_premium: z.boolean().optional(),
  allows_write_to_pm: z.boolean().optional(),
  photo_url: z.string().optional(),
});

export type TelegramUser = z.infer<typeof telegramUserSchema>;

export interface VerifiedInitData {
  user: TelegramUser;
  startParam: string;
  authDate: number;
}

export interface VerifyOptions {
  /** initData necha soniyagacha amal qiladi (eskirgan imzo qayta ishlatilmasin) */
  maxAgeSeconds?: number;
  now?: number;
}

function dataCheckString(params: URLSearchParams): string {
  return [...params.entries()]
    .filter(([key]) => key !== 'hash')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
}

function signature(params: URLSearchParams, botToken: string): Buffer {
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  return crypto.createHmac('sha256', secret).update(dataCheckString(params)).digest();
}

/**
 * initData ni bot tokeni bilan tekshiradi.
 * To'g'ri va yangi bo'lsa foydalanuvchi ma'lumotlarini, aks holda null qaytaradi.
 * Hech qachon xato tashlamaydi — har qanday buzuq kirish shunchaki rad etiladi.
 */
export function verifyInitData(
  initData: string | undefined | null,
  botToken: string,
  { maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS, now = Date.now() }: VerifyOptions = {},
): VerifiedInitData | null {
  if (!initData || !botToken || initData.length > 8192) return null;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash || !/^[a-f0-9]{64}$/.test(hash)) return null;

    const expected = signature(params, botToken);
    // Vaqt bo'yicha hujumlardan himoya: taqqoslash doim bir xil vaqt oladi
    if (!crypto.timingSafeEqual(expected, Buffer.from(hash, 'hex'))) return null;

    const authDate = Number(params.get('auth_date'));
    if (!Number.isFinite(authDate) || now / 1000 - authDate > maxAgeSeconds) return null;

    const user = telegramUserSchema.safeParse(JSON.parse(params.get('user') ?? 'null'));
    if (!user.success) return null;

    return { user: user.data, startParam: params.get('start_param') ?? '', authDate };
  } catch {
    return null;
  }
}

/** Testlar uchun: maydonlarni imzolab, haqiqiy initData qatorini yasaydi */
export function signInitData(fields: Record<string, string>, botToken: string): string {
  const params = new URLSearchParams(fields);
  params.set('hash', signature(params, botToken).toString('hex'));
  return params.toString();
}
