"""Ma'lumotlar bazasi obyektlari (modellar).

Oddiy `dataclass` lar: SQL natijalarini lug'at o'rniga tipli obyektga
aylantiradi — IDE avtomat to'ldiradi, xato kamayadi.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class User:
    """`users` jadvalidagi bitta qator."""

    user_id: int
    username: str | None
    full_name: str
    selected_language: str
    joined_at: str
    is_blocked: bool = False


@dataclass(slots=True)
class ChatMessage:
    """`messages` jadvalidagi bitta qator (AI ga yuboriladigan ko'rinish)."""

    role: str  # "user" yoki "assistant"
    content: str
    timestamp: str | None = None


@dataclass(slots=True)
class Stats:
    """Admin panel uchun statistika."""

    total_users: int = 0
    new_today: int = 0
    active_today: int = 0
    blocked: int = 0
    total_messages: int = 0
    messages_today: int = 0
    # {"uz": 12, "ru": 5, "en": 1}
    by_language: dict[str, int] = field(default_factory=dict)
