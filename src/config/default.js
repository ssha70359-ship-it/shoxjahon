import crypto from 'node:crypto';

import dotenv from 'dotenv';

dotenv.config();

function required(key) {
  const value = process.env[key];
  if (!value) {
    console.error(`❌ .env faylda "${key}" topilmadi. .env.example dan nusxa oling.`);
    process.exit(1);
  }
  return value;
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,

  databaseUrl: required('DATABASE_URL'),

  bot: {
    token: required('BOT_TOKEN'),

    // Mini App manzili (Vercel yoki ngrok)
    webAppUrl: process.env.WEBAPP_URL || '',

    // Backendning o'z ommaviy manzili. Render uni avtomatik beradi.
    publicUrl: (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, ''),

    // Serverda webhook, kompyuterda long polling.
    // Render'da RENDER_EXTERNAL_URL bor, shuning uchun o'zi webhook'ga o'tadi.
    useWebhook: process.env.USE_WEBHOOK
      ? process.env.USE_WEBHOOK === 'true'
      : Boolean(process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL),

    // Lokal Bot API serveri yoki test uchun (odatda bo'sh)
    apiRoot: process.env.TELEGRAM_API_ROOT || '',

    // Telegram so'rovlarini tasdiqlash uchun maxfiy sarlavha
    webhookSecret:
      process.env.WEBHOOK_SECRET ||
      crypto.createHash('sha256').update(`${process.env.BOT_TOKEN}:webhook`).digest('hex').slice(0, 40),

    // Payme (Telegram Payments) provayder tokeni. Bo'sh bo'lsa, buyurtma
    // to'lovsiz ("naqd/kuryerga") rejimda qabul qilinadi.
    paymentProviderToken: process.env.PAYMENT_PROVIDER_TOKEN || '',
  },

  admin: {
    password: process.env.ADMIN_PASSWORD || 'admin123',
    panelUrl: process.env.ADMIN_PANEL_URL || 'http://localhost:5174',
    ids: (process.env.ADMIN_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  },

  // Brauzerdan (Telegramsiz) test qilishga ruxsat
  allowDevUser: process.env.ALLOW_DEV_USER === 'true',

  // Savatchadagi qo'shimcha taklif (upsell)
  extraOffer: {
    id: 'extra-cola',
    name: 'Coca-Cola 0.5L',
    price: 5000,
    imageUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80',
  },

  messages: {
    orderAccepted:
      '✅ Buyurtmangiz muvaffaqiyatli qabul qilindi! Kuryerimiz tez orada bog‘lanadi \u{1F968}',
  },
};

export default config;
