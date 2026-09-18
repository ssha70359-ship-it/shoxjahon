"""Handlerlar to'plami.

`routers` ro'yxatidagi tartib muhim: Dispatcher ularni yuqoridan pastga
tekshiradi.

1. `admin`   — eng birinchi. Broadcast matnini kutayotgan holatda admin
   yozgan xabarni AI handleri "yutib yubormasligi" uchun.
2. `start`   — buyruqlar va menyu tugmalari.
3. `ai_chat` — oxirida, chunki uning ichida "catch-all" handler bor:
   qolgan har qanday matnni AI ga yuboradi.
"""

from handlers import admin, ai_chat, start

routers = (admin.router, start.router, ai_chat.router)

__all__ = ("routers",)
