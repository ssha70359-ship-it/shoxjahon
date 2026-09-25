// Ilovani yig'ish (composition root): baza → servislar → bot → HTTP.
// Testlar ham shu funksiyadan foydalanadi (vaqt, baza va sozlamalarni almashtirib).

import fs from 'node:fs';
import path from 'node:path';

import express, { type Express } from 'express';

import { createTelegramGateway } from './bot/telegram.gateway.js';
import type { TelegramGateway } from './bot/gateway.js';
import type { AppConfig } from './config/env.js';
import { systemClock, type Clock } from './lib/clock.js';
import { EventBus } from './lib/events.js';
import { consoleLogger, type Logger } from './lib/logger.js';
import type { PrismaClient } from './lib/prisma.js';
import { SseHub } from './lib/sse.js';
import { errorHandler } from './middlewares/error-handler.js';
import { createApiRouter } from './routes/index.js';
import { createServices, type Services } from './services/index.js';
import { toPublicOrder, type OrderRecord } from './services/mappers.js';

export interface AppDeps {
  config: AppConfig;
  prisma: PrismaClient;
  clock?: Clock;
  logger?: Logger;
  startBot?: boolean;
}

export interface AppInstance {
  app: Express;
  bus: EventBus;
  hub: SseHub;
  services: Services;
  telegram: TelegramGateway;
  close(): Promise<void>;
}

export async function createApp({
  config,
  prisma,
  clock = systemClock,
  logger = consoleLogger,
  startBot = true,
}: AppDeps): Promise<AppInstance> {
  const bus = new EventBus();
  const hub = new SseHub();
  const services = await createServices(prisma, bus, clock, config);
  const telegram = createTelegramGateway({ config, services, bus, logger });

  wireLiveUpdates(bus, hub, services, logger);

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use('/api', createApiRouter({ config, services, telegram, hub }));
  app.use('/api', errorHandler(logger));

  if (startBot && telegram.bot) {
    try {
      await telegram.start(app);
    } catch (error) {
      logger.error(`❌ Bot ishga tushmadi: ${(error as Error).message}`);
    }
  }

  serveClient(app, config.clientDir);

  return {
    app,
    bus,
    hub,
    services,
    telegram,
    async close() {
      await telegram.stop();
      hub.close();
      bus.removeAllListeners();
    },
  };
}

/** Servis hodisalarini Mini App'ga SSE orqali yetkazadi */
function wireLiveUpdates(bus: EventBus, hub: SseHub, services: Services, logger: Logger): void {
  const fail = (error: unknown) => logger.error('[sse]', error);

  const pushOrder = async (order: OrderRecord) => {
    const audience = new Set([order.userId]);
    if (order.groupCode) for (const id of await services.groups.memberIds(order.groupCode)) audience.add(id);
    // Har kimga o'ziga mos ko'rinish (davradoshlar hostning telefonini ko'rmaydi)
    for (const id of audience) hub.publish([id], 'order', toPublicOrder(order, id));
  };

  bus.on('order:created', (order) => void pushOrder(order).catch(fail));
  bus.on('order:updated', (order) => void pushOrder(order).catch(fail));
  bus.on('user:updated', (user) => hub.publish([user.id], 'user', user));
  bus.on('stoplist:changed', (ids) => hub.broadcast('stoplist', ids));
  bus.on('group:changed', (code) => {
    void (async () => {
      for (const id of await services.groups.memberIds(code)) {
        hub.publish([id], 'group', await services.groups.view(code, id));
      }
    })().catch(fail);
  });
}

/** Mini App (vite build natijasi) va SPA yo'llari */
function serveClient(app: Express, clientDir: string): void {
  const indexFile = path.join(clientDir, 'index.html');

  app.use(
    '/assets',
    express.static(path.join(clientDir, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }),
  );
  app.use(express.static(clientDir, { index: false, maxAge: '1h' }));
  app.get('/{*path}', (_req, res) => {
    if (!fs.existsSync(indexFile)) {
      res.status(503).type('text').send('Mini App hali yigʻilmagan. Avval: npm run build');
      return;
    }
    res.set('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });
}
