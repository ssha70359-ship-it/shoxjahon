"""O'zbek tilidagi matnlar."""

TEXTS: dict[str, str] = {
    # --- umumiy ---
    "language_name": "🇺🇿 O'zbekcha",
    "welcome": (
        "Assalomu alaykum, <b>{name}</b>! 👋\n\n"
        "Men <b>{persona}</b> — <b>{company}</b> kompaniyasining onlayn konsultantiman.\n"
        "Sohamiz: {field}.\n\n"
        "Quyidagi tugmalardan foydalaning yoki savolingizni shunchaki yozib yuboring."
    ),
    "language_changed": "✅ Til o'zgartirildi: <b>O'zbekcha</b>",
    "choose_language": "🌐 Muloqot tilini tanlang:",
    "menu_prompt": "Quyidagi bo'limlardan birini tanlang 👇",
    "back": "⬅️ Orqaga",

    # --- reply tugmalari ---
    "btn_ai": "🤖 AI bilan suhbat",
    "btn_clear": "📜 Suhbatni tozalash",
    "btn_language": "🌐 Tilni o'zgartirish",
    "btn_about": "ℹ️ Bot haqida",
    "btn_contact": "📞 Bog'lanish",

    # --- AI suhbat ---
    "ai_mode_on": (
        "🤖 <b>AI bilan suhbat rejimi yoqildi.</b>\n\n"
        "Savolingizni yozing — men {company} xizmatlari bo'yicha javob beraman.\n"
        "Oxirgi {limit} ta xabarni eslab qolaman, shuning uchun savolni "
        "bo'lib-bo'lib berishingiz mumkin."
    ),
    "history_cleared": "🧹 Suhbat tarixi tozalandi ({count} ta xabar o'chirildi).",
    "history_empty": "Tarix allaqachon bo'sh. Savolingizni yozavering 🙂",
    "ai_error": "⚠️ {error}",
    "ai_unknown_error": "⚠️ Texnik nosozlik yuz berdi. Birozdan so'ng urinib ko'ring.",
    "unknown_command": "🤔 Bunday buyruq yo'q. Buyruqlar ro'yxati: /help",
    "only_text": (
        "Kechirasiz, men hozircha faqat matnli xabarlarni tushunaman. "
        "Savolingizni yozib yuboring 🙂"
    ),
    "throttled": "Biroz sekinroq 🙂",

    # --- ma'lumot bo'limlari ---
    "about": (
        "ℹ️ <b>Bot haqida</b>\n\n"
        "Men <b>{persona}</b> — <b>{company}</b> kompaniyasining AI-konsultantiman.\n"
        "Sohamiz: {field}.\n\n"
        "<b>Imkoniyatlarim:</b>\n"
        "• Xizmatlar bo'yicha savollarga javob beraman\n"
        "• Suhbat kontekstini eslab qolaman (oxirgi {limit} ta xabar)\n"
        "• Uch tilda ishlayman: o'zbek, rus, ingliz\n\n"
        "<b>Buyruqlar:</b>\n"
        "/start — botni qayta ishga tushirish\n"
        "/menu — asosiy menyu\n"
        "/language — tilni o'zgartirish\n"
        "/reset — suhbat tarixini tozalash\n"
        "/help — yordam"
    ),
    "contact": (
        "📞 <b>Bog'lanish</b>\n\n"
        "{contacts}\n\n"
        "Menejerimiz ish vaqtida siz bilan bog'lanadi. "
        "Shu paytgacha savolingiz bo'lsa — menga yozavering."
    ),
    "contact_empty": "Aloqa ma'lumotlari tez orada qo'shiladi.",
    "btn_write_operator": "✍️ Operatorga yozish",
    "btn_call": "📱 Qo'ng'iroq qilish",

    # --- admin ---
    "admin_denied": "⛔️ Bu bo'lim faqat adminlar uchun.",
    "admin_panel": "🛠 <b>Admin panel</b>\n\nKerakli amalni tanlang:",
    "btn_admin_stats": "📊 Statistika",
    "btn_admin_broadcast": "📣 Ommaviy xabar",
    "admin_stats": (
        "📊 <b>Statistika</b>\n\n"
        "👥 Jami foydalanuvchilar: <b>{total_users}</b>\n"
        "🆕 Bugun qo'shilgan: <b>{new_today}</b>\n"
        "🔥 Bugun faol: <b>{active_today}</b>\n"
        "🚫 Botni bloklagan: <b>{blocked}</b>\n\n"
        "💬 Jami xabarlar: <b>{total_messages}</b>\n"
        "💬 Bugungi xabarlar: <b>{messages_today}</b>\n\n"
        "🌐 <b>Tillar bo'yicha:</b>\n{languages}"
    ),
    "broadcast_ask": (
        "📣 Yubormoqchi bo'lgan xabaringizni yuboring.\n\n"
        "HTML formatlash ishlaydi: <b>qalin</b>, <i>kursiv</i>, <a href='https://t.me'>havola</a>.\n"
        "Bekor qilish uchun /cancel."
    ),
    "broadcast_preview": (
        "👀 <b>Xabar ko'rinishi:</b>\n\n{text}\n\n"
        "━━━━━━━━━━━━━━━\n"
        "📬 Qabul qiluvchilar: <b>{count}</b> ta\n\n"
        "Yuborilsinmi?"
    ),
    "btn_broadcast_send": "✅ Yuborish",
    "btn_broadcast_cancel": "❌ Bekor qilish",
    "broadcast_cancelled": "❌ Ommaviy xabar bekor qilindi.",
    "broadcast_started": "📤 Yuborilmoqda... ({count} ta foydalanuvchi)",
    "broadcast_done": (
        "✅ <b>Ommaviy xabar yakunlandi</b>\n\n"
        "📬 Yetkazildi: <b>{sent}</b>\n"
        "🚫 Bloklagan: <b>{blocked}</b>\n"
        "⚠️ Xatolik: <b>{failed}</b>"
    ),
    "broadcast_no_users": "Hozircha foydalanuvchilar yo'q.",
    "nothing_to_cancel": "Bekor qiladigan amal yo'q.",
}
