// Koordinatadan manzil matni (reverse geocoding) — OpenStreetMap Nominatim, kalit shart emas.
// Nominatim qoidasi: sekundiga ko'pi bilan 1 ta so'rov va aniq User-Agent. Shuning uchun
// so'rovlar navbat bilan yuboriladi, natijalar esa xotirada saqlanadi.

export interface GeocodeOptions {
  /** Masalan https://nominatim.openstreetmap.org. Bo'sh bo'lsa — geokoder o'chiq */
  baseUrl: string;
  userAgent: string;
  minIntervalMs?: number;
  timeoutMs?: number;
  cacheSize?: number;
}

export interface NominatimAddress {
  road?: string;
  pedestrian?: string;
  house_number?: string;
  neighbourhood?: string;
  quarter?: string;
  residential?: string;
  suburb?: string;
  city_district?: string;
  city?: string;
  town?: string;
  village?: string;
}

interface NominatimReply {
  display_name?: string;
  address?: NominatimAddress;
  error?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Nominatim javobidan kuryerga tushunarli qisqa manzil: "Ko'cha 12, Mahalla, Tuman" */
export function formatAddress(address: NominatimAddress = {}, displayName = ''): string {
  const street = address.road ?? address.pedestrian;
  const parts = [
    street && address.house_number ? `${street} ${address.house_number}` : street,
    address.neighbourhood ?? address.quarter ?? address.residential,
    address.city_district ?? address.suburb,
  ];
  if (!street) parts.push(address.city ?? address.town ?? address.village);

  const unique = [...new Set(parts.map((part) => part?.trim()).filter(Boolean))];
  const text = unique.length ? unique.join(', ') : displayName.split(',').slice(0, 3).join(',');
  return text.trim().slice(0, 200);
}

export class GeocodeService {
  private readonly cache = new Map<string, string | null>();
  private queue: Promise<unknown> = Promise.resolve();
  private lastRequestAt = 0;

  constructor(private readonly options: GeocodeOptions) {}

  get enabled(): boolean {
    return Boolean(this.options.baseUrl);
  }

  /** Manzil matni yoki null (topilmasa, geokoder o'chiq yoki javob bermasa) */
  async reverse(lat: number, lng: number): Promise<string | null> {
    if (!this.enabled) return null;

    // ~10 metr aniqlik: bir xil nuqta qayta so'ralmaydi
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (this.cache.has(key)) return this.cache.get(key) ?? null;

    try {
      const text = await this.schedule(() => this.lookup(lat, lng));
      this.remember(key, text);
      return text;
    } catch {
      // Tarmoq xatosi keshlanmaydi — keyingi urinishda qayta so'raladi
      return null;
    }
  }

  private async lookup(lat: number, lng: number): Promise<string | null> {
    const url = new URL('/reverse', this.options.baseUrl);
    url.search = new URLSearchParams({
      format: 'jsonv2',
      lat: String(lat),
      lon: String(lng),
      zoom: '18',
      addressdetails: '1',
      'accept-language': 'uz,ru',
    }).toString();

    const response = await fetch(url, {
      headers: { 'user-agent': this.options.userAgent, accept: 'application/json' },
      signal: AbortSignal.timeout(this.options.timeoutMs ?? 5000),
    });
    if (!response.ok) throw new Error(`geocoder ${response.status}`);

    const reply = (await response.json()) as NominatimReply;
    if (reply.error) return null;
    return formatAddress(reply.address, reply.display_name) || null;
  }

  /** So'rovlarni ketma-ket, orasida kamida minIntervalMs bilan yuboradi */
  private schedule<T>(task: () => Promise<T>): Promise<T> {
    const interval = this.options.minIntervalMs ?? 1100;
    const run = this.queue.then(async () => {
      const wait = this.lastRequestAt + interval - Date.now();
      if (wait > 0) await sleep(wait);
      this.lastRequestAt = Date.now();
      return task();
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  private remember(key: string, text: string | null): void {
    const limit = this.options.cacheSize ?? 2000;
    if (this.cache.size >= limit) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, text);
  }
}
