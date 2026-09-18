"""Ma'lumotlar bazasi qatlami testlari."""

from __future__ import annotations

import sqlite3

from database.db import Database
from database.repository import Repository


async def test_yangi_foydalanuvchi_qoshiladi(repo):
    await repo.upsert_user(1, "shoxrux", "Shoxrux S", "uz")
    user = await repo.get_user(1)
    assert user is not None
    assert user.username == "shoxrux"
    assert user.selected_language == "uz"
    assert user.is_blocked is False


async def test_upsert_tanlangan_tilni_ozgartirmaydi(repo):
    """Eng muhim qoida: profil yangilanganda til ustidan yozilmasligi kerak,
    aks holda har bir xabarda foydalanuvchi tanlovi yo'qolardi."""
    await repo.upsert_user(1, "shoxrux", "Shoxrux", "uz")
    await repo.set_language(1, "en")
    await repo.upsert_user(1, "shoxrux_yangi", "Shoxrux S", "uz")  # qayta kirish

    user = await repo.get_user(1)
    assert user.selected_language == "en", "til ustidan yozilib ketdi"
    assert user.username == "shoxrux_yangi", "profil yangilanmadi"


async def test_bloklangan_foydalanuvchi_qayta_kirsa_blok_olinadi(repo):
    await repo.upsert_user(1, "u", "U", "uz")
    await repo.set_blocked(1, True)
    await repo.upsert_user(1, "u", "U", "uz")
    assert (await repo.get_user(1)).is_blocked is False


async def test_tarix_xronologik_tartibda_qaytadi(repo):
    await repo.upsert_user(1, "u", "U", "uz")
    for i in range(1, 6):
        await repo.add_message(1, "user", f"savol {i}")
        await repo.add_message(1, "assistant", f"javob {i}")

    history = await repo.get_history(1, 4)
    assert [m.content for m in history] == ["savol 4", "javob 4", "savol 5", "javob 5"]
    assert [m.role for m in history] == ["user", "assistant", "user", "assistant"]


async def test_tarix_foydalanuvchilar_orasida_ajratilgan(repo):
    await repo.upsert_user(1, "a", "A", "uz")
    await repo.upsert_user(2, "b", "B", "uz")
    await repo.add_message(1, "user", "birinchi")
    await repo.add_message(2, "user", "ikkinchi")

    assert await repo.count_messages(1) == 1
    assert (await repo.get_history(2, 10))[0].content == "ikkinchi"


async def test_tarixni_tozalash_faqat_oz_xabarlarini_ochiradi(repo):
    await repo.upsert_user(1, "a", "A", "uz")
    await repo.upsert_user(2, "b", "B", "uz")
    await repo.add_message(1, "user", "x")
    await repo.add_message(1, "user", "y")
    await repo.add_message(2, "user", "z")

    assert await repo.clear_history(1) == 2
    assert await repo.count_messages(1) == 0
    assert await repo.count_messages(2) == 1


async def test_bosh_tarixni_tozalash_nol_qaytaradi(repo):
    await repo.upsert_user(1, "a", "A", "uz")
    assert await repo.clear_history(1) == 0


async def test_broadcast_royxati_bloklaganlarni_chiqarib_tashlaydi(repo):
    for uid in (1, 2, 3):
        await repo.upsert_user(uid, f"u{uid}", f"U{uid}", "uz")
    await repo.set_blocked(2, True)

    assert await repo.get_broadcast_targets() == [1, 3]


async def test_statistika(repo):
    await repo.upsert_user(1, "a", "A", "uz")
    await repo.upsert_user(2, "b", "B", "ru")
    await repo.upsert_user(3, "c", "C", "ru")
    await repo.set_blocked(3, True)
    await repo.add_message(1, "user", "savol")
    await repo.add_message(1, "assistant", "javob")
    await repo.add_message(2, "user", "savol")

    stats = await repo.get_stats()
    assert stats.total_users == 3
    assert stats.new_today == 3
    assert stats.blocked == 1
    assert stats.stored_messages == 3
    assert stats.stored_messages_today == 3
    assert stats.active_today == 3  # uchalasi ham bugun qo'shilgan
    assert stats.by_language == {"ru": 2, "uz": 1}


async def test_faollik_reset_dan_keyin_ham_saqlanadi(repo):
    """Eng muhim: foydalanuvchi tarixini tozalasa ham, admin
    statistikasidagi "bugun faol" ko'rsatkichi yo'qolmasligi kerak.

    Shuning uchun faollik `messages` jadvalidan emas,
    `users.last_active_at` dan hisoblanadi.
    """
    await repo.upsert_user(1, "a", "A", "uz")
    await repo.add_message(1, "user", "savol")
    await repo.add_message(1, "assistant", "javob")

    oldin = await repo.get_stats()
    assert oldin.active_today == 1
    assert oldin.stored_messages == 2

    await repo.clear_history(1)

    keyin = await repo.get_stats()
    assert keyin.active_today == 1, "tarix tozalanganda faollik yo'qoldi"
    assert keyin.stored_messages == 0, "saqlangan xabarlar soni kamayishi kerak"


async def test_har_bir_harakat_faollik_vaqtini_yangilaydi(repo):
    """upsert_user har bir yangilanishda (middleware orqali) chaqiriladi,
    shuning uchun tugma bosish ham faollik hisoblanadi."""
    await repo.upsert_user(1, "a", "A", "uz")
    boshlangich = (await repo.get_user(1)).last_active_at
    assert boshlangich, "last_active_at to'ldirilmadi"

    await repo.upsert_user(1, "a", "A", "uz")
    assert (await repo.get_user(1)).last_active_at >= boshlangich


async def test_migratsiyada_faollik_royxatdan_otgan_sanaga_tenglanadi(tmp_path):
    """Eski bazada last_active_at bo'sh qolmasligi kerak."""
    path = tmp_path / "eski2.db"
    con = sqlite3.connect(path)
    con.executescript(
        """
        CREATE TABLE users (
            user_id INTEGER PRIMARY KEY, username TEXT, full_name TEXT,
            selected_language TEXT, joined_at TEXT, is_blocked INTEGER DEFAULT 0
        );
        INSERT INTO users VALUES (42,'eski','Eski','uz','2026-01-01',0);
        """
    )
    con.commit()
    con.close()

    database = Database(path)
    await database.connect()
    try:
        user = await Repository(database).get_user(42)
        assert user.last_active_at == "2026-01-01"
    finally:
        await database.close()


async def test_foydalanuvchi_ochirilsa_tarixi_ham_ochadi(db, repo):
    """ON DELETE CASCADE ishlayotganini tekshiramiz."""
    await repo.upsert_user(1, "a", "A", "uz")
    await repo.add_message(1, "user", "x")
    await db.conn.execute("DELETE FROM users WHERE user_id = 1")
    await db.conn.commit()
    assert await repo.count_messages(1) == 0


async def test_eski_baza_migratsiyasi(tmp_path):
    """Loyihaning birinchi versiyasidagi ustun nomlari ko'chirilishi kerak."""
    path = tmp_path / "eski.db"
    con = sqlite3.connect(path)
    con.executescript(
        """
        CREATE TABLE users (
            user_id INTEGER PRIMARY KEY, username TEXT, full_name TEXT,
            language TEXT, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER,
            role TEXT, content TEXT, created_at TEXT
        );
        INSERT INTO users VALUES (42,'eski','Eski User','ru','2026-01-01','2026-01-01');
        INSERT INTO messages (user_id, role, content, created_at)
            VALUES (42,'user','eski savol','2026-01-01');
        """
    )
    con.commit()
    con.close()

    database = Database(path)
    await database.connect()
    try:
        repo = Repository(database)
        user = await repo.get_user(42)
        assert user.selected_language == "ru"  # language -> selected_language
        assert user.joined_at == "2026-01-01"  # created_at -> joined_at
        assert user.is_blocked is False  # yangi ustun qo'shildi

        history = await repo.get_history(42, 10)
        assert [m.content for m in history] == ["eski savol"]  # created_at -> timestamp
    finally:
        await database.close()


async def test_migratsiya_ikki_marta_ishlasa_ham_xato_bermaydi(tmp_path):
    path = tmp_path / "qayta.db"
    for _ in range(2):
        database = Database(path)
        await database.connect()
        await database.close()
