"""Doimiy (reply) klaviaturalar — chat pastida turadigan tugmalar.

Tugma yozuvlari foydalanuvchi tanlagan tilga qarab yasaladi.
"""

from __future__ import annotations

from aiogram.types import KeyboardButton, ReplyKeyboardMarkup, ReplyKeyboardRemove

from locales import all_button_texts, t

# Asosiy menyudagi tugmalarning tarjima kalitlari (ko'rinish tartibida)
MENU_BUTTON_KEYS = (
    "btn_ai",
    "btn_clear",
    "btn_language",
    "btn_about",
    "btn_contact",
)

# Handler filtrlarida ishlatiladigan to'plamlar.
# Har bir tugmaning UCH tildagi yozuvi ham kiritiladi — foydalanuvchi tilni
# almashtirgandan keyin eski klaviatura ekranda qolib ketsa ham tugma
# ishlashda davom etadi.
BTN_AI = all_button_texts("btn_ai")
BTN_CLEAR = all_button_texts("btn_clear")
BTN_LANGUAGE = all_button_texts("btn_language")
BTN_ABOUT = all_button_texts("btn_about")
BTN_CONTACT = all_button_texts("btn_contact")

REMOVE_KEYBOARD = ReplyKeyboardRemove()


def main_menu(lang: str) -> ReplyKeyboardMarkup:
    """Asosiy menyu: 2 + 2 + 1 tugma."""
    labels = [t(lang, key) for key in MENU_BUTTON_KEYS]
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=labels[0]), KeyboardButton(text=labels[1])],
            [KeyboardButton(text=labels[2]), KeyboardButton(text=labels[3])],
            [KeyboardButton(text=labels[4])],
        ],
        resize_keyboard=True,
        input_field_placeholder=t(lang, "menu_prompt"),
    )
