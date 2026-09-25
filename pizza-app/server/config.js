import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** .env faylni o'qiydi (dotenv'siz). Muhitda bor o'zgaruvchilar ustun turadi. */
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;

  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;

    let value = rawValue;
    const quoted = value.match(/^(['"])(.*)\1$/);
    if (quoted) value = quoted[2];
    else value = value.replace(/\s+#.*$/, '');

    process.env[key] = value;
  }
}

loadEnvFile(path.join(ROOT, '.env'));

const env = process.env;

const list = (value) =>
  (value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

// Render o'zi RENDER_EXTERNAL_URL beradi — u yerda PUBLIC_URL ni yozish shart emas
const publicUrl = (env.PUBLIC_URL || env.RENDER_EXTERNAL_URL || '').trim().replace(/\/+$/, '');

export const config = {
  env: env.NODE_ENV || 'development',
  isProduction: env.NODE_ENV === 'production',
  port: Number(env.PORT) || 3000,

  botToken: (env.BOT_TOKEN || '').trim(),
  // Buyurtmalar tushadigan guruh yoki shaxsiy chat ID si
  adminChatId: (env.ADMIN_CHAT_ID || '').trim(),
  // Holatni o'zgartira oladigan xodimlar (bo'sh bo'lsa — admin chatdagi hamma)
  adminIds: list(env.ADMIN_IDS).map(Number).filter(Number.isFinite),

  // Mini App ochiladigan https manzil. Webhook ham shu manzilga o'rnatiladi.
  publicUrl,
  // Webhook faqat serverda (production) va https manzil bo'lsa yoqiladi
  useWebhook: env.NODE_ENV === 'production' && publicUrl.startsWith('https://'),
  webhookSecret: (env.WEBHOOK_SECRET || '').trim(),

  // BotFather → /newapp orqali yaratilgan Mini App qisqa nomi (ixtiyoriy).
  // Bo'lsa, "Davra" havolasi to'g'ridan-to'g'ri ilovani ochadi.
  miniAppShortName: (env.MINIAPP_SHORT_NAME || '').trim(),

  paymentProviderToken: (env.PAYMENT_PROVIDER_TOKEN || '').trim(),

  // Faqat testlar uchun: Telegram Bot API o'rniga soxta server
  telegramApiRoot: (env.TELEGRAM_API_ROOT || '').trim(),

  databaseFile: path.resolve(ROOT, env.DATABASE_FILE || 'data/pizza.db'),

  // Ish vaqtidan tashqarida ham buyurtma qabul qilish (sinov uchun)
  ignoreHours: env.IGNORE_WORKING_HOURS === 'true',

  // Faqat lokal brauzerda sinash uchun: Telegram imzosisiz kirishga ruxsat
  allowDevUser: env.ALLOW_DEV_USER === 'true' && env.NODE_ENV !== 'production',

  distDir: path.join(ROOT, 'dist'),
};

export default config;
