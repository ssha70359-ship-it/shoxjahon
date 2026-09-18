"""Matn bilan ishlash uchun yordamchi funksiyalar."""

from __future__ import annotations

import re

# Telegram bitta xabardagi maksimal belgilar soni
TELEGRAM_MAX_LENGTH = 4096


def split_text(text: str, limit: int = TELEGRAM_MAX_LENGTH) -> list[str]:
    """Uzun matnni Telegram chegarasiga mos bo'laklarga bo'ladi.

    Imkon qadar qator oxiridan bo'lishga harakat qiladi, shunda matn
    o'rtasidan kesilib qolmaydi.
    """
    if len(text) <= limit:
        return [text]

    chunks: list[str] = []
    remaining = text

    while len(remaining) > limit:
        window = remaining[:limit]
        # Oxirgi qator ko'chirish belgisini qidiramiz
        split_at = window.rfind("\n")
        if split_at < limit // 2:  # mos joy topilmadi — bo'sh joy bo'yicha urinamiz
            split_at = window.rfind(" ")
        if split_at < limit // 2:  # baribir topilmadi — qattiq kesamiz
            split_at = limit

        chunks.append(remaining[:split_at].rstrip())
        remaining = remaining[split_at:].lstrip()

    if remaining:
        chunks.append(remaining)
    return chunks


def strip_html(text: str) -> str:
    """Oddiy HTML teglarini olib tashlaydi.

    Menyudagi matnlar Telegram uchun `<b>`, `<i>` kabi teglar bilan yoziladi.
    O'sha matnni suhbat tarixiga (AI kontekstiga) yozishdan oldin teglarni
    tozalaymiz — model uchun ular ortiqcha shovqin.
    """
    return re.sub(r"<[^>]+>", "", text)
