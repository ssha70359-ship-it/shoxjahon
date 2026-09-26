import type { Request, Response } from 'express';

import { reverseGeocodeSchema } from '../../shared/schemas.js';
import { read } from '../middlewares/validate.js';
import type { Services } from '../services/index.js';

/** Joylashuv: Mini App belgilangan nuqtaning manzilini so'raydi */
export class GeoController {
  constructor(private readonly services: Services) {}

  reverse = async (req: Request, res: Response): Promise<void> => {
    const { lat, lng } = read(req, reverseGeocodeSchema);
    res.json({ ok: true, text: await this.services.geocode.reverse(lat, lng) });
  };
}
