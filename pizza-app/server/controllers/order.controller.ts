import type { Request, Response } from 'express';

import { createOrderSchema, idParamSchema } from '../../shared/schemas.js';
import type { TelegramGateway } from '../bot/gateway.js';
import { AppError, DomainError } from '../lib/errors.js';
import { currentUser } from '../middlewares/telegram-auth.js';
import { read } from '../middlewares/validate.js';
import type { Services } from '../services/index.js';
import { toPublicOrder } from '../services/mappers.js';

export class OrderController {
  constructor(
    private readonly services: Services,
    private readonly telegram: TelegramGateway,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const user = currentUser(req);
    const orders = await this.services.orders.listByUser(user.id);
    res.json({ ok: true, orders: orders.map((order) => toPublicOrder(order)) });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const user = currentUser(req);
    const order = await this.services.orders.get(read(req, idParamSchema).id);
    if (!order || !(await this.services.orders.canView(order, user.id))) throw new AppError('order_not_found');
    res.json({ ok: true, order: toPublicOrder(order, user.id) });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const user = currentUser(req);
    const order = await this.services.orders.create(user, read(req, createOrderSchema));
    const invoiceUrl =
      order.status === 'pending_payment' ? await this.telegram.createInvoiceLink(order, user.language) : null;
    res.status(201).json({ ok: true, order: toPublicOrder(order), invoiceUrl });
  };

  invoice = async (req: Request, res: Response): Promise<void> => {
    const user = currentUser(req);
    const order = await this.services.orders.get(read(req, idParamSchema).id);
    if (!order || order.userId !== user.id) throw new AppError('order_not_found');
    if (order.status !== 'pending_payment') throw new DomainError('bad_transition');
    res.json({ ok: true, invoiceUrl: await this.telegram.createInvoiceLink(order, user.language) });
  };

  payCash = async (req: Request, res: Response): Promise<void> => {
    const order = await this.services.orders.switchToCash(read(req, idParamSchema).id, currentUser(req).id);
    res.json({ ok: true, order: toPublicOrder(order) });
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    const order = await this.services.orders.cancelByCustomer(read(req, idParamSchema).id, currentUser(req).id);
    res.json({ ok: true, order: toPublicOrder(order) });
  };
}
