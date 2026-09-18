"""Oddiy (reply) klaviaturalar."""

from __future__ import annotations

from aiogram.types import KeyboardButton, ReplyKeyboardMarkup

# Foydalanuvchi buyruqlarni yozib o'tirmasligi uchun asosiy menyu
MAIN_MENU = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text="ℹ️ Yordam"), KeyboardButton(text="🧹 Suhbatni tozalash")],
    ],
    resize_keyboard=True,
    input_field_placeholder="Savolingizni yozing...",
)
