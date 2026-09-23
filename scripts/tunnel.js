import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

import { ok, warn, paint } from './utils.js';

const SKIP_WARNING_HEADER = 'ngrok-skip-browser-warning:true';
const NGROK_API = 'http://127.0.0.1:4040/api/tunnels';

/** ngrok CLI o'z tokenini shu fayllardan birida saqlaydi */
function ngrokConfigPaths() {
  const home = os.homedir();

  return [
    process.env.NGROK_CONFIG,
    // Windows
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'ngrok', 'ngrok.yml'),
    // macOS
    path.join(home, 'Library', 'Application Support', 'ngrok', 'ngrok.yml'),
    // Linux
    path.join(home, '.config', 'ngrok', 'ngrok.yml'),
    // ngrok v2
    path.join(home, '.ngrok2', 'ngrok.yml'),
  ].filter(Boolean);
}

/**
 * "ngrok config add-authtoken ..." bilan saqlangan tokenni topadi.
 * Shunda .env ga tokenni qayta yozish shart emas.
 */
export function findSavedAuthtoken() {
  for (const file of ngrokConfigPaths()) {
    try {
      if (!fs.existsSync(file)) continue;

      const match = fs.readFileSync(file, 'utf8').match(/^\s*authtoken:\s*["']?([^"'\s#]+)/m);
      if (match) return { token: match[1], file };
    } catch {
      // fayl o'qilmadi - keyingisiga o'tamiz
    }
  }

  return null;
}

/** Allaqachon ishlab turgan ngrok bo'lsa, uning manzilini oladi */
async function findRunningTunnel() {
  try {
    const response = await fetch(NGROK_API, { signal: AbortSignal.timeout(2000) });
    const payload = await response.json();
    const tunnel = payload.tunnels?.find((t) => t.public_url?.startsWith('https://'));
    return tunnel?.public_url || null;
  } catch {
    return null;
  }
}

/** ngrok CLI ko'tarilishini kutib, manzilni oladi */
async function waitForCliTunnel(isDead, attempts = 20) {
  for (let i = 0; i < attempts; i += 1) {
    if (isDead()) return null;

    const url = await findRunningTunnel();
    if (url) return url;

    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  return null;
}

/**
 * Cloudflare "quick tunnel" — hisob ham, token ham kerak emas.
 * Chiqishdan https://....trycloudflare.com manzilini o'qib oladi.
 */
export function startCloudflared(port, timeoutMs = 40000) {
  return new Promise((resolve) => {
    let bin;

    try {
      bin = createRequire(import.meta.url)('cloudflared').bin;
    } catch {
      return resolve({ error: 'cloudflared paketi topilmadi (npm install qiling)' });
    }

    if (!fs.existsSync(bin)) {
      return resolve({ error: 'cloudflared dasturi yuklanmagan' });
    }

    let child;

    try {
      // 127.0.0.1 - "localhost" Windows'da IPv6 (::1) ga ketib, 502 berishi mumkin
      child = spawn(bin, ['tunnel', '--url', `http://127.0.0.1:${port}`, '--no-autoupdate'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      return resolve({ error: `cloudflared ishga tushmadi: ${error.message}` });
    }

    let buffer = '';
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      child.kill();
      finish({ error: 'cloudflared javob bermadi' });
    }, timeoutMs);

    const scan = (chunk) => {
      buffer += chunk;
      const match = buffer.match(/https:\/\/[-a-z0-9]+\.trycloudflare\.com/i);
      if (match) {
        finish({ url: match[0], stop: () => child.kill(), onExit: (cb) => child.once('exit', cb) });
      }
    };

    /** Xato sababini chiqishning oxirgi mazmunli qatoridan olamiz */
    const lastLine = () => {
      const line = buffer
        .split(/\r?\n/)
        .map((item) => item.replace(/^\S+\s+(INF|ERR|WRN)\s+/, '').trim())
        .filter(Boolean)
        .pop();

      return line ? ` (${line.slice(0, 160)})` : '';
    };

    child.stdout.on('data', scan);
    child.stderr.on('data', scan);
    child.on('error', (error) => finish({ error: `cloudflared: ${error.message}` }));
    child.on('exit', () => finish({ error: `cloudflared to‘xtab qoldi${lastLine()}` }));
  });
}

/** ngrok orqali tunnel: tayyor tunnel -> SDK (token bilan) -> CLI */
async function startNgrok(port, envAuthtoken, reasons) {
  // 1) Tayyor tunnel
  const running = await findRunningTunnel();
  if (running) {
    ok(`Ishlab turgan ngrok topildi: ${paint('cyan', running)}`);
    return { url: running, stop: () => {} };
  }

  // 2) Token: avval .env, keyin ngrok'ning o'z configi
  let authtoken = envAuthtoken?.trim() || null;
  let source = '.env';

  if (!authtoken) {
    const saved = findSavedAuthtoken();
    if (saved) {
      authtoken = saved.token;
      source = saved.file;
    }
  }

  if (authtoken) {
    console.log(paint('dim', `  Authtoken manbasi: ${source}`));

    try {
      const ngrok = await import('@ngrok/ngrok');
      const listener = await (ngrok.default ?? ngrok).forward({
        addr: port,
        authtoken,
        request_header_add: SKIP_WARNING_HEADER,
      });

      const url = listener.url();
      ok(`ngrok tunnel ochildi: ${paint('cyan', url)}`);

      return { url, stop: () => listener.close().catch(() => {}) };
    } catch (error) {
      reasons.push(`ngrok SDK: ${error.message}`);
    }
  } else {
    reasons.push('ngrok authtoken topilmadi (.env da ham, ngrok configida ham)');
  }

  // 3) CLI
  try {
    const child = spawn(
      'ngrok',
      ['http', String(port), '--request-header-add', SKIP_WARNING_HEADER, '--log', 'stdout'],
      { shell: process.platform === 'win32', stdio: 'ignore' },
    );

    let died = false;
    child.on('error', (error) => {
      died = true;
      reasons.push(`ngrok CLI: ${error.code === 'ENOENT' ? 'kompyuterda topilmadi' : error.message}`);
    });
    child.on('exit', () => (died = true));

    const url = await waitForCliTunnel(() => died);

    if (url) {
      ok(`ngrok tunnel ochildi: ${paint('cyan', url)}`);
      return { url, stop: () => child.kill() };
    }

    child.kill();
    if (!died) reasons.push('ngrok CLI javob bermadi');
  } catch (error) {
    reasons.push(`ngrok CLI: ${error.message}`);
  }

  return null;
}

async function tryCloudflare(port, reasons) {
  console.log(paint('dim', '  Cloudflare tunneli ochilmoqda (token kerak emas)...'));

  const cloudflare = await startCloudflared(port);

  if (cloudflare.url) {
    ok(`Cloudflare tunnel ochildi: ${paint('cyan', cloudflare.url)}`);
    return { url: cloudflare.url, stop: cloudflare.stop, onExit: cloudflare.onExit };
  }

  reasons.push(cloudflare.error);
  return null;
}

/**
 * Mini App uchun https tunnel ochadi.
 *
 * Odatda avval Cloudflare: ngrok'ning bepul tarifi har bir yangi mijozga
 * "You are about to visit..." ogohlantirish sahifasini ko'rsatadi va uni
 * o'chirib bo'lmaydi (Telegram sahifani o'zi ochadi, sarlavha qo'sha olmaymiz).
 * Cloudflare ishlamasa - ngrok. .env da TUNNEL="ngrok" bo'lsa - teskarisi.
 *
 * Hech biri ochilmasa null qaytaradi va sabablarini aytadi.
 */
export async function startTunnel(port, envAuthtoken, preferred = 'cloudflare') {
  const reasons = [];
  const order =
    String(preferred).toLowerCase() === 'ngrok'
      ? [() => startNgrok(port, envAuthtoken, reasons), () => tryCloudflare(port, reasons)]
      : [() => tryCloudflare(port, reasons), () => startNgrok(port, envAuthtoken, reasons)];

  for (const attempt of order) {
    const tunnel = await attempt();
    if (tunnel) {
      for (const reason of reasons) warn(reason);
      if (/ngrok/i.test(tunnel.url)) {
        warn('ngrok bepul tarifi: yangi mijozlar avval ngrok ogohlantirish sahifasini ko‘radi');
      }
      return tunnel;
    }
  }

  for (const reason of reasons) warn(reason);
  return null;
}
