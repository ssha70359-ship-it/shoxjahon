import config from '../config/default.js';
import { shop, isOpenNow } from '../config/shop.js';
import ProductModel from '../models/Product.js';
import OrderModel from '../models/Order.js';
import UserModel from '../models/User.js';
import botController from './botController.js';
import {
  METHODS,
  assertPayable,
  createInvoiceLink,
  isMethod,
  paymentOptions,
} from '../services/payments.js';

export const cartController = {
  /** GET /api/client/me */
  async me(req, res, next) {
    try {
      res.json({ ok: true, data: req.user });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/client/products */
  async products(req, res, next) {
    try {
      const [items, categories] = await Promise.all([
        ProductModel.findAllActive(),
        ProductModel.categories(),
      ]);

      res.json({
        ok: true,
        data: {
          products: items,
          categories,
          extraOffer: config.extraOffer,
          shop,
          isOpen: isOpenNow(),
          payments: paymentOptions(),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/client/phone */
  async savePhone(req, res, next) {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ ok: false, message: 'Telefon raqam kiritilmagan' });
      }

      const user = await UserModel.updatePhone(req.user.telegramId, String(phone).trim());
      res.json({ ok: true, data: user });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/client/orders
   * body: { items: [{ id, qty }], location, lat, lng, phone, name, comment, withExtra }
   */
  async createOrder(req, res, next) {
    try {
      const { items = [], location, lat, lng, phone, comment, withExtra } = req.body;
      const paymentMethod = req.body.paymentMethod || 'NAQD';

      if (!isMethod(paymentMethod)) {
        return res.status(400).json({ ok: false, message: 'Noma’lum to‘lov usuli' });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ ok: false, message: 'Savatcha bo‘sh' });
      }

      if (!location || String(location).trim().length < 3) {
        return res.status(400).json({ ok: false, message: 'Yetkazib berish manzilini kiriting' });
      }

      if (!phone || String(phone).trim().length < 7) {
        return res.status(400).json({ ok: false, message: 'Telefon raqamni kiriting' });
      }

      // Narxlar bazadan olinadi (mijoz yuborgan narxga ishonmaymiz)
      const ids = items.map((item) => Number(item.id)).filter(Boolean);
      const dbProducts = await ProductModel.findManyByIds(ids);

      const orderItems = [];
      let total = 0;

      for (const item of items) {
        const product = dbProducts.find((p) => p.id === Number(item.id));
        if (!product) continue;

        const qty = Math.max(1, Math.min(50, Number(item.qty) || 1));
        const sum = product.newPrice * qty;
        total += sum;

        orderItems.push({
          productId: product.id,
          name: product.name,
          price: product.newPrice,
          qty,
          sum,
          imageUrl: product.imageUrl,
        });
      }

      if (orderItems.length === 0) {
        return res.status(400).json({ ok: false, message: 'Mahsulotlar topilmadi' });
      }

      // Qo'shimcha taklif (Cola)
      if (withExtra) {
        const extra = config.extraOffer;
        total += extra.price;
        orderItems.push({
          productId: null,
          name: extra.name,
          price: extra.price,
          qty: 1,
          sum: extra.price,
          imageUrl: extra.imageUrl,
        });
      }

      // Karta usuli yoqilganmi va summa Telegram chegarasiga sig'adimi -
      // buyurtma yaratilishidan OLDIN, aks holda to'lab bo'lmaydigan buyurtma qoladi
      await assertPayable(paymentMethod, total);

      const cleanPhone = String(phone).trim();

      // Telefon raqamni profilga ham saqlaymiz
      await UserModel.updatePhone(req.user.telegramId, cleanPhone).catch(() => null);

      const order = await OrderModel.create({
        userId: req.user.id,
        items: orderItems,
        total,
        location: String(location).trim(),
        lat: lat ? Number(lat) : null,
        lng: lng ? Number(lng) : null,
        phone: cleanPhone,
        comment: comment ? String(comment).trim() : null,
        paymentMethod,
      });

      if (!METHODS[paymentMethod].card) {
        // Naqd: buyurtma darhol qabul qilinadi
        botController
          .notifyOrderAccepted(req.user.telegramId, order)
          .catch((error) => console.error('Xabar yuborishda xato:', error.message));
        botController
          .notifyAdmins(order)
          .catch((error) => console.error('Adminga xabar yuborishda xato:', error.message));

        return res.status(201).json({ ok: true, data: order, message: config.messages.orderAccepted });
      }

      // Karta: Mini App ichida ochiladigan hisob-faktura. Adminlar to'lov kelgach xabar oladi.
      let invoiceUrl = null;
      let invoiceError = null;

      try {
        invoiceUrl = await createInvoiceLink(order, paymentMethod);
      } catch (error) {
        // Buyurtma saqlandi - mijoz keyinroq "To'lash" orqali qayta urinishi mumkin
        console.error('Hisob-faktura yaratilmadi:', error.message);
        invoiceError = error.expose ? error.message : 'To‘lov oynasini ochib bo‘lmadi. Qayta urinib ko‘ring.';
      }

      res.status(201).json({ ok: true, data: { ...order, invoiceUrl, invoiceError } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/client/orders/:id/pay  { method }
   * To'lanmagan buyurtmani qayta to'lash yoki usulini almashtirish
   * (masalan Click bekor qilindi -> Payme yoki Naqd).
   */
  async payOrder(req, res, next) {
    try {
      const method = req.body?.method;

      if (!isMethod(method)) {
        return res.status(400).json({ ok: false, message: 'Noma’lum to‘lov usuli' });
      }

      const order = await OrderModel.findById(req.params.id);

      if (!order || order.userId !== req.user.id) {
        return res.status(404).json({ ok: false, message: 'Buyurtma topilmadi' });
      }

      if (order.paymentStatus === 'TOLANGAN') {
        return res.status(409).json({ ok: false, message: 'Bu buyurtma allaqachon to‘langan' });
      }

      if (order.status !== 'KUTILMOQDA') {
        return res.status(409).json({ ok: false, message: 'Bu buyurtmani endi to‘lab bo‘lmaydi' });
      }

      await assertPayable(method, order.total);

      const updated =
        order.paymentMethod === method ? order : await OrderModel.setPaymentMethod(order.id, method);

      if (!METHODS[method].card) {
        // Faqat kartadan naqdga o'tganda xabar beramiz - qayta so'rov kelsa ham takrorlanmaydi
        if (order.paymentMethod !== 'NAQD') {
          botController
            .notifyOrderAccepted(req.user.telegramId, updated)
            .catch((error) => console.error('Xabar yuborishda xato:', error.message));
          botController
            .notifyAdmins(updated)
            .catch((error) => console.error('Adminga xabar yuborishda xato:', error.message));
        }

        return res.json({ ok: true, data: { ...updated, invoiceUrl: null } });
      }

      const invoiceUrl = await createInvoiceLink(updated, method);
      res.json({ ok: true, data: { ...updated, invoiceUrl } });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/client/orders */
  async myOrders(req, res, next) {
    try {
      const orders = await OrderModel.findByUserId(req.user.id);
      res.json({ ok: true, data: orders });
    } catch (error) {
      next(error);
    }
  },
};

export default cartController;
