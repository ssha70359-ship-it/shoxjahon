import config from '../config/default.js';
import ProductModel from '../models/Product.js';
import OrderModel from '../models/Order.js';
import UserModel from '../models/User.js';

const STATUSES = ['KUTILMOQDA', 'YETKAZILDI', 'BEKOR_QILINDI'];

export const adminController = {
  /** POST /api/admin/login */
  login(req, res) {
    const { password } = req.body;

    if (password !== config.admin.password) {
      return res.status(401).json({ ok: false, message: 'Parol noto‘g‘ri' });
    }

    res.json({ ok: true, message: 'Xush kelibsiz!' });
  },

  /** GET /api/admin/stats */
  async stats(req, res, next) {
    try {
      const [orders, pending, products, users, revenue] = await Promise.all([
        OrderModel.count(),
        OrderModel.count({ status: 'KUTILMOQDA' }),
        ProductModel.count(),
        UserModel.count(),
        OrderModel.revenue(),
      ]);

      res.json({ ok: true, data: { orders, pending, products, users, revenue } });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/admin/orders */
  async orders(req, res, next) {
    try {
      const { status } = req.query;
      const orders = await OrderModel.findAll({
        status: STATUSES.includes(status) ? status : undefined,
      });
      res.json({ ok: true, data: orders });
    } catch (error) {
      next(error);
    }
  },

  /** PATCH /api/admin/orders/:id */
  async updateOrderStatus(req, res, next) {
    try {
      const { status } = req.body;

      if (!STATUSES.includes(status)) {
        return res.status(400).json({ ok: false, message: 'Holat noto‘g‘ri' });
      }

      const order = await OrderModel.updateStatus(req.params.id, status);
      res.json({ ok: true, data: order });
    } catch (error) {
      next(error);
    }
  },

  /** DELETE /api/admin/orders/:id */
  async deleteOrder(req, res, next) {
    try {
      await OrderModel.remove(req.params.id);
      res.json({ ok: true, message: 'Buyurtma o‘chirildi' });
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/admin/products */
  async products(req, res, next) {
    try {
      const products = await ProductModel.findAll();
      res.json({ ok: true, data: products });
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/admin/products */
  async createProduct(req, res, next) {
    try {
      const { name, description, imageUrl, oldPrice, newPrice, category } = req.body;

      if (!name || !newPrice || !category) {
        return res
          .status(400)
          .json({ ok: false, message: 'Nomi, yangi narxi va kategoriyasi majburiy' });
      }

      const product = await ProductModel.create({
        name: String(name).trim(),
        description: String(description || '').trim(),
        imageUrl: String(imageUrl || '').trim(),
        oldPrice: oldPrice ? Number(oldPrice) : null,
        newPrice: Number(newPrice),
        category: String(category).trim(),
        isActive: req.body.isActive !== false,
      });

      res.status(201).json({ ok: true, data: product });
    } catch (error) {
      next(error);
    }
  },

  /** PUT /api/admin/products/:id */
  async updateProduct(req, res, next) {
    try {
      const { name, description, imageUrl, oldPrice, newPrice, category, isActive } = req.body;
      const data = {};

      if (name !== undefined) data.name = String(name).trim();
      if (description !== undefined) data.description = String(description).trim();
      if (imageUrl !== undefined) data.imageUrl = String(imageUrl).trim();
      if (oldPrice !== undefined) data.oldPrice = oldPrice === null || oldPrice === '' ? null : Number(oldPrice);
      if (newPrice !== undefined) data.newPrice = Number(newPrice);
      if (category !== undefined) data.category = String(category).trim();
      if (isActive !== undefined) data.isActive = Boolean(isActive);

      const product = await ProductModel.update(req.params.id, data);
      res.json({ ok: true, data: product });
    } catch (error) {
      next(error);
    }
  },

  /** DELETE /api/admin/products/:id */
  async deleteProduct(req, res, next) {
    try {
      await ProductModel.remove(req.params.id);
      res.json({ ok: true, message: 'Mahsulot o‘chirildi' });
    } catch (error) {
      next(error);
    }
  },
};

export default adminController;
