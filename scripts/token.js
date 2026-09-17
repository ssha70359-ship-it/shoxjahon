/**
 * ngrok authtokenni .env faylga yozadi:
 *
 *   npm run ngrok:token <token>
 *
 * Shundan keyin "npm start" tunnelni ngrok CLI'siz, to'g'ridan-to'g'ri
 * SDK orqali ocha oladi.
 */
import fs from 'node:fs';

import { ENV_PATH, fail, ok, paint, readEnv, step, updateEnv, warn } from './utils.js';

const RAW = process.argv.slice(2).join(' ').trim();
const TOKEN = RAW.replace(/^["']|["']$/g, '').trim();

step('ngrok authtoken saqlanmoqda');

if (!TOKEN) {
  fail('Token kiritilmadi.');
  console.log(paint('dim', '  Namuna:  npm run ngrok:token <sizning-authtokeningiz>'));
  console.log(
    paint('dim', '  Tokenni bu yerdan oling: https://dashboard.ngrok.com/get-started/your-authtoken'),
  );
  process.exit(1);
}

if (/^https?:\/\//i.test(TOKEN)) {
  fail('Bu manzil (URL), authtoken emas.');
  console.log(
    paint(
      'dim',
      '  ngrok manzilini qo‘lda kiritish shart emas — npm start uni o‘zi oladi.\n' +
        '  Bu yerga faqat authtoken kerak: https://dashboard.ngrok.com/get-started/your-authtoken',
    ),
  );
  process.exit(1);
}

if (!/^[A-Za-z0-9_-]{30,80}$/.test(TOKEN)) {
  warn('Token shakli odatdagidan farq qiladi, lekin baribir saqlanadi.');
}

if (!fs.existsSync(ENV_PATH)) {
  fail('.env fayl topilmadi.');
  console.log(paint('dim', '  Avval shuni bajaring:  npm run setup'));
  process.exit(1);
}

updateEnv('NGROK_AUTHTOKEN', TOKEN);

const masked = `${TOKEN.slice(0, 6)}...${TOKEN.slice(-4)}`;
ok(`.env faylga yozildi: NGROK_AUTHTOKEN="${masked}"`);

if (!readEnv().NGROK_AUTHTOKEN) {
  fail('Yozib bo‘lmadi — .env faylni qo‘lda tekshiring.');
  process.exit(1);
}

console.log(paint('dim', '\n  Endi shuni bajaring:  npm start\n'));
