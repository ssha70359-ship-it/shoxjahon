import { ClickError, complete, prepare } from '../services/click.service.js';
import logger from '../utils/logger.js';

/**
 * POST /api/payments/click/prepare
 * POST /api/payments/click/complete
 *
 * Click `application/x-www-form-urlencoded` yuboradi, javob esa JSON bo'ladi.
 * Har qanday holatda HTTP 200 qaytariladi - xato `error` maydonida bo'ladi.
 */
function makeHandler(name, handler) {
  return async (req, res) => {
    // Click ba'zan query, ba'zan body orqali yuboradi
    const params = { ...req.query, ...req.body };

    try {
      return res.status(200).json(await handler(params));
    } catch (error) {
      logger.error(`Click ${name} xatosi:`, error);

      return res.status(200).json({
        click_trans_id: params.click_trans_id,
        merchant_trans_id: params.merchant_trans_id,
        ...ClickError.BAD_REQUEST,
      });
    }
  };
}

export const clickPrepare = makeHandler('prepare', prepare);
export const clickComplete = makeHandler('complete', complete);

export default { clickPrepare, clickComplete };
