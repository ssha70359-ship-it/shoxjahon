import dotenv from 'dotenv';

dotenv.config();

/** Majburiy o'zgaruvchi - bo'lmasa server ishga tushmaydi */
function required(key) {
  const value = process.env[key];
  if (!value) {
    console.error(`❌ .env faylda "${key}" topilmadi. .env.example dan nusxa oling.`);
    process.exit(1);
  }
  return value;
}

function list(key) {
  return (process.env[key] || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Oxiridagi "/" belgisi webhook yo'llarida ikki slashga sabab bo'ladi */
function trimSlash(value) {
  return (value || '').replace(/\/+$/, '');
}

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

export const config = {
  env,
  isProduction,
  port: Number(process.env.PORT) || 5000,

  databaseUrl: required('DATABASE_URL'),

  // Backendning o'z ommaviy manzili - to'lov webhook'lari shu yerga keladi
  publicUrl: trimSlash(process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL),
  webAppUrl: trimSlash(process.env.WEBAPP_URL),
  corsOrigins: list('CORS_ORIGINS'),

  bot: {
    token: required('BOT_TOKEN'),
    adminIds: list('ADMIN_IDS'),
  },

  payme: {
    merchantId: process.env.PAYME_MERCHANT_ID || '',
    key: process.env.PAYME_KEY || '',
    testKey: process.env.PAYME_TEST_KEY || '',
    checkoutUrl: trimSlash(process.env.PAYME_CHECKOUT_URL) || 'https://checkout.paycom.uz',
    // Payme tranzaksiyani ochgandan keyin 12 soat ichida tasdiqlashi shart.
    // Muddat o'tgan tranzaksiya 4-sabab bilan bekor qilinadi (protokol talabi).
    timeoutMs: 12 * 60 * 60 * 1000,
  },

  click: {
    serviceId: process.env.CLICK_SERVICE_ID || '',
    merchantId: process.env.CLICK_MERCHANT_ID || '',
    merchantUserId: process.env.CLICK_MERCHANT_USER_ID || '',
    secretKey: process.env.CLICK_SECRET_KEY || '',
    checkoutUrl: trimSlash(process.env.CLICK_CHECKOUT_URL) || 'https://my.click.uz/services/pay',
  },

  // Brauzerdan test qilish rejimi. Productionda hech qachon yoqilmaydi.
  allowDevUser: !isProduction && process.env.ALLOW_DEV_USER === 'true',
};

/** To'lov tizimi to'liq sozlanganmi? Sozlanmagani uchun havola berilmaydi. */
export const paymeEnabled = Boolean(config.payme.merchantId && (config.payme.key || config.payme.testKey));
export const clickEnabled = Boolean(
  config.click.serviceId && config.click.merchantId && config.click.secretKey,
);

export default config;
