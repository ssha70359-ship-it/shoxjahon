import { ok, warn } from './utils.js';

const API = 'https://api.telegram.org';

async function call(token, method, body) {
  let response;

  try {
    response = await fetch(`${API}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
      // Internet sekin bo'lsa dastur muzlab qolmasligi uchun
      signal: AbortSignal.timeout(15000),
    });
  } catch (cause) {
    // Internet yo'q yoki Telegram bloklangan - tokenning aybi emas
    const error = new Error('Telegram serveriga ulanib bo‘lmadi');
    error.network = true;
    error.cause = cause;
    throw error;
  }

  let payload;

  try {
    payload = await response.json();
  } catch (cause) {
    // Proxy yoki wi-fi sahifasi JSON o'rniga HTML qaytardi - tokenning aybi emas
    const error = new Error('Telegramdan tushunarsiz javob keldi (proxy yoki internet muammosi)');
    error.network = true;
    error.cause = cause;
    throw error;
  }

  if (!payload.ok) {
    throw new Error(payload.description || `${method} muvaffaqiyatsiz tugadi`);
  }

  return payload.result;
}

/** Bot hozir qaysi webhook manziliga ulangan (bo'sh = long polling) */
export async function getWebhookUrl(token) {
  const info = await call(token, 'getWebhookInfo');
  return info?.url || '';
}

/** Bot haqida ma'lumot (token to'g'riligini tekshiradi) */
export function getMe(token) {
  return call(token, 'getMe');
}

/** Telegram hozir qaysi menyu tugmasini saqlab turganini qaytaradi */
export function getMenuButton(token) {
  return call(token, 'getChatMenuButton');
}

/**
 * Botning "Menu Button" ini Mini App'ga bog'laydi va natijani Telegramdan
 * qayta o'qib tekshiradi. Bu BotFather'da qo'lda qo'yilgan eski manzilni
 * (masalan example.com) ustidan yozadi.
 */
export async function setupBot(token, webAppUrl) {
  const me = await getMe(token);
  ok(`Bot topildi: @${me.username}`);

  await call(token, 'setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: '\u{1F968} Buyurtma berish',
      web_app: { url: webAppUrl },
    },
  });

  // Haqiqatan yozilganini tekshiramiz
  const current = await getMenuButton(token);
  const savedUrl = current?.web_app?.url;

  // Telegram URL saqlaganda oxiriga "/" qo'shib qo'yishi mumkin - shuni
  // hisobga olmasak, to'g'ri yozilgan taqdirda ham soxta ogohlantirish chiqadi
  const normalize = (url) => (url || '').replace(/\/+$/, '');

  if (normalize(savedUrl) === normalize(webAppUrl)) {
    ok(`Menu tugmasi bog‘landi: ${savedUrl}`);
  } else {
    warn(`Menu tugmasi kutilganidek yozilmadi. Telegramdagi qiymat: ${savedUrl || current?.type}`);
  }

  await call(token, 'setMyCommands', {
    commands: [
      { command: 'start', description: 'Botni ishga tushirish' },
      { command: 'manzil', description: 'Filiallar va ish vaqti' },
      { command: 'help', description: 'Yordam' },
    ],
  });
  ok('Bot buyruqlari ro‘yxatga olindi');

  try {
    await call(token, 'setMyDescription', {
      description:
        'Farhadskaya Bulochka — issiqqina bulochka va nonlar. Har kuni 7:00 – 19:00. Buyurtma berish uchun menyu tugmasini bosing.',
    });
  } catch {
    // muhim emas
  }

  return me;
}

/**
 * Menu tugmasini oddiy "commands" holatiga qaytaradi.
 * Tunnel ochilmaganda chaqiriladi - shunda eski, ishlamaydigan manzil
 * (masalan BotFather'da qolgan example.com) ochilib qolmaydi.
 */
export async function resetMenuButton(token) {
  try {
    await call(token, 'setChatMenuButton', { menu_button: { type: 'commands' } });
    ok('Eski menyu tugmasi tozalandi (ishlamaydigan manzil ochilmaydi)');
  } catch (error) {
    warn(`Menu tugmasini tozalab bo‘lmadi: ${error.message}`);
  }
}
