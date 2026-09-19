import { Router } from 'express';

import orderController from '../controllers/order.controller.js';
import asyncHandler from '../middlewares/asyncHandler.js';
import { telegramAuth } from '../middlewares/auth.middleware.js';
import courseRoutes from './course.routes.js';
import orderRoutes from './order.routes.js';
import paymentRoutes from './payment.routes.js';

const router = Router();

// To'lov webhook'lari - Telegram avtorizatsiyasisiz (o'z imzosi bilan himoyalangan)
router.use('/payments', paymentRoutes);

// Qolgan hamma narsa faqat Telegram Mini App orqali
router.use(telegramAuth);

router.get('/me', asyncHandler(orderController.me));
router.use('/courses', courseRoutes);
router.use('/orders', orderRoutes);

export default router;
