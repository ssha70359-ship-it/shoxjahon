import crypto from 'node:crypto';

// Test serveri .env dagi emas, shu yerdagi qiymatlar bilan ishga tushiriladi.
// Ishga tushirish: `npm run test:e2e` (README ga qarang)
const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:5099';
const PAYME_KEY = process.env.PAYME_KEY || 'test_payme_key_123';
const CLICK_SECRET = process.env.CLICK_SECRET_KEY || 'click_secret_456';
const CLICK_SERVICE_ID = process.env.CLICK_SERVICE_ID || '11111';

let pass = 0;
let fail = 0;

function check(name, condition, detail) {
  if (condition) {
    pass += 1;
    console.log(`  ✅ ${name}`);
  } else {
    fail += 1;
    console.log(`  ❌ ${name}${detail ? ` → ${JSON.stringify(detail)}` : ''}`);
  }
}

const devHeaders = { 'content-type': 'application/json' };

async function api(path, options = {}) {
  const res = await fetch(BASE + path, { headers: devHeaders, ...options });
  return { status: res.status, body: await res.json() };
}

function paymeAuth(key = PAYME_KEY) {
  return 'Basic ' + Buffer.from(`Paycom:${key}`).toString('base64');
}

async function payme(method, params, key = PAYME_KEY, id = 1) {
  const res = await fetch(`${BASE}/api/payments/payme`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: paymeAuth(key) },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  return { status: res.status, body: await res.json() };
}

function clickSign(params, withPrepareId) {
  const source = [
    params.click_trans_id,
    params.service_id,
    CLICK_SECRET,
    params.merchant_trans_id,
    ...(withPrepareId ? [params.merchant_prepare_id] : []),
    params.amount,
    params.action,
    params.sign_time,
  ].join('');
  return crypto.createHash('md5').update(source).digest('hex');
}

async function click(path, params) {
  const res = await fetch(`${BASE}/api/payments/click/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  return { status: res.status, body: await res.json() };
}

// ---------------------------------------------------------------------------

console.log('\n1) Umumiy endpointlar');
const health = await api('/api/health');
check('health 200 va to‘lov tizimlari yoqilgan', health.status === 200 && health.body.payments.payme && health.body.payments.click, health.body);

const courses = await api('/api/courses');
check('kurslar ro‘yxati 4 ta', courses.body.courses?.length === 4, courses.body);
check('o‘qituvchi ma’lumoti bor', Boolean(courses.body.courses?.[0]?.teacher?.fullName), courses.body.courses?.[0]);

const directions = await api('/api/courses/directions');
check('yo‘nalishlar ro‘yxati', directions.body.directions?.length === 3, directions.body);

const detail = await api('/api/courses/1');
check('kurs tafsiloti + bo‘sh joylar', detail.body.course?.seatsLeft === 20, detail.body.course);

console.log('\n2) Ariza (validatsiya)');
const badPhone = await api('/api/orders', { method: 'POST', body: JSON.stringify({ courseId: 1, fullName: 'Ali Valiyev', phone: '123' }) });
check('noto‘g‘ri telefon → 400', badPhone.status === 400, badPhone.body);

const badName = await api('/api/orders', { method: 'POST', body: JSON.stringify({ courseId: 1, fullName: 'A', phone: '901234567' }) });
check('qisqa ism → 400', badName.status === 400, badName.body);

const noCourse = await api('/api/orders', { method: 'POST', body: JSON.stringify({ courseId: 999, fullName: 'Ali Valiyev', phone: '901234567' }) });
check('mavjud bo‘lmagan kurs → 404', noCourse.status === 404, noCourse.body);

console.log('\n3) Ariza yaratish');
const created = await api('/api/orders', { method: 'POST', body: JSON.stringify({ courseId: 1, fullName: 'Shoxrux  Azizov ', phone: '90 123 45 67' }) });
const order = created.body.order;
check('ariza 201 bilan yaratildi', created.status === 201, created.body);
check('telefon normallashtirildi', order?.phone === '+998901234567', order);
check('ism ortiqcha bo‘shliqlardan tozalandi', order?.fullName === 'Shoxrux Azizov', order);
check('summa kurs narxidan olindi', order?.amount === 850000, order);
check('status NEW', order?.status === 'NEW', order);
check('2 ta to‘lov varianti', created.body.payments?.length === 2, created.body.payments);
check('Payme havolasi base64', created.body.payments?.[0]?.url?.startsWith('https://checkout.paycom.uz/'), created.body.payments?.[0]);

const decoded = Buffer.from(created.body.payments[0].url.split('/').pop(), 'base64').toString();
check('Payme havolasida to‘g‘ri summa (tiyin)', decoded.includes(`a=${850000 * 100}`) && decoded.includes(`ac.order_id=${order.id}`), decoded);

const again = await api('/api/orders', { method: 'POST', body: JSON.stringify({ courseId: 1, fullName: 'Shoxrux Azizov', phone: '901234567' }) });
check('takroriy ariza yangi yozuv ochmaydi', again.body.reused === true && again.body.order.id === order.id, again.body);

console.log('\n4) Payme protokoli');
const noAuth = await payme('CheckPerformTransaction', { amount: 85000000, account: { order_id: String(order.id) } }, 'notogri_kalit');
check('noto‘g‘ri kalit → -32504', noAuth.status === 200 && noAuth.body.error?.code === -32504, noAuth.body);

const badMethod = await payme('NoSuchMethod', {});
check('mavjud bo‘lmagan metod → -32601', badMethod.body.error?.code === -32601, badMethod.body);

const badAmount = await payme('CheckPerformTransaction', { amount: 100, account: { order_id: String(order.id) } });
check('noto‘g‘ri summa → -31001', badAmount.body.error?.code === -31001, badAmount.body);

const badOrder = await payme('CheckPerformTransaction', { amount: 85000000, account: { order_id: '99999' } });
check('mavjud bo‘lmagan ariza → -31050', badOrder.body.error?.code === -31050, badOrder.body);

const canPerform = await payme('CheckPerformTransaction', { amount: 85000000, account: { order_id: String(order.id) } });
check('CheckPerformTransaction → allow', canPerform.body.result?.allow === true, canPerform.body);

const PAYME_TX = 'pm_' + Date.now();
const createTx = await payme('CreateTransaction', { id: PAYME_TX, time: Date.now(), amount: 85000000, account: { order_id: String(order.id) } });
check('CreateTransaction → state 1', createTx.body.result?.state === 1, createTx.body);

const createTxAgain = await payme('CreateTransaction', { id: PAYME_TX, time: Date.now(), amount: 85000000, account: { order_id: String(order.id) } });
check('CreateTransaction takroriy → bir xil javob (idempotent)',
  createTxAgain.body.result?.transaction === createTx.body.result?.transaction
  && createTxAgain.body.result?.create_time === createTx.body.result?.create_time, createTxAgain.body);

const secondTx = await payme('CreateTransaction', { id: 'pm_boshqa', time: Date.now(), amount: 85000000, account: { order_id: String(order.id) } });
check('bitta arizaga ikkinchi ochiq tranzaksiya → -31008', secondTx.body.error?.code === -31008, secondTx.body);

const pendingOrder = await api(`/api/orders/${order.id}`);
check('ariza PENDING holatiga o‘tdi', pendingOrder.body.order?.status === 'PENDING', pendingOrder.body.order);

const perform = await payme('PerformTransaction', { id: PAYME_TX });
check('PerformTransaction → state 2', perform.body.result?.state === 2, perform.body);
check('perform_time to‘ldirildi', perform.body.result?.perform_time > 0, perform.body);

const performAgain = await payme('PerformTransaction', { id: PAYME_TX });
check('PerformTransaction takroriy → bir xil javob',
  performAgain.body.result?.perform_time === perform.body.result?.perform_time, performAgain.body);

const checkTx = await payme('CheckTransaction', { id: PAYME_TX });
check('CheckTransaction → state 2', checkTx.body.result?.state === 2, checkTx.body);
check('CheckTransaction cancel_time = 0', checkTx.body.result?.cancel_time === 0, checkTx.body);

const paidOrder = await api(`/api/orders/${order.id}`);
check('ariza PAID bo‘ldi', paidOrder.body.order?.status === 'PAID' && paidOrder.body.order?.provider === 'PAYME', paidOrder.body.order);

const alreadyPaid = await payme('CheckPerformTransaction', { amount: 85000000, account: { order_id: String(order.id) } });
check('to‘langan arizaga yangi to‘lov → -31051', alreadyPaid.body.error?.code === -31051, alreadyPaid.body);

const missingTx = await payme('CheckTransaction', { id: 'yoq_bunday' });
check('topilmagan tranzaksiya → -31003', missingTx.body.error?.code === -31003, missingTx.body);

const statement = await payme('GetStatement', { from: Date.now() - 86400000, to: Date.now() + 1000 });
check('GetStatement ro‘yxat qaytardi', Array.isArray(statement.body.result?.transactions) && statement.body.result.transactions.length >= 1, statement.body);

const cancel = await payme('CancelTransaction', { id: PAYME_TX, reason: 5 });
check('CancelTransaction (to‘langandan keyin) → state -2', cancel.body.result?.state === -2, cancel.body);

const cancelledOrder = await api(`/api/orders/${order.id}`);
check('bekor qilingach ariza CANCELLED', cancelledOrder.body.order?.status === 'CANCELLED', cancelledOrder.body.order);

console.log('\n5) Click protokoli');
const order2 = (await api('/api/orders', { method: 'POST', body: JSON.stringify({ courseId: 2, fullName: 'Shoxrux Azizov', phone: '901234567' }) })).body.order;
check('2-ariza yaratildi (1 100 000 so‘m)', order2?.amount === 1100000, order2);

const CLICK_TX = String(Date.now());
const prepareParams = {
  click_trans_id: CLICK_TX,
  service_id: CLICK_SERVICE_ID,
  click_paydoc_id: '999',
  merchant_trans_id: String(order2.id),
  amount: '1100000.00',
  action: '0',
  error: '0',
  error_note: 'Success',
  sign_time: '2026-09-19 12:00:00',
};

const badSign = await click('prepare', { ...prepareParams, sign_string: 'a'.repeat(32) });
check('noto‘g‘ri imzo → -1', badSign.body.error === -1, badSign.body);

const wrongAmount = await click('prepare', { ...prepareParams, amount: '5.00', sign_string: clickSign({ ...prepareParams, amount: '5.00' }, false) });
check('noto‘g‘ri summa → -2', wrongAmount.body.error === -2, wrongAmount.body);

const prepared = await click('prepare', { ...prepareParams, sign_string: clickSign(prepareParams, false) });
check('prepare → error 0', prepared.body.error === 0, prepared.body);
check('merchant_prepare_id berildi', Number(prepared.body.merchant_prepare_id) > 0, prepared.body);

const preparedAgain = await click('prepare', { ...prepareParams, sign_string: clickSign(prepareParams, false) });
check('prepare takroriy → bir xil prepare_id', preparedAgain.body.merchant_prepare_id === prepared.body.merchant_prepare_id, preparedAgain.body);

const completeParams = {
  ...prepareParams,
  action: '1',
  merchant_prepare_id: String(prepared.body.merchant_prepare_id),
};

const completeBadSign = await click('complete', { ...completeParams, sign_string: clickSign(completeParams, false) });
check('complete imzosi prepare formulasida → -1', completeBadSign.body.error === -1, completeBadSign.body);

const mismatched = await click('complete', {
  ...completeParams,
  merchant_trans_id: '9999',
  sign_string: clickSign({ ...completeParams, merchant_trans_id: '9999' }, true),
});
check('boshqa arizaga ulangan prepare_id → -6', mismatched.body.error === -6, mismatched.body);

const completed = await click('complete', { ...completeParams, sign_string: clickSign(completeParams, true) });
check('complete → error 0', completed.body.error === 0, completed.body);
check('merchant_confirm_id berildi', Number(completed.body.merchant_confirm_id) > 0, completed.body);

const completedAgain = await click('complete', { ...completeParams, sign_string: clickSign(completeParams, true) });
check('complete takroriy → -4 (already paid)', completedAgain.body.error === -4, completedAgain.body);

const order2Paid = await api(`/api/orders/${order2.id}`);
check('2-ariza PAID / CLICK', order2Paid.body.order?.status === 'PAID' && order2Paid.body.order?.provider === 'CLICK', order2Paid.body.order);

const seats = await api('/api/courses/2');
check('to‘langan ariza joyni band qildi (16 → 15)', seats.body.course?.seatsLeft === 15, seats.body.course);

const duplicate = await api('/api/orders', { method: 'POST', body: JSON.stringify({ courseId: 2, fullName: 'Shoxrux Azizov', phone: '901234567' }) });
check('to‘langan kursga qayta ariza → 400', duplicate.status === 400, duplicate.body);

console.log('\n6) Ruxsatlar');
const foreign = await api('/api/orders/99999');
check('birovning/yo‘q arizasi → 404', foreign.status === 404, foreign.body);

const notFound = await api('/api/bunday-yol-yoq');
check('noma’lum yo‘l → 404', notFound.status === 404, notFound.body);


console.log('\n7) Spamdan himoya');
let limited = false;
for (let i = 0; i < 14; i += 1) {
  const res = await api('/api/orders', { method: 'POST', body: JSON.stringify({ courseId: 3, fullName: 'Spam Test', phone: '901234567' }) });
  if (res.status === 429) { limited = true; break; }
}
check('ketma-ket so‘rovlar 429 bilan to‘xtatildi', limited);

console.log(`\n────────────────────────────\nNatija: ${pass} muvaffaqiyatli, ${fail} xato\n`);
process.exit(fail === 0 ? 0 : 1);
