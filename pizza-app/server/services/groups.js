import crypto from 'node:crypto';

import { json, transaction } from '../db.js';
import { SHOP } from '../../shared/shop.js';
import { OrderError, assertAvailable, normalizeLine, unitPrice, LIMITS } from '../../shared/pricing.js';
import { displayName } from './users.js';

// "Davra" — do'stlar yoki hamkasblar bilan bitta umumiy buyurtma.
// Har kim o'z pitsasini qo'shadi, host rasmiylashtiradi, hisob esa
// har bir odamga alohida bo'lib ko'rsatiladi.

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function newCode() {
  let code = '';
  for (let i = 0; i < 6; i += 1) code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return code;
}

export function normalizeCode(code) {
  const value = String(code || '').toUpperCase();
  return /^[A-Z0-9]{6}$/.test(value) ? value : null;
}

export function createGroupService({ db, bus, now, stoplist }) {
  const statements = {
    get: db.prepare('SELECT * FROM groups WHERE code = ?'),
    insert: db.prepare(
      'INSERT INTO groups (code, host_id, status, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
    ),
    setStatus: db.prepare('UPDATE groups SET status = ?, order_id = ? WHERE code = ?'),
    hostOpen: db.prepare(
      "SELECT * FROM groups WHERE host_id = ? AND status = 'open' AND expires_at > ? ORDER BY created_at DESC LIMIT 1",
    ),
    latestForUser: db.prepare(`
      SELECT g.* FROM groups g
      JOIN group_members m ON m.code = g.code
      WHERE m.user_id = ? AND g.expires_at > ? AND g.status IN ('open', 'ordered')
      ORDER BY g.created_at DESC LIMIT 1
    `),
    members: db.prepare('SELECT * FROM group_members WHERE code = ? ORDER BY joined_at'),
    member: db.prepare('SELECT * FROM group_members WHERE code = ? AND user_id = ?'),
    addMember: db.prepare(
      'INSERT OR IGNORE INTO group_members (code, user_id, name, joined_at) VALUES (?, ?, ?, ?)',
    ),
    removeMember: db.prepare('DELETE FROM group_members WHERE code = ? AND user_id = ?'),
    items: db.prepare('SELECT * FROM group_items WHERE code = ? ORDER BY id'),
    item: db.prepare('SELECT * FROM group_items WHERE id = ? AND code = ?'),
    countItems: db.prepare('SELECT COUNT(*) AS n FROM group_items WHERE code = ?'),
    addItem: db.prepare(
      'INSERT INTO group_items (code, user_id, config, qty, created_at) VALUES (?, ?, ?, ?, ?)',
    ),
    setQty: db.prepare('UPDATE group_items SET qty = ? WHERE id = ?'),
    deleteItem: db.prepare('DELETE FROM group_items WHERE id = ?'),
    deleteUserItems: db.prepare('DELETE FROM group_items WHERE code = ? AND user_id = ?'),
  };

  function statusOf(row) {
    if (row.status === 'open' && row.expires_at <= now()) return 'expired';
    return row.status;
  }

  function load(code) {
    const normalized = normalizeCode(code);
    const row = normalized && statements.get.get(normalized);
    if (!row) throw new OrderError('group_not_found');
    return row;
  }

  function requireOpen(row) {
    const status = statusOf(row);
    if (status === 'expired') throw new OrderError('group_expired');
    if (status !== 'open') throw new OrderError('group_closed');
  }

  function requireMember(row, userId) {
    if (!statements.member.get(row.code, userId)) throw new OrderError('not_group_member');
  }

  function changed(code) {
    bus.emit('group:changed', code);
  }

  function view(code, viewerId) {
    const row = load(code);
    const items = statements.items.all(row.code).map((item) => {
      const config = json.parse(item.config);
      return { id: item.id, userId: item.user_id, config, qty: item.qty, unit: unitPrice(config) };
    });

    const members = statements.members.all(row.code).map((member) => {
      const own = items.filter((item) => item.userId === member.user_id);
      return {
        id: member.user_id,
        name: member.name,
        isHost: member.user_id === row.host_id,
        items: own.map(({ userId, ...rest }) => rest),
        subtotal: own.reduce((sum, item) => sum + item.unit * item.qty, 0),
      };
    });

    return {
      code: row.code,
      status: statusOf(row),
      hostId: row.host_id,
      orderId: row.order_id,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      isHost: viewerId === row.host_id,
      isMember: members.some((member) => member.id === viewerId),
      members,
      subtotal: members.reduce((sum, member) => sum + member.subtotal, 0),
      itemsCount: items.reduce((sum, item) => sum + item.qty, 0),
    };
  }

  return {
    view,

    memberIds(code) {
      return statements.members.all(code).map((member) => member.user_id);
    },

    isMember(code, userId) {
      return Boolean(statements.member.get(code, userId));
    },

    /** Foydalanuvchining hozirgi (ochiq yoki yaqinda buyurtma qilingan) davrasi */
    currentFor(userId) {
      const row = statements.latestForUser.get(userId, now());
      return row ? view(row.code, userId) : null;
    },

    create(user) {
      const existing = statements.hostOpen.get(user.id, now());
      if (existing) return view(existing.code, user.id);

      const time = now();
      const expires = time + SHOP.group.ttlHours * 3600_000;
      let code = newCode();
      while (statements.get.get(code)) code = newCode();

      transaction(db, () => {
        statements.insert.run(code, user.id, 'open', time, expires);
        statements.addMember.run(code, user.id, displayName(user), time);
      });

      changed(code);
      return view(code, user.id);
    },

    join(code, user) {
      const row = load(code);
      if (statements.member.get(row.code, user.id)) return view(row.code, user.id);

      requireOpen(row);
      if (statements.members.all(row.code).length >= SHOP.group.maxMembers) {
        throw new OrderError('group_full');
      }

      statements.addMember.run(row.code, user.id, displayName(user), now());
      changed(row.code);
      return view(row.code, user.id);
    },

    leave(code, userId) {
      const row = load(code);
      requireMember(row, userId);

      if (row.host_id === userId) {
        // Host chiqsa — davra yopiladi (agar hali buyurtma berilmagan bo'lsa)
        if (row.status === 'open') statements.setStatus.run('closed', null, row.code);
      } else {
        transaction(db, () => {
          statements.deleteUserItems.run(row.code, userId);
          statements.removeMember.run(row.code, userId);
        });
      }

      changed(row.code);
      return { ok: true };
    },

    addItem(code, userId, rawConfig, rawQty = 1) {
      const row = load(code);
      requireOpen(row);
      requireMember(row, userId);

      const qty = Number(rawQty);
      if (!Number.isInteger(qty) || qty < 1 || qty > LIMITS.maxQty) throw new OrderError('bad_qty');

      const config = normalizeLine(rawConfig);
      assertAvailable(config, stoplist.ids());

      if (statements.countItems.get(row.code).n >= SHOP.group.maxItems) {
        throw new OrderError('group_full');
      }

      statements.addItem.run(row.code, userId, JSON.stringify(config), qty, now());
      changed(row.code);
      return view(row.code, userId);
    },

    updateItem(code, userId, itemId, rawQty) {
      const row = load(code);
      requireOpen(row);
      requireMember(row, userId);

      const item = statements.item.get(Number(itemId), row.code);
      if (!item) throw new OrderError('item_not_found');
      // O'zingiznikini yoki (host bo'lsangiz) istalganini o'zgartirish mumkin
      if (item.user_id !== userId && row.host_id !== userId) throw new OrderError('forbidden');

      const qty = Number(rawQty);
      if (!Number.isInteger(qty) || qty < 0 || qty > LIMITS.maxQty) throw new OrderError('bad_qty');

      if (qty === 0) statements.deleteItem.run(item.id);
      else statements.setQty.run(qty, item.id);

      changed(row.code);
      return view(row.code, userId);
    },

    /** Buyurtma uchun qatorlar: har biri kim qo'shgani bilan */
    linesForOrder(code, hostId) {
      const row = load(code);
      requireOpen(row);
      if (row.host_id !== hostId) throw new OrderError('not_group_host');

      const names = new Map(statements.members.all(row.code).map((m) => [m.user_id, m.name]));
      const lines = statements.items.all(row.code).map((item) => ({
        config: normalizeLine(json.parse(item.config)),
        qty: item.qty,
        by: { id: item.user_id, name: names.get(item.user_id) || '' },
      }));

      if (lines.length === 0) throw new OrderError('empty_cart');
      return lines;
    },

    markOrdered(code, orderId) {
      statements.setStatus.run('ordered', orderId, code);
      changed(code);
    },
  };
}
