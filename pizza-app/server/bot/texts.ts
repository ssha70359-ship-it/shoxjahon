// Bot xabarlari: mijozga — uning tilida, oshxonaga — o'zbekcha.

import { formatMoney, formatPhone, formatTime } from '../../shared/format.js';
import { tr } from '../../shared/menu.js';
import { describeLine, membersFromItems, splitBill, type BillShare } from '../../shared/pricing.js';
import { SHOP } from '../../shared/shop.js';
import { STATUS_LABELS } from '../../shared/status.js';
import type { Lang, OrderItem, OrderMode, OrderStatus, PaymentMethod, UserDto } from '../../shared/types.js';
import type { OrderRecord } from '../services/mappers.js';

type O = OrderRecord;

export const esc = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const uz = {
  welcome: (name: string) =>
    `Assalomu alaykum, <b>${esc(name)}</b>! 🔥\n\n` +
    `<b>${SHOP.name}</b> — ${esc(SHOP.tagline.uz)}.\n\n` +
    '🎨 Pitsani oʻzingiz yigʻing — masalliqlar koʻz oldingizda joylashadi\n' +
    '◐ Yarim-yarim: bitta pitsada ikki xil taʼm\n' +
    '👥 Davra: doʻstlar bilan bitta buyurtma, hisob avtomatik boʻlinadi\n' +
    '🍕 Har bir pitsa — tilim kartangizga bir tilim. 8 tasi = bepul pitsa\n\n' +
    'Pastdagi tugmani bosing 👇',
  open: '🍕 Menyuni ochish',
  menuButton: '🍕 Menyu',
  notConfigured: 'Mini App hali sozlanmagan. Administrator PUBLIC_URL manzilini koʻrsatishi kerak.',
  groupInvite: (code: string) =>
    `👥 Sizni <b>Davra ${code}</b> ga taklif qilishdi!\n\n` +
    'Tugmani bosing, oʻzingizga pitsa tanlang — host hammasini bitta buyurtma qilib yuboradi.',
  joinGroup: '👥 Davraga qoʻshilish',
  track: '📍 Kuzatish',
  help:
    'Buyurtma berish uchun pastdagi <b>Menyu</b> tugmasini bosing.\n\n' +
    '/start — bosh sahifa\n/orders — soʻnggi buyurtmalar\n/help — yordam\n\n' +
    `☎️ ${SHOP.phone}`,
  noOrders: 'Hali buyurtmalaringiz yoʻq. Birinchisini hozir berib koʻring! 🍕',
  ordersTitle: '🧾 <b>Soʻnggi buyurtmalar</b>',
  created: (order: O) =>
    `🧾 <b>Buyurtma #${order.id}</b> oshxonaga yuborildi.\n` +
    `Jami: <b>${formatMoney(order.total, 'uz')}</b>\n\n` +
    'Holatini shu yerda va ilovada jonli kuzatasiz.',
  groupCreated: (order: O, amount?: number) =>
    `👥 <b>Davra buyurtmasi #${order.id}</b> berildi!\n` +
    (amount != null ? `Sizning ulushingiz: <b>${formatMoney(amount, 'uz')}</b>\n` : '') +
    '\nPitsalar pechga tushishi bilan xabar beramiz.',
  status: {
    accepted: (o: O) =>
      `✅ <b>#${o.id}</b> qabul qilindi! Oshpaz xamirni yoymoqda.\n` +
      `Taxminan <b>${formatTime(o.etaAt ?? o.updatedAt)}</b> da ${o.mode === 'pickup' ? 'tayyor boʻladi' : 'yetkaziladi'}.`,
    baking: (o: O) => `🔥 <b>#${o.id}</b> pechda! 400°C, 90 soniya — hidini sezyapsizmi?`,
    delivering: (o: O) =>
      `🛵 Kuryer yoʻlda! <b>#${o.id}</b> taxminan <b>${formatTime(o.etaAt ?? o.updatedAt)}</b> da yetib boradi.`,
    ready: (o: O) => `📦 <b>#${o.id}</b> tayyor! Olib ketishingiz mumkin:\n${esc(SHOP.address.uz)}`,
    done: (o: O, slices: number) =>
      `🍕 Yoqimli ishtaha!` +
      (o.slicesEarned > 0
        ? `\nTilim kartangizga <b>+${o.slicesEarned}</b> tilim qoʻshildi (${slices}/${SHOP.loyalty.slicesForReward}).`
        : ''),
    cancelled: (o: O) =>
      `❌ <b>#${o.id}</b> bekor qilindi.` +
      (o.slicesUsed > 0 ? '\nIshlatilgan tilimlar kartangizga qaytarildi.' : '') +
      `\nSavollar boʻlsa: ${SHOP.phone}`,
  },
  paid: (o: O) => `💳 <b>#${o.id}</b> uchun toʻlov qabul qilindi. Rahmat!`,
  payTitle: (id: number) => `${SHOP.name} — buyurtma #${id}`,
  payLabel: 'Buyurtma',
  payProblem: 'Buyurtma topilmadi yoki allaqachon toʻlangan.',
  shareTitle: 'Davraga qoʻshiling 🍕',
  shareText: (name: string, code: string) =>
    `👥 <b>${esc(name)}</b> sizni <b>${SHOP.name}</b> dagi davrasiga chaqiryapti!\n\n` +
    `Har kim oʻz pitsasini tanlaydi, buyurtma bitta boʻlib ketadi. Davra kodi: <b>${code}</b>`,
  shareDescription: 'Har kim oʻz pitsasini tanlaydi — buyurtma bitta.',
};

const ru: typeof uz = {
  welcome: (name: string) =>
    `Здравствуйте, <b>${esc(name)}</b>! 🔥\n\n` +
    `<b>${SHOP.name}</b> — ${esc(SHOP.tagline.ru)}.\n\n` +
    '🎨 Соберите пиццу сами — ингредиенты ложатся прямо на глазах\n' +
    '◐ Половинки: два вкуса в одной пицце\n' +
    '👥 Давра: общий заказ с друзьями, счёт делится автоматически\n' +
    '🍕 Каждая пицца — кусочек на карте. 8 кусочков = пицца в подарок\n\n' +
    'Нажмите кнопку ниже 👇',
  open: '🍕 Открыть меню',
  menuButton: '🍕 Меню',
  notConfigured: 'Mini App ещё не настроен. Администратор должен указать PUBLIC_URL.',
  groupInvite: (code: string) =>
    `👥 Вас пригласили в <b>Давру ${code}</b>!\n\n` +
    'Нажмите кнопку и выберите себе пиццу — хост отправит всё одним заказом.',
  joinGroup: '👥 Присоединиться',
  track: '📍 Отследить',
  help:
    'Чтобы сделать заказ, нажмите кнопку <b>Меню</b> внизу.\n\n' +
    '/start — главная\n/orders — последние заказы\n/help — помощь\n\n' +
    `☎️ ${SHOP.phone}`,
  noOrders: 'У вас пока нет заказов. Самое время сделать первый! 🍕',
  ordersTitle: '🧾 <b>Последние заказы</b>',
  created: (order: O) =>
    `🧾 <b>Заказ #${order.id}</b> отправлен на кухню.\n` +
    `Итого: <b>${formatMoney(order.total, 'ru')}</b>\n\n` +
    'Статус можно отслеживать здесь и в приложении.',
  groupCreated: (order: O, amount?: number) =>
    `👥 <b>Заказ давры #${order.id}</b> оформлен!\n` +
    (amount != null ? `Ваша доля: <b>${formatMoney(amount, 'ru')}</b>\n` : '') +
    '\nСообщим, как только пиццы отправятся в печь.',
  status: {
    accepted: (o: O) =>
      `✅ <b>#${o.id}</b> принят! Повар уже раскатывает тесто.\n` +
      `Примерно в <b>${formatTime(o.etaAt ?? o.updatedAt)}</b> ${o.mode === 'pickup' ? 'будет готов' : 'будет у вас'}.`,
    baking: (o: O) => `🔥 <b>#${o.id}</b> в печи! 400°C, 90 секунд — чувствуете аромат?`,
    delivering: (o: O) =>
      `🛵 Курьер в пути! <b>#${o.id}</b> будет примерно в <b>${formatTime(o.etaAt ?? o.updatedAt)}</b>.`,
    ready: (o: O) => `📦 <b>#${o.id}</b> готов! Можно забирать:\n${esc(SHOP.address.ru)}`,
    done: (o: O, slices: number) =>
      `🍕 Приятного аппетита!` +
      (o.slicesEarned > 0
        ? `\nНа карту добавлено <b>+${o.slicesEarned}</b> (${slices}/${SHOP.loyalty.slicesForReward}).`
        : ''),
    cancelled: (o: O) =>
      `❌ <b>#${o.id}</b> отменён.` +
      (o.slicesUsed > 0 ? '\nКусочки возвращены на карту.' : '') +
      `\nВопросы: ${SHOP.phone}`,
  },
  paid: (o: O) => `💳 Оплата заказа <b>#${o.id}</b> получена. Спасибо!`,
  payTitle: (id: number) => `${SHOP.name} — заказ #${id}`,
  payLabel: 'Заказ',
  payProblem: 'Заказ не найден или уже оплачен.',
  shareTitle: 'Присоединяйтесь к давре 🍕',
  shareText: (name: string, code: string) =>
    `👥 <b>${esc(name)}</b> зовёт вас в свою давру в <b>${SHOP.name}</b>!\n\n` +
    `Каждый выбирает свою пиццу, заказ — один. Код давры: <b>${code}</b>`,
  shareDescription: 'Каждый выбирает свою пиццу — заказ один.',
};

export type BotTexts = typeof uz;
export type StatusTemplate = (order: O, slices: number) => string;

export function texts(lang: Lang | undefined): BotTexts {
  return lang === 'ru' ? ru : uz;
}

/** Holat o'zgarganda mijozga yuboriladigan matn (bo'lmasa — xabar yuborilmaydi) */
export function statusText(lang: Lang | undefined, status: OrderStatus): StatusTemplate | null {
  const templates = texts(lang).status as Partial<Record<OrderStatus, StatusTemplate>>;
  return templates[status] ?? null;
}

// --- Oshxona uchun buyurtma kartochkasi ------------------------------------

const MODE_LABEL: Record<OrderMode, string> = { delivery: '🛵 Yetkazib berish', pickup: '🏃 Olib ketish' };
const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: '💵 Naqd',
  card: '💳 Karta (kuryerga)',
  online: '📲 Onlayn',
};
export const STATUS_ICON: Record<OrderStatus, string> = {
  pending_payment: '⏳',
  new: '🆕',
  accepted: '✅',
  baking: '🔥',
  delivering: '🛵',
  ready: '📦',
  done: '🏁',
  cancelled: '❌',
};

function itemLines(items: OrderItem[]): string[] {
  return items.map((item) => {
    const { title, details } = describeLine(item.config, 'uz');
    const head = `<b>${item.qty}×</b> ${esc(title)} — ${formatMoney(item.unit * item.qty, 'uz')}`;
    return details.length ? `${head}\n      <i>${esc(details.join(' · '))}</i>` : head;
  });
}

export function adminOrderText(order: O, customer: UserDto | null): string {
  const lines: string[] = [];

  lines.push(`${STATUS_ICON[order.status]} <b>Buyurtma #${order.id}</b> · ${formatTime(order.createdAt)}`);
  lines.push(`${MODE_LABEL[order.mode]} · ${PAYMENT_LABEL[order.payment]}${order.paid ? ' ✔️ toʻlangan' : ''}`);

  const name = customer
    ? [customer.firstName, customer.lastName].filter(Boolean).join(' ') || `#${customer.id}`
    : `#${order.userId}`;
  const username = customer?.username ? ` (@${esc(customer.username)})` : '';
  lines.push(
    `👤 <a href="tg://user?id=${order.userId}">${esc(name)}</a>${username} · ${esc(formatPhone(order.phone))}`,
  );
  lines.push('');

  if (order.groupCode) {
    lines.push(`👥 <b>Davra ${order.groupCode}</b>`);
    const byMember = new Map<string, OrderItem[]>();
    for (const item of order.items) {
      const key = item.by?.name || '—';
      byMember.set(key, [...(byMember.get(key) ?? []), item]);
    }
    for (const [member, items] of byMember) {
      lines.push(`— <u>${esc(member)}</u>`);
      lines.push(...itemLines(items));
    }
  } else {
    lines.push(...itemLines(order.items));
  }

  lines.push('');
  lines.push(`Mahsulotlar: ${formatMoney(order.subtotal, 'uz')}`);
  if (order.mode === 'delivery') {
    lines.push(`Yetkazish: ${order.deliveryFee ? formatMoney(order.deliveryFee, 'uz') : 'bepul'}`);
  }
  if (order.discount) lines.push(`🍕 Tilim kartasi: −${formatMoney(order.discount, 'uz')}`);
  lines.push(`<b>Jami: ${formatMoney(order.total, 'uz')}</b>`);

  if (order.address) {
    const a = order.address;
    const extra = [
      a.entrance && `podyezd ${a.entrance}`,
      a.floor && `qavat ${a.floor}`,
      a.apartment && `xonadon ${a.apartment}`,
    ].filter(Boolean);
    lines.push('');
    lines.push(`📍 ${esc(a.text)}${extra.length ? ` · ${esc(extra.join(' · '))}` : ''}`);
  }
  if (order.distanceKm != null) lines.push(`📏 ${order.distanceKm} km`);
  if (order.comment) lines.push(`💬 ${esc(order.comment)}`);

  lines.push('');
  lines.push(`Holat: <b>${STATUS_ICON[order.status]} ${tr(STATUS_LABELS[order.status], 'uz')}</b>`);
  if (['new', 'accepted', 'baking', 'delivering'].includes(order.status) && order.etaAt) {
    lines.push(`⏱ Mijozga vaʼda: ${formatTime(order.etaAt)}`);
  }

  return lines.join('\n');
}

/** Davra buyurtmasida har bir ishtirokchining ulushi */
export function groupShares(order: O): BillShare[] {
  return splitBill(membersFromItems(order.items), {
    deliveryFee: order.deliveryFee,
    discount: order.discount,
    hostId: order.userId,
  });
}
