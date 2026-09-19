import crypto from 'node:crypto';

import config from '../config/index.js';
import UserModel from '../models/user.model.js';
import logger from '../utils/logger.js';

/** initData eskirgan bo'lsa qabul qilinmaydi (o'g'irlangan header'ni qayta ishlatishdan himoya) */
const INIT_DATA_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Uzunligi turlicha bo'lgan satrlarni ham vaqt bo'yicha xavfsiz solishtiradi */
function safeEqual(a, b) {
  const bufferA = Buffer.from(String(a), 'utf8');
  const bufferB = Buffer.from(String(b), 'utf8');

  if (bufferA.length !== bufferB.length) return false;

  return crypto.timingSafeEqual(bufferA, bufferB);
}

/**
 * Telegram Mini App initData'sini tekshiradi.
 * Hujjat: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * @returns Telegram foydalanuvchi obyekti yoki null
 */
export function verifyInitData(initData, botToken) {
  if (!initData || typeof initData !== 'string') return null;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');
    // `signature` Telegram'ning yangi (Ed25519) imzosi - HMAC hisobiga kirmaydi
    params.delete('signature');

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (!safeEqual(calculatedHash, hash)) return null;

    // Eski initData'ni rad etamiz
    const authDate = Number(params.get('auth_date')) * 1000;
    if (!authDate || Date.now() - authDate > INIT_DATA_MAX_AGE_MS) return null;

    const rawUser = params.get('user');
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
}

/**
 * Mini App so'rovlarini himoyalaydi.
 * Header: `x-telegram-init-data: <window.Telegram.WebApp.initData>`
 *
 * Muvaffaqiyatli bo'lsa `req.user` ga bazadagi User yozuvini qo'yadi.
 */
export async function telegramAuth(req, res, next) {
  try {
    const initData = req.headers['x-telegram-init-data'];
    let telegramUser = verifyInitData(initData, config.bot.token);

    // Faqat lokal ishlab chiqish uchun (config.allowDevUser productionda hech qachon true bo'lmaydi)
    if (!telegramUser && config.allowDevUser) {
      telegramUser = { id: 999000999, first_name: 'Test', last_name: 'O‘quvchi', username: 'test_user' };
      logger.warn('ALLOW_DEV_USER yoqilgan - so‘rov test foydalanuvchisi nomidan bajarilmoqda');
    }

    if (!telegramUser) {
      return res.status(401).json({
        ok: false,
        message: 'Avtorizatsiya xatosi. Iltimos, ilovani Telegram orqali oching.',
      });
    }

    req.telegramUser = telegramUser;
    req.user = await UserModel.upsertFromTelegram(telegramUser);

    next();
  } catch (error) {
    next(error);
  }
}

/** Admin endpointlari uchun - foydalanuvchi ADMIN roli yoki ADMIN_IDS ro'yxatida bo'lishi kerak */
export function adminOnly(req, res, next) {
  const telegramId = String(req.user?.telegramId || '');
  const isAdmin = req.user?.role === 'ADMIN' || config.bot.adminIds.includes(telegramId);

  if (!isAdmin) {
    return res.status(403).json({ ok: false, message: 'Bu amal uchun ruxsat yo‘q' });
  }

  next();
}

export default { telegramAuth, adminOnly, verifyInitData };
