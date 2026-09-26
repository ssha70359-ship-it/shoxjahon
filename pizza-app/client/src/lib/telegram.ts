// Telegram Mini App API ustidan yupqa qatlam.
// Har bir chaqiruv Telegram tashqarisida (oddiy brauzerda) ham xatosiz ishlaydi.

export const tg: TelegramWebApp | null = typeof window !== 'undefined' ? (window.Telegram?.WebApp ?? null) : null;

export function versionAtLeast(version: string): boolean {
  try {
    return Boolean(tg?.isVersionAtLeast(version));
  } catch {
    return false;
  }
}

function attempt(fn: () => void): void {
  try {
    fn();
  } catch {
    // Telegram versiyasi eski yoki brauzerda ochilgan
  }
}

/** Telegram obyekti va kerakli versiya bo'lsa, uni qaytaradi */
function api(version: string): TelegramWebApp | null {
  return tg && versionAtLeast(version) ? tg : null;
}

export function initTelegram(): void {
  if (!tg) return;
  attempt(() => tg.ready());
  attempt(() => tg.expand());
  if (versionAtLeast('7.7')) attempt(() => tg.disableVerticalSwipes());
}

export function colorScheme(): 'light' | 'dark' {
  if (tg?.colorScheme) return tg.colorScheme;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function onThemeChange(handler: () => void): () => void {
  if (!tg) return () => {};
  tg.onEvent('themeChanged', handler);
  return () => tg.offEvent('themeChanged', handler);
}

export function setChrome(color: string): void {
  const app = api('6.1');
  if (!app) return;
  attempt(() => app.setHeaderColor(color));
  attempt(() => app.setBackgroundColor(color));
  if (versionAtLeast('7.10')) attempt(() => app.setBottomBarColor(color));
}

export function initData(): string {
  return tg?.initData ?? '';
}

export function telegramUser() {
  return tg?.initDataUnsafe.user ?? null;
}

export function startParam(): string {
  return tg?.initDataUnsafe.start_param ?? '';
}

// --- Haptic ---------------------------------------------------------------

export function haptic(style: HapticImpact = 'light'): void {
  const app = api('6.1');
  if (app) attempt(() => app.HapticFeedback.impactOccurred(style));
}

export function hapticSelect(): void {
  const app = api('6.1');
  if (app) attempt(() => app.HapticFeedback.selectionChanged());
}

export function hapticNotify(type: HapticNotification = 'success'): void {
  const app = api('6.1');
  if (app) attempt(() => app.HapticFeedback.notificationOccurred(type));
}

// --- Tugmalar va dialoglar ------------------------------------------------

/** "Orqaga" tugmasini ko'rsatadi; qaytgan funksiya handler'ni olib tashlaydi */
export function setBackButton(handler: () => void): () => void {
  const app = api('6.1');
  if (!app) return () => {};
  app.BackButton.onClick(handler);
  app.BackButton.show();
  return () => app.BackButton.offClick(handler);
}

export function hideBackButton(): void {
  const app = api('6.1');
  if (app) attempt(() => app.BackButton.hide());
}

export function setClosingConfirmation(enabled: boolean): void {
  const app = api('6.2');
  if (app) attempt(() => (enabled ? app.enableClosingConfirmation() : app.disableClosingConfirmation()));
}

export function confirmDialog(message: string): Promise<boolean> {
  const app = api('6.2');
  if (!app) return Promise.resolve(window.confirm(message));
  return new Promise((resolve) => {
    try {
      app.showConfirm(message, (ok) => resolve(Boolean(ok)));
    } catch {
      resolve(window.confirm(message));
    }
  });
}

export function openTelegramLink(url: string): void {
  const app = api('6.1');
  if (app) attempt(() => app.openTelegramLink(url));
  else window.open(url, '_blank', 'noopener');
}

/** Tashqi saytni (xarita va h.k.) Telegram brauzerida ochadi */
export function openLink(url: string): void {
  if (tg) attempt(() => tg.openLink(url));
  else window.open(url, '_blank', 'noopener');
}

export function callPhone(phone: string): void {
  const href = `tel:${phone.replace(/\s/g, '')}`;
  if (tg) attempt(() => tg.openLink(href));
  else window.location.href = href;
}

// --- Kontakt, joylashuv, to'lov ------------------------------------------

export function requestPhone(): Promise<string | null> {
  const app = api('6.9');
  if (!app) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      app.requestContact((ok, result) => resolve(ok ? (result?.responseUnsafe?.contact?.phone_number ?? null) : null));
    } catch {
      resolve(null);
    }
  });
}

/** Bot keyinchalik xabar yubora olishi uchun ruxsat so'raydi (Davraga havola orqali kelganlar) */
export function ensureWriteAccess(): Promise<boolean> {
  const app = api('6.9');
  if (!app || telegramUser()?.allows_write_to_pm !== false) return Promise.resolve(true);
  return new Promise((resolve) => {
    try {
      app.requestWriteAccess((ok) => resolve(Boolean(ok)));
    } catch {
      resolve(false);
    }
  });
}

export interface LatLng {
  lat: number;
  lng: number;
}

function browserLocation(): Promise<LatLng | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

/** Telegram LocationManager (Bot API 8.0), bo'lmasa brauzer geolokatsiyasi */
export function requestLocation(): Promise<LatLng | null> {
  const manager = api('8.0')?.LocationManager;
  if (!manager) return browserLocation();

  return new Promise((resolve) => {
    const read = () => {
      if (!manager.isLocationAvailable) return void browserLocation().then(resolve);
      manager.getLocation((data) => resolve(data ? { lat: data.latitude, lng: data.longitude } : null));
    };
    try {
      if (manager.isInited) read();
      else manager.init(read);
    } catch {
      void browserLocation().then(resolve);
    }
  });
}

/** Telegram ichidagi to'lov oynasi */
export function openInvoice(url: string): Promise<InvoiceStatus> {
  const app = api('6.1');
  if (!app) {
    window.open(url, '_blank', 'noopener');
    return Promise.resolve('pending');
  }
  return new Promise((resolve) => {
    try {
      app.openInvoice(url, resolve);
    } catch {
      resolve('failed');
    }
  });
}

/** Bot API 8.0: tayyorlangan xabarni chatga ulashish */
export function shareMessage(preparedId: string | null): Promise<boolean> {
  const app = api('8.0');
  if (!app || !preparedId) return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      app.shareMessage(preparedId, (sent) => resolve(Boolean(sent)));
    } catch {
      resolve(false);
    }
  });
}

export function canAddToHomeScreen(): boolean {
  return Boolean(api('8.0')?.addToHomeScreen);
}

export function addToHomeScreen(): void {
  const app = api('8.0');
  if (app) attempt(() => app.addToHomeScreen());
}

// --- Telegram bulutli xotirasi (savat telefon va kompyuter orasida sinxron) -

export function cloudGet(key: string): Promise<string | null> {
  const app = api('6.9');
  if (!app?.CloudStorage) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      app.CloudStorage.getItem(key, (error, value) => resolve(error ? null : value || null));
    } catch {
      resolve(null);
    }
  });
}

export function cloudSet(key: string, value: string): void {
  const app = api('6.9');
  // Telegram cheklovi — 4096 belgi
  if (app?.CloudStorage && value.length <= 4000) attempt(() => app.CloudStorage.setItem(key, value));
}

export function sensor(name: 'orientation'): TelegramWebApp['DeviceOrientation'] | null;
export function sensor(name: 'accelerometer'): TelegramWebApp['Accelerometer'] | null;
export function sensor(name: 'orientation' | 'accelerometer') {
  const app = api('8.0');
  if (!app) return null;
  return name === 'orientation' ? app.DeviceOrientation : app.Accelerometer;
}
