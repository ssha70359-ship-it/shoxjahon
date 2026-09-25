// Telegram bilan bog'liq hamma narsani yig'adi: bot, handler'lar, bildirishnomalar,
// to'lov havolasi va "Davra" ulashish. BOT_TOKEN bo'lmasa — "bo'sh" gateway (API baribir ishlaydi).

import crypto from 'node:crypto';

import type { Express } from 'express';
import { Telegraf } from 'telegraf';

import { describeLine } from '../../shared/pricing.js';
import { SHOP } from '../../shared/shop.js';
import type { GroupDto, GroupShareDto, Lang, UserDto } from '../../shared/types.js';
import type { AppConfig } from '../config/env.js';
import { DomainError } from '../lib/errors.js';
import type { EventBus } from '../lib/events.js';
import type { Logger } from '../lib/logger.js';
import type { Services } from '../services/index.js';
import { displayName, type OrderRecord } from '../services/mappers.js';
import type { BotContext } from './context.js';
import type { TelegramGateway } from './gateway.js';
import { registerCustomerHandlers } from './handlers/customer.handlers.js';
import { registerKitchenHandlers } from './handlers/kitchen.handlers.js';
import { registerPaymentHandlers } from './handlers/payment.handlers.js';
import { Notifier } from './notifier.js';
import { texts } from './texts.js';

const ALLOWED_UPDATES = ['message', 'callback_query', 'pre_checkout_query'] as const;

interface GatewayDeps {
  config: AppConfig;
  services: Services;
  bus: EventBus;
  logger: Logger;
}

function shareText(user: UserDto, group: GroupDto): string {
  return user.language === 'ru'
    ? `${displayName(user)} зовёт вас в давру ${group.code} — выберите себе пиццу 🍕`
    : `${displayName(user)} sizni ${group.code} davrasiga chaqiryapti — oʻzingizga pitsa tanlang 🍕`;
}

/** Bot o'chiq bo'lganda: API ishlayveradi, Telegram funksiyalari o'chiq */
class NullGateway implements TelegramGateway {
  readonly bot = null;
  readonly username = null;
  readonly canPay = false;

  appLink(): string | null {
    return null;
  }

  async createInvoiceLink(): Promise<string> {
    throw new DomainError('online_disabled');
  }

  async prepareGroupShare(user: UserDto, group: GroupDto): Promise<GroupShareDto> {
    return { preparedId: null, link: null, text: shareText(user, group) };
  }

  async start(): Promise<void> {}

  async stop(): Promise<void> {}
}

class TelegrafGateway implements TelegramGateway {
  readonly bot: Telegraf;
  readonly canPay: boolean;
  username: string | null = null;
  private readonly ctx: BotContext;

  constructor(private readonly deps: GatewayDeps) {
    const { config, services, logger, bus } = deps;
    this.bot = new Telegraf(
      config.botToken,
      config.telegramApiRoot ? { telegram: { apiRoot: config.telegramApiRoot } } : {},
    );
    this.canPay = Boolean(config.paymentProviderToken);

    const webAppUrl = config.publicUrl.startsWith('https://') ? config.publicUrl : '';
    this.ctx = {
      bot: this.bot,
      config,
      services,
      logger,
      webAppUrl,
      openButton: (text, query = '') => ({ text, web_app: { url: `${webAppUrl}${query}` } }),
      isStaff: (chatId, userId) => {
        if (config.adminIds.length) return userId != null && config.adminIds.includes(userId);
        return Boolean(config.adminChatId) && String(chatId) === config.adminChatId;
      },
      safe: async (promise, what) => {
        try {
          return await promise;
        } catch (error) {
          const description =
            (error as { response?: { description?: string } }).response?.description ?? (error as Error).message;
          if (!/message is not modified/.test(description)) logger.warn(`[bot] ${what}: ${description}`);
          return null;
        }
      },
    };

    const notifier = new Notifier(this.ctx);
    registerCustomerHandlers(this.ctx);
    registerKitchenHandlers(this.ctx, (id) => notifier.refreshCard(id));
    registerPaymentHandlers(this.ctx);
    notifier.subscribe(bus);

    this.bot.catch((error, tg) => logger.error(`[bot] ${tg.updateType}:`, error));
  }

  appLink(param: string): string | null {
    if (!this.username) return null;
    const short = this.deps.config.miniAppShortName;
    return short
      ? `https://t.me/${this.username}/${short}?startapp=${param}`
      : `https://t.me/${this.username}?start=${param}`;
  }

  async createInvoiceLink(order: OrderRecord, lang: Lang): Promise<string> {
    if (!this.canPay) throw new DomainError('online_disabled');
    const t = texts(lang);
    const description = order.items
      .map((item) => `${item.qty}× ${describeLine(item.config, lang).title}`)
      .join(', ')
      .slice(0, 250);

    return this.bot.telegram.createInvoiceLink({
      title: t.payTitle(order.id),
      description,
      payload: `order:${order.id}`,
      provider_token: this.deps.config.paymentProviderToken,
      currency: SHOP.currency,
      // Telegram summani eng kichik birlikda kutadi (UZS: tiyin)
      prices: [{ label: t.payLabel, amount: order.total * 100 }],
    });
  }

  async prepareGroupShare(user: UserDto, group: GroupDto): Promise<GroupShareDto> {
    const link = this.appLink(`g_${group.code}`);
    const t = texts(user.language);
    let preparedId: string | null = null;

    if (link) {
      // Bot API 8.0: chiroyli kartochka bilan ulashish (Telegram.WebApp.shareMessage)
      const prepared = await this.ctx.safe(
        this.bot.telegram.callApi(
          'savePreparedInlineMessage' as never,
          {
            user_id: user.id,
            result: {
              type: 'article',
              id: `g${group.code}${Date.now().toString(36)}`,
              title: t.shareTitle,
              description: t.shareDescription,
              input_message_content: { message_text: t.shareText(displayName(user), group.code), parse_mode: 'HTML' },
              reply_markup: { inline_keyboard: [[{ text: t.joinGroup, url: link }]] },
            },
            allow_user_chats: true,
            allow_group_chats: true,
          } as never,
        ) as Promise<{ id: string }>,
        'savePreparedInlineMessage',
      );
      preparedId = prepared?.id ?? null;
    }

    return { preparedId, link, text: shareText(user, group) };
  }

  async start(app: Express): Promise<void> {
    const { config, logger } = this.deps;
    const { safe, webAppUrl } = this.ctx;
    const telegram = this.bot.telegram;

    const me = await telegram.getMe();
    this.username = me.username;
    logger.info(`🤖 Bot: @${me.username}`);

    if (webAppUrl) {
      await safe(
        telegram.setChatMenuButton({ menuButton: { type: 'web_app', text: '🍕 Menyu', web_app: { url: webAppUrl } } }),
        'setChatMenuButton',
      );
    } else {
      logger.warn('⚠️  PUBLIC_URL https emas — Mini App tugmasi oʻrnatilmadi');
    }

    await safe(
      telegram.setMyCommands([
        { command: 'start', description: 'Bosh sahifa' },
        { command: 'orders', description: 'Soʻnggi buyurtmalar' },
        { command: 'til', description: 'Tilni oʻzgartirish' },
        { command: 'help', description: 'Yordam' },
      ]),
      'setMyCommands',
    );
    // Avval ruscha buyruqlar ro'yxati o'rnatilgan bo'lishi mumkin — o'chiramiz, hamma o'zbekcha ko'rsin
    await safe(telegram.deleteMyCommands({ language_code: 'ru' }), 'deleteMyCommands ru');
    if (config.adminChatId) {
      await safe(
        telegram.setMyCommands(
          [
            { command: 'stats', description: 'Bugungi statistika' },
            { command: 'stop', description: 'Stop-list (tugagan mahsulotlar)' },
            { command: 'orders', description: 'Soʻnggi buyurtmalar' },
          ],
          { scope: { type: 'chat', chat_id: config.adminChatId } },
        ),
        'setMyCommands admin',
      );
    }

    if (config.useWebhook) {
      // Maxfiy token: Telegram har so'rovda header'da yuboradi, begona so'rovlar rad etiladi
      const secret =
        config.webhookSecret || crypto.createHash('sha256').update(config.botToken).digest('hex').slice(0, 32);
      app.use(
        await this.bot.createWebhook({
          domain: config.publicUrl,
          path: `/telegram/${secret.slice(0, 16)}`,
          secret_token: secret,
          allowed_updates: [...ALLOWED_UPDATES],
        }),
      );
      logger.info('🔗 Webhook rejimi');
    } else {
      await safe(telegram.deleteWebhook(), 'deleteWebhook');
      this.bot
        .launch({ dropPendingUpdates: true, allowedUpdates: [...ALLOWED_UPDATES] })
        .catch((error: Error) => logger.error('[bot] polling toʻxtadi:', error.message));
      logger.info('🔁 Polling rejimi');
    }
  }

  async stop(): Promise<void> {
    try {
      this.bot.stop('shutdown');
    } catch {
      // polling ishga tushmagan bo'lishi mumkin
    }
  }
}

export function createTelegramGateway(deps: GatewayDeps): TelegramGateway {
  if (!deps.config.botToken) {
    deps.logger.warn('⚠️  BOT_TOKEN yoʻq — bot oʻchiq, faqat API va Mini App ishlaydi');
    return new NullGateway();
  }
  return new TelegrafGateway(deps);
}
