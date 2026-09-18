"""Botni ishga tushirish nuqtasi (entry point).

Ishga tushirish:
    python bot.py
"""

from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.types import BotCommand

from app.database.db import Database
from app.database.repository import Repository
from app.handlers import routers
from app.middlewares.deps import DependenciesMiddleware
from app.middlewares.throttling import ThrottlingMiddleware
from app.services.ai_client import create_ai_client
from app.services.prompts import build_system_prompt
from app.utils.logger import setup_logging
from config import settings

logger = logging.getLogger(__name__)


async def set_bot_commands(bot: Bot) -> None:
    """Telegram menyusidagi buyruqlar ro'yxatini o'rnatadi."""
    await bot.set_my_commands(
        [
            BotCommand(command="start", description="Botni ishga tushirish"),
            BotCommand(command="menu", description="Xizmatlar menyusi"),
            BotCommand(command="help", description="Yordam va buyruqlar"),
            BotCommand(command="reset", description="Suhbat tarixini tozalash"),
        ]
    )


async def main() -> None:
    setup_logging(settings.log_level)
    settings.validate_provider_keys()

    # --- Resurslarni tayyorlaymiz ---
    database = Database(settings.db_file)
    await database.connect()

    repo = Repository(database)
    ai = create_ai_client(settings)
    system_prompt = build_system_prompt(settings)

    bot = Bot(
        token=settings.bot_token,
        # Barcha xabarlar sukut bo'yicha HTML formatida yuboriladi
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher()

    # --- Middleware'lar ---
    # `update` darajasidagi middleware har qanday yangilanish uchun birinchi
    # ishlaydi: u bog'liqliklarni (repo, ai, prompt) `data` ga qo'shadi.
    dp.update.middleware(DependenciesMiddleware(repo, ai, system_prompt))
    # Anti-spam esa handler chaqirilishidan oldin juda tez yuborilgan
    # xabarlarni va tugma bosishlarini to'xtatadi.
    throttling = ThrottlingMiddleware(settings.throttle_rate)
    dp.message.middleware(throttling)
    dp.callback_query.middleware(throttling)

    # --- Routerlarni ulaymiz ---
    dp.include_routers(*routers)

    try:
        await set_bot_commands(bot)
        me = await bot.get_me()
        logger.info("Bot ishga tushdi: @%s", me.username)

        # Bot to'xtab turgan vaqtdagi eski xabarlarni o'tkazib yuboramiz
        await bot.delete_webhook(drop_pending_updates=True)
        await dp.start_polling(bot)
    finally:
        # --- Resurslarni har qanday holatda ham toza yopamiz ---
        await ai.close()
        await database.close()
        await bot.session.close()
        logger.info("Bot to'xtatildi")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logging.getLogger(__name__).info("Ctrl+C — chiqildi")
