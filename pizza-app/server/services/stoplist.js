import { ITEM_BY_ID, PIZZA_BY_ID, TOPPING_BY_ID } from '../../shared/menu.js';

/**
 * Stop-list: vaqtincha tugagan pitsa, mahsulot yoki masalliqlar.
 * Oshxona uni botdagi /stop buyrug'i orqali boshqaradi.
 */
export function createStoplistService({ db, bus, now }) {
  const cache = new Set(db.prepare('SELECT id FROM stoplist').all().map((row) => row.id));

  const insert = db.prepare('INSERT OR IGNORE INTO stoplist (id, created_at) VALUES (?, ?)');
  const remove = db.prepare('DELETE FROM stoplist WHERE id = ?');

  return {
    has(id) {
      return cache.has(id);
    },

    ids() {
      return new Set(cache);
    },

    isKnown(id) {
      return Boolean(PIZZA_BY_ID[id] || ITEM_BY_ID[id] || TOPPING_BY_ID[id]);
    },

    /** Holatni almashtiradi va yangi holatni qaytaradi (true — to'xtatilgan) */
    toggle(id) {
      if (!this.isKnown(id)) throw new Error(`Nomaʼlum mahsulot: ${id}`);

      if (cache.has(id)) {
        remove.run(id);
        cache.delete(id);
      } else {
        insert.run(id, now());
        cache.add(id);
      }

      bus.emit('stoplist:changed', this.ids());
      return cache.has(id);
    },
  };
}
