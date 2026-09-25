import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { signInitData, verifyInitData } from '../server/utils/telegram-init-data.js';

const TOKEN = '123456:TEST-token';
const user = { id: 42, first_name: 'Aziz', language_code: 'uz' };

function initData(overrides: Record<string, string> = {}): string {
  return signInitData(
    {
      user: JSON.stringify(user),
      auth_date: String(Math.floor(Date.now() / 1000)),
      query_id: 'AAH',
      ...overrides,
    },
    TOKEN,
  );
}

describe('verifyInitData', () => {
  it('to‘g‘ri imzoni qabul qiladi', () => {
    const result = verifyInitData(initData({ start_param: 'g_ABC234' }), TOKEN);
    assert.equal(result?.user.id, 42);
    assert.equal(result?.startParam, 'g_ABC234');
  });

  it('boshqa bot tokeni bilan imzolanganini rad etadi', () => {
    assert.equal(verifyInitData(initData(), '999:OTHER'), null);
  });

  it('o‘zgartirilgan maʼlumotni rad etadi', () => {
    assert.equal(verifyInitData(initData().replace('Aziz', 'Hacker'), TOKEN), null);
  });

  it('eskirgan imzoni rad etadi', () => {
    const old = initData({ auth_date: String(Math.floor(Date.now() / 1000) - 2 * 86400) });
    assert.equal(verifyInitData(old, TOKEN), null);
  });

  it('foydalanuvchi maydoni noto‘g‘ri bo‘lsa (Zod) rad etadi', () => {
    assert.equal(verifyInitData(initData({ user: JSON.stringify({ id: 'abc' }) }), TOKEN), null);
  });

  it('bo‘sh yoki buzuq qiymatlarda xato bermaydi', () => {
    assert.equal(verifyInitData('', TOKEN), null);
    assert.equal(verifyInitData('hash=zzz', TOKEN), null);
    assert.equal(verifyInitData('%%%', TOKEN), null);
    assert.equal(verifyInitData(initData(), ''), null);
  });
});
