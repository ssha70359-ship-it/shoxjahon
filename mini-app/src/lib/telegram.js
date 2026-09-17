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
