/**
 * Click yoki Payme provayder tokenini .env faylga yozadi:
 *
 *   npm run payment:token click <token>
 *   npm run payment:token payme <token>
 *
 * Tokenni BotFather beradi: /mybots -> botingiz -> Payments -> CLICK Uzbekistan / Payme.
 */
import fs from 'node:fs';

import { ENV_PATH, fail, ok, paint, step, updateEnv, warn } from './utils.js';

const KEYS = { click: 'CLICK_PROVIDER_TOKEN', payme: 'PAYME_PROVIDER_TOKEN' };

const provider = String(process.argv[2] || '').toLowerCase();
const token = process.argv.slice(3).join(' ').trim().replace(/^["']|["']$/g, '').trim();

/** .env dan kalit qiymatini o'qiydi (bo'sh bo'lsa '') */
function readEnv(key) {
  if (!fs.existsSync(ENV_PATH)) return '';
  const line = fs
    .readFileSync(ENV_PATH, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith(`${key}=`));
  return (line?.split('=').slice(1).join('=') || '').trim().replace(/^["']|["']$/g, '').trim();
}

// Argumentsiz ishga tushirilsa - qaysi to'lov ulangani ko'rsatiladi
if (!provider) {
  step('To‘lov holati');
  for (const [name, key] of Object.entries(KEYS)) {
    const alias = name === 'payme' ? readEnv('PAYMENT_PROVIDER_TOKEN') : '';
    if (readEnv(key) || alias) ok(`${name}: ulangan`);
    else fail(`${name}: ulanmagan — npm run payment:token ${name} <token>`);
  }
  console.log('');
  process.exit(0);
}

step('To‘lov tokeni saqlanmoqda');

if (!KEYS[provider] || !token) {
  fail('Namuna bo‘yicha kiriting:');
  console.log(paint('dim', '  npm run payment:token click <token>'));
  console.log(paint('dim', '  npm run payment:token payme <token>'));
  console.log(paint('dim', '\n  Token: @BotFather -> /mybots -> botingiz -> Payments'));
  process.exit(1);
}

if (!fs.existsSync(ENV_PATH)) {
  fail('.env fayl topilmadi. Avval shuni bajaring:  npm run setup');
  process.exit(1);
}

// BotFather tokeni odatda shunday ko'rinadi: 398062629:TEST:9999..._ABC...
const mode = /^\d+:(TEST|LIVE):\S+$/i.exec(token)?.[1]?.toUpperCase();
if (!mode) warn('Token shakli odatdagidan farq qiladi, lekin baribir saqlanadi.');

updateEnv(KEYS[provider], token);

const masked = `${token.slice(0, 10)}...${token.slice(-4)}`;
ok(`${KEYS[provider]}="${masked}" saqlandi`);

if (mode === 'TEST') {
  console.log(paint('yellow', '  Bu TEST token — pul yechilmaydi, faqat sinov uchun.'));
} else if (mode === 'LIVE') {
  console.log(paint('green', '  Bu LIVE token — haqiqiy to‘lovlar qabul qilinadi.'));
}

console.log(paint('dim', '\n  Endi qayta ishga tushiring:  npm start\n'));
