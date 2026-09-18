"""Ko'p tillilik testlari."""

from __future__ import annotations

import pytest

from locales import _TRANSLATIONS, LANGUAGE_NAMES, all_button_texts, t


def test_uchala_til_bir_xil_kalitlarga_ega():
    """Bitta tilga kalit qo'shib, boshqasida unutish — eng tez-tez uchraydigan xato."""
    keys = {lang: set(texts) for lang, texts in _TRANSLATIONS.items()}
    uz = keys["uz"]
    for lang, lang_keys in keys.items():
        assert lang_keys == uz, f"{lang} da farq: {lang_keys ^ uz}"


def test_uchta_til_mavjud():
    assert set(LANGUAGE_NAMES) == {"uz", "ru", "en"}


@pytest.mark.parametrize("lang", ["uz", "ru", "en"])
def test_har_bir_tilda_matn_qaytadi(lang):
    assert t(lang, "btn_ai")


def test_notanish_til_ozbekchaga_qaytadi():
    assert t("de", "btn_ai") == t("uz", "btn_ai")


def test_notanish_kalit_botni_yiqitmaydi():
    """Tarjima unutilgan bo'lsa ham `t()` xato ko'tarmasligi kerak."""
    assert t("uz", "bunday_kalit_yoq") == "bunday_kalit_yoq"


def test_formatlash_ishlaydi():
    assert "5" in t("uz", "history_cleared", count=5)


def test_all_button_texts_uchta_yozuv_qaytaradi():
    """Tugma filtrlari uchala tildagi yozuvni qabul qilishi kerak."""
    labels = all_button_texts("btn_ai")
    assert len(labels) == 3
    assert "🤖 AI bilan suhbat" in labels
