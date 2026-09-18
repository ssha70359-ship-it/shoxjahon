"""Dependency Injection middleware.

Repository, AI klient va System Prompt ni har bir handlerga avtomatik
uzatadi — handlerlar global o'zgaruvchilarga bog'lanib qolmaydi.
Bir yo'la foydalanuvchini bazada ro'yxatdan o'tkazadi.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, User

from app.database.repository import Repository
from app.services.ai_client import AIClient


class DependenciesMiddleware(BaseMiddleware):
    """Handlerlarga kerakli obyektlarni `data` orqali beradi."""

    def __init__(self, repo: Repository, ai: AIClient, system_prompt: str) -> None:
        self._repo = repo
        self._ai = ai
        self._system_prompt = system_prompt

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        data["repo"] = self._repo
        data["ai"] = self._ai
        data["system_prompt"] = self._system_prompt

        # Foydalanuvchini bazaga yozamiz / ma'lumotini yangilaymiz
        user: User | None = data.get("event_from_user")
        if user is not None and not user.is_bot:
            await self._repo.upsert_user(
                user_id=user.id,
                username=user.username,
                full_name=user.full_name,
                language=user.language_code,
            )

        return await handler(event, data)
