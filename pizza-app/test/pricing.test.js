import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  OrderError,
  assertAvailable,
  defaultPizzaConfig,
  describeLine,
  normalizeCart,
  normalizeLine,
  partToppings,
  splitBill,
  summarize,
  unitPrice,
} from '../shared/pricing.js';
import { SHOP, isOpenAt, estimateMinutes } from '../shared/shop.js';

const pepperoniM = defaultPizzaConfig('pepperoni', 'M');

describe('unitPrice', () => {
  it('menyudagi pitsa narxi o‘lcham bo‘yicha', () => {
    assert.equal(unitPrice(defaultPizzaConfig('pepperoni', 'S')), 69000);
    assert.equal(unitPrice(pepperoniM), 89000);
    assert.equal(unitPrice(defaultPizzaConfig('pepperoni', 'L')), 112000);
  });

  it('qo‘shimcha masalliq o‘lchamga ko‘paytiriladi va 1000 ga yaxlitlanadi', () => {
    const config = normalizeLine({
      ...pepperoniM,
      parts: [{ pizzaId: 'pepperoni', extras: ['jalapeno', 'olive'] }],
    });
    // jalapeno 7000×1.3 = 9100 → 9000; olive 8000×1.3 = 10400 → 10000
    assert.equal(unitPrice(config), 89000 + 9000 + 10000);
  });

  it('olib tashlangan masalliq narxni kamaytirmaydi, bortik qo‘shadi', () => {
    const config = normalizeLine({
      kind: 'pizza',
      size: 'L',
      crust: 'cheese',
      parts: [{ pizzaId: 'qazi', removed: ['onion'] }],
    });
    assert.equal(unitPrice(config), 129000 + 19000);
  });

  it('yarim-yarim: qimmatroq yarmi narxi + masalliqlar yarim narxda', () => {
    const config = normalizeLine({
      kind: 'pizza',
      size: 'M',
      parts: [
        { pizzaId: 'margarita', extras: ['mushroom'] }, // 8000×1.3=10400→10000, yarmi 5000
        { pizzaId: 'qazi' },
      ],
    });
    assert.equal(unitPrice(config), 99000 + 5000);
  });

  it('ichimlik va gazaklar qat’iy narxda', () => {
    assert.equal(unitPrice({ kind: 'item', itemId: 'cola' }), 12000);
  });
});

describe('normalizeLine', () => {
  it('noma’lum qiymatlarni rad etadi', () => {
    assert.throws(() => normalizeLine({ kind: 'item', itemId: 'nope' }), OrderError);
    assert.throws(() => normalizeLine({ ...pepperoniM, size: 'XL' }), /unknown_size/);
    assert.throws(
      () => normalizeLine({ ...pepperoniM, parts: [{ pizzaId: 'pepperoni', extras: ['gold'] }] }),
      /unknown_topping/,
    );
    assert.throws(() => normalizeLine({ ...pepperoniM, parts: [] }), /bad_line/);
    assert.throws(
      () => normalizeLine({ ...pepperoniM, parts: [pepperoniM.parts[0], pepperoniM.parts[0], pepperoniM.parts[0]] }),
      /bad_line/,
    );
  });

  it('masalliqlarni katalog tartibida saralaydi va takrorlarni olib tashlaydi', () => {
    const config = normalizeLine({
      ...pepperoniM,
      parts: [{ pizzaId: 'pepperoni', extras: ['olive', 'chicken', 'olive'] }],
    });
    assert.deepEqual(config.parts[0].extras, ['chicken', 'olive']);
  });

  it('pitsada yo‘q masalliqni “olib tashlash”ni e’tiborsiz qoldiradi', () => {
    const config = normalizeLine({ ...pepperoniM, parts: [{ pizzaId: 'pepperoni', removed: ['onion'] }] });
    assert.deepEqual(config.parts[0].removed, []);
  });
});

describe('normalizeCart', () => {
  it('bir xil qatorlarni birlashtiradi', () => {
    const lines = normalizeCart([
      { config: pepperoniM, qty: 1 },
      { config: { ...pepperoniM, parts: [{ pizzaId: 'pepperoni' }] }, qty: 2 },
      { config: { kind: 'item', itemId: 'cola' }, qty: 1 },
    ]);
    assert.equal(lines.length, 2);
    assert.equal(lines[0].qty, 3);
  });

  it('bo‘sh savat va noto‘g‘ri sonni rad etadi', () => {
    assert.throws(() => normalizeCart([]), /empty_cart/);
    assert.throws(() => normalizeCart([{ config: pepperoniM, qty: 0 }]), /bad_qty/);
    assert.throws(() => normalizeCart([{ config: pepperoniM, qty: 1.5 }]), /bad_qty/);
  });
});

describe('summarize', () => {
  const lines = (qty) => normalizeCart([{ config: pepperoniM, qty }]);

  it('kichik buyurtmaga yetkazish haqi qo‘shiladi', () => {
    const summary = summarize(lines(1), { mode: 'delivery' });
    assert.equal(summary.deliveryFee, SHOP.delivery.fee);
    assert.equal(summary.total, 89000 + SHOP.delivery.fee);
    assert.equal(summary.freeDeliveryLeft, SHOP.delivery.freeFrom - 89000);
  });

  it('chegaradan oshsa yetkazish bepul', () => {
    const summary = summarize(lines(2), { mode: 'delivery' });
    assert.equal(summary.deliveryFee, 0);
    assert.equal(summary.total, 178000);
  });

  it('olib ketishda yetkazish haqi va minimal summa yo‘q', () => {
    const summary = summarize(normalizeCart([{ config: { kind: 'item', itemId: 'cola' }, qty: 1 }]), {
      mode: 'pickup',
    });
    assert.equal(summary.deliveryFee, 0);
    assert.equal(summary.belowMinimum, false);
  });

  it('tilim kartasi eng arzon pitsani bepul qiladi', () => {
    const cart = normalizeCart([
      { config: pepperoniM, qty: 1 },
      { config: defaultPizzaConfig('margarita', 'S'), qty: 2 },
    ]);
    const without = summarize(cart, { useReward: true, slices: 7 });
    assert.equal(without.discount, 0);
    assert.equal(without.rewardReady, false);

    const withReward = summarize(cart, { useReward: true, slices: 8 });
    assert.equal(withReward.discount, 59000);
    assert.equal(withReward.slicesUsed, 8);
    assert.equal(withReward.slicesEarned, 2);
  });
});

describe('describeLine', () => {
  it('o‘zbekcha va ruscha tavsif', () => {
    const config = normalizeLine({
      kind: 'pizza',
      size: 'M',
      crust: 'thin',
      parts: [{ pizzaId: 'pepperoni', extras: ['jalapeno'] }],
    });
    assert.deepEqual(describeLine(config, 'uz'), {
      title: 'Pepperoni',
      details: ['30 sm', 'yupqa', '+halapenyo'],
    });
    assert.equal(describeLine(config, 'ru').details[0], '30 см');
  });

  it('yarim-yarim nomi', () => {
    const config = normalizeLine({
      kind: 'pizza',
      size: 'L',
      parts: [{ pizzaId: 'margarita' }, { pizzaId: 'qazi', removed: ['onion'] }],
    });
    const { title, details } = describeLine(config, 'uz');
    assert.equal(title, 'Margarita / Qazili');
    assert.deepEqual(details, ['yarim-yarim', '35 sm', 'Qazili: −qizil piyoz']);
  });
});

describe('boshqa yordamchilar', () => {
  it('partToppings ikki barobar masalliqni belgilaydi', () => {
    const toppings = partToppings({ pizzaId: 'pepperoni', removed: [], extras: ['pepperoni', 'olive'] });
    assert.deepEqual(toppings, [
      { id: 'pepperoni', double: true },
      { id: 'olive', double: false },
    ]);
  });

  it('stop-listdagi mahsulotni bloklaydi', () => {
    assert.throws(() => assertAvailable(pepperoniM, new Set(['pepperoni'])), { code: 'unavailable' });
    assert.doesNotThrow(() => assertAvailable(pepperoniM, new Set(['cola'])));
  });

  it('splitBill yetkazishni teng bo‘ladi, chegirmani hostga yozadi', () => {
    const shares = splitBill(
      [
        { id: 1, name: 'Host', subtotal: 89000 },
        { id: 2, name: 'Do‘st', subtotal: 69000 },
        { id: 3, name: 'Kuzatuvchi', subtotal: 0 },
      ],
      { deliveryFee: 15000, discount: 10000, hostId: 1 },
    );
    assert.deepEqual(shares, [
      { id: 1, name: 'Host', amount: 89000 + 7500 - 10000 },
      { id: 2, name: 'Do‘st', amount: 69000 + 7500 },
    ]);
    const total = shares.reduce((sum, s) => sum + s.amount, 0);
    assert.equal(total, 89000 + 69000 + 15000 - 10000);
  });

  it('ish vaqti tunda ham to‘g‘ri hisoblanadi (10:00 – 03:00)', () => {
    // Toshkent = UTC+5
    assert.equal(isOpenAt(new Date(Date.UTC(2026, 8, 25, 9, 0))), true); // 14:00
    assert.equal(isOpenAt(new Date(Date.UTC(2026, 8, 25, 20, 30))), true); // 01:30
    assert.equal(isOpenAt(new Date(Date.UTC(2026, 8, 25, 0, 0))), false); // 05:00
  });

  it('yetkazish vaqti masofaga bog‘liq', () => {
    assert.ok(estimateMinutes('delivery', 10) > estimateMinutes('delivery', 1));
    assert.equal(estimateMinutes('pickup', 10), SHOP.delivery.prepMinutes);
  });
});
