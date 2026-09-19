import crypto from 'node:crypto';

import config from '../config/index.js';
import OrderModel from '../models/order.model.js';
import TransactionModel, { TransactionState } from '../models/transaction.model.js';
import logger from '../utils/logger.js';

/**
 * Click Merchant API (SHOP API) - ikki bosqichli to'lov.
 * Hujjat: https://docs.click.uz/click-api-request/
 *
 *  1) Prepare  (action = 0) - Click arizani tekshirishni so'raydi, biz `merchant_prepare_id` beramiz
 *  2) Complete (action = 1) - Click pulni yechgach tasdiqlaydi, biz arizani PAID qilamiz
 *
 * Summalar SO'MDA, kasr bilan keladi ("450000.00"), Payme'dan farqli.
 */

export const ClickAction = {
  PREPARE: 0,
  COMPLETE: 1,
};

/** Click kutadigan javob kodlari */
export const ClickError = {
  SUCCESS: { error: 0, error_note: 'Success' },
  SIGN_CHECK_FAILED: { error: -1, error_note: 'SIGN CHECK FAILED' },
  INCORRECT_AMOUNT: { error: -2, error_note: 'Incorrect parameter amount' },
  ACTION_NOT_FOUND: { error: -3, error_note: 'Action not found' },
  ALREADY_PAID: { error: -4, error_note: 'Already paid' },
  ORDER_NOT_FOUND: { error: -5, error_note: 'User does not exist' },
  TRANSACTION_NOT_FOUND: { error: -6, error_note: 'Transaction does not exist' },
  BAD_REQUEST: { error: -8, error_note: 'Error in request from click' },
  TRANSACTION_CANCELLED: { error: -9, error_note: 'Transaction cancelled' },
};

/** Javobga so'rovdagi identifikatorlarni qo'shib qaytaradi */
function respond(params, result, extra = {}) {
  return {
    click_trans_id: params.click_trans_id,
    merchant_trans_id: params.merchant_trans_id,
    ...extra,
    ...result,
  };
}

function md5(value) {
  return crypto.createHash('md5').update(value, 'utf8').digest('hex');
}

function safeEqual(a, b) {
  const bufferA = Buffer.from(String(a).toLowerCase(), 'utf8');
  const bufferB = Buffer.from(String(b).toLowerCase(), 'utf8');

  if (bufferA.length !== bufferB.length) return false;

  return crypto.timingSafeEqual(bufferA, bufferB);
}

/**
 * Imzoni tekshiradi.
 * Prepare:  md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)
 * Complete: md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + merchant_prepare_id + amount + action + sign_time)
 */
export function verifySignature(params) {
  if (!config.click.secretKey || !params?.sign_string) return false;

  const isComplete = Number(params.action) === ClickAction.COMPLETE;

  const source = [
    params.click_trans_id,
    params.service_id,
    config.click.secretKey,
    params.merchant_trans_id,
    ...(isComplete ? [params.merchant_prepare_id] : []),
    params.amount,
    params.action,
    params.sign_time,
  ].join('');

  return safeEqual(md5(source), params.sign_string);
}

/** Click so'mda kasr bilan yuboradi - 1 tiyingacha farqqa yo'l qo'yamiz */
function amountMatches(order, amount) {
  const received = Number(amount);

  if (!Number.isFinite(received)) return false;

  return Math.abs(received - order.amount) < 0.01;
}

// ---------------------------------------------------------------------------
// 1-bosqich: Prepare
// ---------------------------------------------------------------------------

export async function prepare(params) {
  if (!verifySignature(params)) {
    logger.warn('Click: imzo mos kelmadi', params.merchant_trans_id);
    return respond(params, ClickError.SIGN_CHECK_FAILED);
  }

  if (Number(params.action) !== ClickAction.PREPARE) {
    return respond(params, ClickError.ACTION_NOT_FOUND);
  }

  const orderId = Number(params.merchant_trans_id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return respond(params, ClickError.ORDER_NOT_FOUND);
  }

  const order = await OrderModel.findById(orderId);
  if (!order) return respond(params, ClickError.ORDER_NOT_FOUND);

  if (order.status === 'PAID') return respond(params, ClickError.ALREADY_PAID);
  if (order.status === 'CANCELLED') return respond(params, ClickError.TRANSACTION_CANCELLED);

  if (!amountMatches(order, params.amount)) {
    return respond(params, ClickError.INCORRECT_AMOUNT);
  }

  // Click Prepare'ni takrorlashi mumkin - avval ochilgan tranzaksiyani qaytaramiz
  const existing = await TransactionModel.findByProviderId('CLICK', params.click_trans_id);

  if (existing) {
    if (existing.state === TransactionState.PERFORMED) {
      return respond(params, ClickError.ALREADY_PAID);
    }

    if (existing.state < 0) return respond(params, ClickError.TRANSACTION_CANCELLED);

    return respond(params, ClickError.SUCCESS, { merchant_prepare_id: existing.id });
  }

  const transaction = await TransactionModel.create({
    orderId: order.id,
    provider: 'CLICK',
    providerTransId: params.click_trans_id,
    amount: Math.round(Number(params.amount) * 100),
  });

  logger.payment(`Click: tranzaksiya tayyorlandi #${transaction.id} (ariza #${order.id})`);

  return respond(params, ClickError.SUCCESS, { merchant_prepare_id: transaction.id });
}

// ---------------------------------------------------------------------------
// 2-bosqich: Complete
// ---------------------------------------------------------------------------

export async function complete(params) {
  if (!verifySignature(params)) {
    logger.warn('Click: imzo mos kelmadi (complete)', params.merchant_trans_id);
    return respond(params, ClickError.SIGN_CHECK_FAILED);
  }

  if (Number(params.action) !== ClickAction.COMPLETE) {
    return respond(params, ClickError.ACTION_NOT_FOUND);
  }

  const transaction = await TransactionModel.findById(params.merchant_prepare_id);

  if (!transaction || transaction.provider !== 'CLICK') {
    return respond(params, ClickError.TRANSACTION_NOT_FOUND);
  }

  // `merchant_prepare_id` va `click_trans_id` bir-biriga mos kelishi shart:
  // birovning prepare_id sini boshqa tranzaksiyaga ulab bo'lmaydi
  if (String(transaction.providerTransId) !== String(params.click_trans_id)) {
    return respond(params, ClickError.TRANSACTION_NOT_FOUND);
  }

  if (Number(transaction.orderId) !== Number(params.merchant_trans_id)) {
    return respond(params, ClickError.TRANSACTION_NOT_FOUND);
  }

  if (transaction.state === TransactionState.PERFORMED) {
    // Takroriy so'rov - avvalgi javob qaytariladi
    return respond(params, ClickError.ALREADY_PAID, { merchant_confirm_id: transaction.id });
  }

  if (transaction.state < 0) return respond(params, ClickError.TRANSACTION_CANCELLED);

  // Click o'z tomonida xato bo'lsa manfiy `error` yuboradi - tranzaksiyani bekor qilamiz
  if (Number(params.error) < 0) {
    await TransactionModel.cancel(transaction.id, {
      orderId: transaction.orderId,
      reason: Number(params.error),
      wasPerformed: false,
    });

    logger.payment(`Click: tranzaksiya bekor qilindi #${transaction.id} (${params.error_note || ''})`);

    return respond(params, ClickError.TRANSACTION_CANCELLED);
  }

  if (!amountMatches(transaction.order, params.amount)) {
    return respond(params, ClickError.INCORRECT_AMOUNT);
  }

  const performed = await TransactionModel.perform(transaction.id, {
    orderId: transaction.orderId,
    provider: 'CLICK',
  });

  logger.payment(`Click: to‘lov tasdiqlandi #${performed.id} (ariza #${transaction.orderId})`);

  return respond(params, ClickError.SUCCESS, { merchant_confirm_id: performed.id });
}

/** Mini App uchun to'lov havolasi */
export function buildCheckoutUrl(order, { returnUrl } = {}) {
  const query = new URLSearchParams({
    service_id: config.click.serviceId,
    merchant_id: config.click.merchantId,
    amount: String(order.amount),
    transaction_param: String(order.id),
  });

  if (returnUrl) query.set('return_url', returnUrl);

  return `${config.click.checkoutUrl}?${query.toString()}`;
}

export default { prepare, complete, verifySignature, buildCheckoutUrl, ClickError };
