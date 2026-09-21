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
