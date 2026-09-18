"""Anthropic provayderi (Claude).

Messages API da system prompt xabarlar ro'yxatiga emas, alohida `system`
parametriga beriladi — OpenAI dan asosiy farqi shu.
"""

from __future__ import annotations

import logging

from anthropic import APIError, APIStatusError, AsyncAnthropic, RateLimitError

from app.database.repository import ChatMessage
from app.services.ai_client import AIClient, AIError
from config import Settings

logger = logging.getLogger(__name__)


class AnthropicClient(AIClient):
    """Anthropic Messages API ustidagi qobiq."""

    def __init__(self, settings: Settings) -> None:
        self._client = AsyncAnthropic(api_key=settings.anthropic_api_key, timeout=60.0)
        self._model = settings.anthropic_model
        self._max_tokens = settings.ai_max_tokens

    async def ask(self, system_prompt: str, history: list[ChatMessage]) -> str:
        # Claude formati: system alohida, messages ichida faqat user/assistant
        messages = [{"role": m.role, "content": m.content} for m in history]

        try:
            response = await self._client.messages.create(
                model=self._model,
                system=system_prompt,
                messages=messages,  # type: ignore[arg-type]
                max_tokens=self._max_tokens,
            )
        except RateLimitError as exc:
            logger.warning("Anthropic limitga yetdi: %s", exc)
            raise AIError("Hozir so'rovlar ko'p. Bir daqiqadan so'ng urinib ko'ring.") from exc
        except APIStatusError as exc:
            logger.error("Anthropic HTTP xatosi %s: %s", exc.status_code, exc.message)
            raise AIError("AI xizmatida vaqtinchalik nosozlik.") from exc
        except APIError as exc:
            logger.error("Anthropic xatosi: %s", exc)
            raise AIError("AI xizmatiga ulanib bo'lmadi.") from exc

        # Xavfsizlik uchun: model javob berishdan bosh tortgan bo'lishi mumkin
        if response.stop_reason == "refusal":
            raise AIError("Bu savolga javob bera olmayman. Iltimos, boshqacha ifodalang.")

        # Javob bir nechta blokdan iborat bo'lishi mumkin — faqat matnlarini olamiz
        text = "".join(
            block.text for block in response.content if getattr(block, "type", None) == "text"
        ).strip()
        if not text:
            raise AIError("AI bo'sh javob qaytardi.")
        return text

    async def close(self) -> None:
        await self._client.close()
