"""Ma'lumotlar bazasi bilan ishlovchi funksiyalar (Repository qatlami).

Handlerlar to'g'ridan-to'g'ri SQL yozmaydi — hammasi shu yerda.
Shu tufayli ertaga SQLite o'rniga PostgreSQL qo'ysangiz, faqat shu fayl
o'zgaradi.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.database.db import Database


@dataclass(slots=True)
class ChatMessage:
    """Suhbatning bitta xabari (AI ga yuboriladigan ko'rinish)."""

    role: str  # "user" yoki "assistant"
    content: str


class Repository:
    """users va messages jadvallari ustidagi amallar."""

    def __init__(self, db: Database) -> None:
        self._db = db

    # ---------------------------------------------------------------- users

    async def upsert_user(
        self,
        user_id: int,
        username: str | None,
        full_name: str,
        language: str | None,
    ) -> None:
        """Foydalanuvchini qo'shadi; mavjud bo'lsa ma'lumotini yangilaydi."""
        await self._db.conn.execute(
            """
            INSERT INTO users (user_id, username, full_name, language)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                username   = excluded.username,
                full_name  = excluded.full_name,
                language   = excluded.language,
                updated_at = datetime('now')
            """,
            (user_id, username, full_name, language),
        )
        await self._db.conn.commit()

    # ------------------------------------------------------------- messages

    async def add_message(self, user_id: int, role: str, content: str) -> None:
        """Suhbat tarixiga bitta xabar yozadi."""
        await self._db.conn.execute(
            "INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)",
            (user_id, role, content),
        )
        await self._db.conn.commit()

    async def get_history(self, user_id: int, limit: int) -> list[ChatMessage]:
        """Oxirgi `limit` ta xabarni xronologik tartibda qaytaradi.

        Avval `id DESC` bilan oxirgilarini olamiz, so'ng ro'yxatni teskari
        aylantiramiz — natijada eng eski xabar birinchi bo'ladi (AI modeli
        aynan shu tartibni kutadi).
        """
        cursor = await self._db.conn.execute(
            """
            SELECT role, content
            FROM messages
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (user_id, limit),
        )
        rows = await cursor.fetchall()
        await cursor.close()
        return [ChatMessage(role=row["role"], content=row["content"]) for row in reversed(rows)]

    async def clear_history(self, user_id: int) -> int:
        """Foydalanuvchining butun suhbat tarixini o'chiradi.

        O'chirilgan xabarlar sonini qaytaradi.
        """
        cursor = await self._db.conn.execute(
            "DELETE FROM messages WHERE user_id = ?",
            (user_id,),
        )
        await self._db.conn.commit()
        return cursor.rowcount or 0

    async def count_messages(self, user_id: int) -> int:
        """Foydalanuvchi tarixidagi xabarlar sonini qaytaradi."""
        cursor = await self._db.conn.execute(
            "SELECT COUNT(*) AS c FROM messages WHERE user_id = ?",
            (user_id,),
        )
        row = await cursor.fetchone()
        await cursor.close()
        return int(row["c"]) if row else 0
