"""OpenAI provayderi (GPT-4o-mini).

Chat Completions API ishlatiladi: system prompt xabarlar ro'yxatining
birinchi elementi sifatida yuboriladi.
"""

from __future__ import annotations

import logging

from openai import APIError, APIStatusError, AsyncOpenAI, RateLimitError

from app.database.repository import ChatMessage
from app.services.ai_client import AIClient, AIError
from config import Settings

logger = logging.getLogger(__name__)


class OpenAIClient(AIClient):
    """OpenAI Chat Completions API ustidagi qobiq."""

    def __init__(self, settings: Settings) -> None:
        self._client = AsyncOpenAI(api_key=settings.openai_api_key, timeout=60.0)
        self._model = settings.openai_model
        self._max_tokens = settings.ai_max_tokens

    async def ask(self, system_prompt: str, history: list[ChatMessage]) -> str:
        # OpenAI formati: [{"role": "system"|"user"|"assistant", "content": "..."}]
        messages = [{"role": "system", "content": system_prompt}]
        messages += [{"role": m.role, "content": m.content} for m in history]

        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=messages,  # type: ignore[arg-type]
                max_tokens=self._max_tokens,
                temperature=0.5,  # past harorat — barqaror, "o'ylab topmaydigan" javoblar
            )
        except RateLimitError as exc:
            logger.warning("OpenAI limitga yetdi: %s", exc)
            raise AIError("Hozir so'rovlar ko'p. Bir daqiqadan so'ng urinib ko'ring.") from exc
        except APIStatusError as exc:
            logger.error("OpenAI HTTP xatosi %s: %s", exc.status_code, exc.message)
            raise AIError("AI xizmatida vaqtinchalik nosozlik.") from exc
        except APIError as exc:
            logger.error("OpenAI xatosi: %s", exc)
            raise AIError("AI xizmatiga ulanib bo'lmadi.") from exc

        text = (response.choices[0].message.content or "").strip()
        if not text:
            raise AIError("AI bo'sh javob qaytardi.")
        return text

    async def close(self) -> None:
        await self._client.close()
