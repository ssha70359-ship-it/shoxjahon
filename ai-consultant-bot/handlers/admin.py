"""Admin panel: statistika va ommaviy xabar (broadcast).

Faqat `.env` dagi `ADMIN_ID` ro'yxatidagi foydalanuvchilar kira oladi.
Ommaviy xabar FSM (holatlar mashinasi) orqali uch bosqichda yuboriladi:
    /broadcast -> matnni kutish -> ko'rib chiqish va tasdiqlash -> yuborish
"""

from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, F, Router
from aiogram.exceptions import (
    TelegramBadRequest,
    TelegramForbiddenError,
    TelegramRetryAfter,
)
from aiogram.filters import BaseFilter, Command, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message, TelegramObject, User

from config import settings
from database.models import Stats
from database.repository import Repository
from keyboards.inline import (
    AdminCallback,
    BroadcastCallback,
    admin_keyboard,
    broadcast_confirm_keyboard,
)
from locales import LANGUAGE_NAMES, t

logger = logging.getLogger(__name__)

router = Router(name="admin")


class IsAdmin(BaseFilter):
    """Faqat `ADMIN_ID` dagi foydalanuvchilarni o'tkazadi."""

    async def __call__(self, event: TelegramObject, event_from_user: User | None = None) -> bool:
        return event_from_user is not None and event_from_user.id in settings.admin_ids


class BroadcastState(StatesGroup):
    """Ommaviy xabar yuborish bosqichlari."""

    waiting_for_message = State()   # admin xabar matnini yozishi kutilmoqda
    waiting_for_confirm = State()   # tasdiqlash tugmasi kutilmoqda


# Butun routerga filtr qo'yamiz — ichidagi barcha handlerlar faqat
# adminlar uchun ishlaydi. Boshqa foydalanuvchilar uchun ular umuman
# mavjud emasdek bo'ladi va keyingi routerga o'tib ketadi.
router.message.filter(IsAdmin())
router.callback_query.filter(IsAdmin())


def _format_stats(stats: Stats, lang: str) -> str:
    """Statistikani o'qishga qulay matnga aylantiradi."""
    if stats.by_language:
        languages = "\n".join(
            f"  {LANGUAGE_NAMES.get(code, code)} — <b>{count}</b>"
            for code, count in stats.by_language.items()
        )
    else:
        languages = "  —"

    return t(
        lang,
        "admin_stats",
        total_users=stats.total_users,
        new_today=stats.new_today,
        active_today=stats.active_today,
        blocked=stats.blocked,
        total_messages=stats.total_messages,
        messages_today=stats.messages_today,
        languages=languages,
    )


# ------------------------------------------------------------------ panel


@router.message(Command("admin"))
async def cmd_admin(message: Message, lang: str, state: FSMContext) -> None:
    """/admin — admin panelni ochadi."""
    await state.clear()  # yarim qolgan broadcast bo'lsa, bekor qilamiz
    await message.answer(t(lang, "admin_panel"), reply_markup=admin_keyboard(lang))


@router.message(Command("stats"))
async def cmd_stats(message: Message, lang: str, repo: Repository) -> None:
    """/stats — statistikani darhol ko'rsatadi."""
    stats = await repo.get_stats()
    await message.answer(_format_stats(stats, lang))


@router.callback_query(AdminCallback.filter(F.action == "stats"))
async def cb_stats(callback: CallbackQuery, lang: str, repo: Repository) -> None:
    """📊 Statistika tugmasi."""
    stats = await repo.get_stats()
    if isinstance(callback.message, Message):
        await callback.message.edit_text(
            _format_stats(stats, lang), reply_markup=admin_keyboard(lang)
        )
    await callback.answer()


# -------------------------------------------------------------- broadcast


@router.message(Command("broadcast"))
async def cmd_broadcast(message: Message, lang: str, state: FSMContext) -> None:
    """/broadcast — ommaviy xabar yuborishni boshlaydi."""
    await state.set_state(BroadcastState.waiting_for_message)
    await message.answer(t(lang, "broadcast_ask"))


@router.callback_query(AdminCallback.filter(F.action == "broadcast"))
async def cb_broadcast_start(callback: CallbackQuery, lang: str, state: FSMContext) -> None:
    """📣 Ommaviy xabar tugmasi — matn kutish holatiga o'tadi."""
    await state.set_state(BroadcastState.waiting_for_message)
    if isinstance(callback.message, Message):
        await callback.message.edit_text(t(lang, "broadcast_ask"))
    await callback.answer()


@router.message(Command("cancel"), StateFilter("*"))
async def cmd_cancel(message: Message, lang: str, state: FSMContext) -> None:
    """/cancel — boshlangan amalni bekor qiladi."""
    if await state.get_state() is None:
        await message.answer(t(lang, "nothing_to_cancel"))
        return
    await state.clear()
    await message.answer(t(lang, "broadcast_cancelled"))


@router.message(StateFilter(BroadcastState.waiting_for_message), F.text)
async def broadcast_preview(
    message: Message,
    lang: str,
    state: FSMContext,
    repo: Repository,
) -> None:
    """Admin yozgan matnni ko'rsatib, tasdiqlashni so'raydi."""
    text = message.html_text  # formatlashni (qalin, havola) saqlab qoladi
    targets = await repo.get_broadcast_targets()

    if not targets:
        await state.clear()
        await message.answer(t(lang, "broadcast_no_users"))
        return

    await state.set_state(BroadcastState.waiting_for_confirm)
    await state.update_data(text=text)

    await message.answer(
        t(lang, "broadcast_preview", text=text, count=len(targets)),
        reply_markup=broadcast_confirm_keyboard(lang),
    )


@router.callback_query(
    StateFilter(BroadcastState.waiting_for_confirm),
    BroadcastCallback.filter(F.action == "cancel"),
)
async def cb_broadcast_cancel(callback: CallbackQuery, lang: str, state: FSMContext) -> None:
    """❌ Bekor qilish tugmasi."""
    await state.clear()
    if isinstance(callback.message, Message):
        await callback.message.edit_text(t(lang, "broadcast_cancelled"))
    await callback.answer()


@router.callback_query(
    StateFilter(BroadcastState.waiting_for_confirm),
    BroadcastCallback.filter(F.action == "send"),
)
async def cb_broadcast_send(
    callback: CallbackQuery,
    lang: str,
    state: FSMContext,
    repo: Repository,
    bot: Bot,
) -> None:
    """✅ Yuborish tugmasi — xabarni barcha foydalanuvchilarga tarqatadi."""
    data = await state.get_data()
    text = data.get("text", "")
    await state.clear()

    targets = await repo.get_broadcast_targets()
    if not text or not targets:
        await callback.answer(t(lang, "broadcast_no_users"), show_alert=True)
        return

    if isinstance(callback.message, Message):
        await callback.message.edit_text(t(lang, "broadcast_started", count=len(targets)))
    await callback.answer()

    result = await _do_broadcast(bot, repo, targets, text)

    await bot.send_message(
        callback.message.chat.id if callback.message else callback.from_user.id,
        t(lang, "broadcast_done", **result),
    )


async def _do_broadcast(
    bot: Bot,
    repo: Repository,
    targets: list[int],
    text: str,
) -> dict[str, int]:
    """Xabarni navbat bilan yuboradi va natijani sanaydi.

    Telegram sekundiga ~30 ta xabarga ruxsat beradi, shuning uchun har bir
    yuborishdan keyin qisqa pauza qilamiz. Botni bloklagan foydalanuvchilar
    bazada belgilanadi — keyingi safar ularga urinib o'tirmaymiz.
    """
    delay = 1 / settings.broadcast_rate
    sent = blocked = failed = 0

    for user_id in targets:
        try:
            await bot.send_message(user_id, text)
            sent += 1
        except TelegramForbiddenError:
            # Foydalanuvchi botni bloklagan yoki chatni o'chirgan
            blocked += 1
            await repo.set_blocked(user_id, True)
        except TelegramRetryAfter as exc:
            # Telegram "sekinroq" dedi — kutamiz va shu foydalanuvchiga qayta urinamiz
            logger.warning("Broadcast: flood limit, %s soniya kutilmoqda", exc.retry_after)
            await asyncio.sleep(exc.retry_after)
            try:
                await bot.send_message(user_id, text)
                sent += 1
            except Exception:  # noqa: BLE001
                failed += 1
        except TelegramBadRequest as exc:
            # Masalan, HTML formatlash buzuq yoki chat topilmadi
            logger.warning("Broadcast: %s uchun xato: %s", user_id, exc)
            failed += 1
        except Exception:  # noqa: BLE001 — bitta xato butun tarqatishni to'xtatmasin
            logger.exception("Broadcast: %s uchun kutilmagan xato", user_id)
            failed += 1

        await asyncio.sleep(delay)

    logger.info("Broadcast yakunlandi: sent=%s blocked=%s failed=%s", sent, blocked, failed)
    return {"sent": sent, "blocked": blocked, "failed": failed}
