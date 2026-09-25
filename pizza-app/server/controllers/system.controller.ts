import type { Request, Response } from 'express';

import { idParamSchema } from '../../shared/schemas.js';
import { nextStatus } from '../../shared/status.js';
import type { TelegramGateway } from '../bot/gateway.js';
import { AppError, DomainError } from '../lib/errors.js';
import type { SseHub } from '../lib/sse.js';
import { currentUser } from '../middlewares/telegram-auth.js';
import { read } from '../middlewares/validate.js';
import type { Services } from '../services/index.js';
import { toPublicOrder } from '../services/mappers.js';

/** Texnik yo'llar: health-check, jonli oqim va lokal sinov */
export class SystemController {
  constructor(
    private readonly services: Services,
    private readonly telegram: TelegramGateway,
    private readonly hub: SseHub,
  ) {}

  health = (_req: Request, res: Response): void => {
    res.json({ ok: true, bot: Boolean(this.telegram.username), streams: this.hub.size() });
  };

  stream = (req: Request, res: Response): void => {
    this.hub.connect(req, res, currentUser(req).id);
  };

  /**
   * Faqat lokal sinov (ALLOW_DEV_USER=true): botsiz ham oshxona tugmasini bosgandek
   * buyurtmani keyingi holatga o'tkazish — kuzatuv ekranini brauzerda ko'rish uchun.
   */
  devAdvance = async (req: Request, res: Response): Promise<void> => {
    const order = await this.services.orders.get(read(req, idParamSchema).id);
    if (!order) throw new AppError('order_not_found');
    const to = order.status === 'pending_payment' ? 'new' : nextStatus(order);
    if (!to) throw new DomainError('bad_transition');
    res.json({ ok: true, order: toPublicOrder(await this.services.orders.setStatus(order.id, to)) });
  };
}
