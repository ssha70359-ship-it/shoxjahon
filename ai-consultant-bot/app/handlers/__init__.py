"""Handlerlar to'plami.

`routers` ro'yxatidagi tartib muhim: Dispatcher ularni yuqoridan pastga
tekshiradi. Shu sababli buyruqlar (`commands`) AI handleridan (`chat`)
oldin turadi — aks holda "catch-all" handler buyruqlarni ham yutib yuborardi.
"""

from app.handlers import chat, commands

routers = (commands.router, chat.router)

__all__ = ("routers",)
