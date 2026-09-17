import fs from 'node:fs';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import { ENV_PATH, ROOT, ok, warn, step, paint } from './utils.js';
import { getMe } from './telegram.js';

/**
 * Neon saytidan nusxa olingan matnni toza connection string'ga aylantiradi.
 * "psql '...'" ko'rinishini ham, keraksiz channel_binding parametrini ham tozalaydi.
 */
export function normalizeDatabaseUrl(raw) {
  let value = String(raw || '').trim();

  value = value.replace(/^psql\s+/i, '').trim();
  value = value.replace(/^["']|["']$/g, '').trim();

  // Prisma channel_binding parametrini tushunmaydi
  value = value.replace(/[?&]channel_binding=[^&]*/gi, '');

  if (!value.includes('sslmode=')) {
    value += (value.includes('?') ? '&' : '?') + 'sslmode=require';
  }

  return value;
}

/** Pooler manzilidan migratsiya uchun to'g'ridan-to'g'ri (direct) manzilni yasaydi */
export function deriveDirectUrl(databaseUrl) {
  return databaseUrl.replace('-pooler.', '.');
}

function isValidToken(token) {
  return /^\d{6,}:[A-Za-z0-9_-]{30,}$/.test(String(token || '').trim());
}

const TEMPLATE = (values) => `# Avtomatik yaratildi: npm run setup
# ---------- BAZA (Neon PostgreSQL) ----------
DATABASE_URL="${values.DATABASE_URL}"
DIRECT_URL="${values.DIRECT_URL}"

# ---------- TELEGRAM ----------
BOT_TOKEN="${values.BOT_TOKEN}"
# npm start har safar ngrok manzilini shu yerga o'zi yozadi
WEBAPP_URL="${values.WEBAPP_URL || ''}"
# ngrok.com -> Your Authtoken (ixtiyoriy, bo'lsa tunnel avtomatik ochiladi)
NGROK_AUTHTOKEN="${values.NGROK_AUTHTOKEN || ''}"

# ---------- ADMIN ----------
ADMIN_PASSWORD="${values.ADMIN_PASSWORD}"
ADMIN_IDS="${values.ADMIN_IDS || ''}"
ADMIN_PANEL_URL="http://localhost:5174"

# ---------- SERVER ----------
PORT=5000
NODE_ENV=development

# Brauzerdan (Telegramsiz) test qilish uchun
ALLOW_DEV_USER=true
`;

/** .env bo'lmasa savollar berib yaratadi */
export async function ensureEnv() {
  if (fs.existsSync(ENV_PATH)) return false;

  step('.env fayl topilmadi — keling, birgalikda to‘ldiramiz');
  console.log(paint('dim', '  (Ma’lumotlar faqat shu kompyuterda saqlanadi, git’ga tushmaydi)\n'));

  const rl = readline.createInterface({ input: stdin, output: stdout });

  async function ask(question, { validate, transform, fallback } = {}) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const answer = (await rl.question(`  ${question}\n  > `)).trim();

      if (!answer && fallback !== undefined) return fallback;

      const value = transform ? transform(answer) : answer;

      if (!validate || (await validate(value))) return value;

      if (attempt < 3) console.log(paint('red', '  Noto‘g‘ri qiymat, qaytadan kiriting.\n'));
    }

    rl.close();
    throw new Error('3 marta noto‘g‘ri kiritildi. Qaytadan urinib ko‘ring: npm run setup');
  }

  const DATABASE_URL = await ask(
    'Neon connection string (neon.tech -> Connect):',
    {
      transform: normalizeDatabaseUrl,
      validate: (value) => value.startsWith('postgres'),
    },
  );

  const BOT_TOKEN = await ask('BotFather bergan Bot Token:', {
    validate: async (value) => {
      if (!isValidToken(value)) return false;
      try {
        const me = await getMe(value);
        console.log(paint('green', `  Bot topildi: @${me.username}\n`));
        return true;
      } catch (error) {
        if (error.network) {
          // Internet yo'q - tokenni tekshirib bo'lmadi, lekin ushlab qolmaymiz
          console.log(paint('yellow', `  ${error.message} — token tekshirilmadi.\n`));
          return true;
        }

        console.log(paint('red', `  ${error.message}`));
        return false;
      }
    },
  });

  const ADMIN_PASSWORD = await ask('Admin panel uchun parol (Enter = admin123):', {
    fallback: 'admin123',
  });

  const ADMIN_IDS = await ask('Telegram ID’ingiz (@userinfobot, Enter = bo‘sh):', {
    fallback: '',
  });

  const NGROK_AUTHTOKEN = await ask(
    'ngrok authtoken (ngrok.com -> Your Authtoken, Enter = keyin):',
    { fallback: '' },
  );

  rl.close();

  fs.writeFileSync(
    ENV_PATH,
    TEMPLATE({
      DATABASE_URL,
      DIRECT_URL: deriveDirectUrl(DATABASE_URL),
      BOT_TOKEN,
      ADMIN_PASSWORD,
      ADMIN_IDS,
      NGROK_AUTHTOKEN,
    }),
  );

  ok('.env fayl yaratildi');
  return true;
}

// Alohida ishga tushirilganda: npm run setup
if (process.argv[1] && process.argv[1].endsWith('setup.js')) {
  const created = await ensureEnv();
  if (!created) {
    warn(`.env allaqachon mavjud: ${ENV_PATH.replace(ROOT, '.')}`);
    console.log(paint('dim', '  O‘zgartirish uchun shu faylni tahrirlang yoki o‘chirib qayta ishga tushiring.'));
  }
}
