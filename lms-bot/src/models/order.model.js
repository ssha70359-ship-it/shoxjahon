import prisma from '../database/prisma.js';

const orderInclude = {
  user: { select: { id: true, telegramId: true, firstName: true, username: true, phone: true } },
  course: { select: { id: true, slug: true, title: true, direction: true, price: true } },
};

export const OrderModel = {
  create({ userId, courseId, fullName, phone, comment, amount }) {
    return prisma.order.create({
      data: {
        userId: Number(userId),
        courseId: Number(courseId),
        fullName,
        phone,
        comment: comment || null,
        amount: Number(amount),
      },
      include: orderInclude,
    });
  },

  findById(id) {
    return prisma.order.findUnique({
      where: { id: Number(id) },
      include: orderInclude,
    });
  },

  /** Mini App "Mening arizalarim" bo'limi */
  findByUserId(userId) {
    return prisma.order.findMany({
      where: { userId: Number(userId) },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },

  /**
   * Shu foydalanuvchining shu kursdagi tugallanmagan arizasi.
   * Bir kursga ikki marta ariza qoldirilmasligi uchun tekshiriladi.
   */
  findOpenForCourse(userId, courseId) {
    return prisma.order.findFirst({
      where: {
        userId: Number(userId),
        courseId: Number(courseId),
        status: { in: ['NEW', 'PENDING', 'PAID'] },
      },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
  },

  updateStatus(id, status) {
    return prisma.order.update({
      where: { id: Number(id) },
      data: { status },
      include: orderInclude,
    });
  },

  /** Admin ro'yxati */
  findAll({ status, courseId, take = 100 } = {}) {
    return prisma.order.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(courseId ? { courseId: Number(courseId) } : {}),
      },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      take,
    });
  },
};

export default OrderModel;
