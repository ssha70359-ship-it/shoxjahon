"""Dependency Injection va til middleware'i.

Har bir handlerga avtomatik uzatadi:
  • `repo` — ma'lumotlar bazasi qatlami
  • `ai`   — AI klient
  • `lang` — foydalanuvchi tanlagan til kodi ("uz" / "ru" / "en")

Bir yo'la foydalanuvchini bazada ro'yxatdan o'tkazadi.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, User

from config import Settings
from database.repository import Repository
from services.ai_client import AIClient


class DependenciesMiddleware(BaseMiddleware):
    """Handlerlarga kerakli obyektlarni `data` orqali beradi."""

    def __init__(self, repo: Repository, ai: AIClient, settings: Settings) -> None:
        self._repo = repo
        self._ai = ai
        self._settings = settings

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        data["repo"] = self._repo
        data["ai"] = self._ai

        default_lang = self._settings.default_language.value
        user: User | None = data.get("event_from_user")

        if user is None or user.is_bot:
            data["lang"] = default_lang
            return await handler(event, data)

        # Foydalanuvchini bazaga yozamiz / profilini yangilaymiz.
        # Yangi foydalanuvchi uchun boshlang'ich til Telegram interfeysi
        # tilidan olinadi (uz/ru/en dan biri bo'lsa), aks holda — sukutdagi til.
        initial_lang = default_lang
        if user.language_code:
            code = user.language_code.split("-")[0].lower()
            if code in {"uz", "ru", "en"}:
                initial_lang = code

        await self._repo.upsert_user(
            user_id=user.id,
            username=user.username,
            full_name=user.full_name,
            default_language=initial_lang,
        )

        data["lang"] = await self._repo.get_language(user.id, default_lang)
        return await handler(event, data)
