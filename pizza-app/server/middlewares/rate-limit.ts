// Oddiy xotiradagi cheklovchi: bitta foydalanuvchi bir daqiqada
// belgilangan sondan ko'p so'rov yubora olmaydi.

import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../lib/errors.js';

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  key?: (req: Request) => string | number;
  enabled?: boolean;
}

export function rateLimit({
  windowMs = 60_000,
  max = 20,
  key = (req) => req.user?.id ?? req.ip ?? 'anon',
  enabled = true,
}: RateLimitOptions = {}) {
  if (!enabled) return (_req: Request, _res: Response, next: NextFunction) => next();

  const hits = new Map<string | number, number[]>();
  const cleanup = setInterval(() => {
    const border = Date.now() - windowMs;
    for (const [id, times] of hits) {
      const fresh = times.filter((t) => t > border);
      if (fresh.length) hits.set(id, fresh);
      else hits.delete(id);
    }
  }, windowMs);
  cleanup.unref();

  return (req: Request, _res: Response, next: NextFunction): void => {
    const id = key(req);
    const now = Date.now();
    const times = (hits.get(id) ?? []).filter((t) => t > now - windowMs);
    if (times.length >= max) throw new AppError('too_many_requests');

    times.push(now);
    hits.set(id, times);
    next();
  };
}
