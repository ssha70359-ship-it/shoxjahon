import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ENV_PATH = path.join(ROOT, '.env');

const ESC = String.fromCharCode(27);

const COLORS = {
  reset: `${ESC}[0m`,
  bold: `${ESC}[1m`,
  dim: `${ESC}[2m`,
  red: `${ESC}[31m`,
  green: `${ESC}[32m`,
  yellow: `${ESC}[33m`,
  blue: `${ESC}[34m`,
  magenta: `${ESC}[35m`,
  cyan: `${ESC}[36m`,
};

export function paint(color, text) {
  return `${COLORS[color] || ''}${text}${COLORS.reset}`;
}

export function step(text) {
  console.log(`\n${paint('cyan', '\u{25B6}')} ${paint('bold', text)}`);
}

export function ok(text) {
  console.log(`  ${paint('green', '\u{2713}')} ${text}`);
}

export function warn(text) {
  console.log(`  ${paint('yellow', '\u{26A0}')}  ${text}`);
}

export function fail(text) {
  console.log(`  ${paint('red', '\u{2717}')} ${text}`);
}

/** .env faylni o'qiydi */
export function readEnv() {
  if (!fs.existsSync(ENV_PATH)) return {};

  const result = {};

  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const index = trimmed.indexOf('=');
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

/** .env fayldagi bitta qiymatni yangilaydi (qolgan qatorlarga tegmaydi) */
export function updateEnv(key, value) {
  const line = `${key}="${value}"`;

  if (!fs.existsSync(ENV_PATH)) {
    fs.writeFileSync(ENV_PATH, `${line}\n`);
    return;
  }

  const lines = fs.readFileSync(ENV_PATH, 'utf8').split('\n');
  const index = lines.findIndex((l) => l.trim().startsWith(`${key}=`));

  if (index === -1) lines.push(line);
  else lines[index] = line;

  fs.writeFileSync(ENV_PATH, lines.join('\n'));
}

/** Buyruqni ishga tushiradi va tugashini kutadi */
export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || ROOT,
      stdio: options.silent ? 'pipe' : 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, ...options.env },
    });

    let output = '';
    if (options.silent) {
      child.stdout?.on('data', (data) => (output += data));
      child.stderr?.on('data', (data) => (output += data));
    }

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(output.trim() || `"${command}" buyrugi ${code} kod bilan tugadi`));
    });
  });
}

/**
 * Fon jarayonini ishga tushiradi va loglarni rangli prefiks bilan chiqaradi.
 * npm va shell qatlamisiz, to'g'ridan-to'g'ri node chaqiriladi - shunda Ctrl+C
 * bosilganda hech qanday jarayon osilib qolmaydi va portlar band bo'lmaydi.
 */
export function runBackground(label, color, args, cwd, extraEnv = {}) {
  const child = spawn(process.execPath, args, { cwd, env: { ...process.env, ...extraEnv } });

  const prefix = paint(color, `[${label}]`);
  const write = (data) => {
    for (const line of String(data).split('\n')) {
      if (line.trim()) console.log(`${prefix} ${line}`);
    }
  };

  child.stdout.on('data', write);
  child.stderr.on('data', write);

  return child;
}

/**
 * Jarayonga SIGTERM yuboradi va o'chishini kutadi.
 * 3 soniyada o'chmasa majburan (SIGKILL) yopadi, shunda portlar bo'shaydi.
 */
export function stopProcess(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve();

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, 3000);

    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });

    child.kill('SIGTERM');
  });
}

export const exists = (relative) => fs.existsSync(path.join(ROOT, relative));
