// Zod bilan so'rovni tekshirish (route darajasida).
// Tekshirilgan qiymat sxemaning o'zi kalit bo'lib saqlanadi, controller esa
// read(req, schema) orqali uni aniq turi bilan oladi — qo'lda "as" kerak emas.

import type { NextFunction, Request, Response } from 'express';
import type { z, ZodType } from 'zod';

interface Schemas {
  body?: ZodType;
  params?: ZodType;
}

export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const store = (req.validated ??= new Map());
    if (schemas.params) store.set(schemas.params, schemas.params.parse(req.params));
    if (schemas.body) store.set(schemas.body, schemas.body.parse(req.body ?? {}));
    next();
  };
}

/** validate() dan o'tgan ma'lumotni turi bilan oladi */
export function read<S extends ZodType>(req: Request, schema: S): z.output<S> {
  if (!req.validated?.has(schema)) {
    throw new Error('Bu yo‘lda validate() middleware shu sxema bilan ulanmagan');
  }
  return req.validated.get(schema) as z.output<S>;
}
