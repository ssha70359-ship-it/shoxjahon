import prisma from '../database/prisma.js';

/** Mini App'ga kerakli o'qituvchi maydonlari */
const teacherSelect = {
  select: { id: true, fullName: true, expertise: true, photoUrl: true, bio: true },
};

export const CourseModel = {
  /** Mini App katalogi - faqat faol kurslar */
  findActive({ direction } = {}) {
    return prisma.course.findMany({
      where: {
        isActive: true,
        ...(direction ? { direction } : {}),
      },
      include: { teacher: teacherSelect },
      orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
    });
  },

  findById(id) {
    return prisma.course.findUnique({
      where: { id: Number(id) },
      include: { teacher: teacherSelect },
    });
  },

  findBySlug(slug) {
    return prisma.course.findUnique({
      where: { slug },
      include: { teacher: teacherSelect },
    });
  },

  /** Katalogdagi filtr tugmalari uchun yo'nalishlar ro'yxati */
  async directions() {
    const rows = await prisma.course.groupBy({
      by: ['direction'],
      where: { isActive: true },
      _count: { _all: true },
    });

    return rows
      .map((row) => ({ name: row.direction, count: row._count._all }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  /** Guruhdagi bo'sh joylar - to'langan arizalar hisobga olinadi */
  async seatsLeft(courseId) {
    const course = await prisma.course.findUnique({
      where: { id: Number(courseId) },
      select: { seats: true },
    });

    if (!course) return 0;

    const taken = await prisma.order.count({
      where: { courseId: Number(courseId), status: 'PAID' },
    });

    return Math.max(course.seats - taken, 0);
  },
};

export default CourseModel;
