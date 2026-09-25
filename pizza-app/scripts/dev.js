// npm run dev — lokal ishga tushirish uchun bitta buyruq:
//   1) .env yo'q bo'lsa .env.example dan nusxa oladi
//   2) NGROK_AUTHTOKEN bo'lsa — https tunnel ochadi va uni PUBLIC_URL qiladi
//      (bot menyu tugmasi shu manzilga o'zi bog'lanadi, BotFather'da sozlash shart emas)
//   3) API server va Vite (Mini App) ni birga ishga tushiradi

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB_PORT = 5173;

const paint = (code, text) => `\x1b[${code}m${text}\x1b[0m`;
const ok = (text) => console.log(`${paint(32, '✔')} ${text}`);
const warn = (text) => console.log(`${paint(33, '!')} ${text}`);

const envFile = path.join(ROOT, '.env');
if (!fs.existsSync(envFile)) {
  fs.copyFileSync(path.join(ROOT, '.env.example'), envFile);
  ok('.env yaratildi (.env.example nusxasi). BOT_TOKEN ni yozib qo‘ying.');
}

// config.js .env ni o'qiydi — shu sozlamalar bilan ishlaymiz
const { config } = await import('../server/config.js');

let publicUrl = config.publicUrl;
let closeTunnel = async () => {};
const authtoken = (process.env.NGROK_AUTHTOKEN || '').trim();

if (!publicUrl.startsWith('https://') && authtoken) {
  try {
    const ngrok = await import('@ngrok/ngrok');
    const listener = await (ngrok.default ?? ngrok).forward({ addr: WEB_PORT, authtoken });
    publicUrl = listener.url();
    closeTunnel = () => listener.close().catch(() => {});
    ok(`ngrok tunnel: ${paint(36, publicUrl)}`);
  } catch (error) {
    warn(`ngrok tunnel ochilmadi: ${error.message}`);
  }
}

if (!config.botToken) warn('BOT_TOKEN yoʻq — bot oʻchiq, lekin Mini App brauzerda ishlaydi');
if (!publicUrl.startsWith('https://')) {
  warn('https manzil yoʻq — Telegram ichida ochib boʻlmaydi. .env ga NGROK_AUTHTOKEN yozing.');
}

const children = [];

function run(name, color, command, args, env = {}) {
  const child = spawn(command, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  const prefix = paint(color, `[${name}]`);
  const pipe = (stream, out) =>
    stream.on('data', (chunk) => {
      for (const line of chunk.toString().split(/\r?\n/)) if (line.trim()) out.write(`${prefix} ${line}\n`);
    });
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    if (!stopping) {
      warn(`${name} toʻxtadi (kod ${code})`);
      shutdown();
    }
  });
  children.push(child);
}

run(
  'api',
  35,
  process.execPath,
  ['--disable-warning=ExperimentalWarning', '--disable-warning=DEP0040', '--watch', 'server/index.js'],
  publicUrl ? { PUBLIC_URL: publicUrl } : {},
);
run('web', 36, process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), '--port', String(WEB_PORT)]);

console.log('');
ok(`Brauzerda: ${paint(36, `http://localhost:${WEB_PORT}/?dev=1`)}  (ikkinchi foydalanuvchi: ?dev=2)`);
if (publicUrl.startsWith('https://')) ok(`Telegram: botga /start yozing — menyu tugmasi ${publicUrl} ni ochadi`);
console.log(paint(2, '  To‘xtatish: Ctrl+C\n'));

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  await closeTunnel();
  setTimeout(() => process.exit(0), 300);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
