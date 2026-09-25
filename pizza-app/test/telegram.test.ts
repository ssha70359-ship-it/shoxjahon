import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';

import type { AddressInfo } from 'node:net';

import type { Update } from 'telegraf/types';

import { defaultPizzaConfig } from '../shared/pricing.js';
import { createTestApp, type TestApp } from './helpers.js';

// Soxta Telegram Bot API: bot qaysi metodlarni chaqirganini yozib boradi.

interface Call {
  method: string;
  body: any;
}

const calls: Call[] = [];
let messageId = 100;

const mock = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
  });
  req.on('end', () => {
    const method = (req.url ?? '').split('/').pop() ?? '';
    let body: Call['body'] = {};
    try {
      body = JSON.parse(raw || '{}');
    } catch {
      body = {};
    }
    calls.push({ method, body });

    const reply = (result: unknown) => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true, result }));
    };

    switch (method) {
      case 'getMe':
        return reply({ id: 1, is_bot: true, first_name: 'Olov', username: 'olov_test_bot' });
      case 'getUpdates':
        return setTimeout(() => reply([]), 50);
      case 'sendMessage':
      case 'sendLocation':
      case 'editMessageText':
        messageId += 1;
        return reply({ message_id: messageId, date: 0, chat: { id: body.chat_id, type: 'private' } });
      case 'createInvoiceLink':
        return reply('https://t.me/$invoice-test');
      case 'savePreparedInlineMessage':
        return reply({ id: 'prepared-1', expiration_date: 0 });
      default:
        return reply(true);
    }
  });
});

const ADMIN_CHAT = '-100500';
const HOST = { id: 777, first_name: 'Aziz', language_code: 'uz' };

let instance: TestApp;

async function waitFor(predicate: (call: Call) => boolean, timeout = 3000): Promise<Call> {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const found = calls.find(predicate);
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('kutilgan chaqiruv kelmadi');
}

before(async () => {
  await new Promise<void>((resolve) => mock.listen(0, resolve));
  instance = await createTestApp(
    {
      BOT_TOKEN: '123:TEST',
      TELEGRAM_API_ROOT: `http://127.0.0.1:${(mock.address() as AddressInfo).port}`,
      ADMIN_CHAT_ID: ADMIN_CHAT,
      PUBLIC_URL: 'https://pizza.example.com',
      PAYMENT_PROVIDER_TOKEN: 'PROVIDER:TEST',
      IGNORE_WORKING_HOURS: 'true',
    },
    true,
  );
});

after(async () => {
  await instance.shutdown();
  await new Promise((resolve) => mock.close(resolve));
});

function update(extra: Record<string, unknown>): Update {
  return { update_id: Math.floor(Math.random() * 1e9), ...extra } as unknown as Update;
}

const bot = () => instance.telegram.bot!;

describe('Telegram bot', () => {
  it('ishga tushganda menyu tugmasini Mini App ga bog‘laydi', async () => {
    const call = await waitFor((c) => c.method === 'setChatMenuButton');
    assert.equal(call.body.menu_button.web_app.url, 'https://pizza.example.com');
    assert.equal(instance.telegram.username, 'olov_test_bot');
  });

  it('/start g_KOD — davraga taklif tugmasi', async () => {
    await bot().handleUpdate(
      update({
        message: {
          message_id: 1,
          date: 0,
          chat: { id: HOST.id, type: 'private' },
          from: HOST,
          text: '/start g_abc234',
          entities: [{ type: 'bot_command', offset: 0, length: 6 }],
        },
      }),
    );
    const call = await waitFor((c) => c.method === 'sendMessage' && /ABC234/.test(c.body.text));
    assert.equal(call.body.reply_markup.inline_keyboard[0][0].web_app.url, 'https://pizza.example.com?group=ABC234');
  });

  it('yangi buyurtma oshxonaga tugmalar va xarita bilan boradi, mijozga chek', async () => {
    const { users, orders } = instance.services;
    const user = await users.upsertFromTelegram(HOST);
    await orders.create(user, {
      items: [{ config: defaultPizzaConfig('qazi', 'L'), qty: 1 }],
      mode: 'delivery',
      address: { text: 'Chilonzor 9, 12-uy', entrance: '', floor: '', apartment: '', lat: 41.2856, lng: 69.2034 },
      phone: '+998901234567',
      payment: 'cash',
      comment: '',
      useReward: false,
    });

    const card = await waitFor((c) => c.method === 'sendMessage' && c.body.chat_id === ADMIN_CHAT);
    assert.match(card.body.text, /Buyurtma #1001/);
    assert.match(card.body.text, /Qazili/);
    assert.equal(card.body.reply_markup.inline_keyboard[0][0].callback_data, 'st:1001:accepted');

    await waitFor((c) => c.method === 'sendLocation' && c.body.chat_id === ADMIN_CHAT);
    const receipt = await waitFor(
      (c) => c.method === 'sendMessage' && c.body.chat_id === HOST.id && /oshxonaga/.test(c.body.text),
    );
    assert.match(receipt.body.reply_markup.inline_keyboard[0][0].web_app.url, /\?order=1001$/);
  });

  it('oshxona tugmasi holatni o‘zgartiradi, kartochkani yangilaydi va mijozga yozadi', async () => {
    const adminMessage = (await instance.services.orders.get(1001))!.adminMessageId;
    await bot().handleUpdate(
      update({
        callback_query: {
          id: 'cb1',
          chat_instance: 'x',
          from: { id: 555, first_name: 'Oshpaz' },
          message: { message_id: adminMessage, date: 0, chat: { id: Number(ADMIN_CHAT), type: 'supergroup' } },
          data: 'st:1001:accepted',
        },
      }),
    );

    assert.equal((await instance.services.orders.get(1001))!.status, 'accepted');
    const edit = await waitFor((c) => c.method === 'editMessageText' && c.body.message_id === adminMessage);
    assert.equal(edit.body.reply_markup.inline_keyboard[0][0].callback_data, 'st:1001:baking');
    await waitFor((c) => c.method === 'sendMessage' && c.body.chat_id === HOST.id && /qabul qilindi/.test(c.body.text));
  });

  it('begona chatdan kelgan tugma bosilishini rad etadi', async () => {
    await bot().handleUpdate(
      update({
        callback_query: {
          id: 'cb2',
          chat_instance: 'y',
          from: { id: 999, first_name: 'Begona' },
          message: { message_id: 1, date: 0, chat: { id: 999, type: 'private' } },
          data: 'st:1001:baking',
        },
      }),
    );
    assert.equal((await instance.services.orders.get(1001))!.status, 'accepted');
  });

  it('onlayn to‘lov: pre_checkout tekshiruvi va to‘lovdan keyin oshxonaga yuborish', async () => {
    const { users, orders } = instance.services;
    const user = (await users.get(HOST.id))!;
    const order = await orders.create(user, {
      items: [{ config: { kind: 'item', itemId: 'cola' }, qty: 1 }],
      mode: 'pickup',
      phone: '+998901234567',
      payment: 'online',
      comment: '',
      useReward: false,
    });
    assert.equal(order.status, 'pending_payment');
    assert.equal(await instance.telegram.createInvoiceLink(order, 'uz'), 'https://t.me/$invoice-test');

    // To'lanmagan buyurtma oshxonaga bormasligi kerak
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.ok(
      !calls.some(
        (c) => c.method === 'sendMessage' && c.body.chat_id === ADMIN_CHAT && c.body.text.includes(`#${order.id}`),
      ),
    );

    await bot().handleUpdate(
      update({
        pre_checkout_query: {
          id: 'pc1',
          from: HOST,
          currency: 'UZS',
          total_amount: order.total * 100 + 1, // noto'g'ri summa
          invoice_payload: `order:${order.id}`,
        },
      }),
    );
    const rejected = await waitFor(
      (c) => c.method === 'answerPreCheckoutQuery' && c.body.pre_checkout_query_id === 'pc1',
    );
    assert.equal(rejected.body.ok, false);

    await bot().handleUpdate(
      update({
        pre_checkout_query: {
          id: 'pc2',
          from: HOST,
          currency: 'UZS',
          total_amount: order.total * 100,
          invoice_payload: `order:${order.id}`,
        },
      }),
    );
    const accepted = await waitFor(
      (c) => c.method === 'answerPreCheckoutQuery' && c.body.pre_checkout_query_id === 'pc2',
    );
    assert.equal(accepted.body.ok, true);

    await bot().handleUpdate(
      update({
        message: {
          message_id: 2,
          date: 0,
          chat: { id: HOST.id, type: 'private' },
          from: HOST,
          successful_payment: {
            currency: 'UZS',
            total_amount: order.total * 100,
            invoice_payload: `order:${order.id}`,
            telegram_payment_charge_id: 't',
            provider_payment_charge_id: 'p',
          },
        },
      }),
    );

    const paid = (await orders.get(order.id))!;
    assert.equal(paid.status, 'new');
    assert.equal(paid.paid, true);
    await waitFor(
      (c) => c.method === 'sendMessage' && c.body.chat_id === ADMIN_CHAT && c.body.text.includes(`#${order.id}`),
    );
  });

  it('davra havolasini tayyor kartochka sifatida ulashadi', async () => {
    const user = (await instance.services.users.get(HOST.id))!;
    const group = await instance.services.groups.create(user);
    const result = await instance.telegram.prepareGroupShare(user, group);
    assert.equal(result.preparedId, 'prepared-1');
    assert.equal(result.link, `https://t.me/olov_test_bot?start=g_${group.code}`);
  });
});
