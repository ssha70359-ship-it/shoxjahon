"""English texts."""

TEXTS: dict[str, str] = {
    # --- general ---
    "language_name": "🇬🇧 English",
    "welcome": (
        "Hello, <b>{name}</b>! 👋\n\n"
        "I'm <b>{persona}</b> — the online consultant at <b>{company}</b>.\n"
        "Our field: {field}.\n\n"
        "Use the buttons below or simply type your question."
    ),
    "language_changed": "✅ Language changed to <b>English</b>",
    "choose_language": "🌐 Choose your language:",
    "menu_prompt": "Pick one of the sections below 👇",
    "back": "⬅️ Back",
    # --- reply buttons ---
    "btn_ai": "🤖 Chat with AI",
    "btn_clear": "📜 Clear conversation",
    "btn_language": "🌐 Change language",
    "btn_about": "ℹ️ About the bot",
    "btn_contact": "📞 Contact us",
    # --- AI chat ---
    "ai_mode_on": (
        "🤖 <b>AI chat mode is on.</b>\n\n"
        "Type your question — I'll answer about {company}'s services.\n"
        "I remember the last {limit} messages, so feel free to ask step by step."
    ),
    "history_cleared": "🧹 Conversation history cleared ({count} messages removed).",
    "history_empty": "The history is already empty. Go ahead and ask 🙂",
    "ai_error": "⚠️ {error}",
    "ai_unknown_error": "⚠️ A technical error occurred. Please try again shortly.",
    "unknown_command": "🤔 No such command. See /help for the list.",
    "only_text": "Sorry, I only understand text messages for now. Please type your question 🙂",
    "throttled": "A bit slower, please 🙂",
    # --- info sections ---
    "about": (
        "ℹ️ <b>About the bot</b>\n\n"
        "I'm <b>{persona}</b> — the AI consultant at <b>{company}</b>.\n"
        "Our field: {field}.\n\n"
        "<b>What I can do:</b>\n"
        "• Answer questions about our services\n"
        "• Remember the conversation context (last {limit} messages)\n"
        "• Work in three languages: Uzbek, Russian, English\n\n"
        "<b>Commands:</b>\n"
        "/start — restart the bot\n"
        "/menu — main menu\n"
        "/language — change language\n"
        "/reset — clear conversation history\n"
        "/help — help"
    ),
    "contact": (
        "📞 <b>Contact us</b>\n\n"
        "{contacts}\n\n"
        "Our manager will get back to you during business hours. "
        "In the meantime, feel free to ask me anything."
    ),
    "contact_empty": "Contact details will be added soon.",
    "btn_write_operator": "✍️ Message the operator",
    "btn_call": "📱 Call us",
    # --- admin ---
    "admin_denied": "⛔️ This section is for administrators only.",
    "admin_panel": "🛠 <b>Admin panel</b>\n\nChoose an action:",
    "btn_admin_stats": "📊 Statistics",
    "btn_admin_broadcast": "📣 Broadcast",
    "admin_stats": (
        "📊 <b>Statistics</b>\n\n"
        "👥 Total users: <b>{total_users}</b>\n"
        "🆕 Joined today: <b>{new_today}</b>\n"
        "🔥 Active today: <b>{active_today}</b>\n"
        "🚫 Blocked the bot: <b>{blocked}</b>\n\n"
        "💬 Stored messages: <b>{stored_messages}</b>\n"
        "💬 Of those, today: <b>{stored_messages_today}</b>\n"
        "<i>(goes down when a user runs /reset)</i>\n\n"
        "🌐 <b>By language:</b>\n{languages}"
    ),
    "broadcast_ask": (
        "📣 Send the message you want to broadcast.\n\n"
        "Use Telegram's own formatting (bold, italic, links) — it will be preserved. "
        "There's no need to type tags by hand.\n"
        "Send /cancel to abort."
    ),
    "broadcast_preview": (
        "👀 <b>Preview:</b>\n\n{text}\n\n━━━━━━━━━━━━━━━\n📬 Recipients: <b>{count}</b>\n\nSend it?"
    ),
    "btn_broadcast_send": "✅ Send",
    "btn_broadcast_cancel": "❌ Cancel",
    "broadcast_cancelled": "❌ Broadcast cancelled.",
    "broadcast_started": "📤 Sending... ({count} users)",
    "broadcast_done": (
        "✅ <b>Broadcast finished</b>\n\n"
        "📬 Delivered: <b>{sent}</b>\n"
        "🚫 Blocked: <b>{blocked}</b>\n"
        "⚠️ Failed: <b>{failed}</b>"
    ),
    "broadcast_no_users": "There are no users yet.",
    "nothing_to_cancel": "Nothing to cancel.",
}
