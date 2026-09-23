import config from '../config/default.js';
import bot, { buildOrderPayload } from '../core/bot.js';

/** Telegram UZS summalarini tiyinda qabul qiladi (currencies.json: exp = 2) */
const UZS_EXP = 2;
const CURRENCIES_URL = 'https://core.telegram.org/bots/payments/currencies.json';
const LIMITS_TTL = 6 * 60 * 60 * 1000;

export const METHODS = {
  NAQD: { id: 'NAQD', title: 'Naqd', subtitle: 'Kuryerga yetkazib berilganda', card: false },
  CLICK: { id: 'CLICK', title: 'Click', subtitle: 'Bank kartasi · Telegram ichida', card: true },
  PAYME: { id: 'PAYME', title: 'Payme', subtitle: 'Bank kartasi · Telegram ichida', card: true },
};

/** Mijozga ko'rsatiladigan tushunarli xato (4xx) */
export class PaymentError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
    this.expose = true;
  }
}

export function isMethod(value) {
  return Object.prototype.hasOwnProperty.call(METHODS, value);
}

export function providerToken(method) {
  if (method === 'CLICK') return config.payments.click;
  if (method === 'PAYME') return config.payments.payme;
  return '';
}

export function isEnabled(method) {
  return method === 'NAQD' || Boolean(providerToken(method));
}

export function toMinorUnits(sum) {
  return Math.round(Number(sum) * 10 ** UZS_EXP);
}

const formatSum = (value) => `${Number(value).toLocaleString('ru-RU')} so‘m`;

const FAIL_TTL = 10 * 60 * 1000;

let limitsCache = { at: 0, value: null, ok: false };
let inflight = null;

/**
 * Telegram karta to'lovi uchun UZS chegaralari (taxminan 1–10 000 AQSh dollari).
 * Kursga qarab o'zgargani uchun Telegramning o'zidan olinadi:
 *  - muvaffaqiyatli javob 6 soat saqlanadi;
 *  - xato ham 10 daqiqa eslab qolinadi, har so'rovda qayta kutmaslik uchun;
 *  - bir vaqtda faqat bitta so'rov ketadi.
 * Olib bo'lmasa null (yoki oldingi qiymat) - unda Telegram invoice yaratishda o'zi tekshiradi.
 */
export function uzsLimits({ fetchImpl = fetch } = {}) {
  const age = Date.now() - limitsCache.at;
  if (limitsCache.at && age < (limitsCache.ok ? LIMITS_TTL : FAIL_TTL)) {
    return Promise.resolve(limitsCache.value);
  }

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const response = await fetchImpl(CURRENCIES_URL, { signal: AbortSignal.timeout(5000) });
      const uzs = (await response.json())?.UZS;
      const exp = Number(uzs?.exp);

      if (!uzs || !Number.isFinite(exp)) throw new Error('UZS topilmadi');

      limitsCache = {
        at: Date.now(),
        ok: true,
        value: {
          min: Math.ceil(Number(uzs.min_amount) / 10 ** exp),
          max: Math.floor(Number(uzs.max_amount) / 10 ** exp),
        },
      };
    } catch {
      // Oldingi qiymat bo'lsa saqlab qolamiz, 10 daqiqadan keyin qayta urinamiz
      limitsCache = { at: Date.now(), ok: false, value: limitsCache.value };
    } finally {
      inflight = null;
    }

    return limitsCache.value;
  })();

  return inflight;
}

/** Tarmoqni kutmasdan keshdagi qiymat; eskirgan bo'lsa orqa fonda yangilanadi */
export function cachedLimits() {
  uzsLimits().catch(() => {});
  return limitsCache.value;
}

/** Test uchun keshni tozalash */
export function resetLimitsCache() {
  limitsCache = { at: 0, value: null, ok: false };
  inflight = null;
}

/** Mini App uchun: qaysi usullar yoqilgan va karta uchun minimal summa */
export function paymentOptions() {
  // Katalog Telegram saytini kutmasligi kerak - keshdagi qiymat yetarli
  const limits = cachedLimits();

  return Object.values(METHODS).map((method) => ({
    id: method.id,
    title: method.title,
    subtitle: method.subtitle,
    card: method.card,
    enabled: isEnabled(method.id),
    minAmount: method.card ? limits?.min ?? null : null,
  }));
}

/** Buyurtma yaratishdan oldin: usul yoqilganmi va summa chegaraga sig'adimi */
export async function assertPayable(method, total) {
  if (!isMethod(method)) throw new PaymentError('Noma’lum to‘lov usuli');

  if (!isEnabled(method)) {
    throw new PaymentError(`${METHODS[method].title} hozircha ulanmagan. Boshqa usulni tanlang.`);
  }

  if (!METHODS[method].card) return;

  const limits = await uzsLimits();

  if (limits && total < limits.min) {
    throw new PaymentError(
      `Karta orqali to‘lov kamida ${formatSum(limits.min)}dan. Yana biror narsa qo‘shing yoki naqd to‘lang.`,
    );
  }

  if (limits && total > limits.max) {
    throw new PaymentError(`Karta orqali to‘lov ko‘pi bilan ${formatSum(limits.max)}. Naqd to‘lang.`);
  }
}

/** Nisbiy rasm yo'lini Telegram ko'ra oladigan to'liq https manzilga aylantiradi */
function publicImageUrl(imageUrl) {
  if (!imageUrl) return undefined;
  if (/^https:\/\//i.test(imageUrl)) return imageUrl;

  const base = (config.bot.webAppUrl || '').replace(/\/+$/, '');
  if (!base.startsWith('https://') || !imageUrl.startsWith('/')) return undefined;

  return `${base}${imageUrl}`;
}

/**
 * Mini App ichida ochiladigan hisob-faktura havolasi (WebApp.openInvoice).
 * Mijoz chatga qaytmasdan shu yerning o'zida to'laydi.
 */
export async function createInvoiceLink(order, method, { telegram = bot.telegram } = {}) {
  await assertPayable(method, order.total);

  const items = Array.isArray(order.items) ? order.items : [];
  const description =
    items.map((item) => `${item.name} × ${item.qty}`).join(', ').slice(0, 255) ||
    'Farhadskaya Bulochka buyurtmasi';

  try {
    return await telegram.createInvoiceLink({
      title: `Buyurtma №${order.id}`.slice(0, 32),
      description,
      payload: buildOrderPayload(order.id, method),
      provider_token: providerToken(method),
      currency: 'UZS',
      prices: items.map((item) => ({
        label: `${item.name} × ${item.qty}`.slice(0, 64),
        amount: toMinorUnits(item.sum),
      })),
      photo_url: publicImageUrl(items[0]?.imageUrl),
    });
  } catch (error) {
    const text = String(error?.message || '');

    if (/CURRENCY_TOTAL_AMOUNT_INVALID/i.test(text)) {
      throw new PaymentError('Bu summani karta orqali to‘lab bo‘lmaydi. Summani oshiring yoki naqd to‘lang.');
    }

    if (/PAYMENT_PROVIDER_INVALID|provider/i.test(text)) {
      console.error(`⚠️  ${METHODS[method].title} tokeni yaroqsiz:`, text);
      throw new PaymentError(`${METHODS[method].title} vaqtincha ishlamayapti. Boshqa usulni tanlang.`, 503);
    }

    throw error;
  }
}
