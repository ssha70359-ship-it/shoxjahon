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
        paymentMethod: data.paymentMethod || 'NAQD',
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

  /** To'lanmagan buyurtmaning to'lov usulini almashtiradi (masalan Click -> Naqd) */
  setPaymentMethod(id, paymentMethod) {
    return prisma.order.update({
      where: { id: Number(id) },
      data: { paymentMethod },
      include: { user: true },
    });
  },

  /**
   * Click yoki Payme orqali to'lov o'tganda chaqiriladi.
   * Faqat hali to'lanmagan buyurtmani yangilaydi - Telegram xabarni qayta
   * yuborsa ham mijoz va adminlarga ikkinchi marta xabar ketmaydi.
   * Qaytaradi: { order, firstTime }
   */
  async markPaid(id, { telegramChargeId, providerChargeId, method }) {
    const { count } = await prisma.order.updateMany({
      where: { id: Number(id), paymentStatus: 'KUTILMOQDA' },
      data: {
        paymentStatus: 'TOLANGAN',
        telegramChargeId,
        providerChargeId,
        paidAt: new Date(),
        ...(method ? { paymentMethod: method } : {}),
      },
    });

    const order = await prisma.order.findUnique({
      where: { id: Number(id) },
      include: { user: true },
    });

    return { order, firstTime: count === 1 };
  },

  remove(id) {
    return prisma.order.delete({ where: { id: Number(id) } });
  },

  count(where) {
    return prisma.order.count({ where });
  },

  /**
   * Tushum: bekor qilinmagan naqd buyurtmalar + to'langan karta buyurtmalari.
   * To'lanmagan Click/Payme buyurtmasi hali pul emas - hisobga kirmaydi.
   */
  async revenue() {
    const result = await prisma.order.aggregate({
      _sum: { total: true },
      where: {
        status: { not: 'BEKOR_QILINDI' },
        OR: [{ paymentMethod: 'NAQD' }, { paymentStatus: 'TOLANGAN' }],
      },
    });
    return result._sum.total || 0;
  },
};

export default OrderModel;
