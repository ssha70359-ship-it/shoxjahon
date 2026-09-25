import { json } from '../db.js';

const LANGS = new Set(['uz', 'ru']);

/** Telegram tilidan ilova tilini tanlaydi: rus tilli qurilmalarga — ru, qolganlarga — uz */
export function pickLanguage(code) {
  const lang = String(code || '').toLowerCase();
  return /^(ru|be|kk|uk)/.test(lang) ? 'ru' : 'uz';
}

export function displayName(user) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || (user.username ? `@${user.username}` : `#${user.id}`);
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    username: row.username || '',
    language: row.language,
    phone: row.phone || '',
    slices: row.slices,
    address: json.parse(row.address),
  };
}

export function createUserService({ db, bus, now }) {
  const statements = {
    upsert: db.prepare(`
      INSERT INTO users (id, first_name, last_name, username, language, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        first_name = excluded.first_name,
        last_name  = excluded.last_name,
        username   = excluded.username,
        updated_at = excluded.updated_at
    `),
    get: db.prepare('SELECT * FROM users WHERE id = ?'),
    addSlices: db.prepare('UPDATE users SET slices = MAX(0, slices + ?), updated_at = ? WHERE id = ?'),
  };

  function get(id) {
    return mapUser(statements.get.get(id));
  }

  return {
    get,

    upsertFromTelegram(tgUser) {
      const time = now();
      statements.upsert.run(
        tgUser.id,
        (tgUser.first_name || '').slice(0, 64),
        (tgUser.last_name || '').slice(0, 64),
        (tgUser.username || '').slice(0, 64),
        pickLanguage(tgUser.language_code),
        time,
        time,
      );
      return get(tgUser.id);
    },

    update(id, patch) {
      const fields = [];
      const values = [];

      if (patch.language !== undefined && LANGS.has(patch.language)) {
        fields.push('language = ?');
        values.push(patch.language);
      }
      if (patch.phone !== undefined) {
        fields.push('phone = ?');
        values.push(patch.phone);
      }
      if (patch.address !== undefined) {
        fields.push('address = ?');
        values.push(json.stringify(patch.address));
      }
      if (fields.length === 0) return get(id);

      fields.push('updated_at = ?');
      values.push(now(), id);
      db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);

      const user = get(id);
      bus.emit('user:updated', user);
      return user;
    },

    addSlices(id, delta) {
      statements.addSlices.run(delta, now(), id);
      const user = get(id);
      bus.emit('user:updated', user);
      return user;
    },
  };
}
