// Buyurtma holatlari va ular orasidagi o'tishlar.

export const STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  NEW: 'new',
  ACCEPTED: 'accepted',
  BAKING: 'baking',
  DELIVERING: 'delivering',
  READY: 'ready',
  DONE: 'done',
  CANCELLED: 'cancelled',
};

export const STATUS_LABELS = {
  pending_payment: { uz: 'Toʻlov kutilmoqda', ru: 'Ожидает оплаты' },
  new: { uz: 'Yangi', ru: 'Новый' },
  accepted: { uz: 'Qabul qilindi', ru: 'Принят' },
  baking: { uz: 'Pechda', ru: 'В печи' },
  delivering: { uz: 'Yoʻlda', ru: 'В пути' },
  ready: { uz: 'Tayyor', ru: 'Готов' },
  done: { uz: 'Yetkazildi', ru: 'Доставлен' },
  cancelled: { uz: 'Bekor qilindi', ru: 'Отменён' },
};

const ACTIVE = new Set(['pending_payment', 'new', 'accepted', 'baking', 'delivering', 'ready']);

export function isActive(status) {
  return ACTIVE.has(status);
}

/** Oshxona keyingi qaysi holatga o'tkazadi */
export function nextStatus(order) {
  switch (order.status) {
    case 'new':
      return 'accepted';
    case 'accepted':
      return 'baking';
    case 'baking':
      return order.mode === 'pickup' ? 'ready' : 'delivering';
    case 'delivering':
    case 'ready':
      return 'done';
    default:
      return null;
  }
}

export function canTransition(order, to) {
  if (to === 'cancelled') {
    return ['pending_payment', 'new', 'accepted', 'baking'].includes(order.status);
  }
  if (order.status === 'pending_payment') return to === 'new';
  return nextStatus(order) === to;
}

/** Mijoz o'zi bekor qila oladimi — faqat oshxona hali qabul qilmagan bo'lsa */
export function customerCanCancel(order) {
  return order.status === 'pending_payment' || order.status === 'new';
}

/** Kuzatuv ekranidagi bosqichlar */
export function trackerSteps(mode) {
  return ['accepted', 'baking', mode === 'pickup' ? 'ready' : 'delivering', 'done'];
}
