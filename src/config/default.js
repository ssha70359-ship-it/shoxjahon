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
    webAppUrl: process.env.WEBAPP_URL || '',
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
      '✅ Buyurtmangiz muvaffaqiyatli qabul qilindi! Kuryerimiz tez orada bog‘lanadi \u{1F355}',
  },
};

export default config;
