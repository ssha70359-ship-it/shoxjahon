import { Router } from 'express';

import { addGroupItemSchema, codeParamSchema, itemParamSchema, updateGroupItemSchema } from '../../shared/schemas.js';
import type { GroupController } from '../controllers/group.controller.js';
import type { rateLimit } from '../middlewares/rate-limit.js';
import { validate } from '../middlewares/validate.js';

export function groupRoutes(controller: GroupController, limit: typeof rateLimit): Router {
  const router = Router();
  const byCode = validate({ params: codeParamSchema });
  const writes = limit({ max: 60 });

  router.post('/', limit({ max: 10 }), controller.create);
  router.get('/:code', byCode, controller.view);
  router.post('/:code/join', writes, byCode, controller.join);
  router.post('/:code/leave', writes, byCode, controller.leave);
  router.post(
    '/:code/items',
    writes,
    validate({ params: codeParamSchema, body: addGroupItemSchema }),
    controller.addItem,
  );
  router.patch(
    '/:code/items/:id',
    writes,
    validate({ params: itemParamSchema, body: updateGroupItemSchema }),
    controller.updateItem,
  );
  router.post('/:code/share', limit({ max: 10 }), byCode, controller.share);

  return router;
}
