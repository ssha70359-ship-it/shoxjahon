import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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
 * Mini App uchun https tunnel ochadi. Tartib bo'yicha uriniladi:
 *   1) Allaqachon ishlab turgan ngrok (siz boshqa terminalda ochgan bo'lsangiz)
 *   2) .env dagi NGROK_AUTHTOKEN
 *   3) "ngrok config add-authtoken" bilan saqlangan token
 *   4) Kompyuterdagi ngrok CLI
 * Hech biri bo'lmasa null qaytaradi va sababini aytadi.
 */
export async function startTunnel(port, envAuthtoken) {
  const reasons = [];

  // 1) Tayyor tunnel
  const running = await findRunningTunnel();
  if (running) {
    ok(`Ishlab turgan ngrok topildi: ${paint('cyan', running)}`);
    return { url: running, stop: () => {} };
  }

  // 2-3) Token: avval .env, keyin ngrok'ning o'z configi
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
    reasons.push('authtoken topilmadi (.env da ham, ngrok configida ham)');
  }

  // 4) CLI
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

  for (const reason of reasons) warn(reason);

  return null;
}
