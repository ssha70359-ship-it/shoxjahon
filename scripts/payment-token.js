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
