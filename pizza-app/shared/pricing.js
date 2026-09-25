// Narx hisoblash va savatcha qatorlarini tekshirish.
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
import { SHOP } from './shop.js';

export const LIMITS = {
  maxQty: 20,
  maxLines: 30,
  maxExtras: 8,
};

export class OrderError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'OrderError';
    this.code = code;
  }
}

const TOPPING_ORDER = Object.fromEntries(TOPPINGS.map((topping, i) => [topping.id, i]));
const byCatalogOrder = (a, b) => TOPPING_ORDER[a] - TOPPING_ORDER[b];

const roundPrice = (value) => Math.round(value / 1000) * 1000;

function idList(value) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new OrderError('bad_line');
  return [...new Set(value.map(String))];
}

function normalizePart(raw) {
  const pizza = PIZZA_BY_ID[raw?.pizzaId];
  if (!pizza) throw new OrderError('unknown_pizza');

  const sauce = raw.sauce ?? pizza.sauce;
  if (!SAUCE_BY_ID[sauce]) throw new OrderError('unknown_sauce');

  // Menyu o'zgarib, pitsa tarkibidan chiqib ketgan masalliq bo'lsa — jimgina tashlab yuboramiz
  const removed = idList(raw.removed)
    .filter((id) => pizza.toppings.includes(id))
    .sort(byCatalogOrder);

  const extras = idList(raw.extras);
  if (extras.length > LIMITS.maxExtras) throw new OrderError('too_many_extras');
  for (const id of extras) {
    if (!TOPPING_BY_ID[id]) throw new OrderError('unknown_topping');
  }
  extras.sort(byCatalogOrder);

  return { pizzaId: pizza.id, sauce, removed, extras };
}

/**
 * Savatcha qatorini tekshiradi va bir xil ko'rinishga keltiradi.
 * Noto'g'ri bo'lsa OrderError tashlaydi.
 */
export function normalizeLine(raw) {
  if (!raw || typeof raw !== 'object') throw new OrderError('bad_line');

  if (raw.kind === 'item') {
    if (!ITEM_BY_ID[raw.itemId]) throw new OrderError('unknown_item');
    return { kind: 'item', itemId: raw.itemId };
  }

  if (raw.kind === 'pizza') {
    if (!SIZE_BY_ID[raw.size]) throw new OrderError('unknown_size');

    const crust = raw.crust ?? 'classic';
    if (!CRUST_BY_ID[crust]) throw new OrderError('unknown_crust');

    if (!Array.isArray(raw.parts) || raw.parts.length < 1 || raw.parts.length > 2) {
      throw new OrderError('bad_line');
    }

    return { kind: 'pizza', size: raw.size, crust, parts: raw.parts.map(normalizePart) };
  }

  throw new OrderError('bad_line');
}

/** Bir xil qatorlarni birlashtirish uchun kalit */
export function lineKey(config) {
  return JSON.stringify(config);
}

function normalizeQty(value) {
  const qty = Number(value);
  if (!Number.isInteger(qty) || qty < 1 || qty > LIMITS.maxQty) throw new OrderError('bad_qty');
  return qty;
}

/**
 * Butun savatchani tekshiradi: [{ config, qty }] → bir xil qatorlar birlashtirilgan ro'yxat
 */
export function normalizeCart(rawLines) {
  if (!Array.isArray(rawLines) || rawLines.length === 0) throw new OrderError('empty_cart');
  if (rawLines.length > LIMITS.maxLines) throw new OrderError('too_many_lines');

  const merged = new Map();

  for (const raw of rawLines) {
    const config = normalizeLine(raw?.config);
    const qty = normalizeQty(raw?.qty);
    const key = lineKey(config);
    const existing = merged.get(key);

    if (existing) {
      existing.qty = Math.min(LIMITS.maxQty, existing.qty + qty);
    } else {
      merged.set(key, { config, qty });
    }
  }

  return [...merged.values()];
}

/** To'xtatilgan (stop-list) mahsulot yoki masalliq bo'lsa xato beradi */
export function assertAvailable(config, stopped) {
  if (!stopped || stopped.size === 0) return;

  if (config.kind === 'item') {
    if (stopped.has(config.itemId)) throw new OrderError('unavailable', config.itemId);
    return;
  }

  for (const part of config.parts) {
    if (stopped.has(part.pizzaId)) throw new OrderError('unavailable', part.pizzaId);
    for (const id of part.extras) {
      if (stopped.has(id)) throw new OrderError('unavailable', id);
    }
  }
}

/** Qo'shimcha masalliq narxi tanlangan o'lcham uchun */
export function toppingPrice(id, size) {
  return roundPrice(TOPPING_BY_ID[id].price * SIZE_BY_ID[size].mult);
}

/**
 * Bitta dona narxi.
 * Yarim-yarim pitsa: ikkala yarmidan qimmatrog'i narxida, har bir yarmiga
 * qo'shilgan masalliq esa yarim narxda.
 */
export function unitPrice(config) {
  if (config.kind === 'item') return ITEM_BY_ID[config.itemId].price;

  const halves = config.parts.length === 2;
  const base = Math.max(...config.parts.map((part) => PIZZA_BY_ID[part.pizzaId].prices[config.size]));
  const crust = CRUST_BY_ID[config.crust].price[config.size];

  let extras = 0;
  for (const part of config.parts) {
    for (const id of part.extras) {
      const full = toppingPrice(id, config.size);
      extras += halves ? roundPrice(full / 2) : full;
    }
  }

  return base + crust + extras;
}

/**
 * Savatcha jami.
 * slices — mijozdagi tilimlar soni. Yetarli bo'lsa va useReward yoqilgan
 * bo'lsa, savatdagi eng arzon pitsa bepul bo'ladi.
 */
export function summarize(lines, { mode = 'delivery', useReward = false, slices = 0 } = {}) {
  let subtotal = 0;
  let pizzas = 0;
  let cheapestPizza = null;

  for (const { config, qty } of lines) {
    const unit = unitPrice(config);
    subtotal += unit * qty;

    if (config.kind === 'pizza') {
      pizzas += qty;
      cheapestPizza = cheapestPizza == null ? unit : Math.min(cheapestPizza, unit);
    }
  }

  const rewardReady = slices >= SHOP.loyalty.slicesForReward && cheapestPizza != null;
  const discount = useReward && rewardReady ? cheapestPizza : 0;
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
    rewardValue: rewardReady ? cheapestPizza : 0,
    belowMinimum: isDelivery && subtotal < minOrder,
    freeDeliveryLeft: isDelivery ? Math.max(0, freeFrom - afterDiscount) : 0,
  };
}

/** Pitsaning bir qismidagi yakuniy masalliqlar (chizish uchun) */
export function partToppings(part) {
  const pizza = PIZZA_BY_ID[part.pizzaId];
  const base = pizza.toppings.filter((id) => !part.removed.includes(id));
  const result = base.map((id) => ({ id, double: part.extras.includes(id) }));

  for (const id of part.extras) {
    if (!base.includes(id)) result.push({ id, double: false });
  }

  return result;
}

/** Menyudagi pitsa uchun standart savatcha qatori */
export function defaultPizzaConfig(pizzaId, size = 'M') {
  const pizza = PIZZA_BY_ID[pizzaId];
  return {
    kind: 'pizza',
    size,
    crust: 'classic',
    parts: [{ pizzaId, sauce: pizza.sauce, removed: [], extras: [] }],
  };
}

const WORDS = {
  uz: { cm: 'sm', halves: 'yarim-yarim', sauce: 'sous' },
  ru: { cm: 'см', halves: 'половинки', sauce: 'соус' },
};

function partChanges(part, lang) {
  const pizza = PIZZA_BY_ID[part.pizzaId];
  const words = WORDS[lang] ?? WORDS.uz;
  const changes = [];

  if (part.sauce !== pizza.sauce) {
    changes.push(`${tr(SAUCE_BY_ID[part.sauce].name, lang).toLowerCase()} ${words.sauce}`);
  }
  for (const id of part.removed) changes.push(`−${tr(TOPPING_BY_ID[id].name, lang).toLowerCase()}`);
  for (const id of part.extras) changes.push(`+${tr(TOPPING_BY_ID[id].name, lang).toLowerCase()}`);

  return changes;
}

/**
 * Qatorni odam o'qiydigan ko'rinishga keltiradi:
 * { title: 'Pepperoni', details: ['30 sm', 'yupqa', '−piyoz', '+halapenyo'] }
 */
export function describeLine(config, lang = 'uz') {
  if (config.kind === 'item') {
    return { title: tr(ITEM_BY_ID[config.itemId].name, lang), details: [] };
  }

  const words = WORDS[lang] ?? WORDS.uz;
  const size = SIZE_BY_ID[config.size];
  const details = [`${size.cm} ${words.cm}`];

  if (config.crust !== 'classic') details.push(tr(CRUST_BY_ID[config.crust].name, lang).toLowerCase());

  if (config.parts.length === 1) {
    const [part] = config.parts;
    details.push(...partChanges(part, lang));
    return { title: tr(PIZZA_BY_ID[part.pizzaId].name, lang), details };
  }

  details.unshift(words.halves);
  const names = config.parts.map((part) => tr(PIZZA_BY_ID[part.pizzaId].name, lang));

  config.parts.forEach((part, i) => {
    const changes = partChanges(part, lang);
    if (changes.length) details.push(`${names[i]}: ${changes.join(', ')}`);
  });

  return { title: names.join(' / '), details };
}

export function isCustom(config) {
  return config.kind === 'pizza' && config.parts.some((part) => part.pizzaId === CUSTOM_PIZZA_ID);
}

/**
 * Davra hisobini bo'lish: har kim o'z pitsalari + yetkazish narxining teng ulushi.
 * Tilim kartasi chegirmasi va yaxlitlashdan qolgan qoldiq host hisobiga yoziladi.
 * members: [{ id, name, subtotal }]
 */
export function splitBill(members, { deliveryFee = 0, discount = 0, hostId } = {}) {
  const payers = members.filter((member) => member.subtotal > 0);
  if (payers.length === 0) return [];

  const share = Math.floor(deliveryFee / payers.length / 100) * 100;
  const remainder = deliveryFee - share * payers.length;
  const result = payers.map((member) => ({
    id: member.id,
    name: member.name,
    amount: member.subtotal + share,
  }));

  const host = result.find((entry) => entry.id === hostId) ?? result[0];
  host.amount = Math.max(0, host.amount + remainder - discount);
  return result;
}

/** Davra buyurtmasidagi qatorlardan har bir ishtirokchining summasi */
export function membersFromItems(items) {
  const members = new Map();

  for (const item of items) {
    if (!item.by) continue;
    const entry = members.get(item.by.id) ?? { id: item.by.id, name: item.by.name, subtotal: 0 };
    entry.subtotal += item.unit * item.qty;
    members.set(item.by.id, entry);
  }

  return [...members.values()];
}
