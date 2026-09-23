export const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;

export function initTelegram() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.('#ffffff');
    tg.setBackgroundColor?.('#ffffff');
    tg.disableVerticalSwipes?.();
  } catch {
    /* Telegram tashqarisida ishga tushirilgan */
  }
}

export function getInitData() {
  return tg?.initData || '';
}

export function getTelegramUser() {
  return tg?.initDataUnsafe?.user || null;
}

export function haptic(style = 'light') {
  try {
    tg?.HapticFeedback?.impactOccurred(style);
  } catch {
    /* qo'llab-quvvatlanmaydi */
  }
}

export function notifySuccess() {
  try {
    tg?.HapticFeedback?.notificationOccurred('success');
  } catch {
    /* qo'llab-quvvatlanmaydi */
  }
}

/**
 * Telegram "orqaga" tugmasini yoqadi va bosilganda `handler` ni chaqiradi.
 *
 * Bu tugma ko'rinib turganda Android'ning tizim "orqaga" tugmasi ham shu
 * handlerga tushadi — ya'ni ilova yopilib ketmaydi. Tugma yashirin bo'lsa
 * orqaga bosish Mini App'ni yopadi (Telegramning odatdagi xatti-harakati).
 *
 * Tozalash funksiyasini qaytaradi — useEffect'da to'g'ridan-to'g'ri ishlatiladi.
 */
export function showBackButton(handler) {
  const back = tg?.BackButton;
  if (!back) return () => {};

  try {
    back.onClick(handler);
    back.show();
  } catch {
    return () => {};
  }

  return () => {
    try {
      back.offClick(handler);
    } catch {
      /* qo'llab-quvvatlanmaydi */
    }
  };
}

export function hideBackButton() {
  try {
    tg?.BackButton?.hide();
  } catch {
    /* qo'llab-quvvatlanmaydi */
  }
}

export function notifyError() {
  try {
    tg?.HapticFeedback?.notificationOccurred('error');
  } catch {
    /* qo'llab-quvvatlanmaydi */
  }
}

/**
 * Karta orqali to'lash mumkinmi: Mini App Telegram ichida ochilgan va
 * openInvoice mavjud bo'lishi kerak (brauzerda sinashda ishlamaydi).
 */
export function canPayInApp() {
  return Boolean(tg?.initData && typeof tg.openInvoice === 'function');
}

/**
 * Hisob-fakturani Mini App ustida ochadi - mijoz chatga chiqmasdan to'laydi.
 * Natija: 'paid' | 'cancelled' | 'failed' | 'pending' | 'unsupported'
 */
export function openInvoice(url) {
  return new Promise((resolve) => {
    if (!canPayInApp() || !url) return resolve('unsupported');

    try {
      tg.openInvoice(url, (status) => resolve(status || 'failed'));
    } catch {
      resolve('failed');
    }
  });
}

export function closeApp() {
  try {
    tg?.close();
  } catch {
    /* brauzerda yopilmaydi */
  }
}

export function requestPhone() {
  return new Promise((resolve) => {
    if (!tg?.requestContact) return resolve(null);
    try {
      tg.requestContact((ok, result) => {
        if (!ok) return resolve(null);
        const phone =
          result?.responseUnsafe?.contact?.phone_number || result?.contact?.phone_number || null;
        resolve(phone);
      });
    } catch {
      resolve(null);
    }
  });
}

const LOCATION_TIMEOUT = 25000;

/** Telegram'ning o'z joylashuv API'si (Bot API 8.0+) bormi */
function locationManager() {
  const manager = tg?.LocationManager;
  if (!manager || !tg.isVersionAtLeast?.('8.0')) return null;
  return manager;
}

function initLocationManager(manager) {
  return new Promise((resolve) => {
    if (manager.isInited) return resolve(true);
    try {
      manager.init(() => resolve(true));
    } catch {
      resolve(false);
    }
    setTimeout(() => resolve(manager.isInited), 3000);
  });
}

/** Telegram ilovasi orqali (telefon GPS'idan) joylashuv */
async function locationFromTelegram(manager) {
  if (!(await initLocationManager(manager)) || !manager.isLocationAvailable) return null;

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ error: 'timeout' }), LOCATION_TIMEOUT);

    try {
      manager.getLocation((data) => {
        clearTimeout(timer);

        if (data && Number.isFinite(data.latitude) && Number.isFinite(data.longitude)) {
          return resolve({ lat: data.latitude, lng: data.longitude });
        }

        // Ruxsat so'ralgan, lekin berilmagan - faqat Telegram sozlamasidan yoqiladi
        if (manager.isAccessRequested && !manager.isAccessGranted) {
          return resolve({ error: 'denied', canOpenSettings: true });
        }
        resolve({ error: 'unavailable' });
      });
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

function browserPosition(options) {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      (error) =>
        resolve({ error: error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable' }),
      options,
    );
  });
}

/** Brauzer orqali: avval tez (Wi-Fi/tarmoq), bo'lmasa GPS bilan yana bir bor */
async function locationFromBrowser() {
  if (!navigator.geolocation) return { error: 'unsupported' };

  const quick = await browserPosition({ enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  if (!quick.error || quick.error === 'denied') return quick;

  return browserPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
}

/**
 * Mijoz joylashuvi: { lat, lng } yoki { error, canOpenSettings }.
 * error: 'denied' | 'unavailable' | 'timeout' | 'unsupported'
 *
 * Android Telegram ichidagi brauzer joylashuvi ko'pincha ishlamaydi, shuning
 * uchun avval Telegram'ning o'z LocationManager'i ishlatiladi.
 */
export async function getLocation() {
  const manager = locationManager();

  if (manager) {
    const result = await locationFromTelegram(manager);
    // Ruxsat berilmagan bo'lsa brauzer ham ruxsat bermaydi - qayta so'ramaymiz
    if (result && (!result.error || result.error === 'denied')) return result;
  }

  return locationFromBrowser();
}

/** Telegram'ning joylashuv ruxsati sozlamasini ochadi */
export function openLocationSettings() {
  try {
    tg?.LocationManager?.openSettings();
  } catch {
    /* qo'llab-quvvatlanmaydi */
  }
}

/** Tashqi havolani (masalan xarita) Mini App'ni yopmasdan ochadi */
export function openLink(url) {
  try {
    if (tg?.openLink) return tg.openLink(url);
  } catch {
    /* pastdagi usulga o'tamiz */
  }
  window.open(url, '_blank', 'noopener');
}
