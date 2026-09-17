import express from 'express';
import cors from 'cors';

import config from './config/default.js';
import { connectDatabase, disconnectDatabase } from './database/connection.js';
import bot from './core/bot.js';
import registerBotRoutes from './routes/bot.routes.js';
import clientRoutes from './routes/client.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();

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

app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'Bunday yo‘l topilmadi' });
});

// Prisma xatolarini tushunarli xabarga aylantiradi
const PRISMA_ERRORS = {
  P2025: [404, 'Bunday yozuv topilmadi'],
  P2002: [409, 'Bunday yozuv allaqachon mavjud'],
  P2003: [400, 'Bog\u2018liq yozuv topilmadi'],
};

// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  const known = PRISMA_ERRORS[error?.code];

  if (known) {
    const [status, message] = known;
    return res.status(status).json({ ok: false, message });
  }

  console.error('\u274C Server xatosi:', error);
  res.status(500).json({ ok: false, message: 'Ichki server xatosi' });
});

async function start() {
  await connectDatabase();

  registerBotRoutes();

  app.listen(config.port, () => {
    console.log(`\u{1F680} API server: http://localhost:${config.port}`);
    console.log(`\u{1F5A5}\uFE0F  Admin panel: ${config.admin.panelUrl}`);
    console.log(
      config.bot.webAppUrl?.startsWith('https://')
        ? `\u{1F4F1} Mini App: ${config.bot.webAppUrl}`
        : '\u26A0\uFE0F  WEBAPP_URL hali sozlanmagan (.env faylga ngrok manzilini yozing)',
    );
  });

  // Long polling cheksiz ishlaydi - shuning uchun await qilinmaydi,
  // aks holda Express server ishga tushmay qolardi.
  bot
    .launch({ dropPendingUpdates: true }, () => {
      console.log(`\u{1F916} Telegram bot ishga tushdi: @${bot.botInfo?.username}`);
    })
    .catch((error) => {
      console.error('\u26A0\uFE0F  Bot ishga tushmadi:', error.message);
      console.error('   BOT_TOKEN to\u2018g\u2018riligini tekshiring. API server ishlashda davom etadi.');
    });
}

async function shutdown(signal) {
  console.log(`\n${signal} — to‘xtatilmoqda...`);
  bot.stop(signal);
  await disconnectDatabase();
  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

start().catch((error) => {
  console.error('❌ Ishga tushirishda xato:', error);
  process.exit(1);
});
