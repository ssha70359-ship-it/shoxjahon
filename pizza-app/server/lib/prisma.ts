import { PrismaClient } from '@prisma/client';

export type { PrismaClient };
export type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;

export function createPrisma(databaseUrl: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: ['warn', 'error'],
  });
}
