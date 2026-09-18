"""Inline klaviaturalar — xabarga biriktirilgan tugmalar."""

from __future__ import annotations

from aiogram.filters.callback_data import CallbackData
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from config import settings
from locales import LANGUAGE_NAMES, t


class LanguageCallback(CallbackData, prefix="lang"):
    """Til tanlash tugmasi: "lang:uz", "lang:ru", "lang:en"."""

    code: str


class AdminCallback(CallbackData, prefix="admin"):
    """Admin panel tugmalari: "admin:stats", "admin:broadcast"."""

    action: str


class BroadcastCallback(CallbackData, prefix="bcast"):
    """Ommaviy xabarni tasdiqlash: "bcast:send", "bcast:cancel"."""

    action: str


def language_keyboard() -> InlineKeyboardMarkup:
    """Uch tilni tanlash uchun tugmalar (har biri alohida qatorda)."""
    builder = InlineKeyboardBuilder()
    for code, name in LANGUAGE_NAMES.items():
        builder.button(text=name, callback_data=LanguageCallback(code=code))
    builder.adjust(1)
    return builder.as_markup()


def contact_keyboard(lang: str) -> InlineKeyboardMarkup | None:
    """Operator bilan bog'lanish uchun havolali tugma.

    `.env` da `OPERATOR_USERNAME` ham, `OPERATOR_PHONE` ham ko'rsatilmagan
    bo'lsa `None` qaytaradi — bo'sh havolali tugmani Telegram rad etadi.
    """
    if settings.operator_username:
        username = settings.operator_username.lstrip("@")
        button = InlineKeyboardButton(
            text=t(lang, "btn_write_operator"), url=f"https://t.me/{username}"
        )
    elif settings.operator_phone:
        digits = settings.operator_phone.replace(" ", "").replace("-", "")
        button = InlineKeyboardButton(text=t(lang, "btn_call"), url=f"tel:{digits}")
    else:
        return None

    return InlineKeyboardMarkup(inline_keyboard=[[button]])


def admin_keyboard(lang: str) -> InlineKeyboardMarkup:
    """Admin panel: statistika va ommaviy xabar tugmalari."""
    builder = InlineKeyboardBuilder()
    builder.button(text=t(lang, "btn_admin_stats"), callback_data=AdminCallback(action="stats"))
    builder.button(
        text=t(lang, "btn_admin_broadcast"), callback_data=AdminCallback(action="broadcast")
    )
    builder.adjust(1)
    return builder.as_markup()


def broadcast_confirm_keyboard(lang: str) -> InlineKeyboardMarkup:
    """Ommaviy xabarni yuborishdan oldin tasdiqlash."""
    builder = InlineKeyboardBuilder()
    builder.button(
        text=t(lang, "btn_broadcast_send"), callback_data=BroadcastCallback(action="send")
    )
    builder.button(
        text=t(lang, "btn_broadcast_cancel"), callback_data=BroadcastCallback(action="cancel")
    )
    builder.adjust(2)
    return builder.as_markup()
