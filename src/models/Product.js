import prisma from '../database/connection.js';

export const ProductModel = {
  /** Mijozlar uchun - faqat aktiv mahsulotlar */
  findAllActive() {
    return prisma.product.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });
  },

  /** Admin uchun - hammasi */
  findAll() {
    return prisma.product.findMany({ orderBy: { id: 'asc' } });
  },

  findById(id) {
    return prisma.product.findUnique({ where: { id: Number(id) } });
  },

  findManyByIds(ids) {
    return prisma.product.findMany({
      where: { id: { in: ids.map(Number) } },
    });
  },

  create(data) {
    return prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        oldPrice: data.oldPrice ?? null,
        newPrice: data.newPrice,
        category: data.category,
        isActive: data.isActive ?? true,
      },
    });
  },

  update(id, data) {
    return prisma.product.update({
      where: { id: Number(id) },
      data,
    });
  },

  remove(id) {
    return prisma.product.delete({ where: { id: Number(id) } });
  },

  async categories() {
    const rows = await prisma.product.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return rows.map((row) => row.category);
  },

  count() {
    return prisma.product.count();
  },
};

export default ProductModel;
