import { PrismaClient } from '@prisma/client';
import config from '../config/default.js';

export const prisma = new PrismaClient({
  log: config.env === 'development' ? ['warn', 'error'] : ['error'],
});

export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('\u{1F5C4}️  PostgreSQL (Neon) bazasiga ulandi');
  } catch (error) {
    console.error('❌ Bazaga ulanib bo‘lmadi:', error.message);
    process.exit(1);
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}

export default prisma;
