import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { createServer } from '../server/app.js';
import { defaultPizzaConfig } from '../shared/pricing.js';

// Toshkent vaqti bilan 14:00 — pitsaxona ochiq
let clock = Date.UTC(2026, 8, 25, 9, 0);
const now = () => clock;

const silent = { info() {}, warn() {}, error() {} };

let server;
let base;
let services;

before(async () => {
  const instance = await createServer({
    config: {
      port: 0,
      botToken: '',
      adminChatId: '',
      adminIds: [],
      publicUrl: '',
      useWebhook: false,
      miniAppShortName: '',
      paymentProviderToken: '',
      databaseFile: ':memory:',
      allowDevUser: true,
      ignoreHours: false,
      rateLimit: false,
      distDir: '/nonexistent',
    },
    now,
    log: silent,
  });
  services = instance.services;
  server = instance.app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
  server.closeInstance = instance.close;
});

after(async () => {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
  await server.closeInstance();
});

async function call(userNo, method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-dev-user': String(userNo) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json() };
}

const address = { text: 'Chilonzor 9, 12-uy', entrance: '3', floor: '4', apartment: '15', lat: 41.2856, lng: 69.2034 };

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

    assert.equal(status, 200, JSON.stringify(body));
    const { order } = body;
    assert.equal(order.id, 1001);
    assert.equal(order.status, 'new');
    assert.equal(order.subtotal, 89000 + 24000);
    assert.equal(order.deliveryFee, 15000);
    assert.equal(order.total, 128000);
    assert.equal(order.phone, '+998901234567');
    assert.ok(order.distanceKm > 0 && order.distanceKm < 15);
    assert.ok(order.etaAt > clock);
    assert.equal(order.adminMessageId, undefined, 'xodimlar maydoni mijozga chiqmasin');
  });

  it('manzilsiz yetkazish, noto‘g‘ri telefon va uzoq manzilni rad etadi', async () => {
    const items = [{ config: defaultPizzaConfig('pepperoni', 'M'), qty: 1 }];
    const base = { items, mode: 'delivery', address, phone: '901234567', payment: 'cash' };

    assert.equal((await call(1, 'POST', '/orders', { ...base, address: {} })).body.error, 'address_required');
    assert.equal((await call(1, 'POST', '/orders', { ...base, phone: '12' })).body.error, 'phone_required');
    assert.equal(
      (await call(1, 'POST', '/orders', { ...base, address: { ...address, lat: 40.1, lng: 65.3 } })).body.error,
      'too_far',
    );
    assert.equal((await call(1, 'POST', '/orders', { ...base, payment: 'online' })).body.error, 'online_disabled');
  });

  it('ish vaqtidan tashqarida buyurtma qabul qilinmaydi', async () => {
    const saved = clock;
    clock = Date.UTC(2026, 8, 25, 0, 0); // 05:00
    const { body } = await call(1, 'POST', '/orders', {
      items: [{ config: { kind: 'item', itemId: 'cola' }, qty: 1 }],
      mode: 'pickup',
      phone: '901234567',
      payment: 'cash',
    });
    clock = saved;
    assert.equal(body.error, 'closed');
  });

  it('boshqa odamning buyurtmasini ko‘rib bo‘lmaydi', async () => {
    assert.equal((await call(2, 'GET', '/orders/1001')).status, 404);
    assert.equal((await call(1, 'GET', '/orders/1001')).status, 200);
  });

  it('oshxona holatlari ketma-ket o‘tadi va tilim qo‘shiladi', async () => {
    const { orders, users } = services;
    assert.throws(() => orders.setStatus(1001, 'done'), /bad_transition/);

    orders.setStatus(1001, 'accepted');
    orders.setStatus(1001, 'baking');
    const delivering = orders.setStatus(1001, 'delivering');
    assert.equal(delivering.status, 'delivering');

    orders.setStatus(1001, 'done');
    assert.equal(users.get(1_000_001).slices, 1);

    // Tugagan buyurtmani mijoz bekor qila olmaydi
    const { body } = await call(1, 'POST', '/orders/1001/cancel');
    assert.equal(body.error, 'cannot_cancel');
  });

  it('tilim kartasi: 8 tilim — bepul pitsa, bekor qilinsa qaytadi', async () => {
    services.users.addSlices(1_000_001, 7); // jami 8

    const { body } = await call(1, 'POST', '/orders', {
      items: [{ config: defaultPizzaConfig('margarita', 'S'), qty: 2 }],
      mode: 'pickup',
      phone: '901234567',
      payment: 'cash',
      useReward: true,
    });
    assert.equal(body.order.discount, 59000);
    assert.equal(body.order.total, 59000);
    assert.equal(services.users.get(1_000_001).slices, 0);

    const cancelled = await call(1, 'POST', `/orders/${body.order.id}/cancel`);
    assert.equal(cancelled.body.order.status, 'cancelled');
    assert.equal(services.users.get(1_000_001).slices, 8);
  });

  it('stop-listdagi pitsani buyurtma qilib bo‘lmaydi', async () => {
    services.stoplist.toggle('qazi');
    const { body } = await call(1, 'POST', '/orders', {
      items: [{ config: defaultPizzaConfig('qazi', 'M'), qty: 1 }],
      mode: 'pickup',
      phone: '901234567',
      payment: 'cash',
    });
    services.stoplist.toggle('qazi');
    assert.equal(body.error, 'unavailable');
  });
});

describe('Davra (birgalikdagi buyurtma)', () => {
  let code;

  it('host davra ochadi, do‘st qo‘shiladi', async () => {
    const created = await call(3, 'POST', '/groups');
    code = created.body.group.code;
    assert.match(code, /^[A-Z0-9]{6}$/);
    assert.equal(created.body.group.isHost, true);

    // Qayta bossa — o'sha davra qaytadi
    assert.equal((await call(3, 'POST', '/groups')).body.group.code, code);

    const outsider = await call(4, 'POST', `/groups/${code}/items`, {
      config: defaultPizzaConfig('pepperoni', 'M'),
    });
    assert.equal(outsider.status, 403);

    const joined = await call(4, 'POST', `/groups/${code}/join`);
    assert.equal(joined.body.group.members.length, 2);
    assert.equal(joined.body.group.isHost, false);
  });

  it('har kim o‘z pitsasini qo‘shadi, boshqanikini o‘zgartira olmaydi', async () => {
    await call(3, 'POST', `/groups/${code}/items`, { config: defaultPizzaConfig('qazi', 'L'), qty: 1 });
    const added = await call(4, 'POST', `/groups/${code}/items`, {
      config: defaultPizzaConfig('diablo', 'M'),
      qty: 2,
    });
    const group = added.body.group;
    assert.equal(group.itemsCount, 3);
    assert.equal(group.subtotal, 129000 + 2 * 95000);

    const hostItem = group.members.find((m) => m.isHost).items[0];
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
      body.order.items.map((item) => item.by.name),
      ['Jasur Test', 'Nilufar Test'],
    );

    // Davradosh buyurtmani ko'ra oladi, davra yopiladi
    assert.equal((await call(4, 'GET', `/orders/${body.order.id}`)).status, 200);
    const view = await call(4, 'GET', `/groups/${code}`);
    assert.equal(view.body.group.status, 'ordered');
    assert.equal(view.body.group.orderId, body.order.id);

    const late = await call(4, 'POST', `/groups/${code}/items`, { config: { kind: 'item', itemId: 'cola' } });
    assert.equal(late.body.error, 'group_closed');
  });

  it('muddati o‘tgan davraga qo‘shilib bo‘lmaydi', async () => {
    const created = await call(5, 'POST', '/groups');
    clock += 4 * 3600_000;
    const joined = await call(6, 'POST', `/groups/${created.body.group.code}/join`);
    clock -= 4 * 3600_000;
    assert.equal(joined.body.error, 'group_expired');
  });
});

describe('jonli yangilanishlar (SSE)', () => {
  it('holat o‘zgarishi mijozga darhol yetib boradi', async () => {
    const { body } = await call(1, 'POST', '/orders', {
      items: [{ config: { kind: 'item', itemId: 'cola' }, qty: 1 }],
      mode: 'pickup',
      phone: '901234567',
      payment: 'cash',
    });

    const controller = new AbortController();
    const response = await fetch(`${base}/stream?dev=1`, { signal: controller.signal });
    assert.equal(response.headers.get('content-type'), 'text/event-stream; charset=utf-8');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const received = (async () => {
      while (!buffer.includes('event: order')) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value);
        if (buffer.includes('event: hello')) {
          if (!buffer.includes('accepted')) services.orders.setStatus(body.order.id, 'accepted');
        }
      }
      return buffer;
    })();

    const text = await received;
    controller.abort();
    assert.match(text, /event: order\ndata: \{"id":\d+.*"status":"accepted"/);
  });
});

describe('maxfiylik', () => {
  it('davradosh hostning telefonini ko‘rmaydi', async () => {
    const created = await call(7, 'POST', '/groups');
    const code = created.body.group.code;
    await call(8, 'POST', `/groups/${code}/join`);
    await call(8, 'POST', `/groups/${code}/items`, { config: { kind: 'item', itemId: 'cola' } });
    const { body } = await call(7, 'POST', '/orders', {
      groupCode: code,
      mode: 'pickup',
      phone: '901112233',
      payment: 'cash',
      comment: 'maxfiy izoh',
    });
    const asMember = await call(8, 'GET', `/orders/${body.order.id}`);
    assert.equal(asMember.body.order.phone, '');
    assert.equal(asMember.body.order.comment, '');
    const asHost = await call(7, 'GET', `/orders/${body.order.id}`);
    assert.equal(asHost.body.order.phone, '+998901112233');
  });
});
