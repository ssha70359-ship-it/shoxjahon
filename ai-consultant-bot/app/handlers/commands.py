"""Buyruqlar va menyu: /start, /help, /menu, /reset + inline tugmalar."""

from __future__ import annotations

import logging

from aiogram import F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import Command, CommandStart
from aiogram.types import CallbackQuery, Message

from app.database.repository import Repository
from app.keyboards.common import (
    BTN_HELP,
    BTN_MENU,
    BTN_RESET,
    MAIN_MENU,
    MENU_SECTIONS,
    MenuCallback,
    main_menu_keyboard,
    section_keyboard,
)
from app.utils.text import strip_html
from config import settings

logger = logging.getLogger(__name__)

# Router — handlerlarni guruhlash usuli; keyin Dispatcher ga ulanadi
router = Router(name="commands")

WELCOME_TEXT = (
    "Assalomu alaykum, <b>{name}</b>! 👋\n\n"
    "Men <b>{persona}</b> — <b>{company}</b> kompaniyasining onlayn konsultantiman.\n"
    "Sohamiz: {field}.\n\n"
    "Quyidagi tugmalardan birini tanlang yoki savolingizni shunchaki yozib yuboring."
)

MENU_TEXT = (
    "📋 <b>Asosiy menyu</b>\n\n"
    "Sizni nima qiziqtiradi? Kerakli bo'limni tanlang — "
    "yoki savolingizni erkin matn ko'rinishida yozing, men javob beraman."
)

HELP_TEXT = (
    "<b>Men nima qila olaman?</b>\n"
    "{company} xizmatlari bo'yicha savollaringizga javob beraman va kerakli "
    "ma'lumotni topishga yordam beraman.\n\n"
    "<b>Buyruqlar:</b>\n"
    "/start — botni qayta ishga tushirish\n"
    "/menu — xizmatlar menyusi\n"
    "/help — shu yordam matni\n"
    "/reset — suhbat tarixini tozalash\n\n"
    "<b>Eslatma:</b> men suhbatimizning oxirgi {limit} ta xabarini eslab qolaman, "
    "shuning uchun savolni bo'lib-bo'lib berishingiz mumkin."
)

# --------------------------------------------------------------------------
#  Menyu bo'limlarining matnlari
#
#  Har bir bo'lim `.env` dagi kompaniya ma'lumotlari bilan to'ldiriladi.
#  Matnlarni o'z xizmatlaringizga moslab shu yerda tahrirlaysiz.
#  Oxirgi qator doim AI bilan suhbatni davom ettirishga undaydi.
# --------------------------------------------------------------------------
SECTION_TEXTS: dict[str, str] = {
    "services": (
        "🛠 <b>Xizmatlarimiz</b>\n\n"
        "<b>{company}</b> quyidagi yo'nalishlarda ishlaydi ({field}):\n\n"
        "• <b>Korporativ veb-saytlar</b> — vizitka, katalog, landing page\n"
        "• <b>Internet-do'konlar</b> — to'lov tizimlari va admin panel bilan\n"
        "• <b>Mobil ilovalar</b> — iOS va Android uchun\n"
        "• <b>Telegram botlar</b> — savdo, buyurtma va qo'llab-quvvatlash uchun\n"
        "• <b>Texnik xizmat</b> — mavjud loyihani yangilash va kuzatib borish\n\n"
        "Qaysi xizmat sizni qiziqtirdi? Batafsil so'rang — men tushuntirib beraman."
    ),
    "prices": (
        "💰 <b>Narxlar</b>\n\n"
        "Aniq narx loyihaning hajmi va muddatiga bog'liq. Taxminiy chegaralar:\n\n"
        "• Landing page — <b>3 000 000 so'mdan</b>\n"
        "• Korporativ sayt — <b>7 000 000 so'mdan</b>\n"
        "• Internet-do'kon — <b>15 000 000 so'mdan</b>\n"
        "• Mobil ilova — <b>25 000 000 so'mdan</b>\n"
        "• Telegram bot — <b>4 000 000 so'mdan</b>\n\n"
        "Har bir loyiha uchun bepul hisob-kitob tayyorlab beramiz.\n"
        "Loyihangiz haqida qisqacha yozing — taxminiy narxni aytaman."
    ),
    "about": (
        "🏢 <b>Biz haqimizda</b>\n\n"
        "<b>{company}</b> — {field} sohasida faoliyat yurituvchi jamoa.\n\n"
        "{info}\n\n"
        "Biz haqimizda yana nimani bilmoqchisiz?"
    ),
    "contact": (
        "📞 <b>Operator bilan bog'lanish</b>\n\n"
        "{contacts}\n\n"
        "Menejerimiz ish vaqtida siz bilan bog'lanadi. "
        "Shu paytgacha savolingiz bo'lsa — menga yozavering, men yordam beraman."
    ),
}


def _build_section_text(section: str) -> str:
    """Bo'lim matnini kompaniya ma'lumotlari bilan to'ldiradi."""
    contacts: list[str] = []
    if settings.operator_username:
        contacts.append(f"• Telegram: {settings.operator_username}")
    if settings.operator_phone:
        contacts.append(f"• Telefon: {settings.operator_phone}")
    if settings.company_info:
        contacts.append(f"• {settings.company_info}")

    return SECTION_TEXTS[section].format(
        company=settings.company_name,
        field=settings.company_field,
        info=settings.company_info or "Batafsil ma'lumot uchun operatorga murojaat qiling.",
        contacts="\n".join(contacts) or "Aloqa ma'lumotlari tez orada qo'shiladi.",
    )


async def _remember_section(repo: Repository, user_id: int, section: str, text: str) -> None:
    """Ko'rsatilgan bo'lim matnini suhbat tarixiga yozadi.

    Shu tufayli foydalanuvchi tugmani bosgandan keyin "va muddati qancha?"
    deb so'rasa, AI qaysi bo'lim haqida gap ketayotganini biladi — ya'ni
    tugmali menyu va AI-suhbat bitta oqimga ulanadi.
    """
    await repo.add_message(user_id, "user", f"{MENU_SECTIONS[section]} bo'limini ochdim")
    await repo.add_message(user_id, "assistant", strip_html(text))


# ----------------------------------------------------------------- buyruqlar


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    """/start — tanishuv xabari, doimiy menyu va inline tugmalar."""
    user_name = message.from_user.first_name if message.from_user else "mehmon"

    # Avval doimiy (reply) klaviaturani o'rnatamiz...
    await message.answer(
        WELCOME_TEXT.format(
            name=user_name,
            persona=settings.bot_persona_name,
            company=settings.company_name,
            field=settings.company_field,
        ),
        reply_markup=MAIN_MENU,
    )
    # ...so'ng xizmatlar menyusini alohida xabar sifatida chiqaramiz
    await message.answer(MENU_TEXT, reply_markup=main_menu_keyboard())


@router.message(Command("menu"))
@router.message(F.text == BTN_MENU)
async def cmd_menu(message: Message) -> None:
    """/menu — xizmat bo'limlari bilan inline menyu."""
    await message.answer(MENU_TEXT, reply_markup=main_menu_keyboard())


@router.message(Command("help"))
@router.message(F.text == BTN_HELP)
async def cmd_help(message: Message) -> None:
    """/help — buyruqlar va imkoniyatlar haqida."""
    await message.answer(
        HELP_TEXT.format(company=settings.company_name, limit=settings.history_limit),
        reply_markup=MAIN_MENU,
    )


@router.message(Command("reset"))
@router.message(F.text == BTN_RESET)
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


# ----------------------------------------------------- inline tugma bosishlar


@router.callback_query(MenuCallback.filter(F.section == "main"))
async def cb_back_to_menu(callback: CallbackQuery) -> None:
    """"⬅️ Menyuga qaytish" tugmasi — xabarni asosiy menyuga almashtiradi."""
    await _edit_or_send(callback, MENU_TEXT, main_menu_keyboard())
    await callback.answer()


@router.callback_query(MenuCallback.filter())
async def cb_section(
    callback: CallbackQuery,
    callback_data: MenuCallback,
    repo: Repository,
) -> None:
    """Bo'lim tugmalari: xizmatlar, narxlar, biz haqimizda, bog'lanish."""
    section = callback_data.section

    # Noma'lum bo'lim (masalan, bot yangilangandan keyingi eski tugma)
    if section not in SECTION_TEXTS:
        await callback.answer("Bu bo'lim endi mavjud emas. /menu ni qayta oching.", show_alert=True)
        return

    text = _build_section_text(section)
    await _edit_or_send(callback, text, section_keyboard(section))

    # Bo'limni AI kontekstiga yozamiz — suhbat shu yerdan davom etadi
    if callback.from_user is not None:
        await _remember_section(repo, callback.from_user.id, section, text)

    await callback.answer()


async def _edit_or_send(callback: CallbackQuery, text: str, markup) -> None:
    """Xabarni tahrirlaydi; imkoni bo'lmasa yangisini yuboradi.

    Tahrirlash chatni yangi xabarlar bilan to'ldirmaydi. Ammo Telegram
    "message is not modified" xatosini beradi (bir xil tugma ikki marta
    bosilsa) yoki eski xabarni tahrirlashga ruxsat bermaydi — bunday
    holatlarda oddiygina yangi xabar yuboramiz.
    """
    if isinstance(callback.message, Message):
        try:
            await callback.message.edit_text(text, reply_markup=markup)
            return
        except TelegramBadRequest as exc:
            if "message is not modified" in str(exc):
                return  # foydalanuvchi o'sha tugmani qayta bosdi — hech narsa qilmaymiz
            logger.debug("Xabarni tahrirlab bo'lmadi, yangisi yuboriladi: %s", exc)

    if callback.bot is not None and callback.message is not None:
        await callback.bot.send_message(callback.message.chat.id, text, reply_markup=markup)
