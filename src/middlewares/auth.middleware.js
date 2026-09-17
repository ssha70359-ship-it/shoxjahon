import crypto from 'node:crypto';
import config from '../config/default.js';
import UserModel from '../models/User.js';

/**
 * Telegram initData ni HMAC-SHA256 orqali tekshiradi.
 * To'g'ri bo'lsa foydalanuvchi obyektini, aks holda null qaytaradi.
 */
export function verifyInitData(initData, botToken) {
  if (!initData) return null;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) return null;

    const rawUser = params.get('user');
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
}

/**
 * Mini App so'rovlarini himoyalaydi.
 * Header: x-telegram-init-data
 */
export async function telegramAuth(req, res, next) {
  try {
    const initData = req.headers['x-telegram-init-data'];
    let tgUser = verifyInitData(initData, config.bot.token);

    // Lokal brauzerda test qilish rejimi
    if (!tgUser && config.allowDevUser) {
      tgUser = { id: 999000999, first_name: 'Test', last_name: 'Mijoz', username: 'test_user' };
    }

    if (!tgUser) {
      return res.status(401).json({ ok: false, message: 'Avtorizatsiya xatosi. Ilovani Telegram orqali oching.' });
    }

    req.user = await UserModel.upsert({
      telegramId: tgUser.id,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name,
      username: tgUser.username,
    });

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Admin panel so'rovlarini himoyalaydi.
 * Header: x-admin-password
 */
export function adminAuth(req, res, next) {
  const password = req.headers['x-admin-password'];

  if (!password || password !== config.admin.password) {
    return res.status(401).json({ ok: false, message: 'Parol noto‘g‘ri' });
  }

  next();
}

export default { telegramAuth, adminAuth, verifyInitData };
