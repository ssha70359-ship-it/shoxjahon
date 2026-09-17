/**
 * Bitta buyruq bilan hamma narsani ishga tushiradi:
 * paketlar -> baza -> ngrok -> bot sozlamalari -> 3 ta server
 *
 *   npm start
 */
import path from 'node:path';

import {
  ROOT,
  exists,
  fail,
  ok,
  paint,
  readEnv,
  run,
  runBackground,
  step,
  stopProcess,
  updateEnv,
  warn,
} from './utils.js';
import { ensureEnv } from './setup.js';
import { startTunnel } from './tunnel.js';
import { setupBot } from './telegram.js';

const MINI_APP_PORT = 5173;
const ADMIN_PORT = 5174;

const children = [];
let tunnel = null;
let shuttingDown = false;

function banner() {
  console.log(
    paint('cyan', '\n  \u{1F355}  PIZZA DELIVERY') +
      paint('dim', '  —  bot + mini app + admin panel\n'),
  );
}

async function installDependencies() {
  step('Paketlar tekshirilmoqda');

  const targets = [
    { name: 'Backend', dir: '.', marker: 'node_modules' },
    { name: 'Mini App', dir: 'mini-app', marker: 'mini-app/node_modules' },
    { name: 'Admin Panel', dir: 'admin-panel', marker: 'admin-panel/node_modules' },
  ];

  for (const target of targets) {
    if (exists(target.marker)) {
      ok(`${target.name}: paketlar joyida`);
      continue;
    }

    console.log(paint('dim', `  ${target.name}: o‘rnatilmoqda, biroz kuting...`));
    await run('npm', ['install', '--no-fund', '--no-audit'], {
      cwd: path.join(ROOT, target.dir),
      silent: true,
    });
    ok(`${target.name}: paketlar o‘rnatildi`);
  }
}

async function prepareDatabase() {
  step('Ma’lumotlar bazasi tayyorlanmoqda');

  await run('npx', ['prisma', 'generate'], { silent: true });
  ok('Prisma client yaratildi');

  try {
    await run('npx', ['prisma', 'migrate', 'deploy'], { silent: true });
    ok('Jadvallar bazaga yozildi');
  } catch (error) {
    warn('migrate deploy ishlamadi, "db push" bilan urinilmoqda');
    try {
      await run('npx', ['prisma', 'db', 'push', '--skip-generate'], { silent: true });
      ok('Jadvallar bazaga yozildi');
    } catch {
      fail('Bazaga ulanib bo‘lmadi. .env dagi DATABASE_URL ni tekshiring.');
      console.log(paint('dim', `\n${error.message.slice(0, 600)}\n`));
      process.exit(1);
    }
  }

  await run('node', ['prisma/seed.js'], { silent: true });
  ok('Boshlang‘ich pizzalar bazaga qo‘shildi');
}

async function prepareTunnel(env) {
  step('Telegram uchun https manzil olinmoqda');

  tunnel = await startTunnel(MINI_APP_PORT, env.NGROK_AUTHTOKEN);

  if (!tunnel) {
    // Eski ngrok manzili har doim o'lik bo'ladi, shuning uchun tozalaymiz:
    // bot "Mini App sozlanmagan" deb aytadi, ishlamaydigan tugma ko'rsatmaydi.
    updateEnv('WEBAPP_URL', '');
    warn('ngrok topilmadi — loyiha faqat lokal rejimda ishlaydi');
    console.log(
      paint(
        'dim',
        '  Telegram ichida ochish uchun: ngrok.com dan authtoken oling va\n' +
          '  .env faylga NGROK_AUTHTOKEN="..." deb yozing.',
      ),
    );
    return null;
  }

  updateEnv('WEBAPP_URL', tunnel.url);
  ok('.env faylga WEBAPP_URL yozildi');

  try {
    const me = await setupBot(env.BOT_TOKEN, tunnel.url);
    return me;
  } catch (error) {
    warn(`Bot sozlamalari yangilanmadi: ${error.message}`);
    return null;
  }
}

function startServers() {
  step('Serverlar ishga tushirilmoqda');

  const miniAppDir = path.join(ROOT, 'mini-app');
  const adminDir = path.join(ROOT, 'admin-panel');

  const vite = (dir) => path.join(dir, 'node_modules', 'vite', 'bin', 'vite.js');

  children.push(runBackground('backend', 'green', ['--watch', 'src/index.js'], ROOT));
  children.push(runBackground('mini-app', 'magenta', [vite(miniAppDir)], miniAppDir));
  children.push(runBackground('admin', 'blue', [vite(adminDir)], adminDir));
}

function summary(env, bot) {
  const rows = [
    ['Mini App (lokal)', `http://localhost:${MINI_APP_PORT}`],
    ['Admin panel', `http://localhost:${ADMIN_PORT}`],
    ['Admin parol', env.ADMIN_PASSWORD || 'admin123'],
    ['API', `http://localhost:${env.PORT || 5000}`],
  ];

  if (tunnel) rows.unshift(['Mini App (Telegram)', tunnel.url]);
  if (bot) rows.unshift(['Bot', `https://t.me/${bot.username}`]);

  const width = Math.max(...rows.map(([label]) => label.length));

  const divider = paint('cyan', '─'.repeat(34));

  console.log(`\n  ${divider}`);
  for (const [label, value] of rows) {
    console.log(`  ${paint('dim', label.padEnd(width))}  ${value}`);
  }
  console.log(`  ${divider}`);

  if (bot) {
    console.log(
      `\n  ${paint('green', 'Tayyor!')} Telegramda botni oching va ` +
        paint('bold', '\u{1F355} Buyurtma berish') +
        ' tugmasini bosing.',
    );
  }

  console.log(paint('dim', '\n  To‘xtatish uchun: Ctrl+C\n'));
}

async function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(paint('dim', '\n  To‘xtatilmoqda...'));

  await Promise.all(children.map(stopProcess));
  if (tunnel) await tunnel.stop();

  ok('Hamma jarayon to‘xtatildi');
  process.exit(code);
}

async function main() {
  banner();

  await ensureEnv();

  const env = readEnv();

  if (!env.DATABASE_URL || !env.BOT_TOKEN) {
    fail('.env faylda DATABASE_URL yoki BOT_TOKEN yo‘q.');
    console.log(paint('dim', '  Tuzatish uchun: npm run setup'));
    process.exit(1);
  }

  await installDependencies();
  await prepareDatabase();

  const bot = await prepareTunnel(env);

  startServers();

  setTimeout(() => summary(readEnv(), bot), 4000);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

main().catch((error) => {
  fail(error.message);
  shutdown(1);
});
