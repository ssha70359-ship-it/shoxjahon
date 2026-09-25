import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';

import { createServer } from '../server/app.js';
import { defaultPizzaConfig } from '../shared/pricing.js';

// Soxta Telegram Bot API: bot qaysi metodlarni chaqirganini yozib boradi.

const calls = [];
let messageId = 100;

const mock = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
  });
  req.on('end', () => {
    const method = req.url.split('/').pop();
    let body = {};
    try {
      body = JSON.parse(raw || '{}');
    } catch {
      body = {};
    }
    calls.push({ method, body });

    const reply = (result) => {
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

let instance;
const clock = Date.UTC(2026, 8, 25, 9, 0);

async function waitFor(predicate, timeout = 2000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const found = calls.find(predicate);
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('kutilgan chaqiruv kelmadi');
}

before(async () => {
  await new Promise((resolve) => mock.listen(0, resolve));
  instance = await createServer({
    config: {
      port: 0,
      botToken: '123:TEST',
      telegramApiRoot: `http://127.0.0.1:${mock.address().port}`,
      adminChatId: ADMIN_CHAT,
      adminIds: [],
      publicUrl: 'https://pizza.example.com',
      useWebhook: false,
      miniAppShortName: '',
      paymentProviderToken: 'PROVIDER:TEST',
      databaseFile: ':memory:',
      allowDevUser: false,
      ignoreHours: true,
      rateLimit: false,
      distDir: '/nonexistent',
    },
    now: () => clock,
    log: { info() {}, warn() {}, error() {} },
  });
});

after(async () => {
  await instance.close();
  await new Promise((resolve) => mock.close(resolve));
});

function update(extra) {
  return { update_id: Math.floor(Math.random() * 1e9), ...extra };
}

describe('Telegram bot', () => {
  it('ishga tushganda menyu tugmasini Mini App ga bog‘laydi', async () => {
    const call = await waitFor((c) => c.method === 'setChatMenuButton');
    assert.equal(call.body.menu_button.web_app.url, 'https://pizza.example.com');
    assert.equal(instance.telegram.username, 'olov_test_bot');
  });

  it('/start g_KOD — davraga taklif tugmasi', async () => {
    await instance.telegram.bot.handleUpdate(
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
    const user = users.upsertFromTelegram(HOST);
    orders.create(user, {
      items: [{ config: defaultPizzaConfig('qazi', 'L'), qty: 1 }],
      mode: 'delivery',
      address: { text: 'Chilonzor 9, 12-uy', lat: 41.2856, lng: 69.2034 },
      phone: '901234567',
      payment: 'cash',
    });

    const card = await waitFor((c) => c.method === 'sendMessage' && c.body.chat_id === ADMIN_CHAT);
    assert.match(card.body.text, /Buyurtma #1001/);
    assert.match(card.body.text, /Qazili/);
    assert.equal(card.body.reply_markup.inline_keyboard[0][0].callback_data, 'st:1001:accepted');

    await waitFor((c) => c.method === 'sendLocation' && c.body.chat_id === ADMIN_CHAT);
    const receipt = await waitFor((c) => c.method === 'sendMessage' && c.body.chat_id === HOST.id && /oshxonaga/.test(c.body.text));
    assert.match(receipt.body.reply_markup.inline_keyboard[0][0].web_app.url, /\?order=1001$/);
  });

  it('oshxona tugmasi holatni o‘zgartiradi, kartochkani yangilaydi va mijozga yozadi', async () => {
    const adminMessage = instance.services.orders.get(1001).adminMessageId;
    await instance.telegram.bot.handleUpdate(
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

    assert.equal(instance.services.orders.get(1001).status, 'accepted');
    const edit = await waitFor((c) => c.method === 'editMessageText' && c.body.message_id === adminMessage);
    assert.equal(edit.body.reply_markup.inline_keyboard[0][0].callback_data, 'st:1001:baking');
    await waitFor((c) => c.method === 'sendMessage' && c.body.chat_id === HOST.id && /qabul qilindi/.test(c.body.text));
  });

  it('begona chatdan kelgan tugma bosilishini rad etadi', async () => {
    await instance.telegram.bot.handleUpdate(
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
    assert.equal(instance.services.orders.get(1001).status, 'accepted');
  });

  it('onlayn to‘lov: pre_checkout tekshiruvi va to‘lovdan keyin oshxonaga yuborish', async () => {
    const { users, orders } = instance.services;
    const user = users.get(HOST.id);
    const order = orders.create(user, {
      items: [{ config: { kind: 'item', itemId: 'cola' }, qty: 1 }],
      mode: 'pickup',
      phone: '901234567',
      payment: 'online',
    });
    assert.equal(order.status, 'pending_payment');
    assert.equal(await instance.telegram.createInvoiceLink(order, 'uz'), 'https://t.me/$invoice-test');

    // To'lanmagan buyurtma oshxonaga bormasligi kerak
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.ok(!calls.some((c) => c.method === 'sendMessage' && c.body.chat_id === ADMIN_CHAT && c.body.text.includes(`#${order.id}`)));

    await instance.telegram.bot.handleUpdate(
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
    const rejected = await waitFor((c) => c.method === 'answerPreCheckoutQuery' && c.body.pre_checkout_query_id === 'pc1');
    assert.equal(rejected.body.ok, false);

    await instance.telegram.bot.handleUpdate(
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
    const accepted = await waitFor((c) => c.method === 'answerPreCheckoutQuery' && c.body.pre_checkout_query_id === 'pc2');
    assert.equal(accepted.body.ok, true);

    await instance.telegram.bot.handleUpdate(
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

    const paid = orders.get(order.id);
    assert.equal(paid.status, 'new');
    assert.equal(paid.paid, true);
    await waitFor((c) => c.method === 'sendMessage' && c.body.chat_id === ADMIN_CHAT && c.body.text.includes(`#${order.id}`));
  });

  it('davra havolasini tayyor kartochka sifatida ulashadi', async () => {
    const user = instance.services.users.get(HOST.id);
    const group = instance.services.groups.create(user);
    const result = await instance.telegram.prepareGroupShare(user, group);
    assert.equal(result.preparedId, 'prepared-1');
    assert.equal(result.link, `https://t.me/olov_test_bot?start=g_${group.code}`);
  });
});
