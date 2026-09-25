import { Router } from 'express';

import { createOrderSchema, idParamSchema } from '../../shared/schemas.js';
import type { OrderController } from '../controllers/order.controller.js';
import type { rateLimit } from '../middlewares/rate-limit.js';
import { validate } from '../middlewares/validate.js';

export function orderRoutes(controller: OrderController, limit: typeof rateLimit): Router {
  const router = Router();
  const byId = validate({ params: idParamSchema });

  router.get('/', controller.list);
  router.post('/', limit({ max: 6 }), validate({ body: createOrderSchema }), controller.create);
  router.get('/:id', byId, controller.get);
  router.post('/:id/invoice', limit({ max: 10 }), byId, controller.invoice);
  router.post('/:id/cash', byId, controller.payCash);
  router.post('/:id/cancel', byId, controller.cancel);

  return router;
}
