# 🤖 AI-konsultant bot (aiogram 3.x + GPT-4o-mini / Claude)

Telegram bot: kompaniyaning xushfe'l onlayn konsultanti. Suhbat kontekstini
eslab qoladi, javoblarni faqat kompaniya sohasi doirasida beradi, barcha
ma'lumotni SQLite'da saqlaydi. To'liq asinxron (`async/await`).

---

## 📂 Loyiha tuzilmasi

```
ai-consultant-bot/
├── bot.py                        # Entry point: Bot, Dispatcher, ishga tushirish
├── config.py                     # .env dan o'qiladigan sozlamalar (pydantic-settings)
├── requirements.txt              # Kutubxonalar
├── requirements.lock.txt         # Sinovdan o'tgan aniq versiyalar
├── .env.example                  # .env uchun namuna
├── .gitignore
├── README.md
│
├── data/                         # SQLite fayli shu yerda yaratiladi (gitga tushmaydi)
│   └── bot.db
│
└── app/
    ├── handlers/                 # Telegram xabarlarini qabul qiluvchi qatlam
    │   ├── __init__.py           #   routerlar ro'yxati (tartib muhim!)
    │   ├── commands.py           #   /start, /help, /reset
    │   └── chat.py               #   AI javob beradigan asosiy handler
    │
    ├── services/                 # Biznes mantiq / tashqi xizmatlar
    │   ├── ai_client.py          #   umumiy interfeys + factory
    │   ├── openai_provider.py    #   GPT-4o-mini (AsyncOpenAI)
    │   ├── anthropic_provider.py #   Claude (AsyncAnthropic)
    │   └── prompts.py            #   System Prompt shabloni
    │
    ├── database/                 # Ma'lumotlar bazasi qatlami
    │   ├── db.py                 #   aiosqlite ulanishi + jadval sxemasi
    │   └── repository.py         #   SQL so'rovlar (users, messages)
    │
    ├── middlewares/              # Har bir xabardan oldin ishlaydigan qatlam
    │   ├── deps.py               #   DI: repo/ai/prompt ni handlerga uzatish
    │   └── throttling.py         #   anti-spam
    │
    ├── keyboards/
    │   └── common.py             #   asosiy menyu tugmalari
    │
    └── utils/
        ├── logger.py             #   loglash sozlamasi
        └── text.py               #   uzun matnni bo'laklash (4096 belgi limiti)
```

**Qatlamlar qoidasi:** `handlers` → `services`/`database`. Handler ichida SQL
yozilmaydi va API chaqirilmaydi — hammasi alohida modullarda. Shu tufayli
SQLite'ni PostgreSQL'ga yoki OpenAI'ni Claude'ga almashtirish bitta faylni
o'zgartirish bilan cheklanadi.

---

## 🚀 Ishga tushirish

```bash
cd ai-consultant-bot

# 1. Virtual muhit
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 2. Kutubxonalar
pip install -r requirements.txt
# yoki aniq, sinovdan o'tgan versiyalar bilan:
# pip install -r requirements.lock.txt

# 3. Sozlamalar
cp .env.example .env
nano .env                          # BOT_TOKEN va API kalitni yozing

# 4. Ishga tushirish
python bot.py
```

Baza fayli va `data/` papkasi birinchi ishga tushirishda avtomatik yaratiladi —
qo'lda migratsiya qilish shart emas.

---

## ⚙️ `.env` fayl formati

| O'zgaruvchi | Majburiy | Sukut bo'yicha | Izoh |
|---|---|---|---|
| `BOT_TOKEN` | ✅ | — | @BotFather dan olingan token |
| `AI_PROVIDER` | — | `openai` | `openai` yoki `anthropic` |
| `OPENAI_API_KEY` | `openai` uchun ✅ | — | OpenAI kaliti |
| `OPENAI_MODEL` | — | `gpt-4o-mini` | Model nomi |
| `ANTHROPIC_API_KEY` | `anthropic` uchun ✅ | — | Anthropic kaliti |
| `ANTHROPIC_MODEL` | — | `claude-opus-5` | Model nomi |
| `AI_MAX_TOKENS` | — | `1024` | Javob uzunligi chegarasi |
| `COMPANY_NAME` | — | `Kompaniya` | System Prompt'ga qo'shiladi |
| `COMPANY_FIELD` | — | `xizmat ko'rsatish` | Bot qaysi soha bilan cheklanadi |
| `COMPANY_INFO` | — | — | Ish vaqti, telefon, manzil va h.k. |
| `BOT_PERSONA_NAME` | — | `Konsultant` | Botning ismi |
| `HISTORY_LIMIT` | — | `10` | Kontekstga olinadigan oxirgi xabarlar soni |
| `DB_PATH` | — | `data/bot.db` | SQLite fayl yo'li |
| `THROTTLE_RATE` | — | `1.0` | Xabarlar orasidagi min. vaqt (soniya), `0` — o'chirilgan |
| `LOG_LEVEL` | — | `INFO` | `DEBUG` / `INFO` / `WARNING` / `ERROR` |

> ⚠️ `.env` fayli `.gitignore` da — tokenlar hech qachon repozitoriyga tushmaydi.

---

## 🧠 Suhbat xotirasi qanday ishlaydi

1. Foydalanuvchi savoli `messages` jadvaliga `role='user'` bilan yoziladi.
2. `get_history()` shu foydalanuvchining oxirgi `HISTORY_LIMIT` ta xabarini
   `ORDER BY id DESC LIMIT ?` bilan oladi, so'ng ro'yxatni **teskari
   aylantiradi** — model eng eskisidan eng yangisigacha tartibni kutadi.
3. Bu ro'yxat System Prompt bilan birga AI ga yuboriladi.
4. Javob `role='assistant'` bilan bazaga qaytib yoziladi.

Ya'ni `HISTORY_LIMIT=10` ≈ **5 juft savol-javob**. Bu qiymatni oshirsangiz bot
ko'proq eslaydi, lekin har bir so'rov qimmatroq turadi.

`/reset` buyrug'i faqat o'sha foydalanuvchining qatorlarini o'chiradi —
boshqalarning tarixiga tegmaydi.

---

## 🎭 System Prompt

`app/services/prompts.py` da joylashgan va `.env` dagi kompaniya
ma'lumotlaridan yig'iladi. Unda uchta narsa belgilangan:

- **Muomala uslubi** — xushmuomala, "siz"lab, 2–5 jumla, foydalanuvchi tilida.
- **Qat'iy chegaralar** — faqat kompaniya sohasi; mavzudan tashqari savollar
  muloyimlik bilan rad etiladi; narx/muddat o'ylab topilmaydi.
- **Kompaniya ma'lumoti** — `COMPANY_INFO` matni.

Boshqa sohaga moslash uchun kodga tegish shart emas — `.env` dagi
`COMPANY_*` qiymatlarini o'zgartiring.

---

## 💬 Buyruqlar

| Buyruq | Vazifasi |
|---|---|
| `/start` | Tanishuv xabari + asosiy menyu tugmalari |
| `/help` | Buyruqlar ro'yxati va bot imkoniyatlari |
| `/reset` | Suhbat tarixini tozalash (o'chirilgan xabarlar sonini aytadi) |

Buyruqlar Telegram menyusiga ham avtomatik yoziladi (`set_my_commands`),
`/help` va `/reset` uchun esa qo'shimcha tugmalar bor.

---

## 🗄 Baza sxemasi

```sql
users (
    user_id INTEGER PRIMARY KEY,   -- Telegram id
    username, full_name, language,
    created_at, updated_at
)

messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER  -> users.user_id  ON DELETE CASCADE,
    role    TEXT     CHECK (role IN ('user','assistant')),
    content TEXT,
    created_at
)

INDEX idx_messages_user_created ON messages (user_id, id DESC)
```

`PRAGMA journal_mode=WAL` yoqilgan — o'qish va yozish bir-birini kutmaydi.

---

## 🔁 Provayderni almashtirish

`.env` da bitta qatorni o'zgartirasiz:

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-5
```

Kod o'zgarmaydi: `create_ai_client()` factory kerakli klientni tanlaydi, ikkala
klient ham bir xil `ask(system_prompt, history) -> str` interfeysini bajaradi.
Ikki API o'rtasidagi asosiy farq shu yerda yashiringan — OpenAI'da system
prompt xabarlar ro'yxatining birinchi elementi, Claude'da esa alohida `system`
parametri.

Faqat bitta provayderdan foydalansangiz, `requirements.txt` dan ikkinchisini
o'chirib tashlashingiz mumkin — importlar funksiya ichida, shuning uchun
o'rnatilmagan kutubxona botni yiqitmaydi.

---

## 🛡 Xatolarni boshqarish

| Holat | Bot nima qiladi |
|---|---|
| API limiti (`RateLimitError`) | "So'rovlar ko'p, bir daqiqadan so'ng urinib ko'ring" |
| API nosozligi (5xx) | "AI xizmatida vaqtinchalik nosozlik" |
| Kutilmagan xato | To'liq traceback logga yoziladi, foydalanuvchiga umumiy xabar |
| Javob 4096 belgidan uzun | Qator chegarasidan bo'laklab yuboriladi |
| Javobda HTML buzuvchi belgi | Oddiy matn sifatida qayta yuboriladi |
| Rasm/stiker yuborilsa | "Faqat matnli xabarlarni tushunaman" |

Bot javob tayyorlayotgan vaqtda chatda **"yozmoqda..."** holati ko'rinadi
(`ChatActionSender`).
