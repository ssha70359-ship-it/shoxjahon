"""Ma'lumotlar bazasi bilan ishlovchi funksiyalar (Repository qatlami).

Handlerlar to'g'ridan-to'g'ri SQL yozmaydi — hammasi shu yerda.
Shu tufayli ertaga SQLite o'rniga PostgreSQL qo'ysangiz, faqat shu fayl
o'zgaradi.
"""

from __future__ import annotations

from database.db import Database
from database.models import ChatMessage, Stats, User


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
        default_language: str,
    ) -> None:
        """Foydalanuvchini qo'shadi; mavjud bo'lsa profilini yangilaydi.

        DIQQAT: `selected_language` faqat yangi foydalanuvchi uchun
        yoziladi. Mavjud foydalanuvchining tanlagan tili hech qachon
        ustidan yozilmaydi — aks holda har bir xabarda til tiklanib
        ketardi. Blokdan chiqqan bo'lsa, `is_blocked` tozalanadi.
        """
        await self._db.conn.execute(
            """
            INSERT INTO users (user_id, username, full_name, selected_language)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                username   = excluded.username,
                full_name  = excluded.full_name,
                is_blocked = 0
            """,
            (user_id, username, full_name, default_language),
        )
        await self._db.conn.commit()

    async def get_user(self, user_id: int) -> User | None:
        """Foydalanuvchini qaytaradi; topilmasa — None."""
        cursor = await self._db.conn.execute(
            """
            SELECT user_id, username, full_name, selected_language, joined_at, is_blocked
            FROM users WHERE user_id = ?
            """,
            (user_id,),
        )
        row = await cursor.fetchone()
        await cursor.close()
        if row is None:
            return None
        return User(
            user_id=row["user_id"],
            username=row["username"],
            full_name=row["full_name"],
            selected_language=row["selected_language"],
            joined_at=row["joined_at"],
            is_blocked=bool(row["is_blocked"]),
        )

    async def get_language(self, user_id: int, default: str) -> str:
        """Foydalanuvchi tanlagan tilni qaytaradi (topilmasa — `default`)."""
        cursor = await self._db.conn.execute(
            "SELECT selected_language FROM users WHERE user_id = ?",
            (user_id,),
        )
        row = await cursor.fetchone()
        await cursor.close()
        return row["selected_language"] if row else default

    async def set_language(self, user_id: int, language: str) -> None:
        """Foydalanuvchi tanlagan tilni saqlaydi."""
        await self._db.conn.execute(
            "UPDATE users SET selected_language = ? WHERE user_id = ?",
            (language, user_id),
        )
        await self._db.conn.commit()

    async def set_blocked(self, user_id: int, blocked: bool) -> None:
        """Botni bloklagan foydalanuvchini belgilaydi.

        Ommaviy xabar yuborishda ishlatiladi: bloklagan odamlarga keyingi
        safar urinib o'tirmaymiz.
        """
        await self._db.conn.execute(
            "UPDATE users SET is_blocked = ? WHERE user_id = ?",
            (int(blocked), user_id),
        )
        await self._db.conn.commit()

    async def get_broadcast_targets(self) -> list[int]:
        """Ommaviy xabar yuboriladigan foydalanuvchilar ro'yxati."""
        cursor = await self._db.conn.execute(
            "SELECT user_id FROM users WHERE is_blocked = 0 ORDER BY user_id"
        )
        rows = await cursor.fetchall()
        await cursor.close()
        return [row["user_id"] for row in rows]

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
            SELECT role, content, timestamp
            FROM messages
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (user_id, limit),
        )
        rows = await cursor.fetchall()
        await cursor.close()
        return [
            ChatMessage(role=row["role"], content=row["content"], timestamp=row["timestamp"])
            for row in reversed(rows)
        ]

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

    # ---------------------------------------------------------------- stats

    async def get_stats(self) -> Stats:
        """Admin paneli uchun statistikani yig'adi.

        "Bugun" — SQLite'ning `date('now')` i, ya'ni UTC bo'yicha kun.
        """
        stats = Stats()

        async def scalar(query: str) -> int:
            cursor = await self._db.conn.execute(query)
            row = await cursor.fetchone()
            await cursor.close()
            return int(row[0]) if row else 0

        stats.total_users = await scalar("SELECT COUNT(*) FROM users")
        stats.new_today = await scalar(
            "SELECT COUNT(*) FROM users WHERE date(joined_at) = date('now')"
        )
        stats.blocked = await scalar("SELECT COUNT(*) FROM users WHERE is_blocked = 1")
        stats.total_messages = await scalar("SELECT COUNT(*) FROM messages")
        stats.messages_today = await scalar(
            "SELECT COUNT(*) FROM messages WHERE date(timestamp) = date('now')"
        )
        # Bugun kamida bitta xabar yozgan noyob foydalanuvchilar
        stats.active_today = await scalar(
            "SELECT COUNT(DISTINCT user_id) FROM messages "
            "WHERE date(timestamp) = date('now') AND role = 'user'"
        )

        cursor = await self._db.conn.execute(
            "SELECT selected_language, COUNT(*) AS c FROM users "
            "GROUP BY selected_language ORDER BY c DESC"
        )
        rows = await cursor.fetchall()
        await cursor.close()
        stats.by_language = {row["selected_language"]: row["c"] for row in rows}

        return stats
