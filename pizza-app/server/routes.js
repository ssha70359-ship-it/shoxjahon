import express from 'express';

import { telegramAuth } from './auth.js';
import { rateLimit as createLimiter } from './rateLimit.js';
import { publicOrder } from './services/orders.js';
import { OrderError } from '../shared/pricing.js';
import { isOpenAt } from '../shared/shop.js';
import { isActive, nextStatus } from '../shared/status.js';

const NOT_FOUND = new Set(['order_not_found', 'group_not_found', 'item_not_found']);
const FORBIDDEN = new Set(['forbidden', 'not_group_member', 'not_group_host']);

/** Xatolarni bitta joyda JSON ko'rinishiga keltiradi */
function handle(fn) {
  return async (req, res) => {
    try {
      const result = await fn(req, res);
      if (result !== undefined) res.json({ ok: true, ...result });
    } catch (error) {
      if (error instanceof OrderError) {
        const status = NOT_FOUND.has(error.code) ? 404 : FORBIDDEN.has(error.code) ? 403 : 400;
        res.status(status).json({ ok: false, error: error.code, detail: error.message });
        return;
      }
      console.error('[api]', req.method, req.path, error);
      res.status(500).json({ ok: false, error: 'server_error' });
    }
  };
}

export function createApi({ config, services, hub, telegram }) {
  const { users, orders, groups, stoplist } = services;
  const router = express.Router();

  // Testlarda cheklovni o'chirish mumkin (config.rateLimit = false)
  const rateLimit = (options) =>
    config.rateLimit === false ? (req, res, next) => next() : createLimiter(options);

  router.get('/health', (req, res) => {
    res.json({ ok: true, bot: Boolean(telegram.username), streams: hub.size() });
  });

  router.use(telegramAuth({ botToken: config.botToken, allowDevUser: config.allowDevUser, users }));

  router.get('/stream', (req, res) => hub.handler(req, res));

  router.get(
    '/bootstrap',
    handle((req) => {
      const user = req.user;
      const active = orders
        .listByUser(user.id, 10)
        .filter((order) => isActive(order.status))
        .map(publicOrder);

      return {
        user,
        open: config.ignoreHours || isOpenAt(),
        stoplist: [...stoplist.ids()],
        activeOrders: active,
        group: groups.currentFor(user.id),
        payments: { online: telegram.canPay },
        bot: { username: telegram.username || null },
        startParam: req.startParam,
      };
    }),
  );

  router.patch(
    '/me',
    handle((req) => {
      const patch = {};
      if (req.body?.language) patch.language = req.body.language;
      return { user: users.update(req.user.id, patch) };
    }),
  );

  // --- Buyurtmalar ---------------------------------------------------------

  router.get(
    '/orders',
    handle((req) => ({ orders: orders.listByUser(req.user.id).map(publicOrder) })),
  );

  router.get(
    '/orders/:id',
    handle((req) => {
      const order = orders.get(req.params.id);
      if (!order || !orders.canView(order, req.user.id)) throw new OrderError('order_not_found');
      return { order: publicOrder(order, req.user.id) };
    }),
  );

  router.post(
    '/orders',
    rateLimit({ max: 6 }),
    handle(async (req) => {
      const order = orders.create(req.user, req.body || {});
      let invoiceUrl = null;

      if (order.status === 'pending_payment') {
        invoiceUrl = await telegram.createInvoiceLink(order, req.user.language);
      }

      return { order: publicOrder(order), invoiceUrl };
    }),
  );

  router.post(
    '/orders/:id/invoice',
    rateLimit({ max: 10 }),
    handle(async (req) => {
      const order = orders.get(req.params.id);
      if (!order || order.userId !== req.user.id) throw new OrderError('order_not_found');
      if (order.status !== 'pending_payment') throw new OrderError('bad_transition');
      return { invoiceUrl: await telegram.createInvoiceLink(order, req.user.language) };
    }),
  );

  router.post(
    '/orders/:id/cash',
    handle((req) => ({ order: publicOrder(orders.switchToCash(req.params.id, req.user.id)) })),
  );

  router.post(
    '/orders/:id/cancel',
    handle((req) => ({ order: publicOrder(orders.cancelByCustomer(req.params.id, req.user.id)) })),
  );

  // --- Davra (birgalikdagi buyurtma) ---------------------------------------

  const groupLimit = rateLimit({ max: 60 });

  router.post(
    '/groups',
    rateLimit({ max: 10 }),
    handle((req) => ({ group: groups.create(req.user) })),
  );

  router.get(
    '/groups/:code',
    handle((req) => ({ group: groups.view(req.params.code, req.user.id) })),
  );

  router.post(
    '/groups/:code/join',
    groupLimit,
    handle((req) => ({ group: groups.join(req.params.code, req.user) })),
  );

  router.post(
    '/groups/:code/leave',
    groupLimit,
    handle((req) => groups.leave(req.params.code, req.user.id)),
  );

  router.post(
    '/groups/:code/items',
    groupLimit,
    handle((req) => ({
      group: groups.addItem(req.params.code, req.user.id, req.body?.config, req.body?.qty ?? 1),
    })),
  );

  router.patch(
    '/groups/:code/items/:id',
    groupLimit,
    handle((req) => ({
      group: groups.updateItem(req.params.code, req.user.id, req.params.id, req.body?.qty),
    })),
  );

  router.post(
    '/groups/:code/share',
    rateLimit({ max: 10 }),
    handle(async (req) => {
      const group = groups.view(req.params.code, req.user.id);
      if (!group.isMember) throw new OrderError('not_group_member');
      return telegram.prepareGroupShare(req.user, group);
    }),
  );

  // Faqat lokal sinov (ALLOW_DEV_USER=true): botsiz ham oshxona tugmasini bosgandek
  // buyurtmani keyingi holatga o'tkazish — kuzatuv ekranini brauzerda ko'rish uchun
  if (config.allowDevUser) {
    router.post(
      '/dev/orders/:id/advance',
      handle((req) => {
        const order = orders.get(req.params.id);
        if (!order) throw new OrderError('order_not_found');
        const to = order.status === 'pending_payment' ? 'new' : nextStatus(order);
        if (!to) throw new OrderError('bad_transition');
        return { order: publicOrder(orders.setStatus(order.id, to)) };
      }),
    );
  }

  router.use((req, res) => res.status(404).json({ ok: false, error: 'not_found' }));

  return router;
}
