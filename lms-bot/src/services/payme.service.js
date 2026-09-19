import crypto from 'node:crypto';

import config from '../config/index.js';
import OrderModel from '../models/order.model.js';
import TransactionModel, { TransactionState } from '../models/transaction.model.js';
import logger from '../utils/logger.js';

/**
 * Payme Merchant API (JSON-RPC 2.0).
 * Hujjat: https://developer.help.paycom.uz/metody-merchant-api/
 *
 * Muhim qoidalar:
 *  - Har qanday holatda HTTP 200 qaytariladi, xato JSON ichida bo'ladi.
 *  - Summalar TIYINDA keladi (1 so'm = 100 tiyin).
 *  - `account` ichidagi maydon nomi Payme kabinetidagi nom bilan bir xil bo'lishi shart.
 */

/** Payme kabinetida ko'rsatilgan "Hisob" maydoni nomi */
export const ACCOUNT_FIELD = 'order_id';

/** Protokol xatolari. message uchta tilda bo'lishi majburiy. */
export const PaymeError = {
  InvalidAmount: {
    code: -31001,
    message: {
      uz: 'Noto‘g‘ri summa',
      ru: 'Неверная сумма',
      en: 'Invalid amount',
    },
  },
  TransactionNotFound: {
    code: -31003,
    message: {
      uz: 'Tranzaksiya topilmadi',
      ru: 'Транзакция не найдена',
      en: 'Transaction not found',
    },
  },
  CantDoOperation: {
    code: -31008,
    message: {
      uz: 'Amalni bajarib bo‘lmadi',
      ru: 'Невозможно выполнить операцию',
      en: 'Unable to perform operation',
    },
  },
  OrderNotFound: {
    code: -31050,
    message: {
      uz: 'Ariza topilmadi',
      ru: 'Заявка не найдена',
      en: 'Order not found',
    },
  },
  OrderAlreadyPaid: {
    code: -31051,
    message: {
      uz: 'Ariza allaqachon to‘langan',
      ru: 'Заявка уже оплачена',
      en: 'Order is already paid',
    },
  },
  OrderCancelled: {
    code: -31052,
    message: {
      uz: 'Ariza bekor qilingan',
      ru: 'Заявка отменена',
      en: 'Order is cancelled',
    },
  },
  Unauthorized: {
    code: -32504,
    message: {
      uz: 'Ruxsat yo‘q',
      ru: 'Недостаточно привилегий',
      en: 'Insufficient privileges',
    },
  },
  MethodNotFound: {
    code: -32601,
    message: {
      uz: 'Bunday metod yo‘q',
      ru: 'Метод не найден',
      en: 'Method not found',
    },
  },
  InvalidParams: {
    code: -32602,
    message: {
      uz: 'Noto‘g‘ri parametrlar',
      ru: 'Неверные параметры',
      en: 'Invalid params',
    },
  },
};

/** Kontrollerga xatoni yetkazuvchi maxsus xato turi */
export class PaymeRpcError extends Error {
  constructor({ code, message }, data) {
    super(message.en);
    this.name = 'PaymeRpcError';
    this.code = code;
    this.rpcMessage = message;
    this.data = data;
  }
}

function fail(error, data) {
  throw new PaymeRpcError(error, data);
}

/** Sanani Payme kutadigan millisekundga aylantiradi (bo'sh bo'lsa 0) */
function toMs(date) {
  return date ? new Date(date).getTime() : 0;
}

function safeEqual(a, b) {
  const bufferA = Buffer.from(String(a), 'utf8');
  const bufferB = Buffer.from(String(b), 'utf8');

  if (bufferA.length !== bufferB.length) return false;

  return crypto.timingSafeEqual(bufferA, bufferB);
}

/**
 * `Authorization: Basic base64("Paycom:<KEY>")` sarlavhasini tekshiradi.
 * Asosiy kalit ham, test kaliti ham qabul qilinadi (sandbox uchun).
 */
export function isAuthorized(authorizationHeader) {
  if (!authorizationHeader?.startsWith('Basic ')) return false;

  const decoded = Buffer.from(authorizationHeader.slice(6), 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator === -1) return false;

  const login = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);

  if (login !== 'Paycom') return false;

  const keys = [config.payme.key, config.payme.testKey].filter(Boolean);
  if (keys.length === 0) return false;

  return keys.some((key) => safeEqual(password, key));
}

/** Tranzaksiya 12 soatlik muddatdan oshib ketganmi? */
function isExpired(transaction) {
  return Date.now() - new Date(transaction.createdTime).getTime() > config.payme.timeoutMs;
}

/** So'rovdan ariza raqamini ajratib oladi va arizani topadi */
async function resolveOrder(params) {
  const rawId = params?.account?.[ACCOUNT_FIELD];
  const orderId = Number(rawId);

  if (!rawId || !Number.isInteger(orderId) || orderId <= 0) {
    fail(PaymeError.OrderNotFound, ACCOUNT_FIELD);
  }

  const order = await OrderModel.findById(orderId);
  if (!order) fail(PaymeError.OrderNotFound, ACCOUNT_FIELD);

  return order;
}

/** Summa arizadagi summa bilan bir xilmi? (tiyinda solishtiriladi) */
function assertAmount(order, amount) {
  if (Number(amount) !== order.amount * 100) fail(PaymeError.InvalidAmount);
}

// ---------------------------------------------------------------------------
// Protokol metodlari
// ---------------------------------------------------------------------------

const methods = {
  /** To'lovni boshlash mumkinmi? Payme foydalanuvchiga summa ko'rsatishdan oldin so'raydi. */
  async CheckPerformTransaction(params) {
    const order = await resolveOrder(params);

    if (order.status === 'PAID') fail(PaymeError.OrderAlreadyPaid, ACCOUNT_FIELD);
    if (order.status === 'CANCELLED') fail(PaymeError.OrderCancelled, ACCOUNT_FIELD);

    assertAmount(order, params.amount);

    return {
      allow: true,
      detail: {
        receipt_type: 0,
        items: [
          {
            title: order.course.title,
            price: order.amount * 100,
            count: 1,
            code: '10399002001000000', // IKPU: ta'lim xizmatlari
            package_code: '1',
            vat_percent: 0,
          },
        ],
      },
    };
  },

  /** Tranzaksiya ochadi. Payme takroriy yuborishi mumkin - javob bir xil bo'lishi shart. */
  async CreateTransaction(params) {
    const existing = await TransactionModel.findByProviderId('PAYME', params.id);

    if (existing) {
      if (existing.state !== TransactionState.CREATED) fail(PaymeError.CantDoOperation);

      if (isExpired(existing)) {
        // Protokol talabi: muddati o'tgan tranzaksiya 4-sabab bilan bekor qilinadi
        await TransactionModel.cancel(existing.id, {
          orderId: existing.orderId,
          reason: 4,
          wasPerformed: false,
        });
        fail(PaymeError.CantDoOperation);
      }

      return {
        create_time: toMs(existing.createdTime),
        transaction: String(existing.id),
        state: existing.state,
      };
    }

    const order = await resolveOrder(params);

    if (order.status === 'PAID') fail(PaymeError.OrderAlreadyPaid, ACCOUNT_FIELD);
    if (order.status === 'CANCELLED') fail(PaymeError.OrderCancelled, ACCOUNT_FIELD);

    assertAmount(order, params.amount);

    // Bitta arizada bir vaqtda faqat bitta ochiq tranzaksiya bo'lishi mumkin
    const active = await TransactionModel.findActiveByOrder(order.id);
    if (active) fail(PaymeError.CantDoOperation);

    const createdTime = Number(params.time) > 0 ? new Date(Number(params.time)) : new Date();

    const transaction = await TransactionModel.create({
      orderId: order.id,
      provider: 'PAYME',
      providerTransId: params.id,
      amount: Number(params.amount),
      createdTime,
    });

    logger.payment(`Payme: tranzaksiya ochildi #${transaction.id} (ariza #${order.id})`);

    return {
      create_time: toMs(transaction.createdTime),
      transaction: String(transaction.id),
      state: transaction.state,
    };
  },

  /** To'lovni tasdiqlaydi. Aynan shu yerda ariza PAID bo'ladi. */
  async PerformTransaction(params) {
    const transaction = await TransactionModel.findByProviderId('PAYME', params.id);
    if (!transaction) fail(PaymeError.TransactionNotFound);

    // Takroriy so'rov - avvalgi javobni qaytaramiz (idempotentlik)
    if (transaction.state === TransactionState.PERFORMED) {
      return {
        transaction: String(transaction.id),
        perform_time: toMs(transaction.performedAt),
        state: transaction.state,
      };
    }

    if (transaction.state !== TransactionState.CREATED) fail(PaymeError.CantDoOperation);

    if (isExpired(transaction)) {
      await TransactionModel.cancel(transaction.id, {
        orderId: transaction.orderId,
        reason: 4,
        wasPerformed: false,
      });
      fail(PaymeError.CantDoOperation);
    }

    const performed = await TransactionModel.perform(transaction.id, {
      orderId: transaction.orderId,
      provider: 'PAYME',
    });

    logger.payment(`Payme: to‘lov tasdiqlandi #${performed.id} (ariza #${transaction.orderId})`);

    return {
      transaction: String(performed.id),
      perform_time: toMs(performed.performedAt),
      state: performed.state,
    };
  },

  /** To'lovni bekor qiladi yoki pulni qaytaradi */
  async CancelTransaction(params) {
    const transaction = await TransactionModel.findByProviderId('PAYME', params.id);
    if (!transaction) fail(PaymeError.TransactionNotFound);

    // Allaqachon bekor qilingan - o'sha javobni qaytaramiz
    if (transaction.state < 0) {
      return {
        transaction: String(transaction.id),
        cancel_time: toMs(transaction.cancelledAt),
        state: transaction.state,
      };
    }

    const wasPerformed = transaction.state === TransactionState.PERFORMED;

    const cancelled = await TransactionModel.cancel(transaction.id, {
      orderId: transaction.orderId,
      reason: params.reason,
      wasPerformed,
    });

    logger.payment(
      `Payme: tranzaksiya bekor qilindi #${cancelled.id} (sabab: ${params.reason ?? '-'})`,
    );

    return {
      transaction: String(cancelled.id),
      cancel_time: toMs(cancelled.cancelledAt),
      state: cancelled.state,
    };
  },

  /** Payme tranzaksiya holatini so'raydi */
  async CheckTransaction(params) {
    const transaction = await TransactionModel.findByProviderId('PAYME', params.id);
    if (!transaction) fail(PaymeError.TransactionNotFound);

    return {
      create_time: toMs(transaction.createdTime),
      perform_time: toMs(transaction.performedAt),
      cancel_time: toMs(transaction.cancelledAt),
      transaction: String(transaction.id),
      state: transaction.state,
      reason: transaction.reason ?? null,
    };
  },

  /** Solishtirish (sverka) uchun davr bo'yicha tranzaksiyalar ro'yxati */
  async GetStatement(params) {
    const { from, to } = params || {};

    if (!Number(from) || !Number(to)) fail(PaymeError.InvalidParams);

    const rows = await TransactionModel.findInPeriod('PAYME', from, to);

    return {
      transactions: rows.map((transaction) => ({
        id: transaction.providerTransId,
        time: toMs(transaction.createdTime),
        amount: transaction.amount,
        account: { [ACCOUNT_FIELD]: String(transaction.orderId) },
        create_time: toMs(transaction.createdTime),
        perform_time: toMs(transaction.performedAt),
        cancel_time: toMs(transaction.cancelledAt),
        transaction: String(transaction.id),
        state: transaction.state,
        reason: transaction.reason ?? null,
      })),
    };
  },
};

/**
 * JSON-RPC so'rovini tegishli metodga uzatadi.
 * Xatolarni kontroller ushlaydi va JSON-RPC formatida qaytaradi.
 */
export async function handleRequest({ method, params }) {
  const handler = methods[method];

  if (!handler) fail(PaymeError.MethodNotFound, method);

  return handler(params || {});
}

/**
 * Mini App uchun to'lov havolasi.
 * Payme `base64(m=...;ac.order_id=...;a=...;c=...)` ko'rinishidagi manzilni kutadi.
 */
export function buildCheckoutUrl(order, { returnUrl } = {}) {
  const parts = [
    `m=${config.payme.merchantId}`,
    `ac.${ACCOUNT_FIELD}=${order.id}`,
    `a=${order.amount * 100}`,
    'l=uz',
  ];

  if (returnUrl) parts.push(`c=${returnUrl}`);

  const payload = Buffer.from(parts.join(';'), 'utf8').toString('base64');

  return `${config.payme.checkoutUrl}/${payload}`;
}

export default { handleRequest, isAuthorized, buildCheckoutUrl, PaymeError, PaymeRpcError };
