import crypto from 'node:crypto';

const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:5098';
const BOT_TOKEN = process.env.BOT_TOKEN || '123456:FAKE_TOKEN_FOR_TEST';

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? ' → ' + JSON.stringify(detail) : ''}`); }
};

/** Telegram qanday imzolasa, shunday imzolaymiz */
function signInitData(user, authDate = Math.floor(Date.now() / 1000)) {
  const params = new URLSearchParams({
    user: JSON.stringify(user),
    auth_date: String(authDate),
    query_id: 'AAE1234567',
  });
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  params.set('hash', crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex'));
  return params.toString();
}

const get = (initData) =>
  fetch(`${BASE}/api/me`, { headers: initData ? { 'x-telegram-init-data': initData } : {} })
    .then(async (r) => ({ status: r.status, body: await r.json() }));

console.log('\nTelegram initData tekshiruvi (ALLOW_DEV_USER=false)');

check('header yo‘q → 401', (await get()).status === 401);
check('bo‘sh header → 401', (await get('')).status === 401);
check('tasodifiy matn → 401', (await get('user=%7B%7D&hash=deadbeef')).status === 401);

const valid = signInitData({ id: 555001, first_name: 'Shoxrux', username: 'shoxrux' });
const ok = await get(valid);
check('to‘g‘ri imzo → 200', ok.status === 200, ok.body);
check('foydalanuvchi bazaga yozildi', ok.body.user?.firstName === 'Shoxrux', ok.body);

// Bitta belgini o'zgartiramiz - imzo buziladi
const tampered = valid.replace('Shoxrux', 'Xakerr');
check('ma’lumot o‘zgartirilgan → 401', (await get(tampered)).status === 401);

// Hash to'g'ri, lekin 3 kun oldingi initData
const old = signInitData({ id: 555002, first_name: 'Eski' }, Math.floor(Date.now() / 1000) - 3 * 86400);
check('eskirgan initData (3 kun) → 401', (await get(old)).status === 401);

// Boshqa bot tokeni bilan imzolangan
const otherSecret = crypto.createHmac('sha256', 'WebAppData').update('999:BOSHQA_TOKEN').digest();
const p = new URLSearchParams({ user: JSON.stringify({ id: 1, first_name: 'X' }), auth_date: String(Math.floor(Date.now() / 1000)) });
const dcs = [...p.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
p.set('hash', crypto.createHmac('sha256', otherSecret).update(dcs).digest('hex'));
check('boshqa bot tokeni bilan imzolangan → 401', (await get(p.toString())).status === 401);

console.log(`\nNatija: ${pass} muvaffaqiyatli, ${fail} xato\n`);
process.exit(fail === 0 ? 0 : 1);
