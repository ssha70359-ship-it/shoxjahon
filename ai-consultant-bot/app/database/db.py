"""SQLite ulanishini boshqarish (aiosqlite).

Bitta umumiy ulanish ochiladi va butun bot hayoti davomida ishlatiladi.
aiosqlite har bir so'rovni alohida oqimda bajarganligi uchun event loop
bloklanmaydi.
"""

from __future__ import annotations

import logging
from pathlib import Path

import aiosqlite

logger = logging.getLogger(__name__)

# Jadval sxemasi. `IF NOT EXISTS` — har safar xavfsiz ishga tushiriladi.
_SCHEMA = """
PRAGMA journal_mode = WAL;      -- bir vaqtda o'qish/yozishni tezlashtiradi
PRAGMA foreign_keys = ON;       -- tashqi kalit cheklovlarini yoqamiz

-- Foydalanuvchilar
CREATE TABLE IF NOT EXISTS users (
    user_id     INTEGER PRIMARY KEY,          -- Telegram user id
    username    TEXT,
    full_name   TEXT,
    language    TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Suhbat tarixi: har bir xabar alohida qator
CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    role        TEXT    NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Tarixni user bo'yicha tez o'qish uchun indeks
CREATE INDEX IF NOT EXISTS idx_messages_user_created
    ON messages (user_id, id DESC);
"""


class Database:
    """aiosqlite ulanishi ustidagi yupqa qobiq (wrapper)."""

    def __init__(self, path: Path) -> None:
        self._path = path
        self._conn: aiosqlite.Connection | None = None

    @property
    def conn(self) -> aiosqlite.Connection:
        """Ochiq ulanishni qaytaradi; ochilmagan bo'lsa xato beradi."""
        if self._conn is None:
            raise RuntimeError("Baza ulanmagan. Avval `await db.connect()` chaqiring.")
        return self._conn

    async def connect(self) -> None:
        """Ulanishni ochadi va jadvallarni yaratadi."""
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = await aiosqlite.connect(self._path)
        # Natijalarni dict kabi (qator["ustun"]) o'qish uchun
        self._conn.row_factory = aiosqlite.Row
        await self._conn.executescript(_SCHEMA)
        await self._conn.commit()
        logger.info("SQLite ulandi: %s", self._path)

    async def close(self) -> None:
        """Ulanishni yopadi."""
        if self._conn is not None:
            await self._conn.close()
            self._conn = None
            logger.info("SQLite ulanishi yopildi")
