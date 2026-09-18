"""AI provayderlar uchun umumiy interfeys.

Handlerlar qaysi model ishlatilayotganini bilmaydi — ular faqat
`AIClient.ask(...)` ni chaqiradi. Provayder `.env` dagi AI_PROVIDER orqali
tanlanadi (sukut bo'yicha — Anthropic Claude).
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from config import AIProvider, Settings
from database.models import ChatMessage

logger = logging.getLogger(__name__)


class AIError(Exception):
    """AI so'rovi muvaffaqiyatsiz tugaganda ko'tariladi."""


class AIClient(ABC):
    """Barcha provayderlar uchun umumiy shartnoma (interface)."""

    @abstractmethod
    async def ask(self, system_prompt: str, history: list[ChatMessage]) -> str:
        """Suhbat tarixini modelga yuborib, matnli javob qaytaradi.

        Args:
            system_prompt: botning rolini va javob tilini belgilovchi ko'rsatma.
            history: eng eskisidan eng yangisigacha tartiblangan xabarlar;
                oxirgi element — foydalanuvchining yangi savoli.
        """

    async def close(self) -> None:  # noqa: B027 — ataylab abstract emas
        """HTTP ulanishlarini yopadi (bot to'xtaganda chaqiriladi).

        Sukut bo'yicha hech narsa qilmaydi: har bir provayderda yopiladigan
        ulanish bo'lavermaydi, shuning uchun bu metod majburiy emas.
        """


def create_ai_client(settings: Settings) -> AIClient:
    """Sozlamalarga qarab kerakli provayder klientini yaratadi (Factory)."""
    # Import funksiya ichida: faqat kerak bo'lgan kutubxona yuklanadi,
    # ya'ni ikkinchi provayder o'rnatilmagan bo'lsa ham bot ishlaydi.
    if settings.ai_provider is AIProvider.ANTHROPIC:
        from services.claude_service import ClaudeService

        logger.info("AI provayder: Anthropic Claude (%s)", settings.anthropic_model)
        return ClaudeService(settings)

    if settings.ai_provider is AIProvider.OPENAI:
        from services.openai_service import OpenAIService

        logger.info("AI provayder: OpenAI (%s)", settings.openai_model)
        return OpenAIService(settings)

    raise ValueError(f"Noma'lum AI provayder: {settings.ai_provider}")
