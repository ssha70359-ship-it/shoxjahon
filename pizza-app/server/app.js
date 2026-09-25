import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';

import express from 'express';

import { openDatabase } from './db.js';
import { createEventHub } from './events.js';
import { createApi } from './routes.js';
import { createTelegram } from './telegram.js';
import { createGroupService } from './services/groups.js';
import { createOrderService, publicOrder } from './services/orders.js';
import { createStoplistService } from './services/stoplist.js';
import { createUserService } from './services/users.js';

/**
 * Butun ilovani yig'adi. Testlar ham shu funksiyadan foydalanadi
 * (vaqtni, bazani va sozlamalarni almashtirib).
 */
export async function createServer({ config, now = Date.now, log = console, startBot = true }) {
  const db = openDatabase(config.databaseFile);
  const bus = new EventEmitter();
  bus.setMaxListeners(50);

  const users = createUserService({ db, bus, now });
  const stoplist = createStoplistService({ db, bus, now });
  const groups = createGroupService({ db, bus, now, stoplist });
  const orders = createOrderService({
    db,
    bus,
    now,
    users,
    groups,
    stoplist,
    options: { onlinePayments: Boolean(config.botToken && config.paymentProviderToken), ignoreHours: config.ignoreHours },
  });
  const services = { users, stoplist, groups, orders };

  const hub = createEventHub();
  const telegram = createTelegram({ config, services, bus, log });

  // --- Jonli yangilanishlar (SSE) -----------------------------------------

  function orderAudience(order) {
    const ids = [order.userId];
    if (order.groupCode) ids.push(...groups.memberIds(order.groupCode));
    return ids;
  }

  const pushOrder = (order) => {
    for (const id of new Set(orderAudience(order))) hub.publish([id], 'order', publicOrder(order, id));
  };
  bus.on('order:created', pushOrder);
  bus.on('order:updated', pushOrder);
  bus.on('user:updated', (user) => hub.publish([user.id], 'user', user));
  bus.on('stoplist:changed', (ids) => hub.broadcast('stoplist', [...ids]));
  bus.on('group:changed', (code) => {
    for (const id of groups.memberIds(code)) {
      hub.publish([id], 'group', groups.view(code, id));
    }
  });

  // --- HTTP ---------------------------------------------------------------

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use('/api', express.json({ limit: '64kb' }), createApi({ config, services, hub, telegram }));

  if (startBot && telegram.bot) {
    try {
      await telegram.start(app);
    } catch (error) {
      log.error(`❌ Bot ishga tushmadi: ${error.message}`);
    }
  }

  // Mini App (vite build natijasi)
  const indexFile = path.join(config.distDir, 'index.html');
  app.use(
    '/assets',
    express.static(path.join(config.distDir, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }),
  );
  app.use(express.static(config.distDir, { index: false, maxAge: '1h' }));
  app.get('*', (req, res) => {
    if (!fs.existsSync(indexFile)) {
      res.status(503).type('text').send('Mini App hali yigʻilmagan. Avval: npm run build');
      return;
    }
    res.set('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });

  async function close() {
    await telegram.stop();
    hub.close();
    db.close();
  }

  return { app, db, bus, services, hub, telegram, close };
}
