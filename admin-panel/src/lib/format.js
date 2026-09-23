export function money(value) {
  return `${Number(value || 0).toLocaleString('ru-RU').replace(/ /g, ' ')} so‘m`;
}

export function num(value) {
  return Number(value || 0).toLocaleString('ru-RU').replace(/ /g, ' ');
}

export function date(value) {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export const STATUS_LABEL = {
  KUTILMOQDA: 'Kutilmoqda',
  YETKAZILDI: 'Yetkazildi',
  BEKOR_QILINDI: 'Bekor qilindi',
};

export const STATUSES = Object.keys(STATUS_LABEL);


export const PAYMENT_METHOD_LABEL = {
  NAQD: 'Naqd',
  CLICK: 'Click',
  PAYME: 'Payme',
};

/**
 * Admin uchun to'lov holati: naqd - kuryerga, karta - to'langan/to'lanmagan.
 * To'lanmagan karta buyurtmasini yetkazib bermaslik kerak.
 */
export function paymentBadge(order) {
  const method = order.paymentMethod || 'NAQD';
  const title = PAYMENT_METHOD_LABEL[method] || method;

  if (method === 'NAQD') return { className: 'pay-cash', text: `${title} · kuryerga` };
  if (order.paymentStatus === 'TOLANGAN') return { className: 'pay-paid', text: `${title} · to‘langan` };
  return { className: 'pay-unpaid', text: `${title} · to‘lanmagan` };
}
