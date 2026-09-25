// Testlar uchun: har bir test fayli o'zining toza SQLite bazasi bilan ishlaydi
// (Prisma migratsiyalari haqiqatan qo'llanadi — migratsiyalar ham sinovdan o'tadi).

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

import { createApp, type AppInstance } from '../server/app.js';
import { parseConfig, ROOT, type AppConfig } from '../server/config/env.js';
import { silentLogger } from '../server/lib/logger.js';
import { createPrisma, type PrismaClient } from '../server/lib/prisma.js';

export interface TestApp extends AppInstance {
  prisma: PrismaClient;
  config: AppConfig;
  baseUrl: string;
  server: Server;
  clock: { now: number };
  shutdown(): Promise<void>;
}

// Toshkent vaqti bilan 14:00 — pitsaxona ochiq
export const OPEN_TIME = Date.UTC(2026, 8, 25, 9, 0);

export async function createTestApp(env: Record<string, string> = {}, startBot = false): Promise<TestApp> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'olov-test-'));
  const databaseUrl = `file:${path.join(dir, `${crypto.randomUUID()}.db`)}`;

  execFileSync(process.execPath, [path.join(ROOT, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });

  const config = parseConfig({ NODE_ENV: 'test', DATABASE_URL: databaseUrl, ...env });
  config.clientDir = path.join(dir, 'no-client');

  const prisma = createPrisma(databaseUrl);
  const clock = { now: OPEN_TIME };
  const instance = await createApp({ config, prisma, clock: () => clock.now, logger: silentLogger, startBot });

  const server = instance.app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    ...instance,
    prisma,
    config,
    server,
    clock,
    baseUrl: `http://127.0.0.1:${port}/api`,
    async shutdown() {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      await instance.close();
      await prisma.$disconnect();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

export interface CallResult {
  status: number;
  body: any;
}

/** Dev foydalanuvchi nomidan API ga so'rov */
export function caller(app: TestApp) {
  return async (userNo: number, method: string, url: string, body?: unknown): Promise<CallResult> => {
    const response = await fetch(`${app.baseUrl}${url}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-dev-user': String(userNo) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };
}

export const devId = (n: number) => 1_000_000 + n;
