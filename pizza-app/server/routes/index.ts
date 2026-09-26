// /api yo'llari. Har bir yo'l: Route → (validate / rateLimit) → Controller → Service.

import express, { Router } from 'express';

import { idParamSchema, reverseGeocodeSchema, updateMeSchema } from '../../shared/schemas.js';
import type { TelegramGateway } from '../bot/gateway.js';
import type { AppConfig } from '../config/env.js';
import { GeoController } from '../controllers/geo.controller.js';
import { GroupController } from '../controllers/group.controller.js';
import { OrderController } from '../controllers/order.controller.js';
import { SystemController } from '../controllers/system.controller.js';
import { UserController } from '../controllers/user.controller.js';
import type { SseHub } from '../lib/sse.js';
import { notFound } from '../middlewares/error-handler.js';
import { rateLimit } from '../middlewares/rate-limit.js';
import { telegramAuth } from '../middlewares/telegram-auth.js';
import { validate } from '../middlewares/validate.js';
import type { Services } from '../services/index.js';
import { groupRoutes } from './group.routes.js';
import { orderRoutes } from './order.routes.js';

interface ApiDeps {
  config: AppConfig;
  services: Services;
  telegram: TelegramGateway;
  hub: SseHub;
}

export function createApiRouter({ config, services, telegram, hub }: ApiDeps): Router {
  const router = Router();
  const limit: typeof rateLimit = (options) => rateLimit({ ...options, enabled: config.rateLimit });

  const system = new SystemController(services, telegram, hub);
  const users = new UserController(services, telegram, config);
  const orders = new OrderController(services, telegram);
  const groups = new GroupController(services, telegram);
  const geo = new GeoController(services);

  router.use(express.json({ limit: '64kb' }));

  // Ochiq yo'l
  router.get('/health', system.health);

  // Qolgan hammasi — faqat Telegram imzosi bilan
  router.use(telegramAuth({ botToken: config.botToken, allowDevUser: config.allowDevUser, users: services.users }));

  router.get('/bootstrap', users.bootstrap);
  router.patch('/me', validate({ body: updateMeSchema }), users.updateMe);
  router.get('/stream', system.stream);
  router.get('/geocode/reverse', limit({ max: 12 }), validate({ query: reverseGeocodeSchema }), geo.reverse);
  router.use('/orders', orderRoutes(orders, limit));
  router.use('/groups', groupRoutes(groups, limit));

  if (config.allowDevUser) {
    router.post('/dev/orders/:id/advance', validate({ params: idParamSchema }), system.devAdvance);
  }

  router.use(notFound);
  return router;
}
