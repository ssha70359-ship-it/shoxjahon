"""AI provayderlar uchun umumiy interfeys.

Handlerlar qaysi model ishlatilayotganini bilmaydi — ular faqat
`AIClient.ask(...)` ni chaqiradi. Provayder `.env` dagi AI_PROVIDER orqali
tanlanadi.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from app.database.repository import ChatMessage
from config import AIProvider, Settings

logger = logging.getLogger(__name__)


class AIError(Exception):
    """AI so'rovi muvaffaqiyatsiz tugaganda ko'tariladi."""


class AIClient(ABC):
    """Barcha provayderlar uchun umumiy shartnoma (interface)."""

    @abstractmethod
    async def ask(self, system_prompt: str, history: list[ChatMessage]) -> str:
        """Suhbat tarixini modelga yuborib, matnli javob qaytaradi.

        Args:
            system_prompt: botning rolini belgilovchi ko'rsatma.
            history: eng eskisidan eng yangisigacha tartiblangan xabarlar;
                oxirgi element — foydalanuvchining yangi savoli.
        """

    async def close(self) -> None:
        """HTTP ulanishlarini yopadi (bot to'xtaganda chaqiriladi)."""


def create_ai_client(settings: Settings) -> AIClient:
    """Sozlamalarga qarab kerakli provayder klientini yaratadi (Factory)."""
    # Import funksiya ichida: faqat kerak bo'lgan kutubxona yuklanadi,
    # ya'ni ikkinchi provayder o'rnatilmagan bo'lsa ham bot ishlaydi.
    if settings.ai_provider is AIProvider.OPENAI:
        from app.services.openai_provider import OpenAIClient

        logger.info("AI provayder: OpenAI (%s)", settings.openai_model)
        return OpenAIClient(settings)

    if settings.ai_provider is AIProvider.ANTHROPIC:
        from app.services.anthropic_provider import AnthropicClient

        logger.info("AI provayder: Anthropic (%s)", settings.anthropic_model)
        return AnthropicClient(settings)

    raise ValueError(f"Noma'lum AI provayder: {settings.ai_provider}")
