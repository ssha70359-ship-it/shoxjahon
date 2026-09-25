// Mini App so'rovlarini himoyalaydi: har bir so'rovda initData imzosi bot tokeni bilan tekshiriladi.
// initData ikki joydan olinadi:
//   - "x-telegram-init-data" header (oddiy so'rovlar)
//   - "auth" query parametri (EventSource header yubora olmaydi)

import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../lib/errors.js';
import type { UserService } from '../services/user.service.js';
import { verifyInitData, type TelegramUser } from '../utils/telegram-init-data.js';

const DEV_NAMES = ['Aziz', 'Malika', 'Jasur', 'Nilufar', 'Timur', 'Dilnoza'];

/** Brauzerda sinash uchun soxta foydalanuvchi (faqat ALLOW_DEV_USER=true va production emas) */
export function devUser(raw: unknown): TelegramUser {
  const n = Math.min(Math.max(Number.parseInt(String(raw ?? ''), 10) || 1, 1), 99);
  return {
    id: 1_000_000 + n,
    first_name: DEV_NAMES[(n - 1) % DEV_NAMES.length]!,
    last_name: 'Test',
    username: `test${n}`,
    language_code: 'uz',
  };
}

interface AuthOptions {
  botToken: string;
  allowDevUser: boolean;
  users: UserService;
}

export function telegramAuth({ botToken, allowDevUser, users }: AuthOptions) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const fromQuery = typeof req.query.auth === 'string' ? req.query.auth : '';
    const initData = req.get('x-telegram-init-data') || fromQuery;
    const verified = verifyInitData(initData, botToken);

    let tgUser = verified?.user;
    if (!tgUser && allowDevUser) tgUser = devUser(req.get('x-dev-user') ?? req.query.dev);
    if (!tgUser) throw new AppError('unauthorized');

    req.user = await users.upsertFromTelegram(tgUser);
    req.startParam = verified?.startParam ?? '';
    next();
  };
}

/** Controller'larda autentifikatsiya qilingan foydalanuvchini olish */
export function currentUser(req: Request) {
  if (!req.user) throw new AppError('unauthorized');
  return req.user;
}
