import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { defaultPizzaConfig } from '../shared/pricing.js';
import type { OrderDto } from '../shared/types.js';
import { caller, createTestApp, devId, type TestApp } from './helpers.js';

let app: TestApp;
let call: ReturnType<typeof caller>;

before(async () => {
  app = await createTestApp({ ALLOW_DEV_USER: 'true' });
  call = caller(app);
});

after(async () => {
  await app.shutdown();
});

const address = { text: 'Chilonzor 9, 12-uy', entrance: '3', floor: '4', apartment: '15', lat: 41.2856, lng: 69.2034 };
const pickup = (items: unknown[], extra: Record<string, unknown> = {}) => ({
  items,
  mode: 'pickup',
  phone: '901234567',
  payment: 'cash',
  ...extra,
});

describe('avtorizatsiya', () => {
  it('health ochiq, qolgan yo‘llar Telegram imzosisiz yopiq', async () => {
    const strict = await createTestApp({ ALLOW_DEV_USER: 'false', BOT_TOKEN: '1:TEST' });
    try {
      assert.equal((await fetch(`${strict.baseUrl}/health`)).status, 200);
      const denied = await fetch(`${strict.baseUrl}/bootstrap`, { headers: { 'x-dev-user': '1' } });
      assert.equal(denied.status, 401);
      assert.deepEqual(await denied.json(), { ok: false, error: 'unauthorized' });
    } finally {
      await strict.shutdown();
    }
  });
});

describe('buyurtma', () => {
  it('bootstrap foydalanuvchini yaratadi', async () => {
    const { status, body } = await call(1, 'GET', '/bootstrap');
    assert.equal(status, 200);
    assert.equal(body.user.firstName, 'Aziz');
    assert.equal(body.open, true);
    assert.deepEqual(body.activeOrders, []);
  });

  it('narxni server qayta hisoblaydi va buyurtma yaratadi', async () => {
    const { status, body } = await call(1, 'POST', '/orders', {
      items: [
        { config: defaultPizzaConfig('pepperoni', 'M'), qty: 1, unit: 1 }, // unit ga ishonilmaydi
        { config: { kind: 'item', itemId: 'cola' }, qty: 2 },
      ],
      mode: 'delivery',
      address,
      phone: '90 123 45 67',
      payment: 'cash',
      comment: 'Domofon ishlamaydi',
    });

    assert.equal(status, 201, JSON.stringify(body));
    const order = body.order as OrderDto & { adminMessageId?: number };
    assert.equal(order.id, 1001, 'raqamlar migratsiyadagi ketma-ketlikdan boshlanadi');
    assert.equal(order.status, 'new');
    assert.equal(order.subtotal, 89000 + 24000);
    assert.equal(order.deliveryFee, 15000);
    assert.equal(order.total, 128000);
    assert.equal(order.phone, '+998901234567');
    assert.ok(order.distanceKm! > 0 && order.distanceKm! < 15);
    assert.ok(order.etaAt! > app.clock.now);
    assert.equal(order.adminMessageId, undefined, 'xodimlar maydoni mijozga chiqmasin');
  });

  it('Zod validatsiyasi: manzil, telefon, noto‘g‘ri tur, uzoq manzil', async () => {
    const items = [{ config: defaultPizzaConfig('pepperoni', 'M'), qty: 1 }];
    const base = { items, mode: 'delivery', address, phone: '901234567', payment: 'cash' };

    assert.equal((await call(1, 'POST', '/orders', { ...base, address: undefined })).body.error, 'address_required');
    assert.equal((await call(1, 'POST', '/orders', { ...base, phone: '12' })).body.error, 'phone_required');

    const invalid = await call(1, 'POST', '/orders', { ...base, payment: 'bitcoin' });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error, 'validation');
    assert.equal(invalid.body.issues[0].path, 'payment');

    assert.equal(
      (await call(1, 'POST', '/orders', { ...base, address: { ...address, lat: 40.1, lng: 65.3 } })).body.error,
      'too_far',
    );
    assert.equal((await call(1, 'POST', '/orders', { ...base, payment: 'online' })).body.error, 'online_disabled');
    assert.equal((await call(1, 'GET', '/orders/abc')).body.error, 'validation');
  });

  it('ish vaqtidan tashqarida buyurtma qabul qilinmaydi', async () => {
    const saved = app.clock.now;
    app.clock.now = Date.UTC(2026, 8, 25, 0, 0); // 05:00
    const { body } = await call(1, 'POST', '/orders', pickup([{ config: { kind: 'item', itemId: 'cola' }, qty: 1 }]));
    app.clock.now = saved;
    assert.equal(body.error, 'closed');
  });

  it('boshqa odamning buyurtmasini ko‘rib bo‘lmaydi', async () => {
    assert.equal((await call(2, 'GET', '/orders/1001')).status, 404);
    assert.equal((await call(1, 'GET', '/orders/1001')).status, 200);
  });

  it('oshxona holatlari ketma-ket o‘tadi va tilim qo‘shiladi', async () => {
    const { orders, users } = app.services;
    await assert.rejects(orders.setStatus(1001, 'done'), /bad_transition/);

    await orders.setStatus(1001, 'accepted');
    await orders.setStatus(1001, 'baking');
    const delivering = await orders.setStatus(1001, 'delivering');
    assert.equal(delivering.status, 'delivering');

    await orders.setStatus(1001, 'done');
    assert.equal((await users.get(devId(1)))?.slices, 1);

    // Tugagan buyurtmani mijoz bekor qila olmaydi
    assert.equal((await call(1, 'POST', '/orders/1001/cancel')).body.error, 'cannot_cancel');
  });

  it('tilim kartasi: 8 tilim — bepul pitsa, bekor qilinsa qaytadi', async () => {
    await app.services.users.addSlices(devId(1), 7); // jami 8

    const { body } = await call(
      1,
      'POST',
      '/orders',
      pickup([{ config: defaultPizzaConfig('margarita', 'S'), qty: 2 }], { useReward: true }),
    );
    assert.equal(body.order.discount, 59000);
    assert.equal(body.order.total, 59000);
    assert.equal((await app.services.users.get(devId(1)))?.slices, 0);

    const cancelled = await call(1, 'POST', `/orders/${body.order.id}/cancel`);
    assert.equal(cancelled.body.order.status, 'cancelled');
    assert.equal((await app.services.users.get(devId(1)))?.slices, 8);
  });

  it('stop-listdagi pitsani buyurtma qilib bo‘lmaydi', async () => {
    await app.services.stoplist.toggle('qazi');
    const { body } = await call(1, 'POST', '/orders', pickup([{ config: defaultPizzaConfig('qazi', 'M'), qty: 1 }]));
    await app.services.stoplist.toggle('qazi');
    assert.equal(body.error, 'unavailable');
  });
});

describe('Davra (birgalikdagi buyurtma)', () => {
  let code: string;

  it('host davra ochadi, do‘st qo‘shiladi', async () => {
    const created = await call(3, 'POST', '/groups');
    code = created.body.group.code;
    assert.match(code, /^[A-Z0-9]{6}$/);
    assert.equal(created.body.group.isHost, true);

    // Qayta bossa — o'sha davra qaytadi
    assert.equal((await call(3, 'POST', '/groups')).body.group.code, code);

    const outsider = await call(4, 'POST', `/groups/${code}/items`, { config: defaultPizzaConfig('pepperoni', 'M') });
    assert.equal(outsider.status, 403);

    const joined = await call(4, 'POST', `/groups/${code.toLowerCase()}/join`);
    assert.equal(joined.body.group.members.length, 2);
    assert.equal(joined.body.group.isHost, false);
  });

  it('har kim o‘z pitsasini qo‘shadi, boshqanikini o‘zgartira olmaydi', async () => {
    await call(3, 'POST', `/groups/${code}/items`, { config: defaultPizzaConfig('qazi', 'L'), qty: 1 });
    const added = await call(4, 'POST', `/groups/${code}/items`, { config: defaultPizzaConfig('diablo', 'M'), qty: 2 });
    const group = added.body.group;
    assert.equal(group.itemsCount, 3);
    assert.equal(group.subtotal, 129000 + 2 * 95000);

    const hostItem = group.members.find((m: { isHost: boolean }) => m.isHost).items[0];
    const denied = await call(4, 'PATCH', `/groups/${code}/items/${hostItem.id}`, { qty: 3 });
    assert.equal(denied.status, 403);
  });

  it('faqat host rasmiylashtiradi, buyurtmada kim nima qo‘shgani saqlanadi', async () => {
    const payload = { groupCode: code, mode: 'pickup', phone: '901112233', payment: 'cash' };
    assert.equal((await call(4, 'POST', '/orders', payload)).status, 403);

    const { body } = await call(3, 'POST', '/orders', payload);
    assert.equal(body.order.groupCode, code);
    assert.equal(body.order.total, 129000 + 190000);
    assert.deepEqual(
      body.order.items.map((item: { by: { name: string } }) => item.by.name),
      ['Jasur Test', 'Nilufar Test'],
    );

    // Davradosh buyurtmani ko'ra oladi, lekin hostning telefonini emas
    const asMember = await call(4, 'GET', `/orders/${body.order.id}`);
    assert.equal(asMember.status, 200);
    assert.equal(asMember.body.order.phone, '');

    const view = await call(4, 'GET', `/groups/${code}`);
    assert.equal(view.body.group.status, 'ordered');
    assert.equal(view.body.group.orderId, body.order.id);

    // Ikkinchi marta buyurtma berib bo'lmaydi
    assert.equal((await call(3, 'POST', '/orders', payload)).body.error, 'group_closed');
    const late = await call(4, 'POST', `/groups/${code}/items`, { config: { kind: 'item', itemId: 'cola' } });
    assert.equal(late.body.error, 'group_closed');
  });

  it('muddati o‘tgan davraga qo‘shilib bo‘lmaydi', async () => {
    const created = await call(5, 'POST', '/groups');
    app.clock.now += 4 * 3_600_000;
    const joined = await call(6, 'POST', `/groups/${created.body.group.code}/join`);
    app.clock.now -= 4 * 3_600_000;
    assert.equal(joined.body.error, 'group_expired');
  });
});

describe('jonli yangilanishlar (SSE)', () => {
  it('holat o‘zgarishi mijozga darhol yetib boradi', async () => {
    const { body } = await call(1, 'POST', '/orders', pickup([{ config: { kind: 'item', itemId: 'cola' }, qty: 1 }]));
    const orderId = body.order.id as number;

    const controller = new AbortController();
    const response = await fetch(`${app.baseUrl}/stream?dev=1`, { signal: controller.signal });
    assert.equal(response.headers.get('content-type'), 'text/event-stream; charset=utf-8');

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let advanced = false;

    while (!buffer.includes('"status":"accepted"')) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value);
      if (!advanced && buffer.includes('event: hello')) {
        advanced = true;
        await app.services.orders.setStatus(orderId, 'accepted');
      }
    }
    controller.abort();

    assert.match(buffer, /event: order\ndata: \{"id":\d+.*"status":"accepted"/);
  });
});
