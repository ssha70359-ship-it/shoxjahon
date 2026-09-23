import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Farhadskaya Bulochka — haqiqiy katalog.
 *
 * Manba: @farhadskaya_bulochka Instagram "Menyu" va "Narxlar" storylari.
 * Narxlar e'lon qilinganidek "…so'mdan" (boshlang'ich narx) tarzida beriladi.
 *
 * `imageUrl` — backend `public/` papkasidan uzatiladigan nisbiy yo'l.
 * `description` — tarkib, vergul bilan ajratiladi (Mini App shu bo'yicha ko'rsatadi).
 */
const products = [
  // ──────────────────── Bulochka — 7 000 so'mdan ────────────────────
  {
    name: 'Serdechko',
    description: 'Qatlamali xamir, Sariyog‘, Shakar sirop, Yurak shaklida',
    imageUrl: '/products/serdechko.jpg?v=2',
    newPrice: 7000,
    category: 'Bulochka',
  },
  {
    name: 'Tvorogli bulochka',
    description: 'Sut xamiri, Tvorog, Sariyog‘, Shakar sirop',
    imageUrl: '/products/tvorogli.jpg?v=2',
    newPrice: 7000,
    category: 'Bulochka',
  },
  {
    name: 'Mayizli bulochka',
    description: 'Sut xamiri, Mayiz, Sariyog‘, Shakar sirop',
    imageUrl: '/products/mayizli.jpg?v=2',
    newPrice: 7000,
    category: 'Bulochka',
  },
  {
    name: 'Makli bulochka',
    description: 'Sut xamiri, Ko‘knori (mak), Sariyog‘, Shakar sirop',
    imageUrl: '/products/makli.jpg?v=2',
    newPrice: 7000,
    category: 'Bulochka',
  },
  {
    name: 'Shokoladli bulochka',
    description: 'Sut xamiri, Shokolad, Sariyog‘, Shakar sirop',
    imageUrl: '/products/shokoladli.jpg?v=2',
    newPrice: 7000,
    category: 'Bulochka',
  },
  {
    name: 'Sosiskali bulochka',
    description: 'Sut xamiri, Sosiska, Kunjut',
    imageUrl: '/products/sosiskali.jpg?v=2',
    newPrice: 7000,
    category: 'Bulochka',
  },
  {
    name: 'Simit',
    description: 'Turk xamiri, Kunjut, Uzuk shaklida',
    imageUrl: '/products/simit.jpg?v=2',
    newPrice: 7000,
    category: 'Bulochka',
  },
  {
    name: 'Tvorogli vatrushka',
    description: 'Sut xamiri, Tvorog, Smetana, Vanil',
    imageUrl: '/products/vatrushka.jpg',
    newPrice: 7000,
    category: 'Bulochka',
  },
  {
    name: 'Mayizli slayka',
    description: 'Yumshoq xamir, Mayiz, Vanilli krem, Shakar sirop',
    imageUrl: '/products/mayizli-slayka.jpg',
    newPrice: 7000,
    category: 'Bulochka',
  },

  // ─────────────────────────── Kruassan ───────────────────────────
  {
    name: 'Malinali kruassan',
    description: 'Qatlamali xamir, Malina qatlami, Quritilgan malina',
    imageUrl: '/products/kruassan-malina.jpg',
    newPrice: 18000,
    category: 'Kruassan',
  },
  {
    name: 'Shokoladli kruassan',
    description: 'Qatlamali xamir, Shokolad qatlami',
    imageUrl: '/products/kruassan-shokolad.jpg',
    newPrice: 18000,
    category: 'Kruassan',
  },
  {
    name: 'Pon shokolad',
    description: 'Qatlamali xamir, Shokolad tayoqchalari, Shakar sirop',
    imageUrl: '/products/pon-shokolad.jpg',
    newPrice: 18000,
    category: 'Kruassan',
  },
  {
    name: 'Mindalli kruassan',
    description: 'Qatlamali xamir, Mindal kremi, Mindal barglari',
    imageUrl: '/products/kruassan-mindal.jpg',
    newPrice: 23000,
    category: 'Kruassan',
  },
  {
    name: 'Fistashkali kruassan',
    description: 'Qatlamali xamir, Fistashka kremi, Maydalangan fistashka',
    imageUrl: '/products/kruassan-fistashka.jpg',
    newPrice: 23000,
    category: 'Kruassan',
  },

  // ─────────────────────────── Shirinlik ──────────────────────────
  {
    name: 'Blinchik',
    description: 'Yupqa blin, Ichimlik to‘ldirma',
    imageUrl: '/products/blinchik.jpg',
    newPrice: 6000,
    category: 'Shirinlik',
  },
  {
    name: 'Trubochka',
    description: 'Qatlamali xamir, Oqsilli krem',
    imageUrl: '/products/trubochka.jpg',
    newPrice: 7000,
    category: 'Shirinlik',
  },
  {
    name: 'Sinnabon',
    description: 'Dolchinli xamir, Krem-chiz, Shokolad sousi',
    imageUrl: '/products/sinnabon.jpg?v=2',
    newPrice: 12000,
    category: 'Shirinlik',
  },
  {
    name: 'Brauni',
    description: 'Qora shokolad, Sariyog‘, Tuxum, Un',
    imageUrl: '/products/brauni.jpg',
    newPrice: 12000,
    category: 'Shirinlik',
  },
  {
    name: 'Medovik',
    description: 'Asalli korj, Smetana kremi',
    imageUrl: '/products/medovik.jpg',
    newPrice: 20000,
    category: 'Shirinlik',
  },
  {
    name: 'San Sebastian',
    description: 'Krem-chiz, Qaymoq, Tuxum, Kuydirilgan yuza',
    imageUrl: '/products/san-sebastian.jpg',
    newPrice: 30000,
    category: 'Shirinlik',
  },
  {
    name: 'Tiramisu',
    description: 'Savoyardi, Mascarpone, Espresso, Kakao',
    imageUrl: '/products/tiramisu.jpg',
    newPrice: 30000,
    category: 'Shirinlik',
  },

  // ─────────────────────────── Pechenye ───────────────────────────
  {
    name: 'Rogalik',
    description: 'Uy pechenyesi, Sariyog‘ xamiri, Shakar pudrasi',
    imageUrl: '/products/rogalik.jpg',
    newPrice: 23000,
    category: 'Pechenye',
  },
  {
    name: 'Oreshki',
    description: 'Uy pechenyesi, Quyultirilgan sut, Sariyog‘',
    imageUrl: '/products/oreshki.jpg',
    newPrice: 25000,
    category: 'Pechenye',
  },
];

async function main() {
  console.log('\u{1F968} Seed boshlandi — Farhadskaya Bulochka katalogi...');

  for (const product of products) {
    const existing = await prisma.product.findFirst({ where: { name: product.name } });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: { ...product, isActive: true },
      });
      console.log(`   ♻️  Yangilandi: ${product.name}`);
    } else {
      await prisma.product.create({ data: product });
      console.log(`   ✅ Qo‘shildi: ${product.name}`);
    }
  }

  // Menyuda yo'q eski mahsulotlarni yashiramiz (o'chirmaymiz — tarix saqlanadi)
  const names = products.map((item) => item.name);
  const { count } = await prisma.product.updateMany({
    where: { name: { notIn: names }, isActive: true },
    data: { isActive: false },
  });

  if (count > 0) {
    console.log(`   \u{1F648} ${count} ta eski mahsulot nofaol qilindi`);
  }

  console.log(`\u{1F389} Seed tugadi. Menyuda ${products.length} ta mahsulot bor.`);
  console.log('   \u{1F4A1} Narxlar "…so‘mdan" — boshlang‘ich narx (Instagram menyusi bo‘yicha).');
}

main()
  .catch((error) => {
    console.error('❌ Seed xatosi:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
