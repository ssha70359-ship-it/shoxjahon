"""Foydalanuvchi handlerlari testlari: menyu, til, AI suhbat."""

from __future__ import annotations

import pytest

from keyboards.inline import LanguageCallback
from tests.conftest import (
    button_labels,
    button_urls,
    callback_update,
    photo_update,
    text_update,
)

UZ_MENU = [
    "🤖 AI bilan suhbat",
    "📜 Suhbatni tozalash",
    "🌐 Tilni o'zgartirish",
    "ℹ️ Bot haqida",
    "📞 Bog'lanish",
]
EN_MENU = [
    "🤖 Chat with AI",
    "📜 Clear conversation",
    "🌐 Change language",
    "ℹ️ About the bot",
    "📞 Contact us",
]


async def test_start_menyuni_korsatadi(dp, bot):
    await dp.feed_update(bot, text_update("/start"))
    assert button_labels(bot.sent[-1][2]) == UZ_MENU
    assert "Aziza" in bot.sent[-1][1]


async def test_yangi_foydalanuvchi_tili_telegramdan_olinadi(dp, bot, repo):
    await dp.feed_update(bot, text_update("/start", user_id=606, language_code="ru-RU"))
    assert (await repo.get_user(606)).selected_language == "ru"
    assert "Здравствуйте" in bot.sent[-1][1]


async def test_notanish_telegram_tili_sukutdagiga_tushadi(dp, bot, repo):
    await dp.feed_update(bot, text_update("/start", user_id=607, language_code="de"))
    assert (await repo.get_user(607)).selected_language == "uz"


async def test_til_tugmalari_uchta(dp, bot):
    await dp.feed_update(bot, text_update("/language"))
    assert button_labels(bot.sent[-1][2]) == ["🇺🇿 O'zbekcha", "🇷🇺 Русский", "🇬🇧 English"]


async def test_tilni_ozgartirish_menyuni_ham_yangilaydi(dp, bot, repo):
    await dp.feed_update(bot, text_update("/start"))
    await dp.feed_update(bot, callback_update(LanguageCallback(code="en").pack(), update_id=2))

    assert (await repo.get_user(555)).selected_language == "en"
    assert "English" in bot.edited[-1][0]
    assert button_labels(bot.sent[-1][2]) == EN_MENU


async def test_notogri_til_kodi_rad_etiladi(dp, bot, repo):
    await dp.feed_update(bot, text_update("/start"))
    await dp.feed_update(bot, callback_update("lang:de", update_id=2))
    assert (await repo.get_user(555)).selected_language == "uz"


async def test_eski_tildagi_tugma_ham_ishlaydi(dp, bot, repo):
    """Til almashtirilgandan keyin ekranda qolgan eski klaviatura buzilmasligi kerak."""
    await dp.feed_update(bot, text_update("/start"))
    await dp.feed_update(bot, callback_update(LanguageCallback(code="ru").pack(), update_id=2))
    # foydalanuvchi eski (o'zbekcha) tugmani bosadi
    await dp.feed_update(bot, text_update("ℹ️ Bot haqida", update_id=3))
    assert "AI-консультант" in bot.sent[-1][1], "eski tugma ishlamadi"


async def test_boglanish_operator_havolasini_beradi(dp, bot):
    await dp.feed_update(bot, text_update("📞 Bog'lanish"))
    assert button_urls(bot.sent[-1][2]) == ["https://t.me/sunrise_manager"]
    assert "+998901234567" in bot.sent[-1][1]


# ------------------------------------------------------------- AI suhbat


async def test_savol_ai_ga_yuboriladi(dp, bot, ai):
    await dp.feed_update(bot, text_update("Sayt qancha turadi?"))
    assert len(ai.calls) == 1
    _, history = ai.calls[0]
    assert history[-1].content == "Sayt qancha turadi?"
    assert bot.sent[-1][1] == "AI javobi."


async def test_kontekst_toplanadi(dp, bot, ai):
    for i, savol in enumerate(["Salom", "Sayt-chi?", "Muddati?"], start=1):
        await dp.feed_update(bot, text_update(savol, update_id=i))

    _, history = ai.calls[-1]
    assert [m.role for m in history] == ["user", "assistant", "user", "assistant", "user"]
    assert history[0].content == "Salom"
    assert history[-1].content == "Muddati?"


async def test_javob_tarixga_yoziladi(dp, bot, repo):
    await dp.feed_update(bot, text_update("savol"))
    assert await repo.count_messages(555) == 2  # savol + javob


async def test_system_prompt_tanlangan_tilda(dp, bot, ai):
    await dp.feed_update(bot, callback_update(LanguageCallback(code="en").pack()))
    await dp.feed_update(bot, text_update("How much?", update_id=2))
    assert "Always reply in ENGLISH" in ai.calls[-1][0]


async def test_tarixni_tozalash(dp, bot, repo):
    await dp.feed_update(bot, text_update("savol"))
    await dp.feed_update(bot, text_update("📜 Suhbatni tozalash", update_id=2))
    assert await repo.count_messages(555) == 0
    assert "tozalandi" in bot.sent[-1][1]


async def test_bosh_tarixni_tozalash_boshqa_xabar_beradi(dp, bot):
    await dp.feed_update(bot, text_update("/reset"))
    assert "bo'sh" in bot.sent[-1][1]


async def test_juda_uzun_savol_kesiladi(dp, bot, ai):
    await dp.feed_update(bot, text_update("a" * 5000))
    assert len(ai.calls[0][1][-1].content) == 2000


@pytest.mark.parametrize("bosh_matn", ["   ", "\n\n"])
async def test_bosh_xabar_ai_ga_yuborilmaydi(dp, bot, ai, bosh_matn):
    await dp.feed_update(bot, text_update(bosh_matn))
    assert ai.calls == []


async def test_uzun_javob_bolaklanadi(dp, bot, repo, ai):
    ai._answer = "javob\n" * 2000  # ~12000 belgi
    await dp.feed_update(bot, text_update("savol"))
    yuborilgan = [t for _, t, _ in bot.sent]
    assert len(yuborilgan) == 3
    assert all(len(t) <= 4096 for t in yuborilgan)


async def test_nomalum_buyruq_yordamga_yonaltiradi(dp, bot, ai):
    await dp.feed_update(bot, text_update("/bunday_buyruq_yoq"))
    assert "Bunday buyruq yo'q" in bot.sent[-1][1]
    assert ai.calls == [], "noma'lum buyruq AI ga yuborilib ketdi"


async def test_admin_buyrugi_oddiy_foydalanuvchiga_oshkor_bolmaydi(dp, bot):
    """Admin bo'lmagan odam /admin yozsa, panel emas — oddiy 'noma'lum buyruq'."""
    await dp.feed_update(bot, text_update("/admin", user_id=606))
    assert "Bunday buyruq yo'q" in bot.sent[-1][1]
    assert bot.sent[-1][2] is None


async def test_matnsiz_xabar_uchun_alohida_javob(dp, bot, ai):
    await dp.feed_update(bot, photo_update())
    assert "faqat matnli" in bot.sent[-1][1]
    assert ai.calls == []


async def test_ai_xatosi_foydalanuvchiga_korsatiladi(dp, bot, ai, monkeypatch):
    from services.ai_client import AIError

    async def xato(*_args, **_kwargs):
        raise AIError("Hozir so'rovlar ko'p.")

    monkeypatch.setattr(ai, "ask", xato)
    await dp.feed_update(bot, text_update("savol"))
    assert "Hozir so'rovlar ko'p." in bot.sent[-1][1]


async def test_kutilmagan_xato_botni_yiqitmaydi(dp, bot, ai, monkeypatch):
    async def portlash(*_args, **_kwargs):
        raise RuntimeError("kutilmagan")

    monkeypatch.setattr(ai, "ask", portlash)
    await dp.feed_update(bot, text_update("savol"))
    assert "Texnik nosozlik" in bot.sent[-1][1]
