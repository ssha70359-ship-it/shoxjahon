"""AI suhbat handleri — Claude bilan muloqot.

Ish tartibi:
1. Foydalanuvchi xabarini bazaga yozamiz.
2. Oxirgi N ta xabarni (kontekst) bazadan o'qiymiz.
3. System Prompt (tanlangan til bilan) + kontekstni Claude'ga yuboramiz.
4. Javobni bazaga yozamiz va foydalanuvchiga qaytaramiz.
"""

from __future__ import annotations

import logging

from aiogram import F, Router
from aiogram.enums import ChatAction
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import Command
from aiogram.types import Message
from aiogram.utils.chat_action import ChatActionSender

from config import settings
from database.repository import Repository
from keyboards.reply import BTN_AI, BTN_CLEAR, main_menu
from locales import t
from services.ai_client import AIClient, AIError
from services.prompts import build_system_prompt
from utils.text import split_text

logger = logging.getLogger(__name__)

router = Router(name="ai_chat")

# Juda uzun savollarni kesib yuboramiz (token sarfini cheklash uchun)
MAX_QUESTION_LENGTH = 2000


@router.message(F.text.in_(BTN_AI))
async def enable_ai_mode(message: Message, lang: str) -> None:
    """🤖 AI bilan suhbat — rejimni tushuntiruvchi xabar.

    Alohida "rejim" holati saqlanmaydi: bot baribir har qanday matnli
    xabarga javob beradi. Bu tugma foydalanuvchiga nima qilish
    kerakligini tushuntiradi.
    """
    await message.answer(
        t(lang, "ai_mode_on", company=settings.company_name, limit=settings.history_limit),
        reply_markup=main_menu(lang),
    )


@router.message(Command("reset"))
@router.message(F.text.in_(BTN_CLEAR))
async def clear_history(message: Message, lang: str, repo: Repository) -> None:
    """📜 Suhbatni tozalash — foydalanuvchining tarixini o'chiradi."""
    if message.from_user is None:
        return

    deleted = await repo.clear_history(message.from_user.id)
    logger.info("Foydalanuvchi %s tarixini tozaladi (%s ta xabar)", message.from_user.id, deleted)

    key = "history_cleared" if deleted else "history_empty"
    await message.answer(
        t(lang, key, count=deleted) if deleted else t(lang, key),
        reply_markup=main_menu(lang),
    )


@router.message(F.text & ~F.text.startswith("/"))
async def handle_question(
    message: Message,
    lang: str,
    repo: Repository,
    ai: AIClient,
) -> None:
    """Buyruq va tugma bo'lmagan har qanday matnli xabarga AI javobi."""
    if message.from_user is None or message.text is None:
        return

    user_id = message.from_user.id
    question = message.text.strip()[:MAX_QUESTION_LENGTH]
    if not question:
        return

    # 1. Savolni tarixga yozamiz
    await repo.add_message(user_id, "user", question)

    # 2. Kontekstni tayyorlaymiz (yangi savol ham shu ro'yxat ichida bo'ladi)
    history = await repo.get_history(user_id, settings.history_limit)

    # 3. System Prompt foydalanuvchi tili bilan yig'iladi — Claude javobni
    #    aynan o'sha tilda beradi.
    system_prompt = build_system_prompt(settings, lang)

    # 4. AI dan javob so'raymiz. Shu vaqt davomida "yozmoqda..." ko'rsatiladi
    try:
        async with ChatActionSender(
            bot=message.bot,  # type: ignore[arg-type]
            chat_id=message.chat.id,
            action=ChatAction.TYPING,
        ):
            answer = await ai.ask(system_prompt, history)
    except AIError as exc:
        # Kutilgan xato — foydalanuvchiga tushunarli matn ko'rsatamiz
        await message.answer(t(lang, "ai_error", error=str(exc)))
        return
    except Exception:
        logger.exception("AI so'rovida kutilmagan xato (user_id=%s)", user_id)
        await message.answer(t(lang, "ai_unknown_error"))
        return

    # 5. Javobni tarixga yozamiz va yuboramiz
    await repo.add_message(user_id, "assistant", answer)
    await _send_long_answer(message, answer)


async def _send_long_answer(message: Message, text: str) -> None:
    """Javobni Telegram cheklovlariga moslab yuboradi.

    - 4096 belgidan uzun matn bo'laklarga bo'linadi;
    - modeldan kelgan matnda `<` yoki `&` bo'lsa HTML tahlili buzilishi
      mumkin, shuning uchun xatolikda oddiy matn sifatida qayta yuboriladi.
    """
    for chunk in split_text(text):
        try:
            await message.answer(chunk)
        except TelegramBadRequest:
            await message.answer(chunk, parse_mode=None)


@router.message(F.text.startswith("/"))
async def handle_unknown_command(message: Message, lang: str) -> None:
    """Hech bir handler ushlamagan buyruq.

    Bu handler eng oxirida turadi, shuning uchun bu yerga faqat mavjud
    bo'lmagan buyruqlar tushadi. Admin buyruqlari ham shu yerga tushadi —
    agar yozgan odam admin bo'lmasa. Shu tariqa botda admin paneli
    borligi oshkor bo'lmaydi.
    """
    await message.answer(t(lang, "unknown_command"))


@router.message(~F.text)
async def handle_unsupported(message: Message, lang: str) -> None:
    """Matn bo'lmagan xabarlar (rasm, stiker, audio...) uchun javob."""
    await message.answer(t(lang, "only_text"))
