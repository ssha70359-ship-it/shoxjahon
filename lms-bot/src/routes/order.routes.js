import { Router } from 'express';

import orderController from '../controllers/order.controller.js';
import asyncHandler from '../middlewares/asyncHandler.js';
import { rateLimit } from '../middlewares/rateLimit.middleware.js';

const router = Router();

/**
 * Ariza yuborish cheklovi - bitta foydalanuvchi daqiqasiga 10 marta.
 * Formada xato to'ldirilgan urinishlar ham sanaladi, shuning uchun chegara
 * odatdagi foydalanuvchini bezovta qilmaydigan darajada qo'yilgan.
 */
const createLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyBy: (req) => `order:${req.user?.id ?? req.ip}`,
  message: 'Juda tez-tez ariza yuborilmoqda. Bir daqiqadan keyin urinib ko‘ring.',
});

router.get('/', asyncHandler(orderController.myOrders));
router.get('/:id', asyncHandler(orderController.detail));
router.post('/', createLimit, asyncHandler(orderController.create));

export default router;
