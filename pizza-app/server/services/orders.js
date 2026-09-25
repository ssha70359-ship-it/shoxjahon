import { json, transaction } from '../db.js';
import { SHOP, distanceKm, estimateMinutes, isOpenAt, localMinutes, travelMinutes } from '../../shared/shop.js';
import {
  OrderError,
  assertAvailable,
  describeLine,
  normalizeCart,
  summarize,
  unitPrice,
} from '../../shared/pricing.js';
import { canTransition, customerCanCancel } from '../../shared/status.js';

const MODES = new Set(['delivery', 'pickup']);
const PAYMENTS = new Set(['cash', 'card', 'online']);

const text = (value, max) =>
  String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, max);

/** +998 90 123 45 67 → +998901234567 */
export function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

function normalizeAddress(raw, mode) {
  if (mode === 'pickup') return null;

  const address = {
    text: text(raw?.text, 200),
    entrance: text(raw?.entrance, 12),
    floor: text(raw?.floor, 12),
    apartment: text(raw?.apartment, 12),
  };
  if (address.text.length < 3) throw new OrderError('address_required');

  const lat = Number(raw?.lat);
  const lng = Number(raw?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    address.lat = Math.round(lat * 1e6) / 1e6;
    address.lng = Math.round(lng * 1e6) / 1e6;
  }

  return address;
}

function mapOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    groupCode: row.group_code,
    status: row.status,
    mode: row.mode,
    items: json.parse(row.items, []),
    address: json.parse(row.address),
    phone: row.phone,
    comment: row.comment || '',
    payment: row.payment,
    paid: Boolean(row.paid),
    subtotal: row.subtotal,
    deliveryFee: row.delivery_fee,
    discount: row.discount,
    total: row.total,
    slicesUsed: row.slices_used,
    slicesEarned: row.slices_earned,
    history: json.parse(row.history, []),
    distanceKm: row.distance_km,
    etaAt: row.eta_at,
    adminChatId: row.admin_chat_id,
    adminMessageId: row.admin_message_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Mijozga yuboriladigan ko'rinish (xodimlarga oid maydonlarsiz).
 * Davradoshlar buyurtmani ko'radi, lekin hostning telefoni va izohini emas.
 */
export function publicOrder(order, viewerId = order?.userId) {
  if (!order) return null;
  const { adminChatId, adminMessageId, ...rest } = order;
  if (viewerId !== order.userId) {
    rest.phone = '';
    rest.comment = '';
  }
  return rest;
}

export function createOrderService({ db, bus, now, users, groups, stoplist, options = {} }) {
  const statements = {
    insert: db.prepare(`
      INSERT INTO orders (
        user_id, group_code, items, mode, address, phone, comment, payment, paid,
        subtotal, delivery_fee, discount, total, slices_used, slices_earned,
        status, history, distance_km, eta_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    get: db.prepare('SELECT * FROM orders WHERE id = ?'),
    byUser: db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT ?'),
    update: db.prepare(
      'UPDATE orders SET status = ?, history = ?, eta_at = ?, updated_at = ? WHERE id = ?',
    ),
    markPaid: db.prepare(
      "UPDATE orders SET paid = 1, status = 'new', history = ?, updated_at = ? WHERE id = ?",
    ),
    toCash: db.prepare(
      "UPDATE orders SET payment = 'cash', status = 'new', history = ?, updated_at = ? WHERE id = ?",
    ),
    adminMessage: db.prepare('UPDATE orders SET admin_chat_id = ?, admin_message_id = ? WHERE id = ?'),
    since: db.prepare('SELECT * FROM orders WHERE created_at >= ? ORDER BY id'),
    takeSlices: db.prepare('UPDATE users SET slices = slices - ? WHERE id = ? AND slices >= ?'),
  };

  function get(id) {
    return mapOrder(statements.get.get(Number(id)));
  }

  function mustGet(id) {
    const order = get(id);
    if (!order) throw new OrderError('order_not_found');
    return order;
  }

  function emitUpdate(order, from) {
    bus.emit('order:updated', order, from);
    return order;
  }

  return {
    get,

    listByUser(userId, limit = 30) {
      return statements.byUser.all(userId, limit).map(mapOrder);
    },

    /** Buyurtmani mijoz yoki uning davradoshlari ko'ra oladi */
    canView(order, userId) {
      if (order.userId === userId) return true;
      return Boolean(order.groupCode && groups.isMember(order.groupCode, userId));
    },

    create(user, payload = {}) {
      const time = now();

      if (!options.ignoreHours && !isOpenAt(new Date(time))) throw new OrderError('closed');

      const mode = payload.mode;
      if (!MODES.has(mode)) throw new OrderError('bad_mode');

      const payment = payload.payment;
      if (!PAYMENTS.has(payment)) throw new OrderError('bad_payment');
      if (payment === 'online' && !options.onlinePayments) throw new OrderError('online_disabled');

      const phone = normalizePhone(payload.phone);
      if (!phone) throw new OrderError('phone_required');

      const address = normalizeAddress(payload.address, mode);
      const comment = text(payload.comment, 300);

      let lines;
      const groupCode = payload.groupCode ? String(payload.groupCode).toUpperCase() : null;

      if (groupCode) {
        lines = groups.linesForOrder(groupCode, user.id);
      } else {
        lines = normalizeCart(payload.items);
      }

      const stopped = stoplist.ids();
      for (const line of lines) assertAvailable(line.config, stopped);

      const summary = summarize(lines, {
        mode,
        useReward: Boolean(payload.useReward),
        slices: user.slices,
      });
      if (summary.belowMinimum) throw new OrderError('below_minimum');

      let km = null;
      if (address?.lat != null) {
        km = Math.round(distanceKm(SHOP.location, address) * 10) / 10;
        if (km > SHOP.delivery.radiusKm) throw new OrderError('too_far');
      }

      const items = lines.map((line) => ({
        config: line.config,
        qty: line.qty,
        unit: unitPrice(line.config),
        ...(line.by ? { by: line.by } : {}),
      }));

      const status = payment === 'online' ? 'pending_payment' : 'new';
      const history = [{ status, at: time }];
      const etaAt = time + estimateMinutes(mode, km) * 60_000;

      const id = transaction(db, () => {
        if (summary.slicesUsed > 0) {
          const taken = statements.takeSlices.run(summary.slicesUsed, user.id, summary.slicesUsed);
          if (taken.changes === 0) throw new OrderError('not_enough_slices');
        }

        const result = statements.insert.run(
          user.id,
          groupCode,
          JSON.stringify(items),
          mode,
          json.stringify(address),
          phone,
          comment,
          payment,
          summary.subtotal,
          summary.deliveryFee,
          summary.discount,
          summary.total,
          summary.slicesUsed,
          summary.slicesEarned,
          status,
          JSON.stringify(history),
          km,
          etaAt,
          time,
          time,
        );

        const orderId = Number(result.lastInsertRowid);
        if (groupCode) groups.markOrdered(groupCode, orderId);
        return orderId;
      });

      // Keyingi safar manzil va telefonni qayta yozmaslik uchun eslab qolamiz
      users.update(user.id, { phone, ...(address ? { address } : {}) });

      const order = get(id);
      bus.emit('order:created', order);
      return order;
    },

    /** Oshxona holatni o'zgartiradi (bot tugmalari orqali) */
    setStatus(id, to) {
      const order = mustGet(id);
      if (order.status === to) return order;
      if (!canTransition(order, to)) throw new OrderError('bad_transition');

      const time = now();
      const history = [...order.history, { status: to, at: time }];
      let etaAt = order.etaAt;

      if (to === 'delivering') etaAt = time + travelMinutes(order.distanceKm) * 60_000;
      if (to === 'ready' || to === 'done') etaAt = time;

      transaction(db, () => {
        statements.update.run(to, JSON.stringify(history), etaAt, time, order.id);

        if (to === 'done' && order.slicesEarned > 0) {
          users.addSlices(order.userId, order.slicesEarned);
        }
        if (to === 'cancelled' && order.slicesUsed > 0) {
          users.addSlices(order.userId, order.slicesUsed);
        }
      });

      return emitUpdate(get(order.id), order.status);
    },

    cancelByCustomer(id, userId) {
      const order = mustGet(id);
      if (order.userId !== userId) throw new OrderError('forbidden');
      if (!customerCanCancel(order)) throw new OrderError('cannot_cancel');
      return this.setStatus(order.id, 'cancelled');
    },

    markPaid(id) {
      const order = mustGet(id);
      if (order.paid) return order;
      if (order.status !== 'pending_payment') throw new OrderError('bad_transition');

      const time = now();
      const history = [...order.history, { status: 'new', at: time }];
      statements.markPaid.run(JSON.stringify(history), time, order.id);

      const updated = get(order.id);
      bus.emit('order:paid', updated);
      return emitUpdate(updated, order.status);
    },

    /** Onlayn to'lov o'tmasa — mijoz naqd pulga o'tkazishi mumkin */
    switchToCash(id, userId) {
      const order = mustGet(id);
      if (order.userId !== userId) throw new OrderError('forbidden');
      if (order.status !== 'pending_payment') throw new OrderError('bad_transition');

      const time = now();
      const history = [...order.history, { status: 'new', at: time }];
      statements.toCash.run(JSON.stringify(history), time, order.id);

      const updated = get(order.id);
      bus.emit('order:paid', updated);
      return emitUpdate(updated, order.status);
    },

    setAdminMessage(id, chatId, messageId) {
      statements.adminMessage.run(String(chatId), messageId, Number(id));
    },

    /** Bugungi statistika (Toshkent vaqti bo'yicha) */
    todayStats() {
      const time = now();
      const date = new Date(time);
      const startOfDay =
        time - (localMinutes(date) * 60 + date.getUTCSeconds()) * 1000 - date.getUTCMilliseconds();

      const orders = statements.since.all(startOfDay).map(mapOrder);
      const valid = orders.filter((order) => !['cancelled', 'pending_payment'].includes(order.status));
      const revenue = valid.reduce((sum, order) => sum + order.total, 0);

      const top = new Map();
      for (const order of valid) {
        for (const item of order.items) {
          const { title } = describeLine(item.config, 'uz');
          top.set(title, (top.get(title) || 0) + item.qty);
        }
      }

      return {
        count: valid.length,
        cancelled: orders.filter((order) => order.status === 'cancelled').length,
        active: valid.filter((order) => !['done'].includes(order.status)).length,
        revenue,
        average: valid.length ? Math.round(revenue / valid.length) : 0,
        top: [...top.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([title, qty]) => ({ title, qty })),
      };
    },
  };
}
