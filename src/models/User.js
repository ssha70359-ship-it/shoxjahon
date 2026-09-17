import prisma from '../database/connection.js';

export const UserModel = {
  /** Telegram ID bo'yicha topish */
  findByTelegramId(telegramId) {
    return prisma.user.findUnique({ where: { telegramId: String(telegramId) } });
  },

  findById(id) {
    return prisma.user.findUnique({ where: { id: Number(id) } });
  },

  /** Bor bo'lsa yangilaydi, yo'q bo'lsa yaratadi */
  upsert({ telegramId, firstName, lastName, username, phone }) {
    const data = {
      firstName: firstName || 'Mijoz',
      lastName: lastName || null,
      username: username || null,
    };

    if (phone) data.phone = phone;

    return prisma.user.upsert({
      where: { telegramId: String(telegramId) },
      update: data,
      create: { telegramId: String(telegramId), ...data },
    });
  },

  updatePhone(telegramId, phone) {
    return prisma.user.update({
      where: { telegramId: String(telegramId) },
      data: { phone },
    });
  },

  count() {
    return prisma.user.count();
  },
};

export default UserModel;
