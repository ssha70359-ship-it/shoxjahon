import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../server/lib/errors.js';
import { rateLimit } from '../server/middlewares/rate-limit.js';

it('rateLimit belgilangan sondan keyin too_many_requests beradi', () => {
  const limiter = rateLimit({ max: 2, windowMs: 60_000 });
  const request = (id: number) => ({ user: { id } }) as unknown as Request;
  const res = {} as Response;
  const results: string[] = [];
  const next: NextFunction = () => results.push('next');

  limiter(request(7), res, next);
  limiter(request(7), res, next);
  assert.throws(
    () => limiter(request(7), res, next),
    (error: unknown) => error instanceof AppError && error.status === 429,
  );
  // Boshqa foydalanuvchiga ta'sir qilmaydi
  limiter(request(8), res, next);

  assert.deepEqual(results, ['next', 'next', 'next']);
});
