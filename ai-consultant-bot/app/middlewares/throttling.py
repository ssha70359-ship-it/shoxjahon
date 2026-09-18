"""Anti-spam (throttling) middleware.

Bir foydalanuvchi belgilangan vaqt ichida bir nechta xabar yuborsa,
ortiqchalari e'tiborsiz qoldiriladi. Bu AI so'rovlari uchun beriladigan
pulni ham tejaydi.
"""

from __future__ import annotations

import time
from collections.abc import Awaitable, Callable
from typing import Any

from aiogram import BaseMiddleware
from aiogram.types import Message, TelegramObject


class ThrottlingMiddleware(BaseMiddleware):
    """Foydalanuvchi xabarlari orasidagi minimal vaqtni ta'minlaydi."""

    def __init__(self, rate: float = 1.0) -> None:
        self._rate = rate
        # {user_id: oxirgi ruxsat etilgan xabar vaqti}
        self._last_seen: dict[int, float] = {}

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        if self._rate <= 0 or not isinstance(event, Message) or event.from_user is None:
            return await handler(event, data)

        user_id = event.from_user.id
        now = time.monotonic()
        last = self._last_seen.get(user_id, 0.0)

        if now - last < self._rate:
            # Juda tez yozildi — xabarni tashlab yuboramiz (handler chaqirilmaydi)
            return None

        self._last_seen[user_id] = now
        return await handler(event, data)
