import { spawn } from 'node:child_process';
import { ok, warn, paint } from './utils.js';

const SKIP_WARNING_HEADER = 'ngrok-skip-browser-warning:true';

/** ngrok CLI'ning lokal API'sidan https manzilni oladi */
async function readCliTunnelUrl(isDead, attempts = 20) {
  for (let i = 0; i < attempts; i += 1) {
    if (isDead()) return null;

    try {
      const response = await fetch('http://127.0.0.1:4040/api/tunnels');
      const payload = await response.json();
      const tunnel = payload.tunnels?.find((t) => t.public_url?.startsWith('https://'));
      if (tunnel) return tunnel.public_url;
    } catch {
      // ngrok hali ko'tarilmagan
    }

    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  return null;
}

/**
 * Mini App uchun https tunnel ochadi.
 * 1) NGROK_AUTHTOKEN bo'lsa - ngrok SDK (hech narsa o'rnatish shart emas)
 * 2) Bo'lmasa - kompyuterdagi ngrok CLI
 * Ikkalasi ham bo'lmasa null qaytaradi, loyiha lokal rejimda ishlayveradi.
 */
export async function startTunnel(port, authtoken) {
  if (authtoken) {
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
      warn(`ngrok SDK ishlamadi: ${error.message}`);
    }
  }

  // CLI varianti
  try {
    const child = spawn(
      'ngrok',
      ['http', String(port), '--request-header-add', SKIP_WARNING_HEADER, '--log', 'stdout'],
      { shell: process.platform === 'win32', stdio: 'ignore' },
    );

    let died = false;
    child.on('error', () => (died = true));
    child.on('exit', () => (died = true));

    const url = await readCliTunnelUrl(() => died);

    if (died || !url) {
      child.kill();
      return null;
    }

    ok(`ngrok tunnel ochildi: ${paint('cyan', url)}`);
    return { url, stop: () => child.kill() };
  } catch {
    return null;
  }
}
