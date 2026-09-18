"""Asosiy buyruqlar va menyu: /start, /menu, /help, /language, tugmalar."""

from __future__ import annotations

import logging

from aiogram import F, Router
from aiogram.filters import Command, CommandStart
from aiogram.types import CallbackQuery, Message

from config import settings
from database.repository import Repository
from keyboards.inline import LanguageCallback, contact_keyboard, language_keyboard
from keyboards.reply import BTN_ABOUT, BTN_CONTACT, BTN_LANGUAGE, main_menu
from locales import LANGUAGE_NAMES, t

logger = logging.getLogger(__name__)

# Router — handlerlarni guruhlash usuli; keyin Dispatcher ga ulanadi
router = Router(name="start")


def _contact_text(lang: str) -> str:
    """Aloqa ma'lumotlarini `.env` dan yig'ib, matnga joylaydi."""
    contacts: list[str] = []
    if settings.operator_username:
        contacts.append(f"• Telegram: {settings.operator_username}")
    if settings.operator_phone:
        contacts.append(f"• {settings.operator_phone}")
    if settings.company_info:
        contacts.append(f"• {settings.company_info}")

    return t(
        lang,
        "contact",
        contacts="\n".join(contacts) or t(lang, "contact_empty"),
    )


@router.message(CommandStart())
async def cmd_start(message: Message, lang: str) -> None:
    """/start — tanishuv xabari va asosiy menyu.

    `lang` argumenti DependenciesMiddleware tomonidan uzatiladi.
    """
    user_name = message.from_user.first_name if message.from_user else "—"
    await message.answer(
        t(
            lang,
            "welcome",
            name=user_name,
            persona=settings.bot_persona_name,
            company=settings.company_name,
            field=settings.company_field,
        ),
        reply_markup=main_menu(lang),
    )


@router.message(Command("menu"))
async def cmd_menu(message: Message, lang: str) -> None:
    """/menu — asosiy tugmalarni qaytadan ko'rsatadi."""
    await message.answer(t(lang, "menu_prompt"), reply_markup=main_menu(lang))


@router.message(Command("help"))
@router.message(Command("about"))
@router.message(F.text.in_(BTN_ABOUT))
async def cmd_about(message: Message, lang: str) -> None:
    """ℹ️ Bot haqida — imkoniyatlar va buyruqlar ro'yxati."""
    await message.answer(
        t(
            lang,
            "about",
            persona=settings.bot_persona_name,
            company=settings.company_name,
            field=settings.company_field,
            limit=settings.history_limit,
        ),
        reply_markup=main_menu(lang),
    )


@router.message(Command("contact"))
@router.message(F.text.in_(BTN_CONTACT))
async def cmd_contact(message: Message, lang: str) -> None:
    """📞 Bog'lanish — aloqa ma'lumotlari va operator havolasi."""
    await message.answer(_contact_text(lang), reply_markup=contact_keyboard(lang))


# ------------------------------------------------------------------ til


@router.message(Command("language"))
@router.message(F.text.in_(BTN_LANGUAGE))
async def cmd_language(message: Message, lang: str) -> None:
    """🌐 Tilni o'zgartirish — inline tugmalar bilan tanlov."""
    await message.answer(t(lang, "choose_language"), reply_markup=language_keyboard())


@router.callback_query(LanguageCallback.filter())
async def cb_set_language(
    callback: CallbackQuery,
    callback_data: LanguageCallback,
    repo: Repository,
) -> None:
    """Til tugmasi bosilganda: bazaga yozamiz va menyuni yangi tilda qayta chizamiz."""
    new_lang = callback_data.code

    if new_lang not in LANGUAGE_NAMES:
        await callback.answer("Unsupported language", show_alert=True)
        return

    if callback.from_user is not None:
        await repo.set_language(callback.from_user.id, new_lang)
        logger.info("Foydalanuvchi %s tilni %s ga o'zgartirdi", callback.from_user.id, new_lang)

    # Tanlov xabarini tahrirlaymiz (tugmalar olib tashlanadi)
    if isinstance(callback.message, Message):
        await callback.message.edit_text(t(new_lang, "language_changed"))

    # Reply klaviaturani yangi tildagi yozuvlar bilan almashtirish uchun
    # yangi xabar kerak — `edit_text` reply klaviaturaga ta'sir qilmaydi.
    if callback.bot is not None and callback.message is not None:
        await callback.bot.send_message(
            callback.message.chat.id,
            t(new_lang, "menu_prompt"),
            reply_markup=main_menu(new_lang),
        )

    await callback.answer()
