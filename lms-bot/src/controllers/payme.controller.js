import {
  handleRequest,
  isAuthorized,
  PaymeError,
  PaymeRpcError,
} from '../services/payme.service.js';
import logger from '../utils/logger.js';

/** JSON-RPC xato javobi. Payme har doim HTTP 200 kutadi. */
function rpcError(res, id, { code, message }, data) {
  return res.status(200).json({
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code, message, ...(data === undefined ? {} : { data }) },
  });
}

/**
 * POST /api/payments/payme
 *
 * Payme'dan keladigan barcha Merchant API so'rovlari shu yerdan o'tadi.
 * Yo'l .env dagi kalit bilan emas, Basic-auth bilan himoyalangan.
 */
export async function paymeWebhook(req, res) {
  const { id = null, method, params } = req.body || {};

  if (!isAuthorized(req.headers.authorization)) {
    logger.warn('Payme: avtorizatsiyasiz so‘rov', req.ip);
    return rpcError(res, id, PaymeError.Unauthorized);
  }

  if (!method || typeof method !== 'string') {
    return rpcError(res, id, PaymeError.MethodNotFound, method ?? null);
  }

  try {
    const result = await handleRequest({ method, params });

    return res.status(200).json({ jsonrpc: '2.0', id, result });
  } catch (error) {
    if (error instanceof PaymeRpcError) {
      return rpcError(res, id, { code: error.code, message: error.rpcMessage }, error.data);
    }

    // Kutilmagan xato - Payme uchun "amalni bajarib bo'lmadi" deb qaytariladi,
    // tafsilot esa faqat loglarda qoladi.
    logger.error('Payme webhook xatosi:', error);

    return rpcError(res, id, PaymeError.CantDoOperation);
  }
}

export default { paymeWebhook };
