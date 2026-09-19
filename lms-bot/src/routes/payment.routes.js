import { Router } from 'express';

import { clickComplete, clickPrepare } from '../controllers/click.controller.js';
import { paymeWebhook } from '../controllers/payme.controller.js';

const router = Router();

/**
 * To'lov tizimlarining webhook'lari.
 *
 * Bu yo'llarga `telegramAuth` QO'YILMAYDI - so'rov foydalanuvchidan emas,
 * to'lov tizimi serveridan keladi. Ularning o'z tekshiruvi bor:
 *   Payme - Authorization: Basic base64("Paycom:<PAYME_KEY>")
 *   Click - md5 imzo (sign_string)
 */
router.post('/payme', paymeWebhook);

router.post('/click/prepare', clickPrepare);
router.post('/click/complete', clickComplete);

export default router;
