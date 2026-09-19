import config, { clickEnabled, paymeEnabled } from '../config/index.js';
import * as clickService from './click.service.js';
import * as paymeService from './payme.service.js';

/**
 * Mini App'ga beriladigan to'lov variantlari.
 * Sozlanmagan tizim ro'yxatga umuman tushmaydi - foydalanuvchi ishlamaydigan
 * tugmani bosib qolmasligi uchun.
 */
export function buildPaymentOptions(order) {
  const returnUrl = config.webAppUrl || undefined;
  const options = [];

  if (paymeEnabled) {
    options.push({
      provider: 'PAYME',
      title: 'Payme',
      url: paymeService.buildCheckoutUrl(order, { returnUrl }),
    });
  }

  if (clickEnabled) {
    options.push({
      provider: 'CLICK',
      title: 'Click',
      url: clickService.buildCheckoutUrl(order, { returnUrl }),
    });
  }

  return options;
}

export default { buildPaymentOptions };
