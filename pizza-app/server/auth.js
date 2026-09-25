import crypto from 'node:crypto';

const MAX_AGE_SECONDS = 24 * 3600;

/**
 * Telegram Mini App initData imzosini tekshiradi.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 * To'g'ri bo'lsa { user, startParam, authDate } qaytaradi, aks holda null.
 */
export function verifyInitData(initData, botToken, { maxAgeSeconds = MAX_AGE_SECONDS, now = Date.now() } = {}) {
  if (!initData || !botToken) return null;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash || !/^[a-f0-9]{64}$/.test(hash)) return null;

    params.delete('hash');
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const expected = crypto.createHmac('sha256', secret).update(dataCheckString).digest();

    if (!crypto.timingSafeEqual(expected, Buffer.from(hash, 'hex'))) return null;

    const authDate = Number(params.get('auth_date'));
    if (!Number.isFinite(authDate) || now / 1000 - authDate > maxAgeSeconds) return null;

    const user = JSON.parse(params.get('user') || 'null');
    if (!user || !Number.isInteger(user.id)) return null;

    return { user, startParam: params.get('start_param') || '', authDate };
  } catch {
    return null;
  }
}

/** Test uchun: initData ni imzolab beradi */
export function signInitData(fields, botToken) {
  const params = new URLSearchParams(fields);
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  params.set('hash', crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex'));
  return params.toString();
}

const DEV_NAMES = ['Aziz', 'Malika', 'Jasur', 'Nilufar', 'Timur', 'Dilnoza'];

/** Brauzerda sinash uchun soxta foydalanuvchi (faqat ALLOW_DEV_USER=true bo'lsa) */
export function devUser(rawId) {
  const n = Math.min(Math.max(Number.parseInt(rawId, 10) || 1, 1), 99);
  return {
    id: 1_000_000 + n,
    first_name: DEV_NAMES[(n - 1) % DEV_NAMES.length],
    last_name: 'Test',
    username: `test${n}`,
    language_code: 'uz',
  };
}

/**
 * Express middleware. initData ikki joydan olinadi:
 *  - "x-telegram-init-data" header (oddiy so'rovlar)
 *  - "auth" query parametri (EventSource header yubora olmaydi)
 */
export function telegramAuth({ botToken, allowDevUser, users }) {
  return (req, res, next) => {
    const initData = req.get('x-telegram-init-data') || req.query.auth || '';
    const verified = verifyInitData(initData, botToken);
    let tgUser = verified?.user;

    if (!tgUser && allowDevUser) {
      tgUser = devUser(req.get('x-dev-user') || req.query.dev);
    }

    if (!tgUser) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    try {
      req.user = users.upsertFromTelegram(tgUser);
      req.startParam = verified?.startParam || '';
      next();
    } catch (error) {
      next(error);
    }
  };
}
