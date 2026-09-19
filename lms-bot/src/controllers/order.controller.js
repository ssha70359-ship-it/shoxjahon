import CourseModel from '../models/course.model.js';
import OrderModel from '../models/order.model.js';
import UserModel from '../models/user.model.js';
import { buildPaymentOptions } from '../services/payment.service.js';
import logger from '../utils/logger.js';
import {
  cleanText,
  normalizePhone,
  toPositiveInt,
  NotFoundError,
  ValidationError,
} from '../utils/validate.js';

/** Mini App'ga qaytariladigan ariza ko'rinishi */
function present(order) {
  return {
    id: order.id,
    status: order.status,
    amount: order.amount,
    fullName: order.fullName,
    phone: order.phone,
    comment: order.comment,
    provider: order.provider,
    paidAt: order.paidAt,
    createdAt: order.createdAt,
    course: order.course
      ? {
          id: order.course.id,
          title: order.course.title,
          direction: order.course.direction,
        }
      : null,
  };
}

export const orderController = {
  /** GET /api/orders - mening arizalarim */
  async myOrders(req, res) {
    const orders = await OrderModel.findByUserId(req.user.id);

    res.json({ ok: true, orders: orders.map(present) });
  },

  /** GET /api/orders/:id */
  async detail(req, res) {
    const id = toPositiveInt(req.params.id, { field: 'id' });
    const order = await OrderModel.findById(id);

    // Boshqa foydalanuvchining arizasi ham "topilmadi" deb qaytariladi -
    // shu tariqa ariza raqamlarini birma-bir terib ko'rishdan foyda bo'lmaydi
    if (!order || order.userId !== req.user.id) throw new NotFoundError('Ariza topilmadi');

    res.json({ ok: true, order: present(order), payments: buildPaymentOptions(order) });
  },

  /**
   * POST /api/orders - kursga yozilish arizasi
   * Body: { courseId, fullName, phone, comment? }
   */
  async create(req, res) {
    const courseId = toPositiveInt(req.body?.courseId, { field: 'courseId' });
    const fullName = cleanText(req.body?.fullName, { field: 'Ism familiya', min: 3, max: 80 });
    const phone = normalizePhone(req.body?.phone);
    const comment = req.body?.comment
      ? cleanText(req.body.comment, { field: 'Izoh', max: 500 })
      : null;

    const course = await CourseModel.findById(courseId);
    if (!course || !course.isActive) throw new NotFoundError('Kurs topilmadi');

    // Takroriy ariza: to'langan bo'lsa qaytarib yubormaymiz, to'lanmagani qayta ishlatiladi
    const existing = await OrderModel.findOpenForCourse(req.user.id, course.id);

    if (existing?.status === 'PAID') {
      throw new ValidationError('Siz bu kursga allaqachon yozilgansiz');
    }

    if (existing) {
      return res.status(200).json({
        ok: true,
        reused: true,
        order: present(existing),
        payments: buildPaymentOptions(existing),
      });
    }

    const seatsLeft = await CourseModel.seatsLeft(course.id);
    if (seatsLeft <= 0) throw new ValidationError('Afsus, bu guruhda bo‘sh joy qolmadi');

    const order = await OrderModel.create({
      userId: req.user.id,
      courseId: course.id,
      fullName,
      phone,
      comment,
      // Narx arizaga nusxalanadi: kurs narxi keyin o'zgarsa ham to'lov summasi o'zgarmaydi
      amount: course.price,
    });

    // Keyingi safar forma avtomatik to'lishi uchun
    if (req.user.phone !== phone) await UserModel.savePhone(req.user.id, phone);

    logger.info(`Yangi ariza #${order.id}: ${fullName} → ${course.title}`);

    res.status(201).json({
      ok: true,
      order: present(order),
      payments: buildPaymentOptions(order),
    });
  },

  /** GET /api/me - Mini App ochilganda profil ma'lumoti */
  async me(req, res) {
    res.json({
      ok: true,
      user: {
        id: req.user.id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        username: req.user.username,
        phone: req.user.phone,
        role: req.user.role,
      },
    });
  },
};

export default orderController;
