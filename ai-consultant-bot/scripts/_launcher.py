"""Botni lokal soxta Telegram serveriga qaratib ishga tushiradi.

Bu faylni to'g'ridan-to'g'ri chaqirmang — uni `scripts/demo.py` ishlatadi.

Bot kodiga umuman tegilmaydi — faqat aiogram sessiyasining manzili
almashtiriladi (Telegram'ning o'zi ham "local Bot API server" ni
qo'llab-quvvatlaydi, ya'ni bu sun'iy holat emas).
"""

import asyncio
import sys
from pathlib import Path

# Loyiha ildizi — shu fayl scripts/ ichida yotadi
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import os

from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.client.telegram import TelegramAPIServer

PORT = os.environ.get("DEMO_TELEGRAM_PORT", "8081")

LOCAL = TelegramAPIServer(
    base=f"http://127.0.0.1:{PORT}/bot{{token}}/{{method}}",
    file=f"http://127.0.0.1:{PORT}/file/bot{{token}}/{{path}}",
)

_orig_init = AiohttpSession.__init__


def _patched_init(self, *args, **kwargs):
    kwargs["api"] = LOCAL
    _orig_init(self, *args, **kwargs)


AiohttpSession.__init__ = _patched_init

import main  # noqa: E402  — patch'dan keyin import qilinishi shart

asyncio.run(main.main())
