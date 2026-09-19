import prisma from '../database/prisma.js';

export const UserModel = {
  /** Telegram'dan kelgan ma'lumot bo'yicha foydalanuvchini yaratadi yoki yangilaydi */
  upsertFromTelegram({ id, first_name: firstName, last_name: lastName, username }) {
    const data = {
      firstName: firstName || 'Foydalanuvchi',
      lastName: lastName || null,
      username: username || null,
    };

    return prisma.user.upsert({
      where: { telegramId: String(id) },
      update: data,
      create: { telegramId: String(id), ...data },
    });
  },

  findByTelegramId(telegramId) {
    return prisma.user.findUnique({ where: { telegramId: String(telegramId) } });
  },

  findById(id) {
    return prisma.user.findUnique({ where: { id: Number(id) } });
  },

  /** Ariza yuborilganda raqamni profilga ham saqlab qo'yamiz - keyingi safar avtomatik to'ladi */
  savePhone(id, phone) {
    return prisma.user.update({ where: { id: Number(id) }, data: { phone } });
  },
};

export default UserModel;
