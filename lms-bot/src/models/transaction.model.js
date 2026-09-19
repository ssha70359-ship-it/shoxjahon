import prisma from '../database/prisma.js';

/**
 * Tranzaksiya holatlari - Payme protokolidagi qiymatlar.
 * Click uchun ham shu qiymatlar ishlatiladi (PREPARED = CREATED).
 */
export const TransactionState = {
  CREATED: 1,
  PERFORMED: 2,
  CANCELLED: -1,
  CANCELLED_AFTER_PERFORM: -2,
};

const withOrder = { include: { order: { include: { user: true, course: true } } } };

export const TransactionModel = {
  findByProviderId(provider, providerTransId) {
    return prisma.transaction.findUnique({
      where: { provider_providerTransId: { provider, providerTransId: String(providerTransId) } },
      ...withOrder,
    });
  },

  findById(id) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) return null;

    return prisma.transaction.findUnique({ where: { id: numericId }, ...withOrder });
  },

  /** Shu arizada ochiq (tasdiqlanishi kutilayotgan) tranzaksiya bormi? */
  findActiveByOrder(orderId) {
    return prisma.transaction.findFirst({
      where: { orderId: Number(orderId), state: TransactionState.CREATED },
    });
  },

  findPerformedByOrder(orderId) {
    return prisma.transaction.findFirst({
      where: { orderId: Number(orderId), state: TransactionState.PERFORMED },
    });
  },

  /**
   * Tranzaksiya ochadi va arizani "to'lov kutilmoqda" holatiga o'tkazadi.
   * Ikkalasi bitta DB tranzaksiyasida bajariladi - yarim holat qolmaydi.
   */
  async create({ orderId, provider, providerTransId, amount, createdTime }) {
    const [transaction] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          orderId: Number(orderId),
          provider,
          providerTransId: String(providerTransId),
          amount: Number(amount),
          state: TransactionState.CREATED,
          ...(createdTime ? { createdTime } : {}),
        },
      }),
      prisma.order.update({
        where: { id: Number(orderId) },
        data: { status: 'PENDING', provider },
      }),
    ]);

    return transaction;
  },

  /**
   * To'lovni tasdiqlaydi: tranzaksiya PERFORMED, ariza PAID bo'ladi.
   * Atomar - to'lov o'tib, ariza to'lanmagan holda qolib ketmaydi.
   */
  async perform(transactionId, { orderId, provider }) {
    const performedAt = new Date();

    const [transaction] = await prisma.$transaction([
      prisma.transaction.update({
        where: { id: Number(transactionId) },
        data: { state: TransactionState.PERFORMED, performedAt },
      }),
      prisma.order.update({
        where: { id: Number(orderId) },
        data: { status: 'PAID', provider, paidAt: performedAt },
      }),
    ]);

    return transaction;
  },

  /**
   * Tranzaksiyani bekor qiladi.
   * To'langanidan keyin bekor qilinsa (-2) ariza ham bekor qilinadi - pul qaytarildi degani.
   */
  async cancel(transactionId, { orderId, reason, wasPerformed }) {
    const cancelledAt = new Date();
    const state = wasPerformed
      ? TransactionState.CANCELLED_AFTER_PERFORM
      : TransactionState.CANCELLED;

    const [transaction] = await prisma.$transaction([
      prisma.transaction.update({
        where: { id: Number(transactionId) },
        data: { state, reason: reason ?? null, cancelledAt },
      }),
      prisma.order.update({
        where: { id: Number(orderId) },
        data: { status: 'CANCELLED', paidAt: null },
      }),
    ]);

    return transaction;
  },

  /** Payme GetStatement uchun - berilgan oraliqdagi tranzaksiyalar */
  findInPeriod(provider, from, to) {
    return prisma.transaction.findMany({
      where: {
        provider,
        createdTime: { gte: new Date(Number(from)), lte: new Date(Number(to)) },
      },
      orderBy: { createdTime: 'asc' },
    });
  },
};

export default TransactionModel;
