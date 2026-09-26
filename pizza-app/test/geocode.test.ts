import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';

import { formatAddress } from '../server/services/geocode.service.js';
import { caller, createTestApp, type TestApp } from './helpers.js';

// Soxta Nominatim: testlar haqiqiy internetga chiqmaydi
const hits: URL[] = [];
const agents: string[] = [];
let failNext = false;

const nominatim = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  hits.push(url);
  agents.push(req.headers['user-agent'] ?? '');
  if (failNext) {
    failNext = false;
    res.writeHead(503).end();
    return;
  }
  const lat = Number(url.searchParams.get('lat'));
  const body =
    lat < 0
      ? { error: 'Unable to geocode' }
      : {
          display_name: 'Bunyodkor shoh ko‘chasi, Chilonzor tumani, Toshkent, Oʻzbekiston',
          address: {
            road: 'Bunyodkor shoh ko‘chasi',
            house_number: '12',
            neighbourhood: 'Qatortol',
            city_district: 'Chilonzor tumani',
            city: 'Toshkent',
          },
        };
  res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
});

let app: TestApp;
let call: ReturnType<typeof caller>;

before(async () => {
  nominatim.listen(0);
  await new Promise<void>((resolve) => nominatim.once('listening', resolve));
  const { port } = nominatim.address() as AddressInfo;
  app = await createTestApp({ ALLOW_DEV_USER: 'true', GEOCODER_URL: `http://127.0.0.1:${port}` });
  call = caller(app);
});

after(async () => {
  await app.shutdown();
  nominatim.close();
});

describe('manzilni nuqtadan aniqlash', () => {
  it('koordinatadan qisqa manzil qaytaradi', async () => {
    const { status, body } = await call(1, 'GET', '/geocode/reverse?lat=41.2856&lng=69.2034');
    assert.equal(status, 200);
    assert.equal(body.text, 'Bunyodkor shoh ko‘chasi 12, Qatortol, Chilonzor tumani');

    const sent = hits.at(-1)!;
    assert.equal(sent.pathname, '/reverse');
    assert.equal(sent.searchParams.get('lon'), '69.2034');
    assert.equal(sent.searchParams.get('format'), 'jsonv2');
    assert.match(agents.at(-1)!, /^OlovPizzaMiniApp\//, 'Nominatim aniq User-Agent talab qiladi');
  });

  it('bir xil nuqta qayta so‘ralmaydi (kesh)', async () => {
    const before = hits.length;
    const { body } = await call(2, 'GET', '/geocode/reverse?lat=41.28561&lng=69.20342');
    assert.equal(body.text, 'Bunyodkor shoh ko‘chasi 12, Qatortol, Chilonzor tumani');
    assert.equal(hits.length, before);
  });

  it('topilmasa null, tarmoq xatosi keshlanmaydi', async () => {
    assert.equal((await call(1, 'GET', '/geocode/reverse?lat=-10&lng=20')).body.text, null);

    failNext = true;
    assert.equal((await call(1, 'GET', '/geocode/reverse?lat=41.3&lng=69.3')).body.text, null);
    const retry = await call(1, 'GET', '/geocode/reverse?lat=41.3&lng=69.3');
    assert.equal(retry.body.text, 'Bunyodkor shoh ko‘chasi 12, Qatortol, Chilonzor tumani');
  });

  it('noto‘g‘ri koordinata — validatsiya xatosi', async () => {
    const { status, body } = await call(1, 'GET', '/geocode/reverse?lat=abc&lng=69');
    assert.equal(status, 400);
    assert.equal(body.error, 'validation');
    assert.equal((await call(1, 'GET', '/geocode/reverse?lat=95&lng=69')).status, 400);
  });
});

describe('formatAddress', () => {
  it('ko‘cha bo‘lmasa shahar qo‘shiladi, takrorlar olib tashlanadi', () => {
    assert.equal(
      formatAddress({ suburb: 'Yunusobod tumani', city_district: 'Yunusobod tumani', city: 'Toshkent' }),
      'Yunusobod tumani, Toshkent',
    );
  });

  it('manzil qismlari bo‘lmasa display_name boshidan olinadi', () => {
    assert.equal(formatAddress({}, 'A, B, C, D, E'), 'A, B, C');
  });
});
