// Barcha xatolarni bitta joyda yagona JSON ko'rinishiga keltiradi:
// { ok: false, error: "<kod>", detail?, issues? }

import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import type { ApiFailure } from '../../shared/types.js';
import { AppError, DomainError, statusForCode } from '../lib/errors.js';
import type { Logger } from '../lib/logger.js';

// Zod sxemalarida message sifatida berilgan biznes kodlari — mijozga shundayligicha ko'rsatiladi
const KNOWN_CODES = new Set(['phone_required', 'address_required', 'empty_cart', 'group_not_found']);

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError('not_found'));
}

export function errorHandler(logger: Logger) {
  return (error: unknown, req: Request, res: Response, _next: NextFunction): void => {
    let status = 500;
    let body: ApiFailure & { issues?: { path: string; message: string }[] } = { ok: false, error: 'server_error' };

    if (error instanceof ZodError) {
      const known = error.issues.find((issue) => KNOWN_CODES.has(issue.message));
      status = known ? statusForCode(known.message) : 400;
      body = {
        ok: false,
        error: known?.message ?? 'validation',
        issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      };
    } else if (error instanceof AppError) {
      status = error.status;
      body = { ok: false, error: error.code };
    } else if (error instanceof DomainError) {
      status = statusForCode(error.code);
      body = { ok: false, error: error.code, detail: error.message };
    } else if (error instanceof SyntaxError && 'body' in error) {
      status = 400;
      body = { ok: false, error: 'validation' };
    } else {
      logger.error('[api]', req.method, req.originalUrl, error);
    }

    res.status(status).json(body);
  };
}
