import assert from 'node:assert/strict';
import { it } from 'node:test';

import { rateLimit } from '../server/rateLimit.js';

it('rateLimit belgilangan sondan keyin 429 qaytaradi', () => {
  const limiter = rateLimit({ max: 2, windowMs: 60_000 });
  const results = [];

  for (let i = 0; i < 3; i += 1) {
    const res = {
      status(code) {
        results.push(code);
        return this;
      },
      json() {},
    };
    limiter({ user: { id: 7 } }, res, () => results.push('next'));
  }

  // Boshqa foydalanuvchiga ta'sir qilmaydi
  limiter({ user: { id: 8 } }, {}, () => results.push('other'));

  assert.deepEqual(results, ['next', 'next', 429, 'other']);
});
