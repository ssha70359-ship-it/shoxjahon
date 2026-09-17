import { message } from 'telegraf/filters';
import bot from '../core/bot.js';
import botController from '../controllers/botController.js';

/** Bot handlerlarini ro'yxatdan o'tkazish */
export function registerBotRoutes() {
  bot.start(botController.start);
  bot.help(botController.help);
  bot.command('admin', botController.admin);

  bot.on(message('contact'), botController.contact);
  bot.on(message('text'), botController.fallback);

  return bot;
}

export default registerBotRoutes;
