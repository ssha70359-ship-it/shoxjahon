import type { AppConfig } from '../config/env.js';
import type { Clock } from '../lib/clock.js';
import type { EventBus } from '../lib/events.js';
import type { PrismaClient } from '../lib/prisma.js';
import { GeocodeService } from './geocode.service.js';
import { GroupService } from './group.service.js';
import { OrderService } from './order.service.js';
import { StoplistService } from './stoplist.service.js';
import { UserService } from './user.service.js';

export interface Services {
  users: UserService;
  stoplist: StoplistService;
  groups: GroupService;
  orders: OrderService;
  geocode: GeocodeService;
}

/** Barcha servislarni bog'liqliklari bilan yig'adi (oddiy dependency injection) */
export async function createServices(
  prisma: PrismaClient,
  bus: EventBus,
  clock: Clock,
  config: Pick<AppConfig, 'botToken' | 'paymentProviderToken' | 'ignoreHours' | 'geocoderUrl' | 'publicUrl'>,
): Promise<Services> {
  const users = new UserService(prisma, bus, clock);
  const stoplist = new StoplistService(prisma, bus);
  await stoplist.load();
  const groups = new GroupService(prisma, bus, clock, stoplist);
  const orders = new OrderService(prisma, bus, clock, users, groups, stoplist, {
    onlinePayments: Boolean(config.botToken && config.paymentProviderToken),
    ignoreHours: config.ignoreHours,
  });

  const geocode = new GeocodeService({
    baseUrl: config.geocoderUrl,
    userAgent: `OlovPizzaMiniApp/1.0${config.publicUrl ? ` (+${config.publicUrl})` : ''}`,
  });

  return { users, stoplist, groups, orders, geocode };
}
