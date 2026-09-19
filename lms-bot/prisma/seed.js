import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const teachers = [
  {
    key: 'aziz',
    fullName: 'Aziz Rahimov',
    expertise: 'Senior Frontend Developer',
    bio: '7 yillik tajriba. React va TypeScript bo‘yicha 400 dan ortiq o‘quvchi tayyorlagan.',
    photoUrl: 'https://i.pravatar.cc/240?img=12',
  },
  {
    key: 'malika',
    fullName: 'Malika Yusupova',
    expertise: 'Product Designer',
    bio: 'Figma va UX tadqiqotlari bo‘yicha amaliyotchi dizayner.',
    photoUrl: 'https://i.pravatar.cc/240?img=45',
  },
  {
    key: 'jasur',
    fullName: 'Jasur Karimov',
    expertise: 'Backend Engineer',
    bio: 'Node.js, PostgreSQL va yuqori yuklamali tizimlar bo‘yicha mutaxassis.',
    photoUrl: 'https://i.pravatar.cc/240?img=33',
  },
];

const courses = [
  {
    slug: 'frontend-react',
    title: 'Frontend dasturlash (React)',
    description:
      'HTML, CSS, JavaScript asoslaridan boshlab React'
      + ' bilan to‘liq ishlaydigan ilova yozishgacha. Kurs oxirida portfolio loyihasi tayyor bo‘ladi.',
    direction: 'Dasturlash',
    level: 'BEGINNER',
    durationWeeks: 16,
    lessonsPerWeek: 3,
    price: 850000,
    oldPrice: 1000000,
    seats: 20,
    teacherKey: 'aziz',
    coverUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
  },
  {
    slug: 'backend-nodejs',
    title: 'Backend dasturlash (Node.js)',
    description:
      'Express, PostgreSQL, Prisma va REST API. To‘lov tizimlari integratsiyasi va serverga joylashtirish amaliyoti bilan.',
    direction: 'Dasturlash',
    level: 'INTERMEDIATE',
    durationWeeks: 20,
    lessonsPerWeek: 3,
    price: 1100000,
    seats: 16,
    teacherKey: 'jasur',
    coverUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80',
  },
  {
    slug: 'ui-ux-design',
    title: 'UI/UX dizayn',
    description:
      'Figma, dizayn tizimlari, prototiplash va foydalanuvchi tadqiqotlari. Real buyurtmalar ustida ishlash.',
    direction: 'Dizayn',
    level: 'BEGINNER',
    durationWeeks: 12,
    lessonsPerWeek: 2,
    price: 700000,
    seats: 18,
    teacherKey: 'malika',
    coverUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80',
  },
  {
    slug: 'smm-marketing',
    title: 'SMM va raqamli marketing',
    description:
      'Instagram va Telegram’da kontent strategiyasi, targeting, analitika va sotuv voronkasi.',
    direction: 'Marketing',
    level: 'BEGINNER',
    durationWeeks: 8,
    lessonsPerWeek: 2,
    price: 550000,
    seats: 25,
    teacherKey: 'malika',
    coverUrl: 'https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=800&q=80',
  },
];

/** Kurs boshlanish sanasi - bugundan N kundan keyin */
function startsInDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(9, 0, 0, 0);
  return date;
}

async function main() {
  const teacherIds = {};

  for (const { key, ...data } of teachers) {
    // Teacher'da unique maydon yo'q, shuning uchun ism bo'yicha qidirib yangilaymiz
    const existing = await prisma.teacher.findFirst({ where: { fullName: data.fullName } });

    const teacher = existing
      ? await prisma.teacher.update({ where: { id: existing.id }, data })
      : await prisma.teacher.create({ data });

    teacherIds[key] = teacher.id;
  }

  let index = 0;

  for (const { teacherKey, ...data } of courses) {
    index += 1;

    const payload = {
      ...data,
      teacherId: teacherIds[teacherKey],
      startDate: startsInDays(index * 7),
    };

    await prisma.course.upsert({
      where: { slug: data.slug },
      update: payload,
      create: payload,
    });
  }

  console.log(`✅ Seed tugadi: ${teachers.length} o‘qituvchi, ${courses.length} kurs`);
}

main()
  .catch((error) => {
    console.error('❌ Seed xatosi:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
