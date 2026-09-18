"""Loyiha sozlamalari.

Barcha maxfiy ma'lumotlar (token, API kalit) `.env` faylidan o'qiladi —
kodga hech qachon qattiq yozilmaydi. `pydantic-settings` qiymatlarni
o'qiydi va turini tekshiradi, xato bo'lsa bot ishga tushmaydi.
"""

from __future__ import annotations

from enum import StrEnum
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Loyihaning ildiz papkasi (config.py shu yerda joylashgan)
BASE_DIR = Path(__file__).resolve().parent


class AIProvider(StrEnum):
    """Qo'llab-quvvatlanadigan AI provayderlar."""

    OPENAI = "openai"
    ANTHROPIC = "anthropic"


class Settings(BaseSettings):
    """`.env` faylidan o'qiladigan sozlamalar."""

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",  # .env dagi notanish kalitlarni e'tiborsiz qoldiramiz
    )

    # --- Telegram ---
    bot_token: str

    # --- AI provayder ---
    ai_provider: AIProvider = AIProvider.OPENAI
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-opus-5"
    ai_max_tokens: int = Field(default=1024, ge=64, le=8192)

    # --- Kompaniya ma'lumotlari (System Prompt uchun) ---
    company_name: str = "Kompaniya"
    company_field: str = "xizmat ko'rsatish"
    company_info: str = ""
    bot_persona_name: str = "Konsultant"

    # --- Operator bilan bog'lanish (menyudagi havolali tugma uchun) ---
    operator_username: str | None = None  # masalan: @sunrise_manager
    operator_phone: str | None = None     # masalan: +998901234567

    # --- Suhbat xotirasi: kontekstga olinadigan oxirgi xabarlar soni ---
    history_limit: int = Field(default=10, ge=2, le=50)

    # --- Ma'lumotlar bazasi ---
    db_path: Path = Path("data/bot.db")

    # --- Anti-spam: bir foydalanuvchidan xabarlar orasidagi minimal vaqt ---
    throttle_rate: float = Field(default=1.0, ge=0.0)

    # --- Loglash ---
    log_level: str = "INFO"

    @property
    def db_file(self) -> Path:
        """DB fayl uchun to'liq (absolyut) yo'l."""
        path = self.db_path
        return path if path.is_absolute() else BASE_DIR / path

    def validate_provider_keys(self) -> None:
        """Tanlangan provayderga mos API kalit borligini tekshiradi."""
        if self.ai_provider is AIProvider.OPENAI and not self.openai_api_key:
            raise ValueError("AI_PROVIDER=openai tanlandi, lekin OPENAI_API_KEY berilmagan.")
        if self.ai_provider is AIProvider.ANTHROPIC and not self.anthropic_api_key:
            raise ValueError("AI_PROVIDER=anthropic tanlandi, lekin ANTHROPIC_API_KEY berilmagan.")


# Butun loyiha bo'ylab ishlatiladigan yagona sozlamalar obyekti
settings = Settings()  # type: ignore[call-arg]
