import crypto from 'node:crypto';

import express from 'express';
import cors from 'cors';

import config from './config/default.js';
import { connectDatabase, disconnectDatabase } from './database/connection.js';
import bot from './core/bot.js';
import registerBotRoutes from './routes/bot.routes.js';
import clientRoutes from './routes/client.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();

// Render/Vercel proxy ortida turadi - haqiqiy mijoz IP sini olish uchun
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'Pizza API', version: '1.0.0' });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use('/api/client', clientRoutes);
app.use('/api/admin', adminRoutes);

// Prisma xatolarini tushunarli xabarga aylantiradi
const PRISMA_ERRORS = {
  P2025: [404, 'Bunday yozuv topilmadi'],
  P2002: [409, 'Bunday yozuv allaqachon mavjud'],
  P2003: [400, 'Bog‘liq yozuv topilmadi'],
};

/** 404 va xato ushlagichlar oxirida turishi kerak (webhook'dan ham keyin) */
function registerFallbackHandlers() {
  app.use((req, res) => {
    res.status(404).json({ ok: false, message: 'Bunday yo‘l topilmadi' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    const known = PRISMA_ERRORS[error?.code];

    if (known) {
      const [status, message] = known;
      return res.status(status).json({ ok: false, message });
    }

    console.error('❌ Server xatosi:', error);
    res.status(500).json({ ok: false, message: 'Ichki server xatosi' });
  });
}

/** Tokendan kelib chiqqan, topib bo'lmaydigan webhook yo'li */
function webhookPath() {
  const hash = crypto.createHash('sha256').update(config.bot.token).digest('hex');
  return `/telegram/${hash.slice(0, 32)}`;
}

/**
 * Botni ulaydi.
 * Serverda (Render, Railway...) webhook, kompyuterda long polling ishlatiladi.
 * Webhook afzal: bepul tarifda server uxlab qolsa ham Telegram uni uyg'otadi.
 */
async function connectBot() {
  if (config.bot.useWebhook && config.bot.publicUrl) {
    const path = webhookPath();

    const middleware = await bot.createWebhook({
      domain: config.bot.publicUrl,
      path,
      secret_token: config.bot.webhookSecret,
      drop_pending_updates: true,
    });

    app.use(middleware);

    console.log(`\u{1F916} Bot webhook rejimida: ${config.bot.publicUrl}${path}`);
    return 'webhook';
  }

  return 'polling';
}

/** Server ko'tarilgach botning menyu tugmasini Mini App'ga bog'laydi */
async function syncMenuButton() {
  const url = config.bot.webAppUrl;

  try {
    if (url?.startsWith('https://')) {
      await bot.telegram.setChatMenuButton({
        menu_button: {
          type: 'web_app',
          text: '\u{1F355} Buyurtma berish',
          web_app: { url },
        },
      });
      console.log(`\u{1F4F1} Menyu tugmasi bog‘landi: ${url}`);
    } else {
      await bot.telegram.setChatMenuButton({ menu_button: { type: 'commands' } });
      console.warn('⚠️  WEBAPP_URL yo‘q — menyu tugmasi tozalandi');
    }
  } catch (error) {
    console.error('⚠️  Menyu tugmasi yangilanmadi:', error.message);
  }
}

async function start() {
  await connectDatabase();

  registerBotRoutes();

  let mode = 'polling';

  try {
    mode = await connectBot();
  } catch (error) {
    console.error('⚠️  Webhook o‘rnatilmadi:', error.message);
    console.error('   Long polling rejimiga o‘tilmoqda.');
  }

  registerFallbackHandlers();

  app.listen(config.port, () => {
    console.log(`\u{1F680} API server: ${config.bot.publicUrl || `http://localhost:${config.port}`}`);
    console.log(
      config.bot.webAppUrl?.startsWith('https://')
        ? `\u{1F4F1} Mini App: ${config.bot.webAppUrl}`
        : '⚠️  WEBAPP_URL hali sozlanmagan',
    );
    console.log(
      config.bot.paymentProviderToken
        ? '\u{1F4B3} To‘lov: Payme yoqilgan (PAYMENT_PROVIDER_TOKEN topildi)'
        : '\u{1F4B3} To‘lov: o‘chirilgan — PAYMENT_PROVIDER_TOKEN .env da yo‘q, naqd oqim ishlaydi',
    );
  });

  if (mode === 'polling') {
    // Long polling cheksiz ishlaydi - shuning uchun await qilinmaydi,
    // aks holda Express server ishga tushmay qolardi.
    bot
      .launch({ dropPendingUpdates: true }, () => {
        console.log(`\u{1F916} Telegram bot ishga tushdi: @${bot.botInfo?.username}`);
        syncMenuButton();
      })
      .catch((error) => {
        console.error('⚠️  Bot ishga tushmadi:', error.message);
        console.error('   BOT_TOKEN to‘g‘riligini tekshiring. API server ishlashda davom etadi.');
      });
  } else {
    await syncMenuButton();
  }
}

async function shutdown(signal) {
  console.log(`\n${signal} — to‘xtatilmoqda...`);
  try {
    bot.stop(signal);
  } catch {
    // bot ishga tushmagan bo'lsa Telegraf xato beradi - muhim emas
  }
  await disconnectDatabase();
  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

start().catch((error) => {
  console.error('❌ Ishga tushirishda xato:', error);
  process.exit(1);
});
// Serverda kutilmagan asinxron xatolik bo'lsa server to'xtab qolmasligi uchun:
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Asosiy oqimdagi kutilmagan xatoliklarni ushlash:
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err);
});