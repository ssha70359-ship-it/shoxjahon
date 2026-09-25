// npm run dev — lokal ishga tushirish uchun bitta buyruq:
//   1) .env yo'q bo'lsa .env.example dan nusxa oladi
//   2) NGROK_AUTHTOKEN bo'lsa — https tunnel ochadi va uni PUBLIC_URL qiladi
//      (bot menyu tugmasi shu manzilga o'zi bog'lanadi, BotFather'da sozlash shart emas)
//   3) API server va Vite (Mini App) ni birga ishga tushiradi

import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { loadEnvFile, parseConfig, ROOT } from '../server/config/env.js';

const WEB_PORT = 5173;

const paint = (code: number, text: string) => `\x1b[${code}m${text}\x1b[0m`;
const ok = (text: string) => console.log(`${paint(32, '✔')} ${text}`);
const warn = (text: string) => console.log(`${paint(33, '!')} ${text}`);

const envFile = path.join(ROOT, '.env');
if (!fs.existsSync(envFile)) {
  fs.copyFileSync(path.join(ROOT, '.env.example'), envFile);
  ok('.env yaratildi (.env.example nusxasi). BOT_TOKEN ni yozib qo‘ying.');
}

loadEnvFile();
const config = parseConfig();

// Baza jadvallari: yangi migratsiyalar bo'lsa qo'llanadi
await new Promise<void>((resolve, reject) => {
  const migrate = spawn(
    process.execPath,
    [path.join(ROOT, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'],
    {
      cwd: ROOT,
      stdio: 'inherit',
    },
  );
  migrate.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('prisma migrate deploy muvaffaqiyatsiz'))));
});
ok('Baza tayyor (prisma migrate deploy)');

let publicUrl = config.publicUrl;
let closeTunnel = async () => {};
const authtoken = (process.env.NGROK_AUTHTOKEN ?? '').trim();

if (!publicUrl.startsWith('https://') && authtoken) {
  try {
    const ngrok = await import('@ngrok/ngrok');
    const listener = await (ngrok.default ?? ngrok).forward({ addr: WEB_PORT, authtoken });
    publicUrl = listener.url() ?? publicUrl;
    closeTunnel = () => listener.close().catch(() => {});
    ok(`ngrok tunnel: ${paint(36, publicUrl)}`);
  } catch (error) {
    warn(`ngrok tunnel ochilmadi: ${(error as Error).message}`);
  }
}

if (!config.botToken) warn('BOT_TOKEN yoʻq — bot oʻchiq, lekin Mini App brauzerda ishlaydi');
if (!publicUrl.startsWith('https://')) {
  warn('https manzil yoʻq — Telegram ichida ochib boʻlmaydi. .env ga NGROK_AUTHTOKEN yozing.');
}

const children: ChildProcess[] = [];
let stopping = false;

function run(name: string, color: number, command: string, args: string[], env: Record<string, string> = {}) {
  const child = spawn(command, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    // shell ishlatilmaydi: Windows'da "C:\Program Files" dagi bo'sh joy buyruqni buzardi
  });
  const prefix = paint(color, `[${name}]`);
  const pipe = (stream: NodeJS.ReadableStream | null, out: NodeJS.WriteStream) =>
    stream?.on('data', (chunk: Buffer) => {
      for (const line of chunk.toString().split(/\r?\n/)) if (line.trim()) out.write(`${prefix} ${line}\n`);
    });
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    if (!stopping) {
      warn(`${name} toʻxtadi (kod ${code})`);
      void shutdown();
    }
  });
  children.push(child);
}

run(
  'api',
  35,
  process.execPath,
  [path.join(ROOT, 'node_modules/tsx/dist/cli.mjs'), 'watch', '--clear-screen=false', 'server/index.ts'],
  // telegraf ichidagi eski punycode ogohlantirishi terminalni to'ldirmasin
  { NODE_OPTIONS: '--disable-warning=DEP0040', ...(publicUrl ? { PUBLIC_URL: publicUrl } : {}) },
);
run('web', 36, process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), '--port', String(WEB_PORT)]);

console.log('');
ok(`Brauzerda: ${paint(36, `http://localhost:${WEB_PORT}/?dev=1`)}  (ikkinchi foydalanuvchi: ?dev=2)`);
if (publicUrl.startsWith('https://')) ok(`Telegram: botga /start yozing — menyu tugmasi ${publicUrl} ni ochadi`);
console.log(paint(2, '  To‘xtatish: Ctrl+C\n'));

async function shutdown() {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  await closeTunnel();
  setTimeout(() => process.exit(0), 300);
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
