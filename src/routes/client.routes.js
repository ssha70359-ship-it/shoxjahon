import { Router } from 'express';
import cartController from '../controllers/cartController.js';
import { telegramAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(telegramAuth);

router.get('/me', cartController.me);
router.get('/products', cartController.products);
router.get('/orders', cartController.myOrders);
router.post('/orders', cartController.createOrder);
router.post('/orders/:id/pay', cartController.payOrder);
router.post('/phone', cartController.savePhone);

export default router;
