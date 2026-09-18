"""Buyruqlar: /start, /help, /reset."""

from __future__ import annotations

import logging

from aiogram import F, Router
from aiogram.filters import Command, CommandStart
from aiogram.types import Message

from app.database.repository import Repository
from app.keyboards.common import MAIN_MENU
from config import settings

logger = logging.getLogger(__name__)

# Router — handlerlarni guruhlash usuli; keyin Dispatcher ga ulanadi
router = Router(name="commands")

WELCOME_TEXT = (
    "Assalomu alaykum, <b>{name}</b>! 👋\n\n"
    "Men <b>{persona}</b> — <b>{company}</b> kompaniyasining onlayn konsultantiman.\n"
    "Sohamiz: {field}.\n\n"
    "Savolingizni oddiy matn ko'rinishida yozavering — men darhol javob beraman.\n\n"
    "Buyruqlar ro'yxati: /help"
)

HELP_TEXT = (
    "<b>Men nima qila olaman?</b>\n"
    "{company} xizmatlari bo'yicha savollaringizga javob beraman va kerakli "
    "ma'lumotni topishga yordam beraman.\n\n"
    "<b>Buyruqlar:</b>\n"
    "/start — botni qayta ishga tushirish\n"
    "/help — shu yordam matni\n"
    "/reset — suhbat tarixini tozalash\n\n"
    "<b>Eslatma:</b> men suhbatimizning oxirgi {limit} ta xabarini eslab qolaman, "
    "shuning uchun savolni bo'lib-bo'lib berishingiz mumkin."
)


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    """/start — tanishuv xabari va asosiy menyu."""
    user_name = message.from_user.first_name if message.from_user else "mehmon"
    await message.answer(
        WELCOME_TEXT.format(
            name=user_name,
            persona=settings.bot_persona_name,
            company=settings.company_name,
            field=settings.company_field,
        ),
        reply_markup=MAIN_MENU,
    )


@router.message(Command("help"))
@router.message(F.text == "ℹ️ Yordam")
async def cmd_help(message: Message) -> None:
    """/help — buyruqlar va imkoniyatlar haqida."""
    await message.answer(
        HELP_TEXT.format(company=settings.company_name, limit=settings.history_limit),
        reply_markup=MAIN_MENU,
    )


@router.message(Command("reset"))
@router.message(F.text == "🧹 Suhbatni tozalash")
async def cmd_reset(message: Message, repo: Repository) -> None:
    """/reset — foydalanuvchining suhbat tarixini o'chiradi.

    `repo` argumenti DependenciesMiddleware tomonidan uzatiladi.
    """
    if message.from_user is None:
        return

    deleted = await repo.clear_history(message.from_user.id)
    logger.info("Foydalanuvchi %s tarixini tozaladi (%s ta xabar)", message.from_user.id, deleted)

    if deleted:
        text = f"🧹 Suhbat tarixi tozalandi ({deleted} ta xabar o'chirildi).\nYangi savolingizni kuting."
    else:
        text = "Tarix allaqachon bo'sh. Savolingizni yozavering 🙂"

    await message.answer(text, reply_markup=MAIN_MENU)
