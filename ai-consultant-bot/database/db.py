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
    user_id           INTEGER PRIMARY KEY,          -- Telegram user id
    username          TEXT,
    full_name         TEXT    NOT NULL DEFAULT '',
    selected_language TEXT    NOT NULL DEFAULT 'uz',
    joined_at         TEXT    NOT NULL DEFAULT (datetime('now')),
    is_blocked        INTEGER NOT NULL DEFAULT 0    -- botni bloklagan bo'lsa 1
);

-- Suhbat tarixi: har bir xabar alohida qator
CREATE TABLE IF NOT EXISTS messages (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   INTEGER NOT NULL,
    role      TEXT    NOT NULL CHECK (role IN ('user', 'assistant')),
    content   TEXT    NOT NULL,
    timestamp TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Tarixni user bo'yicha tez o'qish uchun indeks
CREATE INDEX IF NOT EXISTS idx_messages_user_id
    ON messages (user_id, id DESC);

-- Statistikada "bugungi xabarlar" ni tez sanash uchun
CREATE INDEX IF NOT EXISTS idx_messages_timestamp
    ON messages (timestamp);
"""

# Eski (v1) ustun nomlari -> yangi nomlar.
# Loyihaning birinchi versiyasida `language` va `created_at` ishlatilgan edi.
_RENAMES: dict[str, list[tuple[str, str]]] = {
    "users": [("language", "selected_language"), ("created_at", "joined_at")],
    "messages": [("created_at", "timestamp")],
}


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
        """Ulanishni ochadi, eski sxemani ko'chiradi va jadvallarni yaratadi."""
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = await aiosqlite.connect(self._path)
        # Natijalarni dict kabi (qator["ustun"]) o'qish uchun
        self._conn.row_factory = aiosqlite.Row

        await self._migrate()
        await self._conn.executescript(_SCHEMA)
        await self._conn.commit()
        logger.info("SQLite ulandi: %s", self._path)

    async def _columns(self, table: str) -> set[str]:
        """Jadvaldagi ustun nomlarini qaytaradi (jadval yo'q bo'lsa — bo'sh)."""
        cursor = await self.conn.execute(f"PRAGMA table_info({table})")
        rows = await cursor.fetchall()
        await cursor.close()
        return {row["name"] for row in rows}

    async def _migrate(self) -> None:
        """Eski bazani yangi sxemaga moslaydi.

        Bot oldingi versiyada ishlagan bo'lsa, bazada `language` /
        `created_at` ustunlari bo'ladi. Ularni yo'qotmasdan nomini
        o'zgartiramiz, so'ng yetishmayotgan ustunlarni qo'shamiz.
        """
        for table, renames in _RENAMES.items():
            columns = await self._columns(table)
            if not columns:
                continue  # jadval hali yo'q — sxema uni o'zi yaratadi
            for old, new in renames:
                if old in columns and new not in columns:
                    await self.conn.execute(
                        f"ALTER TABLE {table} RENAME COLUMN {old} TO {new}"
                    )
                    logger.info("Migratsiya: %s.%s -> %s", table, old, new)

        # Keyinroq qo'shilgan ustunlar
        users_columns = await self._columns("users")
        if users_columns and "is_blocked" not in users_columns:
            await self.conn.execute(
                "ALTER TABLE users ADD COLUMN is_blocked INTEGER NOT NULL DEFAULT 0"
            )
            logger.info("Migratsiya: users.is_blocked qo'shildi")

        await self.conn.commit()

    async def close(self) -> None:
        """Ulanishni yopadi."""
        if self._conn is not None:
            await self._conn.close()
            self._conn = None
            logger.info("SQLite ulanishi yopildi")
