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

/** Bot haqida ma'lumot (token to'g'riligini tekshiradi) */
export function getMe(token) {
  return call(token, 'getMe');
}

/**
 * Botning "Menu Button" ini Mini App'ga bog'laydi.
 * Shu sabab BotFather'da qo'lda sozlash kerak emas.
 */
export async function setupBot(token, webAppUrl) {
  const me = await getMe(token);
  ok(`Bot topildi: @${me.username}`);

  await call(token, 'setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: '\u{1F355} Buyurtma berish',
      web_app: { url: webAppUrl },
    },
  });
  ok('Menu tugmasi Mini App’ga bog‘landi (BotFather kerak emas)');

  await call(token, 'setMyCommands', {
    commands: [
      { command: 'start', description: 'Botni ishga tushirish' },
      { command: 'help', description: 'Yordam' },
    ],
  });
  ok('Bot buyruqlari ro‘yxatga olindi');

  try {
    await call(token, 'setMyDescription', {
      description:
        'Issiqqina pizzalarni 30 daqiqada yetkazib beramiz. Buyurtma berish uchun menyu tugmasini bosing.',
    });
  } catch {
    // muhim emas
  }

  return me;
}

/** Menu tugmasini oddiy holatga qaytaradi */
export async function resetMenuButton(token) {
  try {
    await call(token, 'setChatMenuButton', { menu_button: { type: 'commands' } });
  } catch (error) {
    warn(`Menu tugmasini tozalab bo‘lmadi: ${error.message}`);
  }
}
