// Ishga tushirish nuqtasi: sozlamalar → baza → ilova → HTTP server.

import { createApp } from './app.js';
import { loadEnvFile, parseConfig } from './config/env.js';
import { consoleLogger as logger } from './lib/logger.js';
import { createPrisma } from './lib/prisma.js';

loadEnvFile();

let config;
try {
  config = parseConfig();
} catch (error) {
  logger.error(`❌ ${(error as Error).message}`);
  process.exit(1);
}

const prisma = createPrisma(config.databaseUrl);
const instance = await createApp({ config, prisma, logger });

const server = instance.app.listen(config.port, () => {
  logger.info(`🍕 Olov Pizza: http://localhost:${config.port}`);
  if (config.allowDevUser) logger.info('🧪 ALLOW_DEV_USER=true — brauzerda Telegramsiz sinash mumkin');
  if (config.publicUrl) logger.info(`🌍 Mini App: ${config.publicUrl}`);
});

let stopping = false;
async function shutdown(signal: string): Promise<void> {
  if (stopping) return;
  stopping = true;
  logger.info(`\n${signal} — toʻxtatilmoqda...`);
  server.close();
  await instance.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
