import type { Request, Response } from 'express';
import { addGroupItemSchema, codeParamSchema, itemParamSchema, updateGroupItemSchema } from '../../shared/schemas.js';
import type { TelegramGateway } from '../bot/gateway.js';
import { AppError } from '../lib/errors.js';
import { currentUser } from '../middlewares/telegram-auth.js';
import { read } from '../middlewares/validate.js';
import type { Services } from '../services/index.js';

const codeOf = (req: Request) => read(req, codeParamSchema).code;

export class GroupController {
  constructor(
    private readonly services: Services,
    private readonly telegram: TelegramGateway,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json({ ok: true, group: await this.services.groups.create(currentUser(req)) });
  };

  view = async (req: Request, res: Response): Promise<void> => {
    res.json({ ok: true, group: await this.services.groups.view(codeOf(req), currentUser(req).id) });
  };

  join = async (req: Request, res: Response): Promise<void> => {
    res.json({ ok: true, group: await this.services.groups.join(codeOf(req), currentUser(req)) });
  };

  leave = async (req: Request, res: Response): Promise<void> => {
    await this.services.groups.leave(codeOf(req), currentUser(req).id);
    res.json({ ok: true });
  };

  addItem = async (req: Request, res: Response): Promise<void> => {
    const { config, qty } = read(req, addGroupItemSchema);
    const group = await this.services.groups.addItem(codeOf(req), currentUser(req).id, config, qty);
    res.status(201).json({ ok: true, group });
  };

  updateItem = async (req: Request, res: Response): Promise<void> => {
    const { code, id } = read(req, itemParamSchema);
    const { qty } = read(req, updateGroupItemSchema);
    const group = await this.services.groups.updateItem(code, currentUser(req).id, id, qty);
    res.json({ ok: true, group });
  };

  share = async (req: Request, res: Response): Promise<void> => {
    const user = currentUser(req);
    const group = await this.services.groups.view(codeOf(req), user.id);
    if (!group.isMember) throw new AppError('not_group_member');
    res.json({ ok: true, ...(await this.telegram.prepareGroupShare(user, group)) });
  };
}
