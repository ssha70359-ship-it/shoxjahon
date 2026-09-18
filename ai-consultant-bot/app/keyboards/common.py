"""Klaviaturalar: doimiy (reply) menyu va tugmali (inline) xizmatlar menyusi."""

from __future__ import annotations

from aiogram.filters.callback_data import CallbackData
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
)
from aiogram.utils.keyboard import InlineKeyboardBuilder

from config import settings


class MenuCallback(CallbackData, prefix="menu"):
    """Inline tugmalarning `callback_data` si uchun shablon.

    Telegram `callback_data` ni oddiy satr sifatida yuboradi. `CallbackData`
    fabrikasi uni "menu:services" ko'rinishida yig'adi va handlerda yana
    obyektga aylantirib beradi — qo'lda satr kesish shart emas.
    """

    section: str


# --- Bo'limlar: kalit (callback uchun) -> tugma yozuvi -------------------
# Tartib muhim: tugmalar shu ketma-ketlikda chiziladi.
MENU_SECTIONS: dict[str, str] = {
    "services": "🛠 Xizmatlarimiz",
    "prices": "💰 Narxlar",
    "about": "🏢 Biz haqimizda",
    "contact": "📞 Operator bilan bog'lanish",
}

# Reply menyudagi tugma yozuvlari (handlerlarda filtr sifatida ishlatiladi)
BTN_MENU = "📋 Menyu"
BTN_HELP = "ℹ️ Yordam"
BTN_RESET = "🧹 Suhbatni tozalash"

# Doimiy (reply) klaviatura — chat pastida turadi
MAIN_MENU = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text=BTN_MENU)],
        [KeyboardButton(text=BTN_HELP), KeyboardButton(text=BTN_RESET)],
    ],
    resize_keyboard=True,
    input_field_placeholder="Savolingizni yozing...",
)


def _operator_button() -> InlineKeyboardButton | None:
    """Operator bilan bog'lanish uchun havolali tugma.

    `.env` da `OPERATOR_USERNAME` yoki `OPERATOR_PHONE` ko'rsatilmagan bo'lsa,
    tugma umuman chizilmaydi (bo'sh havola Telegram tomonidan rad etiladi).
    """
    if settings.operator_username:
        username = settings.operator_username.lstrip("@")
        return InlineKeyboardButton(text="✍️ Operatorga yozish", url=f"https://t.me/{username}")
    if settings.operator_phone:
        digits = settings.operator_phone.replace(" ", "").replace("-", "")
        return InlineKeyboardButton(text="📱 Qo'ng'iroq qilish", url=f"tel:{digits}")
    return None


def main_menu_keyboard() -> InlineKeyboardMarkup:
    """Asosiy inline menyu: xizmat bo'limlari ikki ustunda."""
    builder = InlineKeyboardBuilder()
    for section, label in MENU_SECTIONS.items():
        builder.button(text=label, callback_data=MenuCallback(section=section))
    builder.adjust(2)  # har qatorda 2 ta tugma
    return builder.as_markup()


def section_keyboard(section: str) -> InlineKeyboardMarkup:
    """Bo'lim ichidagi klaviatura: "orqaga" va (kerak bo'lsa) operator havolasi."""
    builder = InlineKeyboardBuilder()

    # Operator havolasini faqat "bog'lanish" bo'limida ko'rsatamiz
    if section == "contact" and (button := _operator_button()) is not None:
        builder.row(button)

    builder.row(
        InlineKeyboardButton(
            text="⬅️ Menyuga qaytish",
            callback_data=MenuCallback(section="main").pack(),
        )
    )
    return builder.as_markup()
