"""Botni ishga tushirish nuqtasi (entry point).

Ishga tushirish:
    python main.py
"""

from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import BotCommand, BotCommandScopeChat

from config import settings
from database.db import Database
from database.repository import Repository
from handlers import routers
from middlewares.deps import DependenciesMiddleware
from middlewares.throttling import ThrottlingMiddleware
from services.ai_client import create_ai_client
from utils.logger import setup_logging

logger = logging.getLogger(__name__)

# Barcha foydalanuvchilar ko'radigan buyruqlar
USER_COMMANDS = [
    BotCommand(command="start", description="Botni ishga tushirish"),
    BotCommand(command="menu", description="Asosiy menyu"),
    BotCommand(command="language", description="Tilni o'zgartirish"),
    BotCommand(command="reset", description="Suhbat tarixini tozalash"),
    BotCommand(command="help", description="Yordam / bot haqida"),
]

# Faqat adminlar ko'radigan qo'shimcha buyruqlar
ADMIN_COMMANDS = USER_COMMANDS + [
    BotCommand(command="admin", description="Admin panel"),
    BotCommand(command="stats", description="Statistika"),
    BotCommand(command="broadcast", description="Ommaviy xabar"),
]


async def set_bot_commands(bot: Bot) -> None:
    """Telegram menyusidagi buyruqlar ro'yxatini o'rnatadi."""
    await bot.set_my_commands(USER_COMMANDS)

    # Adminlarga kengaytirilgan ro'yxat — faqat ularning chatida ko'rinadi
    for admin_id in settings.admin_ids:
        try:
            await bot.set_my_commands(ADMIN_COMMANDS, scope=BotCommandScopeChat(chat_id=admin_id))
        except Exception as exc:  # noqa: BLE001 — admin hali /start bosmagan bo'lishi mumkin
            logger.warning("Admin %s uchun buyruqlarni o'rnatib bo'lmadi: %s", admin_id, exc)


async def main() -> None:
    setup_logging(settings.log_level)
    settings.validate_provider_keys()

    if not settings.admin_ids:
        logger.warning("ADMIN_ID ko'rsatilmagan — admin panel hech kimga ochiq emas")

    # --- Resurslarni tayyorlaymiz ---
    database = Database(settings.db_file)
    await database.connect()

    repo = Repository(database)
    ai = create_ai_client(settings)

    bot = Bot(
        token=settings.bot_token,
        # Barcha xabarlar sukut bo'yicha HTML formatida yuboriladi
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    # MemoryStorage — FSM holatlari (broadcast bosqichlari) uchun.
    # Bot qayta ishga tushsa holatlar yo'qoladi; bu broadcast uchun muammo emas.
    dp = Dispatcher(storage=MemoryStorage())

    # --- Middleware'lar ---
    # `update` darajasidagi middleware har qanday yangilanish uchun birinchi
    # ishlaydi: u bog'liqliklarni (repo, ai) va foydalanuvchi tilini `data` ga
    # qo'shadi.
    dp.update.middleware(DependenciesMiddleware(repo, ai, settings))
    # Anti-spam esa handler chaqirilishidan oldin juda tez yuborilgan
    # xabarlarni va tugma bosishlarini to'xtatadi.
    throttling = ThrottlingMiddleware(settings.throttle_rate)
    dp.message.middleware(throttling)
    dp.callback_query.middleware(throttling)

    # --- Routerlarni ulaymiz (tartib handlers/__init__.py da izohlangan) ---
    dp.include_routers(*routers)

    try:
        await set_bot_commands(bot)
        me = await bot.get_me()
        logger.info("Bot ishga tushdi: @%s | adminlar: %s", me.username, settings.admin_ids or "yo'q")

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
