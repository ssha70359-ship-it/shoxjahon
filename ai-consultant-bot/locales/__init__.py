"""Ko'p tillilik (i18n).

Matnlar til bo'yicha alohida modullarda saqlanadi. `t()` funksiyasi
kerakli tildagi matnni topib, formatlab qaytaradi.
"""

from __future__ import annotations

import logging

from config import Language
from locales import en, ru, uz

logger = logging.getLogger(__name__)

# Til kodi -> matnlar lug'ati
_TRANSLATIONS: dict[str, dict[str, str]] = {
    Language.UZ.value: uz.TEXTS,
    Language.RU.value: ru.TEXTS,
    Language.EN.value: en.TEXTS,
}

# Til tanlash tugmalari uchun: kod -> tugma yozuvi
LANGUAGE_NAMES: dict[str, str] = {
    code: texts["language_name"] for code, texts in _TRANSLATIONS.items()
}


def t(lang: str, key: str, **kwargs: object) -> str:
    """Tanlangan tildagi matnni qaytaradi.

    Agar til yoki kalit topilmasa — o'zbekchaga qaytadi (fallback), shunda
    bot hech qachon xato bermaydi.
    """
    texts = _TRANSLATIONS.get(lang) or _TRANSLATIONS[Language.UZ.value]
    template = texts.get(key)

    if template is None:  # tarjima unutilgan bo'lsa — zaxira til
        logger.warning("Tarjima topilmadi: lang=%s key=%s", lang, key)
        template = _TRANSLATIONS[Language.UZ.value].get(key, key)

    return template.format(**kwargs) if kwargs else template


def all_button_texts(key: str) -> set[str]:
    """Bitta tugmaning barcha tillardagi yozuvlarini qaytaradi.

    Handler filtrlari uchun kerak: foydalanuvchi tilini almashtirgan bo'lsa
    ham, eski klaviaturadagi tugma ishlashda davom etsin.
    """
    return {texts[key] for texts in _TRANSLATIONS.values() if key in texts}
