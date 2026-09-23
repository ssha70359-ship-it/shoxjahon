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

    // Backendning o'z ommaviy manzili. Render uni avtomatik beradi.
    publicUrl: (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, ''),

    // Mini App manzili. Serverda (Render) Mini App backend bilan bitta domenda
    // turadi, shuning uchun alohida yozish shart emas. Kompyuterda - tunnel.
    webAppUrl: (
      process.env.WEBAPP_URL ||
      process.env.PUBLIC_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      ''
    ).replace(/\/$/, ''),

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

  },

  /**
   * Karta orqali to'lov (Telegram Payments). Tokenlar BotFather'dan olinadi:
   * /mybots -> bot -> Payments -> CLICK Uzbekistan / Payme.
   * Token bo'sh bo'lsa o'sha usul Mini App'da ko'rinmaydi. Naqd doim ishlaydi.
   */
  payments: {
    click: (process.env.CLICK_PROVIDER_TOKEN || '').trim(),
    // PAYMENT_PROVIDER_TOKEN - eski nomi (ilgari faqat Payme bor edi)
    payme: (process.env.PAYME_PROVIDER_TOKEN || process.env.PAYMENT_PROVIDER_TOKEN || '').trim(),
  },

  admin: {
    password: process.env.ADMIN_PASSWORD || 'admin123',
    panelUrl:
      process.env.ADMIN_PANEL_URL ||
      (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL
        ? `${(process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL).replace(/\/$/, '')}/admin/`
        : 'http://localhost:5174'),
    ids: (process.env.ADMIN_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  },

  // Brauzerdan (Telegramsiz) test qilishga ruxsat
  allowDevUser: process.env.ALLOW_DEV_USER === 'true',

  // Savatchadagi qo'shimcha taklif (upsell) - menyudagi mahsulot
  extraOffer: {
    id: 'extra-trubochka',
    name: 'Trubochka',
    price: 7000,
    imageUrl: '/products/trubochka.jpg',
  },

  messages: {
    orderAccepted:
      '✅ Buyurtmangiz muvaffaqiyatli qabul qilindi! Kuryerimiz tez orada bog‘lanadi \u{1F968}',
  },
};

export default config;
