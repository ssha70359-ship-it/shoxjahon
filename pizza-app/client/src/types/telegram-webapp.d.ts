// Telegram Mini App API (telegram-web-app.js) — ilovada ishlatiladigan qismi.
// https://core.telegram.org/bots/webapps

type HapticImpact = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type HapticNotification = 'error' | 'success' | 'warning';
type InvoiceStatus = 'paid' | 'cancelled' | 'failed' | 'pending';

interface TelegramSensor {
  start(params?: Record<string, unknown>, callback?: (started: boolean) => void): void;
  stop(callback?: (stopped: boolean) => void): void;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      allows_write_to_pm?: boolean;
    };
    start_param?: string;
  };
  version: string;
  colorScheme: 'light' | 'dark';

  isVersionAtLeast(version: string): boolean;
  ready(): void;
  expand(): void;
  disableVerticalSwipes(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  setBottomBarColor(color: string): void;
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;
  onEvent(event: string, handler: () => void): void;
  offEvent(event: string, handler: () => void): void;
  showConfirm(message: string, callback: (ok: boolean) => void): void;
  openLink(url: string): void;
  openTelegramLink(url: string): void;
  openInvoice(url: string, callback: (status: InvoiceStatus) => void): void;
  requestContact(
    callback: (ok: boolean, result?: { responseUnsafe?: { contact?: { phone_number?: string } } }) => void,
  ): void;
  requestWriteAccess(callback: (ok: boolean) => void): void;
  shareMessage(id: string, callback?: (sent: boolean) => void): void;
  addToHomeScreen(): void;

  HapticFeedback: {
    impactOccurred(style: HapticImpact): void;
    selectionChanged(): void;
    notificationOccurred(type: HapticNotification): void;
  };
  BackButton: {
    show(): void;
    hide(): void;
    onClick(handler: () => void): void;
    offClick(handler: () => void): void;
  };
  CloudStorage: {
    getItem(key: string, callback: (error: string | null, value?: string) => void): void;
    setItem(key: string, value: string, callback?: (error: string | null, stored?: boolean) => void): void;
  };
  LocationManager: {
    isInited: boolean;
    isLocationAvailable: boolean;
    init(callback?: () => void): void;
    getLocation(callback: (data: { latitude: number; longitude: number } | null) => void): void;
  };
  DeviceOrientation: TelegramSensor & { alpha: number | null; beta: number | null; gamma: number | null };
  Accelerometer: TelegramSensor & { x: number | null; y: number | null; z: number | null };
}

interface Window {
  Telegram?: { WebApp: TelegramWebApp };
}
