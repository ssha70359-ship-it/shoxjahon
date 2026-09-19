import prisma from '../database/connection.js';

export const OrderModel = {
  create(data) {
    return prisma.order.create({
      data: {
        userId: data.userId,
        items: data.items,
        total: data.total,
        location: data.location,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        phone: data.phone ?? null,
        comment: data.comment ?? null,
      },
      include: { user: true },
    });
  },

  /** Admin panel uchun - barcha buyurtmalar */
  findAll({ status } = {}) {
    return prisma.order.findMany({
      where: status ? { status } : undefined,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  /** Mijozning shaxsiy tarixi */
  findByUserId(userId) {
    return prisma.order.findMany({
      where: { userId: Number(userId) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },

  findById(id) {
    return prisma.order.findUnique({
      where: { id: Number(id) },
      include: { user: true },
    });
  },

  updateStatus(id, status) {
    return prisma.order.update({
      where: { id: Number(id) },
      data: { status },
      include: { user: true },
    });
  },

  /** Payme orqali to'lov muvaffaqiyatli o'tganda chaqiriladi */
  markPaid(id, { telegramChargeId, providerChargeId }) {
    return prisma.order.update({
      where: { id: Number(id) },
      data: {
        paymentStatus: 'TOLANGAN',
        telegramChargeId,
        providerChargeId,
        paidAt: new Date(),
      },
      include: { user: true },
    });
  },

  remove(id) {
    return prisma.order.delete({ where: { id: Number(id) } });
  },

  count(where) {
    return prisma.order.count({ where });
  },

  async revenue() {
    const result = await prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { not: 'BEKOR_QILINDI' } },
    });
    return result._sum.total || 0;
  },
};

export default OrderModel;
