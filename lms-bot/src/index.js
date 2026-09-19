import config, { clickEnabled, paymeEnabled } from './config/index.js';
import createApp from './app.js';
import { connectDatabase, disconnectDatabase } from './database/prisma.js';
import logger from './utils/logger.js';

/** Webhook manzillarini ko'rsatadi - Payme/Click kabinetiga aynan shular kiritiladi */
function printPaymentSetup() {
  const base = config.publicUrl || `http://localhost:${config.port}`;

  logger.payment(
    paymeEnabled
      ? `Payme yoqilgan → webhook: ${base}/api/payments/payme`
      : 'Payme o‘chirilgan (PAYME_MERCHANT_ID / PAYME_KEY .env da yo‘q)',
  );

  logger.payment(
    clickEnabled
      ? `Click yoqilgan → prepare: ${base}/api/payments/click/prepare, complete: ${base}/api/payments/click/complete`
      : 'Click o‘chirilgan (CLICK_SERVICE_ID / CLICK_MERCHANT_ID / CLICK_SECRET_KEY .env da yo‘q)',
  );

  if (config.isProduction && !config.publicUrl) {
    logger.warn('PUBLIC_URL sozlanmagan - to‘lov tizimlari webhook manzilini bilmaydi');
  }
}

async function start() {
  await connectDatabase();

  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info(`\u{1F680} API server: ${config.publicUrl || `http://localhost:${config.port}`}`);
    logger.info(
      config.webAppUrl
        ? `\u{1F4F1} Mini App: ${config.webAppUrl}`
        : '⚠️  WEBAPP_URL hali sozlanmagan',
    );
    printPaymentSetup();

    if (config.allowDevUser) {
      logger.warn('ALLOW_DEV_USER=true - bu rejim faqat lokal test uchun!');
    }
  });

  return server;
}

async function shutdown(signal, server) {
  logger.info(`${signal} — to‘xtatilmoqda...`);

  server?.close();
  await disconnectDatabase();

  process.exit(0);
}

const server = await start();

process.once('SIGINT', () => shutdown('SIGINT', server));
process.once('SIGTERM', () => shutdown('SIGTERM', server));

// Kutilmagan xatolik serverni butunlay to'xtatib qo'ymasligi uchun
process.on('unhandledRejection', (reason) => {
  logger.error('Ushlanmagan promise xatosi:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Ushlanmagan xato:', error);
});
