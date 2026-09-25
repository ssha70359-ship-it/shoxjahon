// Ilova ichidagi hodisalar. Servislar faqat hodisa chiqaradi; kim tinglashini
// (bot, SSE) bilmaydi — shu tufayli qatlamlar bir-biriga bog'lanmaydi.

import { EventEmitter } from 'node:events';

import type { OrderStatus, UserDto } from '../../shared/types.js';
import type { OrderRecord } from '../services/mappers.js';

export interface AppEvents {
  'order:created': [order: OrderRecord];
  'order:updated': [order: OrderRecord, from: OrderStatus];
  'order:paid': [order: OrderRecord];
  'user:updated': [user: UserDto];
  'group:changed': [code: string];
  'stoplist:changed': [ids: string[]];
}

export class EventBus extends EventEmitter<AppEvents> {
  constructor() {
    super({ captureRejections: true });
    this.setMaxListeners(50);
  }
}
