import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Farhadskaya Bulochka — boshlang'ich katalog.
 *
 * Narxlar Toshkent bozoriga mo'ljallangan TAXMINIY qiymatlar.
 * Haqiqiy narxlarni admin paneldan ("Mahsulotlar" bo'limi) o'zgartiring.
 *
 * `description` — tarkib, vergul bilan ajratiladi (Mini App shu bo'yicha ko'rsatadi).
 */
const products = [
  // ─────────────────────────── Bulochka ───────────────────────────
  {
    name: 'Mayizli bulochka',
    description: 'Sut xamiri, Mayiz, Sariyog‘, Vanil, Shakar sepilgan',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
    oldPrice: 5000,
    newPrice: 4000,
    category: 'Bulochka',
  },
  {
    name: 'Shakarli bulochka',
    description: 'Sut xamiri, Sariyog‘, Shakar, Tuxum surtilgan',
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80',
    newPrice: 3500,
    category: 'Bulochka',
  },
  {
    name: 'Kunjutli bulochka',
    description: 'Sut xamiri, Kunjut, Sariyog‘, Tuz',
    imageUrl: 'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=800&q=80',
    newPrice: 4000,
    category: 'Bulochka',
  },
  {
    name: 'Tvorogli bulochka',
    description: 'Sut xamiri, Tvorog, Smetana, Vanil, Shakar',
    imageUrl: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80',
    newPrice: 5000,
    category: 'Bulochka',
  },

  // ───────────────────────────── Non ──────────────────────────────
  {
    name: 'Oq non',
    description: 'Oliy nav un, Achitqi, Tuz, Suv',
    imageUrl: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&q=80',
    newPrice: 5000,
    category: 'Non',
  },
  {
    name: 'Qora non',
    description: 'Javdar uni, Bug‘doy uni, Achitqi, Tuz',
    imageUrl: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80',
    newPrice: 6000,
    category: 'Non',
  },
  {
    name: 'Javdar noni',
    description: 'To‘liq javdar uni, Xamirturush, Tuz, Suv',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
    newPrice: 8000,
    category: 'Non',
  },
  {
    name: 'Borodinskiy',
    description: 'Javdar uni, Koriandr, Solod, Shira, Tuz',
    imageUrl: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=800&q=80',
    oldPrice: 12000,
    newPrice: 10000,
    category: 'Non',
  },
  {
    name: 'Chiabatta',
    description: 'Italyan uni, Zaytun moyi, Xamirturush, Dengiz tuzi',
    imageUrl: 'https://images.unsplash.com/photo-1585478259715-876acc5be8eb?w=800&q=80',
    newPrice: 12000,
    category: 'Non',
  },

  // ─────────────────────── Samsa va slayka ────────────────────────
  {
    name: 'Sosiskali slayka',
    description: 'Qatlamali xamir, Mol go‘shti sosiska, Pishloq, Ketchup',
    imageUrl: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&q=80',
    newPrice: 7000,
    category: 'Samsa va slayka',
  },
  {
    name: 'Go‘shtli samsa',
    description: 'Qatlamali xamir, Mol go‘shti, Piyoz, Ziravorlar, Kunjut',
    imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80',
    oldPrice: 12000,
    newPrice: 10000,
    category: 'Samsa va slayka',
  },
  {
    name: 'Kartoshkali samsa',
    description: 'Qatlamali xamir, Kartoshka, Piyoz, Zira, Qalampir',
    imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80',
    newPrice: 8000,
    category: 'Samsa va slayka',
  },
  {
    name: 'Xonim',
    description: 'Yupqa xamir, Kartoshka, Go‘sht, Piyoz, Smetana sousi',
    imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80',
    newPrice: 25000,
    category: 'Samsa va slayka',
  },
  {
    name: 'Uy pitsasi',
    description: 'Xamir, Pomidor sousi, Mozzarella, Kolbasa, Bulg‘or qalampiri',
    imageUrl: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=800&q=80',
    oldPrice: 35000,
    newPrice: 30000,
    category: 'Samsa va slayka',
  },

  // ─────────────────────────── Shirinlik ──────────────────────────
  {
    name: 'Limonli olma pirogi',
    description: 'Qumoq xamir, Olma, Limon, Dolchin, Shakar pudrasi',
    imageUrl: 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?w=800&q=80',
    oldPrice: 40000,
    newPrice: 35000,
    category: 'Shirinlik',
  },
  {
    name: 'Zavarnoy kek',
    description: 'Zavarnoy xamir, Vanilli krem, Shakar pudrasi',
    imageUrl: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800&q=80',
    newPrice: 6000,
    category: 'Shirinlik',
  },
  {
    name: 'Napoleon (bo‘lak)',
    description: 'Qatlamali xamir, Zavarnoy krem, Sariyog‘, Vanil',
    imageUrl: 'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=800&q=80',
    newPrice: 12000,
    category: 'Shirinlik',
  },

  // ─────────────────────────── Pechenye ───────────────────────────
  {
    name: 'Kunjutli pechenye (1 kg)',
    description: 'Un, Kunjut, Sariyog‘, Shakar, Tuxum',
    imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&q=80',
    newPrice: 45000,
    category: 'Pechenye',
  },
  {
    name: 'Urug‘li pechenye (1 kg)',
    description: 'Un, Kungaboqar urug‘i, Zig‘ir urug‘i, Sariyog‘, Shakar',
    imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&q=80',
    oldPrice: 55000,
    newPrice: 48000,
    category: 'Pechenye',
  },
];

async function main() {
  console.log('\u{1F968} Seed boshlandi — Farhadskaya Bulochka katalogi...');

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
  console.log('   \u{1F4A1} Narxlar taxminiy — admin paneldan aniq narxlarni kiriting.');
}

main()
  .catch((error) => {
    console.error('❌ Seed xatosi:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
