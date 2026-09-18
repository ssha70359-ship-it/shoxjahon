"""Asosiy AI handleri — oddiy matnli savollarga javob beradi.

Ish tartibi:
1. Foydalanuvchi xabarini bazaga yozamiz.
2. Oxirgi N ta xabarni (kontekst) bazadan o'qiymiz.
3. System Prompt + kontekstni AI modelga yuboramiz.
4. Javobni bazaga yozamiz va foydalanuvchiga qaytaramiz.
"""

from __future__ import annotations

import logging

from aiogram import F, Router
from aiogram.enums import ChatAction
from aiogram.exceptions import TelegramBadRequest
from aiogram.types import Message
from aiogram.utils.chat_action import ChatActionSender

from app.database.repository import Repository
from app.services.ai_client import AIClient, AIError
from app.utils.text import split_text
from config import settings

logger = logging.getLogger(__name__)

router = Router(name="chat")

# Juda uzun savollarni kesib yuboramiz (token sarfini cheklash uchun)
MAX_QUESTION_LENGTH = 2000


@router.message(F.text & ~F.text.startswith("/"))
async def handle_question(message: Message, repo: Repository, ai: AIClient, system_prompt: str) -> None:
    """Buyruq bo'lmagan har qanday matnli xabarga AI javobi."""
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

    # 3. AI dan javob so'raymiz. Shu vaqt davomida "yozmoqda..." ko'rsatiladi
    try:
        async with ChatActionSender(
            bot=message.bot,  # type: ignore[arg-type]
            chat_id=message.chat.id,
            action=ChatAction.TYPING,
        ):
            answer = await ai.ask(system_prompt, history)
    except AIError as exc:
        # Kutilgan xato — foydalanuvchiga tushunarli matn ko'rsatamiz
        await message.answer(f"⚠️ {exc}")
        return
    except Exception:  # noqa: BLE001 — kutilmagan xatoda bot yiqilmasligi kerak
        logger.exception("AI so'rovida kutilmagan xato (user_id=%s)", user_id)
        await message.answer("⚠️ Texnik nosozlik yuz berdi. Birozdan so'ng urinib ko'ring.")
        return

    # 4. Javobni tarixga yozamiz va yuboramiz
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


@router.message()
async def handle_unsupported(message: Message) -> None:
    """Matn bo'lmagan xabarlar (rasm, stiker, audio...) uchun javob."""
    await message.answer(
        "Kechirasiz, men hozircha faqat matnli xabarlarni tushunaman. "
        "Savolingizni yozib yuboring 🙂"
    )
