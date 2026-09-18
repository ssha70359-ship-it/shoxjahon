# 🤖 AI-konsultant bot (aiogram 3.x + Anthropic Claude)

Telegram bot: kompaniyaning xushfe'l onlayn konsultanti. Claude AI bilan
suhbatlashadi, kontekstni eslab qoladi, uch tilda ishlaydi va admin paneliga
ega. To'liq asinxron (`async/await`), modulli tuzilma.

---

## ⚠️ Model haqida muhim eslatma

Siz so'ragan ikkala model ham **endi ishlamaydi**:

| Model | Holati |
|---|---|
| `claude-3-5-sonnet-20241022` | **To'xtatilgan** (2025-10-28) — API xato qaytaradi |
| `claude-3-haiku-20240307` | **To'xtatilgan** (2026-04-19) |

Buning o'rniga joriy modellar ishlatiladi (`.env` dagi `ANTHROPIC_MODEL`):

| Model | Kontekst | Narx (input/output, 1M token) | Qachon |
|---|---|---|---|
| `claude-opus-5` *(sukut bo'yicha)* | 1M | $5 / $25 | Eng kuchli, murakkab savollar |
| `claude-sonnet-5` | 1M | $2 / $10 | Muvozanatli variant |
| `claude-haiku-4-5` | 200K | $1 / $5 | Eng arzon va tez — siz `haiku` so'raganingiz uchun mos muqobil |

Model ID lariga sana qo'shilmaydi — jadvaldagi satr to'liq ID.

---

## 📂 Loyiha tuzilmasi

```
ai-consultant-bot/
├── main.py                       # Entry point: Bot, Dispatcher, ishga tushirish
├── config.py                     # .env sozlamalari (pydantic-settings)
├── requirements.txt              # Kutubxonalar
├── requirements.lock.txt         # Sinovdan o'tgan aniq versiyalar
├── .env.example                  # .env uchun namuna
├── .gitignore
├── README.md
│
├── data/                         # SQLite fayli shu yerda (gitga tushmaydi)
│   └── bot.db
│
├── database/                     # Ma'lumotlar bazasi qatlami
│   ├── db.py                     #   aiosqlite ulanishi, sxema, migratsiya
│   ├── models.py                 #   User, ChatMessage, Stats (dataclass)
│   └── repository.py             #   barcha SQL so'rovlar
│
├── handlers/                     # Telegram yangilanishlarini qabul qilish
│   ├── __init__.py               #   routerlar tartibi (muhim!)
│   ├── start.py                  #   /start, /menu, /help, /language, til tanlash
│   ├── ai_chat.py                #   Claude bilan suhbat, /reset
│   └── admin.py                  #   /admin, statistika, broadcast (FSM)
│
├── keyboards/
│   ├── reply.py                  #   doimiy menyu (5 tugma, tilga qarab)
│   └── inline.py                 #   til tanlash, admin panel, tasdiqlash
│
├── services/                     # Biznes mantiq / tashqi xizmatlar
│   ├── ai_client.py              #   umumiy interfeys + factory
│   ├── claude_service.py         #   Anthropic Claude (asosiy)
│   ├── openai_service.py         #   OpenAI (muqobil, ixtiyoriy)
│   └── prompts.py                #   System Prompt + til qoidalari
│
├── locales/                      # Ko'p tillilik
│   ├── __init__.py               #   t() funksiyasi va fallback
│   ├── uz.py  ru.py  en.py       #   matnlar (38 ta kalit, uchchalasida bir xil)
│
├── middlewares/
│   ├── deps.py                   #   DI: repo/ai/lang ni handlerga uzatish
│   └── throttling.py             #   anti-spam (xabar + tugma)
│
└── utils/
    ├── logger.py                 #   loglash sozlamasi
    └── text.py                   #   uzun matnni bo'laklash, HTML tozalash
```

**Qatlamlar qoidasi:** `handlers` → `services` / `database`. Handler ichida SQL
yozilmaydi va API chaqirilmaydi.

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
nano .env                          # BOT_TOKEN, ANTHROPIC_API_KEY, ADMIN_ID

# 4. Ishga tushirish
python main.py
```

Baza fayli va `data/` papkasi birinchi ishga tushirishda avtomatik yaratiladi.
Bot oldingi versiyada ishlagan bo'lsa, eski jadvallar **avtomatik ko'chiriladi**
(`language` → `selected_language`, `created_at` → `joined_at`), ma'lumot
yo'qolmaydi.

---

## ⚙️ `.env` fayl formati

| O'zgaruvchi | Majburiy | Sukut bo'yicha | Izoh |
|---|---|---|---|
| `BOT_TOKEN` | ✅ | — | @BotFather dan olingan token |
| `ADMIN_ID` | — | — | Admin ID(lar), vergul bilan: `111,222` |
| `AI_PROVIDER` | — | `anthropic` | `anthropic` yoki `openai` |
| `ANTHROPIC_API_KEY` | ✅ | — | Claude API kaliti |
| `ANTHROPIC_MODEL` | — | `claude-opus-5` | Yuqoridagi jadvalga qarang |
| `AI_EFFORT` | — | `low` | `low`…`max` — javob chuqurligi |
| `OPENAI_API_KEY` | `openai` uchun | — | Muqobil provayder |
| `OPENAI_MODEL` | — | `gpt-4o-mini` | |
| `AI_MAX_TOKENS` | — | `1024` | Javob uzunligi chegarasi |
| `COMPANY_NAME` | — | `Kompaniya` | System Prompt'ga qo'shiladi |
| `COMPANY_FIELD` | — | `xizmat ko'rsatish` | Bot qaysi soha bilan cheklanadi |
| `COMPANY_INFO` | — | — | Ish vaqti, telefon, manzil |
| `BOT_PERSONA_NAME` | — | `Konsultant` | Botning ismi |
| `OPERATOR_USERNAME` | — | — | "Operatorga yozish" tugmasi havolasi |
| `OPERATOR_PHONE` | — | — | Telefon (username bo'lmasa) |
| `DEFAULT_LANGUAGE` | — | `uz` | `uz` / `ru` / `en` |
| `HISTORY_LIMIT` | — | `10` | Kontekstdagi oxirgi xabarlar soni |
| `DB_PATH` | — | `data/bot.db` | SQLite fayl yo'li |
| `THROTTLE_RATE` | — | `1.0` | Anti-spam, soniya (`0` — o'chirilgan) |
| `BROADCAST_RATE` | — | `20` | Sekundiga nechta xabar (Telegram limiti ~30) |
| `LOG_LEVEL` | — | `INFO` | `DEBUG` / `INFO` / `WARNING` / `ERROR` |

> ⚠️ `.env` fayli `.gitignore` da — tokenlar hech qachon repozitoriyga tushmaydi.

> 💡 `AI_EFFORT` ataylab `CLAUDE_EFFORT` deb nomlanmagan: `CLAUDE_*` prefiksi
> Claude Code kabi vositalarning muhit o'zgaruvchilari bilan to'qnashadi, haqiqiy
> muhit o'zgaruvchisi esa `.env` faylidan **ustun turadi** — ya'ni sozlamangiz
> jimgina e'tiborsiz qolardi.

---

## 🧠 Claude integratsiyasi

`services/claude_service.py` — Messages API ustidagi qobiq:

```python
response = await self._client.messages.create(
    model=self._model,
    system=system_prompt,          # Claude'da system ALOHIDA parametr
    messages=messages,             # ichida faqat user/assistant
    max_tokens=self._max_tokens,
    output_config={"effort": "low"},
)
```

**Muhim tafsilotlar:**

- **`system` alohida parametr.** OpenAI'da u `messages[0]`, Claude'da esa
  top-level maydon. Ikki API o'rtasidagi asosiy farq shu.
- **`effort`** javob chuqurligini boshqaradi. Konsultant-bot uchun `low` —
  eng tez va arzon. **Haiku modellari `effort` ni qo'llab-quvvatlamaydi**
  (API 400 qaytaradi), shuning uchun model nomida `haiku` bo'lsa parametr
  avtomatik o'tkazib yuboriladi.
- **`stop_reason == "refusal"`** tekshiriladi: model javob berishdan bosh
  tortsa, foydalanuvchiga tushunarli xabar chiqadi.
- **Javob bloklari.** `response.content` bir nechta blokdan iborat bo'lishi
  mumkin (masalan `thinking`), shuning uchun faqat `type == "text"` bloklari
  yig'iladi.

Provayderni almashtirish uchun `.env` da `AI_PROVIDER=openai` yozsangiz kifoya —
ikkala servis bir xil `ask(system_prompt, history) -> str` interfeysini bajaradi.

---

## 🌐 Ko'p tillilik

Uch til: 🇺🇿 O'zbekcha, 🇷🇺 Русский, 🇬🇧 English.

**Til qanday tanlanadi:**

1. Yangi foydalanuvchi uchun **Telegram interfeysi tili** olinadi
   (`language_code` `uz`/`ru`/`en` bo'lsa), aks holda `DEFAULT_LANGUAGE`.
2. Foydalanuvchi `🌐 Tilni o'zgartirish` yoki `/language` orqali o'zgartiradi.
3. Tanlov `users.selected_language` ga yoziladi va **hech qachon ustidan
   yozilmaydi** — profil yangilanganda ham saqlanib qoladi.

**Til nimalarga ta'sir qiladi:**

- Bot interfeysi — barcha matnlar va tugma yozuvlari (`locales/`).
- **Claude javoblari** — System Prompt oxiriga aniq ko'rsatma qo'shiladi:

  ```
  ЯЗЫК ОТВЕТА: Всегда отвечай на РУССКОМ языке, даже если пользователь
  пишет на другом языке.
  ```

  "Foydalanuvchi tilida javob ber" degan mavhum ko'rsatmadan ko'ra, tilni
  aniq aytish ishonchliroq ishlaydi.

**Tarjima yo'q bo'lsa** `t()` o'zbekchaga qaytadi va logga ogohlantirish
yozadi — bot hech qachon xato bermaydi.

Tugma filtrlari **uchala tildagi** yozuvni qabul qiladi (`all_button_texts`),
shuning uchun til almashtirilgandan keyin ekranda qolib ketgan eski klaviatura
ham ishlashda davom etadi.

---

## 🗄 Baza sxemasi

```sql
users (
    user_id           INTEGER PRIMARY KEY,   -- Telegram id
    username          TEXT,
    full_name         TEXT,
    selected_language TEXT NOT NULL DEFAULT 'uz',
    joined_at         TEXT NOT NULL DEFAULT (datetime('now')),
    is_blocked        INTEGER NOT NULL DEFAULT 0   -- broadcast uchun
)

messages (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   INTEGER -> users.user_id ON DELETE CASCADE,
    role      TEXT CHECK (role IN ('user','assistant')),
    content   TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
)

INDEX idx_messages_user_id   ON messages (user_id, id DESC)
INDEX idx_messages_timestamp ON messages (timestamp)
```

`PRAGMA journal_mode=WAL` yoqilgan. `is_blocked` ustuni sizning ro'yxatingizda
yo'q edi, lekin ommaviy xabar uchun zarur: botni bloklagan odamlarga keyingi
safar urinib o'tirilmaydi.

---

## 💬 Buyruqlar va menyu

**Asosiy menyu (reply klaviatura):**

```
┌──────────────────────┬────────────────────────┐
│ 🤖 AI bilan suhbat   │ 📜 Suhbatni tozalash    │
├──────────────────────┼────────────────────────┤
│ 🌐 Tilni o'zgartirish│ ℹ️ Bot haqida           │
├──────────────────────┴────────────────────────┤
│ 📞 Bog'lanish                                  │
└───────────────────────────────────────────────┘
```

| Buyruq | Vazifasi |
|---|---|
| `/start` | Tanishuv + menyu |
| `/menu` | Menyuni qayta ko'rsatish |
| `/language` | Tilni o'zgartirish |
| `/reset` | Suhbat tarixini tozalash |
| `/help` | Bot haqida va buyruqlar |
| `/admin` | 🔒 Admin panel |
| `/stats` | 🔒 Statistika |
| `/broadcast` | 🔒 Ommaviy xabar |

Adminlar uchun kengaytirilgan buyruqlar ro'yxati `BotCommandScopeChat` orqali
**faqat ularning chatida** ko'rsatiladi.

---

## 🛠 Admin panel

Kirish `.env` dagi `ADMIN_ID` bo'yicha. Filtr **butun routerga** qo'yilgan:

```python
router.message.filter(IsAdmin())
router.callback_query.filter(IsAdmin())
```

Shu tufayli admin bo'lmagan odam uchun bu handlerlar umuman mavjud emasdek
bo'ladi va xabar keyingi routerga o'tadi — u yerda "noma'lum buyruq" javobini
oladi. Ya'ni **botda admin paneli borligi oshkor bo'lmaydi**.

### 📊 Statistika

Jami foydalanuvchilar, bugun qo'shilganlar, bugun faol bo'lganlar (bugun
kamida bitta savol yozgan noyob foydalanuvchilar), botni bloklaganlar, jami
va bugungi xabarlar, tillar bo'yicha taqsimot.

### 📣 Ommaviy xabar (broadcast)

FSM orqali uch bosqich:

```
/broadcast  ──►  matnni kutish  ──►  ko'rib chiqish + tasdiqlash  ──►  yuborish
                       │                        │
                   /cancel                  ❌ Bekor
```

- Matn `message.html_text` orqali olinadi — **formatlash saqlanadi**
  (qalin, kursiv, havola).
- Yuborishdan oldin xabar ko'rinishi va qabul qiluvchilar soni ko'rsatiladi.
- Yuborish `BROADCAST_RATE` (sekundiga 20) tezligida, har biridan keyin pauza.
- `TelegramForbiddenError` — foydalanuvchi bloklagan → bazada `is_blocked=1`,
  keyingi safar ro'yxatga kirmaydi.
- `TelegramRetryAfter` — Telegram "sekinroq" desa, kutib qayta urinadi.
- Bitta xato butun tarqatishni to'xtatmaydi; oxirida hisobot chiqadi:
  yetkazildi / bloklagan / xatolik.

---

## 🛡 Xatolarni boshqarish

| Holat | Bot nima qiladi |
|---|---|
| API limiti (`RateLimitError`) | "So'rovlar ko'p, bir daqiqadan so'ng urinib ko'ring" |
| API nosozligi (5xx) | "AI xizmatida vaqtinchalik nosozlik" |
| `stop_reason == "refusal"` | "Boshqacha ifodalang" |
| Kutilmagan xato | Traceback logga, foydalanuvchiga umumiy xabar |
| Javob 4096 belgidan uzun | Qator chegarasidan bo'laklab yuboriladi |
| Javobda HTML buzuvchi belgi | Oddiy matn sifatida qayta yuboriladi |
| Noma'lum buyruq | "Bunday buyruq yo'q, /help" |
| Rasm/stiker | "Faqat matnli xabarlarni tushunaman" |

Barcha xato matnlari ham foydalanuvchi tilida chiqadi.
