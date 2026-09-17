import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  {
    name: 'Margarita',
    description: 'Pomidor sousi, Mozzarella pishlog‘i, Yangi rayhon, Zaytun moyi',
    imageUrl: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=800&q=80',
    oldPrice: 45000,
    newPrice: 39000,
    category: 'Klassik',
  },
  {
    name: 'Peperoni',
    description: 'Pomidor sousi, Mozzarella pishlog‘i, Peperoni kolbasa, Achchiq qalampir',
    imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80',
    oldPrice: 59000,
    newPrice: 49000,
    category: 'Go‘shtli',
  },
  {
    name: 'Qazi pizza',
    description: 'Pomidor sousi, Mozzarella pishlog‘i, Milliy qazi, Qizil piyoz, Ko‘katlar',
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
    oldPrice: 75000,
    newPrice: 65000,
    category: 'Go‘shtli',
  },
  {
    name: 'Pishloqli',
    description: '4 xil pishloq, Mozzarella, Parmezan, Chedder, Smetana sousi',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80',
    oldPrice: 55000,
    newPrice: 47000,
    category: 'Vegetarian',
  },
];

async function main() {
  console.log('\u{1F355} Seed boshlandi...');

  for (const product of products) {
    const existing = await prisma.product.findFirst({ where: { name: product.name } });

    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data: product });
      console.log(`   ♻️  Yangilandi: ${product.name}`);
    } else {
      await prisma.product.create({ data: product });
      console.log(`   ✅ Qo‘shildi: ${product.name}`);
    }
  }

  const total = await prisma.product.count();
  console.log(`\u{1F389} Seed tugadi. Bazada jami ${total} ta mahsulot bor.`);
}

main()
  .catch((error) => {
    console.error('❌ Seed xatosi:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
