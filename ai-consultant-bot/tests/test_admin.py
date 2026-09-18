"""Admin panel testlari: kirish huquqi, statistika, ommaviy xabar."""

from __future__ import annotations

from aiogram.types import MessageEntity

from keyboards.inline import AdminCallback, BroadcastCallback
from tests.conftest import (
    BLOCKED_USER_ID,
    button_labels,
    callback_update,
    text_update,
    text_update_with_entities,
)

ADMIN = 555  # conftest dagi ADMIN_ID ro'yxatida bor
ODDIY = 606  # admin emas


async def test_admin_panel_ochiladi(dp, bot):
    await dp.feed_update(bot, text_update("/admin", user_id=ADMIN))
    assert button_labels(bot.sent[-1][2]) == ["📊 Statistika", "📣 Ommaviy xabar"]


async def test_oddiy_foydalanuvchiga_panel_ochilmaydi(dp, bot):
    await dp.feed_update(bot, text_update("/admin", user_id=ODDIY))
    assert button_labels(bot.sent[-1][2]) == []
    assert "Ommaviy xabar" not in bot.sent[-1][1]


async def test_oddiy_foydalanuvchi_stats_tugmasini_bosa_olmaydi(dp, bot):
    await dp.feed_update(bot, callback_update(AdminCallback(action="stats").pack(), user_id=ODDIY))
    assert bot.edited == []


async def test_statistika_korsatiladi(dp, bot, repo):
    await repo.upsert_user(ADMIN, "admin", "Admin", "uz")
    await repo.upsert_user(ODDIY, "user", "User", "ru")
    await repo.add_message(ODDIY, "user", "savol")

    await dp.feed_update(bot, callback_update(AdminCallback(action="stats").pack(), user_id=ADMIN))
    matn = bot.edited[-1][0]
    assert "Jami foydalanuvchilar: <b>2</b>" in matn
    assert "Bugun faol: <b>2</b>" in matn  # ikkalasi ham bugun muloqot qildi
    assert "Saqlangan xabarlar: <b>1</b>" in matn
    assert "🇷🇺 Русский — <b>1</b>" in matn


async def test_statistika_reset_dan_keyin_faollikni_korsatadi(dp, bot, repo):
    """Demoda topilgan kamchilik: /reset dan keyin statistika butunlay
    nolga tushib qolardi."""
    await dp.feed_update(bot, text_update("savol", user_id=ODDIY))
    await dp.feed_update(bot, text_update("/reset", user_id=ODDIY, update_id=2))

    await dp.feed_update(
        bot, callback_update(AdminCallback(action="stats").pack(), user_id=ADMIN, update_id=3)
    )
    matn = bot.edited[-1][0]
    assert "Bugun faol: <b>2</b>" in matn, matn
    assert "Saqlangan xabarlar: <b>0</b>" in matn


async def test_stats_buyrugi_ham_ishlaydi(dp, bot):
    await dp.feed_update(bot, text_update("/stats", user_id=ADMIN))
    assert "Statistika" in bot.sent[-1][1]


# -------------------------------------------------------------- broadcast


async def _broadcast_tayyorla(dp, bot, repo, matn="Yangilik: <b>chegirma!</b>"):
    """Broadcast oqimini tasdiqlash bosqichigacha olib boradi."""
    for uid in (ADMIN, ODDIY, BLOCKED_USER_ID):
        await repo.upsert_user(uid, f"u{uid}", f"U{uid}", "uz")
    await dp.feed_update(bot, text_update("/broadcast", user_id=ADMIN))
    await dp.feed_update(bot, text_update(matn, user_id=ADMIN, update_id=2))


async def test_broadcast_korinishi_va_qabul_qiluvchilar_soni(dp, bot, repo):
    await _broadcast_tayyorla(dp, bot, repo)
    assert "Qabul qiluvchilar: <b>3</b>" in bot.sent[-1][1]
    assert button_labels(bot.sent[-1][2]) == ["✅ Yuborish", "❌ Bekor qilish"]


async def test_broadcast_telegram_formatlashini_saqlaydi(dp, bot, repo):
    """Admin Telegram'ning o'z formatlashidan foydalansa (qalin, havola),
    u `html_text` orqali HTML teglarga aylanadi va tarqatishda saqlanadi."""
    for uid in (ADMIN, ODDIY):
        await repo.upsert_user(uid, f"u{uid}", f"U{uid}", "uz")
    await dp.feed_update(bot, text_update("/broadcast", user_id=ADMIN))

    # "chegirma" so'zi Telegram'da qalin qilib belgilangan
    await dp.feed_update(
        bot,
        text_update_with_entities(
            "Yangilik: chegirma!",
            [MessageEntity(type="bold", offset=10, length=8)],
            user_id=ADMIN,
            update_id=2,
        ),
    )
    assert "<b>chegirma</b>" in bot.sent[-1][1]


async def test_broadcast_qolda_yozilgan_teglar_ekranlanadi(dp, bot, repo):
    """Admin "<b>" ni qo'lda yozsa, u teg emas — oddiy matn bo'lib qoladi.
    Bu Telegram'ning xatti-harakati va xabarni buzilishdan saqlaydi."""
    await _broadcast_tayyorla(dp, bot, repo, matn="Narx <b>past</b>")
    assert "&lt;b&gt;past&lt;/b&gt;" in bot.sent[-1][1]


async def test_broadcast_yuboriladi_va_bloklagan_belgilanadi(dp, bot, repo):
    await _broadcast_tayyorla(dp, bot, repo)
    bot.sent.clear()

    await dp.feed_update(
        bot, callback_update(BroadcastCallback(action="send").pack(), user_id=ADMIN, update_id=3)
    )

    yetkazilgan = {chat_id for chat_id, _, _ in bot.sent}
    assert ADMIN in yetkazilgan and ODDIY in yetkazilgan
    assert BLOCKED_USER_ID not in yetkazilgan

    hisobot = bot.sent[-1][1]
    assert "Yetkazildi: <b>2</b>" in hisobot
    assert "Bloklagan: <b>1</b>" in hisobot

    # bloklagan foydalanuvchi bazada belgilandi va keyingi ro'yxatga kirmaydi
    assert (await repo.get_user(BLOCKED_USER_ID)).is_blocked is True
    assert BLOCKED_USER_ID not in await repo.get_broadcast_targets()


async def test_broadcast_tugma_bilan_bekor_qilinadi(dp, bot, repo):
    await _broadcast_tayyorla(dp, bot, repo)
    await dp.feed_update(
        bot, callback_update(BroadcastCallback(action="cancel").pack(), user_id=ADMIN, update_id=3)
    )
    assert "bekor qilindi" in bot.edited[-1][0]


async def test_broadcast_cancel_buyrugi_bilan_bekor_qilinadi(dp, bot, repo):
    await repo.upsert_user(ADMIN, "a", "A", "uz")
    await dp.feed_update(bot, text_update("/broadcast", user_id=ADMIN))
    await dp.feed_update(bot, text_update("/cancel", user_id=ADMIN, update_id=2))
    assert "bekor qilindi" in bot.sent[-1][1]


async def test_bekor_qilingandan_keyin_matn_ai_ga_ketadi(dp, bot, repo, ai):
    """FSM holati tozalanganini tekshiramiz: keyingi xabar broadcast emas."""
    await _broadcast_tayyorla(dp, bot, repo)
    await dp.feed_update(
        bot, callback_update(BroadcastCallback(action="cancel").pack(), user_id=ADMIN, update_id=3)
    )
    await dp.feed_update(bot, text_update("oddiy savol", user_id=ADMIN, update_id=4))
    assert len(ai.calls) == 1
    assert ai.calls[0][1][-1].content == "oddiy savol"


async def test_broadcast_holatida_matn_ai_ga_ketmaydi(dp, bot, repo, ai):
    await _broadcast_tayyorla(dp, bot, repo, matn="tarqatiladigan matn")
    assert ai.calls == [], "broadcast matni AI ga yuborilib ketdi"


async def test_admin_buyrugi_yarim_qolgan_broadcastni_tozalaydi(dp, bot, repo, ai):
    await repo.upsert_user(ADMIN, "a", "A", "uz")
    await dp.feed_update(bot, text_update("/broadcast", user_id=ADMIN))
    await dp.feed_update(bot, text_update("/admin", user_id=ADMIN, update_id=2))
    await dp.feed_update(bot, text_update("oddiy savol", user_id=ADMIN, update_id=3))
    assert len(ai.calls) == 1


async def test_foydalanuvchi_yoq_bolsa_broadcast_boshlanmaydi(dp, bot):
    await dp.feed_update(bot, text_update("/broadcast", user_id=ADMIN))
    # ADMIN ning o'zi middleware orqali bazaga tushadi, shuning uchun
    # kamida bitta qabul qiluvchi bo'ladi — bu holat oddiy oqim
    await dp.feed_update(bot, text_update("matn", user_id=ADMIN, update_id=2))
    assert "Qabul qiluvchilar: <b>1</b>" in bot.sent[-1][1]
