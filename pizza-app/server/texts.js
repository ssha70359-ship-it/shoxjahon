// Bot xabarlari: mijozga — uning tilida, oshxonaga — o'zbekcha.

import { SHOP } from '../shared/shop.js';
import { formatMoney, formatPhone, formatTime } from '../shared/format.js';
import { describeLine, membersFromItems, splitBill } from '../shared/pricing.js';
import { STATUS_LABELS } from '../shared/status.js';
import { tr } from '../shared/menu.js';

export const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const T = {
  uz: {
    welcome: (name) =>
      `Assalomu alaykum, <b>${esc(name)}</b>! 🔥\n\n` +
      `<b>${SHOP.name}</b> — ${esc(SHOP.tagline.uz)}.\n\n` +
      '🎨 Pitsani oʻzingiz yigʻing — masalliqlar koʻz oldingizda joylashadi\n' +
      '◐ Yarim-yarim: bitta pitsada ikki xil taʼm\n' +
      '👥 Davra: doʻstlar bilan bitta buyurtma, hisob avtomatik boʻlinadi\n' +
      '🍕 Har bir pitsa — tilim kartangizga bir tilim. 8 tasi = bepul pitsa\n\n' +
      'Pastdagi tugmani bosing 👇',
    open: '🍕 Menyuni ochish',
    menuButton: '🍕 Menyu',
    notConfigured:
      'Mini App hali sozlanmagan. Administrator PUBLIC_URL manzilini koʻrsatishi kerak.',
    groupInvite: (code) =>
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
    created: (order) =>
      `🧾 <b>Buyurtma #${order.id}</b> oshxonaga yuborildi.\n` +
      `Jami: <b>${formatMoney(order.total, 'uz')}</b>\n\n` +
      'Holatini shu yerda va ilovada jonli kuzatasiz.',
    groupCreated: (order, amount) =>
      `👥 <b>Davra buyurtmasi #${order.id}</b> berildi!\n` +
      (amount != null ? `Sizning ulushingiz: <b>${formatMoney(amount, 'uz')}</b>\n` : '') +
      '\nPitsalar pechga tushishi bilan xabar beramiz.',
    status: {
      accepted: (o) =>
        `✅ <b>#${o.id}</b> qabul qilindi! Oshpaz xamirni yoymoqda.\n` +
        `Taxminan <b>${formatTime(o.etaAt)}</b> da ${o.mode === 'pickup' ? 'tayyor boʻladi' : 'yetkaziladi'}.`,
      baking: (o) => `🔥 <b>#${o.id}</b> pechda! 400°C, 90 soniya — hidini sezyapsizmi?`,
      delivering: (o) =>
        `🛵 Kuryer yoʻlda! <b>#${o.id}</b> taxminan <b>${formatTime(o.etaAt)}</b> da yetib boradi.`,
      ready: (o) =>
        `📦 <b>#${o.id}</b> tayyor! Olib ketishingiz mumkin:\n${esc(SHOP.address.uz)}`,
      done: (o, slices) =>
        `🍕 Yoqimli ishtaha!` +
        (o.slicesEarned > 0
          ? `\nTilim kartangizga <b>+${o.slicesEarned}</b> tilim qoʻshildi (${slices}/${SHOP.loyalty.slicesForReward}).`
          : ''),
      cancelled: (o) =>
        `❌ <b>#${o.id}</b> bekor qilindi.` +
        (o.slicesUsed > 0 ? '\nIshlatilgan tilimlar kartangizga qaytarildi.' : '') +
        `\nSavollar boʻlsa: ${SHOP.phone}`,
    },
    paid: (o) => `💳 <b>#${o.id}</b> uchun toʻlov qabul qilindi. Rahmat!`,
    payTitle: (id) => `${SHOP.name} — buyurtma #${id}`,
    payLabel: 'Buyurtma',
    payProblem: 'Buyurtma topilmadi yoki allaqachon toʻlangan.',
    shareTitle: 'Davraga qoʻshiling 🍕',
    shareText: (name, code) =>
      `👥 <b>${esc(name)}</b> sizni <b>${SHOP.name}</b> dagi davrasiga chaqiryapti!\n\n` +
      `Har kim oʻz pitsasini tanlaydi, buyurtma bitta boʻlib ketadi. Davra kodi: <b>${code}</b>`,
    shareDescription: 'Har kim oʻz pitsasini tanlaydi — buyurtma bitta.',
  },
  ru: {
    welcome: (name) =>
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
    groupInvite: (code) =>
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
    created: (order) =>
      `🧾 <b>Заказ #${order.id}</b> отправлен на кухню.\n` +
      `Итого: <b>${formatMoney(order.total, 'ru')}</b>\n\n` +
      'Статус можно отслеживать здесь и в приложении.',
    groupCreated: (order, amount) =>
      `👥 <b>Заказ давры #${order.id}</b> оформлен!\n` +
      (amount != null ? `Ваша доля: <b>${formatMoney(amount, 'ru')}</b>\n` : '') +
      '\nСообщим, как только пиццы отправятся в печь.',
    status: {
      accepted: (o) =>
        `✅ <b>#${o.id}</b> принят! Повар уже раскатывает тесто.\n` +
        `Примерно в <b>${formatTime(o.etaAt)}</b> ${o.mode === 'pickup' ? 'будет готов' : 'будет у вас'}.`,
      baking: (o) => `🔥 <b>#${o.id}</b> в печи! 400°C, 90 секунд — чувствуете аромат?`,
      delivering: (o) =>
        `🛵 Курьер в пути! <b>#${o.id}</b> будет примерно в <b>${formatTime(o.etaAt)}</b>.`,
      ready: (o) => `📦 <b>#${o.id}</b> готов! Можно забирать:\n${esc(SHOP.address.ru)}`,
      done: (o, slices) =>
        `🍕 Приятного аппетита!` +
        (o.slicesEarned > 0
          ? `\nНа карту добавлено <b>+${o.slicesEarned}</b> (${slices}/${SHOP.loyalty.slicesForReward}).`
          : ''),
      cancelled: (o) =>
        `❌ <b>#${o.id}</b> отменён.` +
        (o.slicesUsed > 0 ? '\nКусочки возвращены на карту.' : '') +
        `\nВопросы: ${SHOP.phone}`,
    },
    paid: (o) => `💳 Оплата заказа <b>#${o.id}</b> получена. Спасибо!`,
    payTitle: (id) => `${SHOP.name} — заказ #${id}`,
    payLabel: 'Заказ',
    payProblem: 'Заказ не найден или уже оплачен.',
    shareTitle: 'Присоединяйтесь к давре 🍕',
    shareText: (name, code) =>
      `👥 <b>${esc(name)}</b> зовёт вас в свою давру в <b>${SHOP.name}</b>!\n\n` +
      `Каждый выбирает свою пиццу, заказ — один. Код давры: <b>${code}</b>`,
    shareDescription: 'Каждый выбирает свою пиццу — заказ один.',
  },
};

export function texts(lang) {
  return T[lang] ?? T.uz;
}

// --- Oshxona uchun buyurtma kartochkasi ------------------------------------

const MODE_LABEL = { delivery: '🛵 Yetkazib berish', pickup: '🏃 Olib ketish' };
const PAYMENT_LABEL = { cash: '💵 Naqd', card: '💳 Karta (kuryerga)', online: '📲 Onlayn' };
const STATUS_ICON = {
  pending_payment: '⏳',
  new: '🆕',
  accepted: '✅',
  baking: '🔥',
  delivering: '🛵',
  ready: '📦',
  done: '🏁',
  cancelled: '❌',
};

function itemLines(items) {
  return items.map((item) => {
    const { title, details } = describeLine(item.config, 'uz');
    const head = `<b>${item.qty}×</b> ${esc(title)} — ${formatMoney(item.unit * item.qty, 'uz')}`;
    return details.length ? `${head}\n      <i>${esc(details.join(' · '))}</i>` : head;
  });
}

export function adminOrderText(order, customer) {
  const lines = [];
  const time = formatTime(order.createdAt);

  lines.push(`${STATUS_ICON[order.status] || '🧾'} <b>Buyurtma #${order.id}</b> · ${time}`);
  lines.push(`${MODE_LABEL[order.mode]} · ${PAYMENT_LABEL[order.payment]}${order.paid ? ' ✔️ toʻlangan' : ''}`);

  const name = customer
    ? [customer.firstName, customer.lastName].filter(Boolean).join(' ') || `#${customer.id}`
    : `#${order.userId}`;
  const username = customer?.username ? ` (@${esc(customer.username)})` : '';
  lines.push(`👤 <a href="tg://user?id=${order.userId}">${esc(name)}</a>${username} · ${esc(formatPhone(order.phone))}`);
  lines.push('');

  if (order.groupCode) {
    lines.push(`👥 <b>Davra ${order.groupCode}</b>`);
    const byMember = new Map();
    for (const item of order.items) {
      const key = item.by?.name || '—';
      if (!byMember.has(key)) byMember.set(key, []);
      byMember.get(key).push(item);
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

const NEXT_BUTTON = {
  new: { to: 'accepted', text: '✅ Qabul qilish' },
  accepted: { to: 'baking', text: '🔥 Pechga' },
  baking: {
    delivery: { to: 'delivering', text: '🛵 Kuryerga berildi' },
    pickup: { to: 'ready', text: '📦 Tayyor' },
  },
  delivering: { to: 'done', text: '🏁 Yetkazildi' },
  ready: { to: 'done', text: '🏁 Mijoz oldi' },
};

export function adminKeyboard(order) {
  const rows = [];
  let next = NEXT_BUTTON[order.status];
  if (next && !next.to) next = next[order.mode];

  const row = [];
  if (next) row.push({ text: next.text, callback_data: `st:${order.id}:${next.to}` });
  if (['pending_payment', 'new', 'accepted', 'baking'].includes(order.status)) {
    row.push({ text: '❌ Bekor', callback_data: `st:${order.id}:cancelled` });
  }
  if (row.length) rows.push(row);

  if (order.address?.lat != null && order.status !== 'done' && order.status !== 'cancelled') {
    const { lat, lng } = order.address;
    rows.push([
      { text: '🗺 Yandex xarita', url: `https://yandex.uz/maps/?pt=${lng},${lat}&z=17&l=map` },
      { text: '🧭 Google', url: `https://maps.google.com/?q=${lat},${lng}` },
    ]);
  }

  return { inline_keyboard: rows };
}

/** Davra buyurtmasida har bir ishtirokchining ulushi */
export function groupShares(order) {
  return splitBill(membersFromItems(order.items), {
    deliveryFee: order.deliveryFee,
    discount: order.discount,
    hostId: order.userId,
  });
}
