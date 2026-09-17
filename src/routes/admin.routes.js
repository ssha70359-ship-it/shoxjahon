import { Router } from 'express';
import adminController from '../controllers/adminController.js';
import { adminAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// Login parol tekshiruvisiz
router.post('/login', adminController.login);

// Qolgan hamma yo'llar himoyalangan
router.use(adminAuth);

router.get('/stats', adminController.stats);

router.get('/orders', adminController.orders);
router.patch('/orders/:id', adminController.updateOrderStatus);
router.delete('/orders/:id', adminController.deleteOrder);

router.get('/products', adminController.products);
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

export default router;
