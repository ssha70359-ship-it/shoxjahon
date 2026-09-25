import type { Request, Response } from 'express';

import { updateMeSchema } from '../../shared/schemas.js';
import { isOpenAt } from '../../shared/shop.js';
import { isActive } from '../../shared/status.js';
import type { BootstrapDto } from '../../shared/types.js';
import type { TelegramGateway } from '../bot/gateway.js';
import type { AppConfig } from '../config/env.js';
import { currentUser } from '../middlewares/telegram-auth.js';
import { read } from '../middlewares/validate.js';
import type { Services } from '../services/index.js';
import { toPublicOrder } from '../services/mappers.js';

export class UserController {
  constructor(
    private readonly services: Services,
    private readonly telegram: TelegramGateway,
    private readonly config: Pick<AppConfig, 'ignoreHours'>,
  ) {}

  /** Ilova ochilganda kerak bo'ladigan hamma narsa bitta so'rovda */
  bootstrap = async (req: Request, res: Response): Promise<void> => {
    const user = currentUser(req);
    const [orders, group] = await Promise.all([
      this.services.orders.listByUser(user.id, 10),
      this.services.groups.currentFor(user.id),
    ]);

    const payload: BootstrapDto = {
      user,
      open: this.config.ignoreHours || isOpenAt(),
      stoplist: [...this.services.stoplist.ids()],
      activeOrders: orders.filter((order) => isActive(order.status)).map((order) => toPublicOrder(order)),
      group,
      payments: { online: this.telegram.canPay },
      bot: { username: this.telegram.username },
      startParam: req.startParam ?? '',
    };
    res.json({ ok: true, ...payload });
  };

  updateMe = async (req: Request, res: Response): Promise<void> => {
    const user = await this.services.users.update(currentUser(req).id, {
      language: read(req, updateMeSchema).language,
    });
    res.json({ ok: true, user });
  };
}
