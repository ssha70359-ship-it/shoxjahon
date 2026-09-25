// Narx hisoblash va savatcha qatorlarini bir xil ko'rinishga keltirish.
// Mini App narxni shu fayl bilan ko'rsatadi, server esa buyurtmani aynan
// shu funksiyalar bilan qayta hisoblaydi — mijoz yuborgan narxga ishonilmaydi.

import {
  CRUST_BY_ID,
  CUSTOM_PIZZA_ID,
  ITEM_BY_ID,
  PIZZA_BY_ID,
  SAUCE_BY_ID,
  SIZE_BY_ID,
  TOPPINGS,
  TOPPING_BY_ID,
  tr,
} from './menu.js';
import { LIMITS, cartLineSchema, lineConfigSchema } from './schemas.js';
import { SHOP } from './shop.js';
import type { CartLine, Lang, LineConfig, OrderItem, OrderMode, PizzaConfig, PizzaPart, SizeId } from './types.js';

export { LIMITS };

/** Biznes qoidasi buzilganda tashlanadigan xato. code — mijozga ko'rsatiladigan kalit */
export class DomainError extends Error {
  readonly code: string;

  constructor(code: string, detail?: string) {
    super(detail ?? code);
    this.name = 'DomainError';
    this.code = code;
  }
}

const TOPPING_ORDER = new Map(TOPPINGS.map((topping, i) => [topping.id, i]));
const byCatalogOrder = (a: string, b: string) => (TOPPING_ORDER.get(a) ?? 0) - (TOPPING_ORDER.get(b) ?? 0);

const roundPrice = (value: number) => Math.round(value / 1000) * 1000;

/**
 * Zod bilan tekshirilgan qatorni yagona ko'rinishga keltiradi:
 * takrorlar olib tashlanadi, masalliqlar katalog tartibida, sous to'ldiriladi.
 * Noto'g'ri bo'lsa ZodError yoki DomainError tashlaydi.
 */
export function normalizeLine(raw: unknown): LineConfig {
  const parsed = lineConfigSchema.parse(raw);
  if (parsed.kind === 'item') return { kind: 'item', itemId: parsed.itemId };

  const parts: PizzaPart[] = parsed.parts.map((part) => {
    const pizza = PIZZA_BY_ID[part.pizzaId]!;
    const extras = [...new Set(part.extras)].sort(byCatalogOrder);
    if (extras.length > LIMITS.maxExtras) throw new DomainError('too_many_extras');

    return {
      pizzaId: pizza.id,
      sauce: part.sauce ?? pizza.sauce,
      // Menyu o'zgarib, pitsa tarkibidan chiqib ketgan masalliq bo'lsa — jimgina tashlaymiz
      removed: [...new Set(part.removed)].filter((id) => pizza.toppings.includes(id)).sort(byCatalogOrder),
      extras,
    };
  });

  return { kind: 'pizza', size: parsed.size, crust: parsed.crust, parts };
}

/** Bir xil qatorlarni birlashtirish uchun kalit */
export function lineKey(config: LineConfig): string {
  return JSON.stringify(config);
}

/** Butun savatchani tekshiradi va bir xil qatorlarni birlashtiradi */
export function normalizeCart(rawLines: unknown): CartLine[] {
  if (!Array.isArray(rawLines) || rawLines.length === 0) throw new DomainError('empty_cart');
  if (rawLines.length > LIMITS.maxLines) throw new DomainError('too_many_lines');

  const merged = new Map<string, CartLine>();
  for (const raw of rawLines) {
    const { qty } = cartLineSchema.pick({ qty: true }).parse(raw);
    const config = normalizeLine((raw as { config: unknown }).config);
    const key = lineKey(config);
    const existing = merged.get(key);

    if (existing) existing.qty = Math.min(LIMITS.maxQty, existing.qty + qty);
    else merged.set(key, { config, qty });
  }

  return [...merged.values()];
}

/** To'xtatilgan (stop-list) mahsulot yoki masalliq bo'lsa xato beradi */
export function assertAvailable(config: LineConfig, stopped: ReadonlySet<string>): void {
  if (stopped.size === 0) return;

  if (config.kind === 'item') {
    if (stopped.has(config.itemId)) throw new DomainError('unavailable', config.itemId);
    return;
  }

  for (const part of config.parts) {
    if (stopped.has(part.pizzaId)) throw new DomainError('unavailable', part.pizzaId);
    for (const id of part.extras) {
      if (stopped.has(id)) throw new DomainError('unavailable', id);
    }
  }
}

export function isAvailable(config: LineConfig, stopped: ReadonlySet<string>): boolean {
  try {
    assertAvailable(config, stopped);
    return true;
  } catch {
    return false;
  }
}

/** Qo'shimcha masalliq narxi tanlangan o'lcham uchun */
export function toppingPrice(id: string, size: SizeId): number {
  return roundPrice(TOPPING_BY_ID[id]!.price * SIZE_BY_ID[size].mult);
}

/** Yarim-yarim pitsada bitta qo'shimchaning narxi (yarmi) */
export function halfToppingPrice(id: string, size: SizeId): number {
  return roundPrice(toppingPrice(id, size) / 2);
}

/**
 * Bitta dona narxi.
 * Yarim-yarim pitsa: ikkala yarmidan qimmatrog'i narxida, har bir yarmiga
 * qo'shilgan masalliq esa yarim narxda.
 */
export function unitPrice(config: LineConfig): number {
  if (config.kind === 'item') return ITEM_BY_ID[config.itemId]!.price;

  const halves = config.parts.length === 2;
  const base = Math.max(...config.parts.map((part) => PIZZA_BY_ID[part.pizzaId]!.prices[config.size]));
  const crust = CRUST_BY_ID[config.crust].price[config.size];

  let extras = 0;
  for (const part of config.parts) {
    for (const id of part.extras) {
      extras += halves ? halfToppingPrice(id, config.size) : toppingPrice(id, config.size);
    }
  }

  return base + crust + extras;
}

export interface CartSummary {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  pizzas: number;
  slicesEarned: number;
  slicesUsed: number;
  rewardReady: boolean;
  rewardValue: number;
  belowMinimum: boolean;
  freeDeliveryLeft: number;
}

interface SummaryOptions {
  mode?: OrderMode;
  useReward?: boolean;
  slices?: number;
}

/**
 * Savatcha jami.
 * slices — mijozdagi tilimlar soni. Yetarli bo'lsa va useReward yoqilgan
 * bo'lsa, savatdagi eng arzon pitsa bepul bo'ladi.
 */
export function summarize(
  lines: readonly CartLine[],
  { mode = 'delivery', useReward = false, slices = 0 }: SummaryOptions = {},
): CartSummary {
  let subtotal = 0;
  let pizzas = 0;
  let cheapestPizza: number | null = null;

  for (const { config, qty } of lines) {
    const unit = unitPrice(config);
    subtotal += unit * qty;

    if (config.kind === 'pizza') {
      pizzas += qty;
      cheapestPizza = cheapestPizza == null ? unit : Math.min(cheapestPizza, unit);
    }
  }

  const rewardReady = slices >= SHOP.loyalty.slicesForReward && cheapestPizza != null;
  const discount = useReward && rewardReady ? (cheapestPizza ?? 0) : 0;
  const afterDiscount = subtotal - discount;

  const { fee, freeFrom, minOrder } = SHOP.delivery;
  const isDelivery = mode === 'delivery';
  const deliveryFee = isDelivery && lines.length > 0 && afterDiscount < freeFrom ? fee : 0;

  return {
    subtotal,
    discount,
    deliveryFee,
    total: afterDiscount + deliveryFee,
    pizzas,
    // Bepul pitsa tilim hisobiga kirmaydi
    slicesEarned: Math.max(0, pizzas - (discount > 0 ? 1 : 0)),
    slicesUsed: discount > 0 ? SHOP.loyalty.slicesForReward : 0,
    rewardReady,
    rewardValue: rewardReady ? (cheapestPizza ?? 0) : 0,
    belowMinimum: isDelivery && subtotal < minOrder,
    freeDeliveryLeft: isDelivery ? Math.max(0, freeFrom - afterDiscount) : 0,
  };
}

export interface ToppingEntry {
  id: string;
  double: boolean;
}

/** Pitsaning bir qismidagi yakuniy masalliqlar (chizish uchun) */
export function partToppings(part: PizzaPart): ToppingEntry[] {
  const pizza = PIZZA_BY_ID[part.pizzaId]!;
  const base = pizza.toppings.filter((id) => !part.removed.includes(id));
  const result = base.map((id) => ({ id, double: part.extras.includes(id) }));

  for (const id of part.extras) {
    if (!base.includes(id)) result.push({ id, double: false });
  }

  return result;
}

/** Menyudagi pitsa uchun standart savatcha qatori */
export function defaultPizzaConfig(pizzaId: string, size: SizeId = 'M'): PizzaConfig {
  const pizza = PIZZA_BY_ID[pizzaId]!;
  return {
    kind: 'pizza',
    size,
    crust: 'classic',
    parts: [{ pizzaId, sauce: pizza.sauce, removed: [], extras: [] }],
  };
}

const WORDS: Record<Lang, { cm: string; halves: string; sauce: string }> = {
  uz: { cm: 'sm', halves: 'yarim-yarim', sauce: 'sous' },
  ru: { cm: 'см', halves: 'половинки', sauce: 'соус' },
};

function partChanges(part: PizzaPart, lang: Lang): string[] {
  const pizza = PIZZA_BY_ID[part.pizzaId]!;
  const changes: string[] = [];

  if (part.sauce !== pizza.sauce) {
    changes.push(`${tr(SAUCE_BY_ID[part.sauce].name, lang).toLowerCase()} ${WORDS[lang].sauce}`);
  }
  for (const id of part.removed) changes.push(`−${tr(TOPPING_BY_ID[id]!.name, lang).toLowerCase()}`);
  for (const id of part.extras) changes.push(`+${tr(TOPPING_BY_ID[id]!.name, lang).toLowerCase()}`);

  return changes;
}

export interface LineDescription {
  title: string;
  details: string[];
}

/**
 * Qatorni odam o'qiydigan ko'rinishga keltiradi:
 * { title: 'Pepperoni', details: ['30 sm', 'yupqa', '−piyoz', '+halapenyo'] }
 */
export function describeLine(config: LineConfig, lang: Lang = 'uz'): LineDescription {
  if (config.kind === 'item') {
    return { title: tr(ITEM_BY_ID[config.itemId]!.name, lang), details: [] };
  }

  const words = WORDS[lang];
  const details = [`${SIZE_BY_ID[config.size].cm} ${words.cm}`];

  if (config.crust !== 'classic') details.push(tr(CRUST_BY_ID[config.crust].name, lang).toLowerCase());

  if (config.parts.length === 1) {
    const [part] = config.parts as [PizzaPart];
    details.push(...partChanges(part, lang));
    return { title: tr(PIZZA_BY_ID[part.pizzaId]!.name, lang), details };
  }

  details.unshift(words.halves);
  const names = config.parts.map((part) => tr(PIZZA_BY_ID[part.pizzaId]!.name, lang));

  config.parts.forEach((part, i) => {
    const changes = partChanges(part, lang);
    if (changes.length) details.push(`${names[i]}: ${changes.join(', ')}`);
  });

  return { title: names.join(' / '), details };
}

export function isCustom(config: LineConfig): boolean {
  return config.kind === 'pizza' && config.parts.some((part) => part.pizzaId === CUSTOM_PIZZA_ID);
}

export interface BillMember {
  id: number;
  name: string;
  subtotal: number;
}

export interface BillShare {
  id: number;
  name: string;
  amount: number;
}

/**
 * Davra hisobini bo'lish: har kim o'z pitsalari + yetkazish narxining teng ulushi.
 * Tilim kartasi chegirmasi va yaxlitlashdan qolgan qoldiq host hisobiga yoziladi.
 */
export function splitBill(
  members: readonly BillMember[],
  { deliveryFee = 0, discount = 0, hostId }: { deliveryFee?: number; discount?: number; hostId?: number } = {},
): BillShare[] {
  const payers = members.filter((member) => member.subtotal > 0);
  if (payers.length === 0) return [];

  const share = Math.floor(deliveryFee / payers.length / 100) * 100;
  const remainder = deliveryFee - share * payers.length;
  const result = payers.map((member) => ({ id: member.id, name: member.name, amount: member.subtotal + share }));

  const host = result.find((entry) => entry.id === hostId) ?? result[0]!;
  host.amount = Math.max(0, host.amount + remainder - discount);
  return result;
}

/** Davra buyurtmasidagi qatorlardan har bir ishtirokchining summasi */
export function membersFromItems(items: readonly OrderItem[]): BillMember[] {
  const members = new Map<number, BillMember>();

  for (const item of items) {
    if (!item.by) continue;
    const entry = members.get(item.by.id) ?? { id: item.by.id, name: item.by.name, subtotal: 0 };
    entry.subtotal += item.unit * item.qty;
    members.set(item.by.id, entry);
  }

  return [...members.values()];
}
