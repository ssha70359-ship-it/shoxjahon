/**
 * Bitta buyruq bilan hamma narsani ishga tushiradi:
 * paketlar -> baza -> tunnel (Cloudflare, bo'lmasa ngrok) -> bot sozlamalari -> 3 ta server
 *
 *   npm start
 */
import net from 'node:net';
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
import { getWebhookUrl, resetMenuButton, setupBot } from './telegram.js';

const MINI_APP_PORT = 5173;
const ADMIN_PORT = 5174;

const children = [];
let tunnel = null;
let webAppUrl = '';
let shuttingDown = false;

function banner() {
  console.log(
    paint('cyan', '\n  \u{1F968}  FARHADSKAYA BULOCHKA') +
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
  ok('Boshlang‘ich mahsulotlar bazaga qo‘shildi');
}

async function prepareTunnel(env) {
  step('Telegram uchun https manzil olinmoqda');

  tunnel = await startTunnel(MINI_APP_PORT, env.NGROK_AUTHTOKEN, env.TUNNEL || 'cloudflare');

  if (!tunnel) {
    // Eski tunnel manzili har doim o'lik bo'ladi - uni tozalaymiz, shunda bot
    // ishlamaydigan tugma o'rniga tushunarli xabar ko'rsatadi.
    // Qo'lda yozilgan doimiy manzilga (masalan static domain) tegmaymiz.
    if (/ngrok|trycloudflare|loca\.lt/i.test(env.WEBAPP_URL || '')) {
      updateEnv('WEBAPP_URL', '');
    }

    // BotFather'da qolgan eski manzil (example.com) ochilib qolmasligi uchun
    await resetMenuButton(env.BOT_TOKEN);

    warn('https tunnel ochilmadi — Mini App Telegram ichida ishlamaydi');

    // Bu yerga yetgan bo'lsak, ngrok ham, Cloudflare ham ishlamadi.
    console.log(
      paint(
        'dim',
        '\n  Ikkala tunnel ham ochilmadi. Eng ko‘p uchraydigan sabablar:\n' +
          '    • Internet yo‘q, yoki VPN/antivirus/korporativ tarmoq tunnelni bloklayapti\n' +
          '    • Eski "npm start" hali ishlab turibdi — barcha terminallarni yoping\n' +
          '      (Windows: taskkill /f /im node.exe)\n\n' +
          '  ngrok ixtiyoriy — Cloudflare tunneliga token kerak emas. Lekin ngrok\n' +
          '  ishlatmoqchi bo‘lsangiz: npm run ngrok:token <token>\n\n' +
          '  Tunnelsiz ham ishlaydi: Mini App brauzerda http://localhost:5173\n' +
          '  manzilida ochiladi (faqat Telegram ichida ishlamaydi).',
      ),
    );
    return null;
  }

  webAppUrl = tunnel.url;
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

const vite = (dir) => path.join(dir, 'node_modules', 'vite', 'bin', 'vite.js');
const services = {};

/**
 * Fon jarayonini ishga tushiradi va kutilmaganda o'chsa qayta ko'taradi.
 * Aks holda tunnel ishlab turadi-yu, Mini App o'chiq qoladi (502 Bad gateway).
 */
function supervise(name, color, args, cwd, env = {}) {
  const start = () => {
    const child = runBackground(name, color, args, cwd, env);
    const startedAt = Date.now();
    services[name] = child;
    children.push(child);

    child.once('exit', (code) => {
      if (shuttingDown || child.replaced) return;

      // Darhol yiqilsa (masalan port band) - qayta urinish foydasiz
      if (Date.now() - startedAt < 5000) {
        fail(`[${name}] ishga tushmadi (kod ${code}). Yuqoridagi xabarni o‘qing.`);
        return;
      }

      warn(`[${name}] to‘xtab qoldi — 2 soniyadan so‘ng qayta ishga tushiriladi`);
      setTimeout(start, 2000);
    });
  };

  start();
}

async function restartService(name, color, args, cwd, env) {
  const old = services[name];
  if (old) {
    old.replaced = true;
    await stopProcess(old);
  }
  supervise(name, color, args, cwd, env);
}

const backendArgs = ['--watch', 'src/index.js'];

function startFrontends() {
  step('Mini App va admin panel ishga tushirilmoqda');

  const miniAppDir = path.join(ROOT, 'mini-app');
  const adminDir = path.join(ROOT, 'admin-panel');

  // --strictPort: port band bo'lsa jimgina boshqa portga o'tib ketmasin
  // (tunnel 5173 ga qaraydi - aks holda mijozlar 502 ko'radi)
  supervise('mini-app', 'magenta', [vite(miniAppDir), '--port', String(MINI_APP_PORT), '--strictPort'], miniAppDir);
  supervise('admin', 'blue', [vite(adminDir), '--port', String(ADMIN_PORT), '--strictPort'], adminDir);
}

function startBackend() {
  return restartService('backend', 'green', backendArgs, ROOT, { WEBAPP_URL: webAppUrl });
}

/** Mini App haqiqatan javob berayotganini kutadi (tunnel undan keyin ochiladi) */
async function waitForMiniApp(timeoutMs = 60000) {
  const until = Date.now() + timeoutMs;

  while (Date.now() < until) {
    try {
      const response = await fetch(`http://127.0.0.1:${MINI_APP_PORT}/`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return true;
    } catch {
      // hali ko'tarilmagan
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

/**
 * Bot serverda (Render) webhook bilan ishlayotgan bo'lsa, kompyuterda ishga
 * tushirish uni o'chirib qo'yadi: bot tokeni bitta, lokal bot webhook'ni
 * o'chirib long polling'ga o'tadi. Shuning uchun avval ogohlantiramiz.
 */
async function guardProductionBot(env) {
  if (process.argv.includes('--force')) return;

  let url = '';
  try {
    url = await getWebhookUrl(env.BOT_TOKEN);
  } catch {
    return; // internet yo'q - keyingi qadamlar o'zi aytadi
  }

  // Tunnel manzillari - bu kompyuterning o'zi (eski, yopilmagan ishga tushirish)
  if (!url || /trycloudflare|ngrok|loca\.lt/i.test(url)) return;

  fail('Bot hozir serverda ishlayapti:');
  console.log(
    paint(
      'dim',
      `  ${new URL(url).origin}\n\n` +
        '  Kompyuterda ishga tushirsangiz, serverdagi bot to‘xtab qoladi\n' +
        '  (bot tokeni bitta, ikkalasi bir vaqtda ishlay olmaydi).\n\n' +
        '  Sinash uchun BotFather’da alohida test bot oching va .env dagi\n' +
        '  BOT_TOKEN ni o‘shaniki bilan almashtiring.\n\n' +
        '  Baribir ishga tushirish kerak bo‘lsa:  npm start -- --force\n' +
        '  (keyin serverdagi botni qaytarish: Render -> Manual Deploy -> Deploy latest commit)\n',
    ),
  );
  process.exit(1);
}

/** Port bo'shligini tekshiradi */
function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port);
  });
}

async function checkPorts(env) {
  const ports = [
    [MINI_APP_PORT, 'Mini App'],
    [ADMIN_PORT, 'Admin panel'],
    [Number(env.PORT) || 5000, 'Backend'],
  ];

  const busy = [];
  for (const [port, name] of ports) {
    if (!(await isPortFree(port))) busy.push(`${port} (${name})`);
  }

  if (busy.length === 0) return;

  fail(`Port band: ${busy.join(', ')}`);
  console.log(
    paint(
      'dim',
      '  Odatda eski "npm start" hali ishlab turgan bo‘ladi (yopilgan terminal ham).\n' +
        '  Hamma eski jarayonlarni yoping va qayta ishga tushiring:\n\n' +
        '    Windows (PowerShell):\n' +
        '      taskkill /f /im node.exe\n' +
        '      taskkill /f /im cloudflared.exe\n' +
        '    Mac/Linux: pkill -f vite; pkill -f cloudflared\n\n' +
        '  Keyin:  npm start\n',
    ),
  );
  process.exit(1);
}

/**
 * Tunnel uzilib qolsa (Cloudflare quick tunnel ba'zan uziladi) yangisini
 * ochadi, botni yangi manzilga bog'laydi va backendni qayta ishga tushiradi.
 */
function watchTunnel(env) {
  tunnel?.onExit?.(async () => {
    if (shuttingDown) return;

    warn('Tunnel uzildi — yangisi ochilmoqda...');
    const bot = await prepareTunnel(env);
    if (tunnel) {
      await startBackend();
      watchTunnel(env);
      if (bot) ok(`Mini App yangi manzilda: ${paint('cyan', tunnel.url)}`);
    }
  });
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
        paint('bold', '\u{1F968} Buyurtma berish') +
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

  // Kompyuter o'chiq paytda mijozlar "502 Bad gateway" ko'rmasin
  const token = readEnv().BOT_TOKEN;
  if (token && tunnel) await resetMenuButton(token).catch(() => {});

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

  await guardProductionBot(env);
  await installDependencies();
  await checkPorts(env);
  await prepareDatabase();

  // Avval Mini App, u javob bergach tunnel - aks holda birinchi mijoz 502 ko'radi
  startFrontends();
  if (!(await waitForMiniApp())) {
    warn(`Mini App ${MINI_APP_PORT}-portda javob bermayapti — yuqoridagi [mini-app] xabarlarini o‘qing`);
  }

  const bot = await prepareTunnel(env);
  await startBackend();
  watchTunnel(env);

  setTimeout(() => summary(readEnv(), bot), 4000);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
// Windows: terminal oynasi yopilganda
process.on('SIGHUP', () => shutdown(0));
process.on('SIGBREAK', () => shutdown(0));

main().catch((error) => {
  fail(error.message);
  shutdown(1);
});
