import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';
import cors from 'cors';

import config from './config/default.js';
import { connectDatabase, disconnectDatabase } from './database/connection.js';
import bot from './core/bot.js';
import registerBotRoutes from './routes/bot.routes.js';
import clientRoutes from './routes/client.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { uzsLimits } from './services/payments.js';
import UserModel from './models/User.js';

const app = express();

// Render/Vercel proxy ortida turadi - haqiqiy mijoz IP sini olish uchun
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Mahsulot rasmlari: public/products/*.jpg -> /products/*.jpg
const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
app.use(express.static(publicDir, { maxAge: '7d' }));

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'Bulochka API', version: '1.0.0' });
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
    // Mijozga ko'rsatish mumkin bo'lgan xato (masalan to'lov chegarasi)
    if (error?.expose && error.status) {
      return res.status(error.status).json({ ok: false, message: error.message });
    }

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

/**
 * Ilgari har bir mijozga alohida (chat) menyu tugmasi eski tunnel manzili
 * bilan yozilgan edi - manzil o'zgargach ular "502 Bad gateway" ochardi.
 * Hammasini umumiy tugmaga qaytaramiz. Telegram limiti uchun sekin yuboriladi.
 */
async function resetChatMenuButtons() {
  let ids = [];
  try {
    ids = await UserModel.allTelegramIds();
  } catch (error) {
    console.error('⚠️  Mijozlar ro‘yxati olinmadi:', error.message);
    return;
  }

  let done = 0;
  for (const chatId of ids) {
    try {
      await bot.telegram.setChatMenuButton({ chatId, menuButton: { type: 'default' } });
      done += 1;
    } catch {
      // mijoz botni bloklagan bo'lishi mumkin - o'tkazib yuboramiz
    }
    await new Promise((resolve) => setTimeout(resolve, 60));
  }

  if (ids.length) console.log(`\u{1F504} ${done}/${ids.length} mijozning menyu tugmasi yangilandi`);
}

/** Server ko'tarilgach botning menyu tugmasini Mini App'ga bog'laydi */
async function syncMenuButton() {
  const url = config.bot.webAppUrl;

  try {
    if (url?.startsWith('https://')) {
      // Telegraf camelCase kutadi: { menuButton } (menu_button yuborilmay qolardi)
      await bot.telegram.setChatMenuButton({
        menuButton: {
          type: 'web_app',
          text: '\u{1F968} Buyurtma berish',
          web_app: { url },
        },
      });
      console.log(`\u{1F4F1} Menyu tugmasi bog‘landi: ${url}`);
      resetChatMenuButtons();
    } else {
      await bot.telegram.setChatMenuButton({ menuButton: { type: 'commands' } });
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
    const cards = [
      config.payments.click && 'Click',
      config.payments.payme && 'Payme',
    ].filter(Boolean);

    // Karta chegaralarini oldindan olib qo'yamiz - birinchi mijoz kutmasin
    if (cards.length) uzsLimits().catch(() => {});
    console.log(
      cards.length
        ? `\u{1F4B3} To‘lov: Naqd + ${cards.join(' + ')}`
        : '\u{1F4B3} To‘lov: faqat naqd — karta uchun: npm run payment:token click|payme <token>',
    );
    // Bittasi ulanmagan bo'lsa Mini App'da ko'rinmaydi - sababini aniq aytamiz
    for (const [name, key] of [['Click', 'click'], ['Payme', 'payme']]) {
      if (cards.length && !config.payments[key]) {
        console.log(`   ${name} ulanmagan (Mini App'da ko‘rinmaydi) — npm run payment:token ${key} <token>`);
      }
    }
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