"""Anthropic Claude integratsiyasi (asosiy AI provayderi).

Messages API da system prompt xabarlar ro'yxatiga emas, alohida `system`
parametriga beriladi — OpenAI dan asosiy farqi shu.
"""

from __future__ import annotations

import logging

from anthropic import APIError, APIStatusError, AsyncAnthropic, RateLimitError

from config import Settings
from database.models import ChatMessage
from services.ai_client import AIClient, AIError

logger = logging.getLogger(__name__)

# `output_config.effort` ni qo'llab-quvvatlamaydigan modellar.
# Haiku 4.5 ga `effort` yuborilsa API xato qaytaradi, shuning uchun
# model nomida shu bo'lak bo'lsa parametrni umuman jo'natmaymiz.
_NO_EFFORT_MARKERS = ("haiku",)


class ClaudeService(AIClient):
    """Anthropic Messages API ustidagi qobiq."""

    def __init__(self, settings: Settings) -> None:
        self._client = AsyncAnthropic(api_key=settings.anthropic_api_key, timeout=60.0)
        self._model = settings.anthropic_model
        self._max_tokens = settings.ai_max_tokens
        self._effort = settings.ai_effort
        self._supports_effort = not any(m in self._model.lower() for m in _NO_EFFORT_MARKERS)

        if not self._supports_effort:
            logger.info("%s modeli `effort` ni qo'llab-quvvatlamaydi — o'tkazib yuborildi", self._model)

    async def ask(self, system_prompt: str, history: list[ChatMessage]) -> str:
        # Claude formati: system alohida, messages ichida faqat user/assistant
        messages = [{"role": m.role, "content": m.content} for m in history]

        # `effort` javob chuqurligini boshqaradi. Konsultant-bot uchun "low"
        # yetarli: tez, arzon va aniq javob beradi.
        extra: dict[str, object] = {}
        if self._supports_effort:
            extra["output_config"] = {"effort": self._effort}

        try:
            response = await self._client.messages.create(
                model=self._model,
                system=system_prompt,
                messages=messages,  # type: ignore[arg-type]
                max_tokens=self._max_tokens,
                **extra,  # type: ignore[arg-type]
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

        # Javob bir nechta blokdan iborat bo'lishi mumkin (masalan, `thinking`
        # bloklari) — faqat matn bloklarini olamiz.
        text = "".join(
            block.text for block in response.content if getattr(block, "type", None) == "text"
        ).strip()
        if not text:
            raise AIError("AI bo'sh javob qaytardi.")
        return text

    async def close(self) -> None:
        await self._client.close()
