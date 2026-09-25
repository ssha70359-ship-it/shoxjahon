// Telegram Mini App API ustidan yupqa qatlam.
// Har bir chaqiruv Telegram tashqarisida (oddiy brauzerda) ham xatosiz ishlaydi.

export const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp ?? null : null;

export const inTelegram = Boolean(tg?.initData);

export function versionAtLeast(version) {
  try {
    return Boolean(tg?.isVersionAtLeast?.(version));
  } catch {
    return false;
  }
}

function attempt(fn, fallback) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function initTelegram() {
  if (!tg) return;
  attempt(() => tg.ready());
  attempt(() => tg.expand());
  if (versionAtLeast('7.7')) attempt(() => tg.disableVerticalSwipes());
}

export function colorScheme() {
  if (tg?.colorScheme) return tg.colorScheme;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function onThemeChange(handler) {
  if (!tg) return () => {};
  tg.onEvent('themeChanged', handler);
  return () => tg.offEvent('themeChanged', handler);
}

export function setChrome(color) {
  if (!tg) return;
  if (versionAtLeast('6.1')) {
    attempt(() => tg.setHeaderColor(color));
    attempt(() => tg.setBackgroundColor(color));
  }
  if (versionAtLeast('7.10')) attempt(() => tg.setBottomBarColor(color));
}

export function initData() {
  return tg?.initData || '';
}

export function telegramUser() {
  return tg?.initDataUnsafe?.user ?? null;
}

export function startParam() {
  return tg?.initDataUnsafe?.start_param || '';
}

// --- Haptic ---------------------------------------------------------------

export function haptic(style = 'light') {
  if (versionAtLeast('6.1')) attempt(() => tg.HapticFeedback.impactOccurred(style));
}

export function hapticSelect() {
  if (versionAtLeast('6.1')) attempt(() => tg.HapticFeedback.selectionChanged());
}

export function hapticNotify(type = 'success') {
  if (versionAtLeast('6.1')) attempt(() => tg.HapticFeedback.notificationOccurred(type));
}

// --- Tugmalar va dialoglar ------------------------------------------------

export function setBackButton(handler) {
  if (!tg || !versionAtLeast('6.1')) return () => {};
  const back = tg.BackButton;
  if (!handler) {
    attempt(() => back.hide());
    return () => {};
  }
  back.onClick(handler);
  back.show();
  return () => {
    back.offClick(handler);
  };
}

export function hideBackButton() {
  if (tg && versionAtLeast('6.1')) attempt(() => tg.BackButton.hide());
}

export function setClosingConfirmation(enabled) {
  if (!tg || !versionAtLeast('6.2')) return;
  attempt(() => (enabled ? tg.enableClosingConfirmation() : tg.disableClosingConfirmation()));
}

export function confirmDialog(message) {
  if (tg && versionAtLeast('6.2')) {
    return new Promise((resolve) => {
      try {
        tg.showConfirm(message, (ok) => resolve(Boolean(ok)));
      } catch {
        resolve(window.confirm(message));
      }
    });
  }
  return Promise.resolve(window.confirm(message));
}

export function openTelegramLink(url) {
  if (tg && versionAtLeast('6.1')) {
    attempt(() => tg.openTelegramLink(url));
    return;
  }
  window.open(url, '_blank', 'noopener');
}

export function callPhone(phone) {
  const href = `tel:${String(phone).replace(/\s/g, '')}`;
  if (tg) attempt(() => tg.openLink(href));
  else window.location.href = href;
}

// --- Kontakt, joylashuv, to'lov ------------------------------------------

export function requestPhone() {
  return new Promise((resolve) => {
    if (!tg || !versionAtLeast('6.9')) return resolve(null);
    try {
      tg.requestContact((ok, result) => {
        if (!ok) return resolve(null);
        resolve(result?.responseUnsafe?.contact?.phone_number ?? null);
      });
    } catch {
      resolve(null);
    }
  });
}

/** Bot keyinchalik xabar yubora olishi uchun ruxsat so'raydi (Davraga havola orqali kelganlar) */
export function ensureWriteAccess() {
  return new Promise((resolve) => {
    const user = telegramUser();
    if (!tg || !user || user.allows_write_to_pm || !versionAtLeast('6.9')) return resolve(true);
    try {
      tg.requestWriteAccess((ok) => resolve(Boolean(ok)));
    } catch {
      resolve(false);
    }
  });
}

function browserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}

/** Telegram LocationManager (Bot API 8.0), bo'lmasa brauzer geolokatsiyasi */
export function requestLocation() {
  const manager = tg?.LocationManager;
  if (!manager || !versionAtLeast('8.0')) return browserLocation();

  return new Promise((resolve) => {
    const read = () => {
      if (!manager.isLocationAvailable) return resolve(browserLocation());
      manager.getLocation((data) => {
        if (data) resolve({ lat: data.latitude, lng: data.longitude });
        else resolve(null);
      });
    };

    try {
      if (manager.isInited) read();
      else manager.init(read);
    } catch {
      resolve(browserLocation());
    }
  });
}

/** Telegram ichidagi to'lov oynasi. Natija: paid | cancelled | failed | pending */
export function openInvoice(url) {
  return new Promise((resolve) => {
    if (!tg || !versionAtLeast('6.1')) {
      window.open(url, '_blank', 'noopener');
      return resolve('pending');
    }
    try {
      tg.openInvoice(url, (status) => resolve(status));
    } catch {
      resolve('failed');
    }
  });
}

/** Bot API 8.0: tayyorlangan xabarni chatga ulashish */
export function shareMessage(preparedId) {
  return new Promise((resolve) => {
    if (!tg || !preparedId || !versionAtLeast('8.0')) return resolve(false);
    try {
      tg.shareMessage(preparedId, (sent) => resolve(Boolean(sent)));
    } catch {
      resolve(false);
    }
  });
}

export function canAddToHomeScreen() {
  return Boolean(tg && versionAtLeast('8.0') && tg.addToHomeScreen);
}

export function addToHomeScreen() {
  if (canAddToHomeScreen()) attempt(() => tg.addToHomeScreen());
}

// --- Telegram bulutli xotirasi (savat telefon va kompyuter orasida sinxron) -

export function cloudGet(key) {
  return new Promise((resolve) => {
    if (!tg?.CloudStorage || !versionAtLeast('6.9')) return resolve(null);
    try {
      tg.CloudStorage.getItem(key, (error, value) => resolve(error ? null : value || null));
    } catch {
      resolve(null);
    }
  });
}

export function cloudSet(key, value) {
  if (!tg?.CloudStorage || !versionAtLeast('6.9')) return;
  if (value.length > 4000) return; // Telegram cheklovi 4096 belgi
  attempt(() => tg.CloudStorage.setItem(key, value, () => {}));
}
