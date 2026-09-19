# O'quv Markazi — Kurslarga yozilish va to'lov boti

Telegram Mini App orqali ishlaydigan LMS: o'quvchi kurslarni ko'radi, ariza qoldiradi
va Payme yoki Click orqali to'lov qiladi.

**Stek:** Node.js 20+ · Express · Prisma · PostgreSQL · Telegraf · React (Vite + Tailwind)

---

## Loyiha tuzilmasi

```
lms-bot/
├── prisma/
│   ├── schema.prisma          # User, Teacher, Course, Order, Transaction
│   ├── migrations/            # SQL migratsiyalar
│   └── seed.js                # namunaviy kurslar va o'qituvchilar
│
├── src/
│   ├── index.js               # server ishga tushishi, to'xtatilishi
│   ├── app.js                 # Express ilovasi (CORS, JSON, marshrutlar)
│   │
│   ├── config/index.js        # .env o'qish va tekshirish
│   ├── database/prisma.js     # Prisma mijozi
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.js       # Telegram initData HMAC tekshiruvi
│   │   ├── rateLimit.middleware.js  # spamdan himoya
│   │   ├── error.middleware.js      # 404 va xato javoblari
│   │   └── asyncHandler.js
│   │
│   ├── models/                # Prisma so'rovlari (user, course, order, transaction)
│   ├── services/
│   │   ├── payme.service.js   # Payme Merchant API (JSON-RPC)
│   │   ├── click.service.js   # Click Merchant API (Prepare/Complete)
│   │   └── payment.service.js # to'lov havolalarini yig'ish
│   ├── controllers/
│   ├── routes/
│   └── utils/                 # logger, validatsiya
│
├── tests/                     # uchdan-uchgacha testlar
│   ├── payments.e2e.mjs       # Payme va Click protokollari
│   ├── auth.e2e.mjs           # initData imzosi
│   └── run.sh
│
├── bot/                       # (3-qadam) Telegraf boti
├── mini-app/                  # (4-qadam) React + Vite + Tailwind
├── .env.example
└── package.json
```

---

## Ishga tushirish

```bash
cd lms-bot
npm install

cp .env.example .env          # qiymatlarni to'ldiring (pastga qarang)

npm run db:migrate            # jadvallarni yaratish
npm run db:seed               # namunaviy kurslar
npm run dev                   # http://localhost:5000
```

Tekshirish: `curl http://localhost:5000/api/health`

### Majburiy .env qiymatlari

| O'zgaruvchi | Izoh |
|---|---|
| `DATABASE_URL` | PostgreSQL ulanish manzili |
| `DIRECT_URL` | Migratsiya uchun pooler'siz manzil. Pooler ishlatmasangiz `DATABASE_URL` bilan bir xil yozing — **bo'sh qoldirib bo'lmaydi** |
| `BOT_TOKEN` | BotFather bergan token |

Qolganlari (`PAYME_*`, `CLICK_*`, `WEBAPP_URL`, `ADMIN_IDS`) ixtiyoriy: sozlanmagan
to'lov tizimi Mini App'da tugma sifatida umuman ko'rsatilmaydi.

---

## API

Barcha `/api/courses`, `/api/orders`, `/api/me` so'rovlari
`x-telegram-init-data` sarlavhasini talab qiladi (Mini App'dagi
`window.Telegram.WebApp.initData`).

| Metod | Yo'l | Vazifasi |
|---|---|---|
| GET | `/api/health` | server va to'lov tizimlari holati |
| GET | `/api/me` | joriy foydalanuvchi profili |
| GET | `/api/courses` | faol kurslar ro'yxati (`?direction=Dasturlash`) |
| GET | `/api/courses/directions` | yo'nalishlar va ularda nechta kurs borligi |
| GET | `/api/courses/:id` | bitta kurs + bo'sh joylar soni |
| GET | `/api/orders` | mening arizalarim |
| GET | `/api/orders/:id` | ariza + to'lov havolalari |
| POST | `/api/orders` | kursga yozilish arizasi |

`POST /api/orders` tanasi:

```json
{ "courseId": 1, "fullName": "Shoxrux Azizov", "phone": "90 123 45 67", "comment": "" }
```

Javob:

```json
{
  "ok": true,
  "order": { "id": 1, "status": "NEW", "amount": 850000, "phone": "+998901234567" },
  "payments": [
    { "provider": "PAYME", "title": "Payme", "url": "https://checkout.paycom.uz/..." },
    { "provider": "CLICK", "title": "Click",  "url": "https://my.click.uz/services/pay?..." }
  ]
}
```

---

## To'lov tizimlari

Webhook'lar Telegram avtorizatsiyasidan o'tmaydi — so'rov foydalanuvchidan emas,
to'lov tizimi serveridan keladi va o'z mexanizmi bilan tekshiriladi.

| Tizim | Yo'l | Himoya |
|---|---|---|
| Payme | `POST /api/payments/payme` | `Authorization: Basic base64("Paycom:<PAYME_KEY>")` |
| Click | `POST /api/payments/click/prepare` | `sign_string` (md5) |
| Click | `POST /api/payments/click/complete` | `sign_string` (md5) |

Kabinetlarga aynan shu manzillar kiritiladi (`PUBLIC_URL` + yo'l), masalan:
`https://sizning-domeningiz.uz/api/payments/payme`

### To'lov oqimi

```
Mini App → POST /api/orders          → Order(status: NEW)
        → Payme/Click havolasi ochiladi
Payme   → CheckPerformTransaction    → summa va ariza tekshiriladi
        → CreateTransaction          → Transaction(state: 1), Order(status: PENDING)
        → PerformTransaction         → Transaction(state: 2), Order(status: PAID)
Click   → prepare                    → Transaction(state: 1), Order(status: PENDING)
        → complete                   → Transaction(state: 2), Order(status: PAID)
```

**Muhim tafsilotlar:**

- Payme summani **tiyinda** yuboradi (`amount = price × 100`), Click esa **so'mda** (`"850000.00"`).
- `Transaction` va `Order` holati bitta DB tranzaksiyasida yangilanadi — to'lov o'tib,
  ariza to'lanmagan holda qolib ketmaydi.
- Takroriy so'rovlar (Payme ham, Click ham qayta yuborishi mumkin) bir xil javob qaytaradi.
- Ariza summasi kursdan **nusxalanadi**: kurs narxi keyin o'zgarsa ham, ochiq ariza
  summasi o'zgarmaydi.
- 12 soat ichida tasdiqlanmagan Payme tranzaksiyasi 4-sabab bilan bekor qilinadi.

---

## Testlar

```bash
DATABASE_URL="postgresql://.../lms_test" npm run test:e2e
```

Sinaladi: kurs katalogi, ariza validatsiyasi, Payme protokolining barcha metodlari
(xato kodlari va idempotentlik bilan), Click prepare/complete, imzo buzilgan
so'rovlar, `initData` soxtalashtirilgan holatlar, spam cheklovi.

> Test bazaga yozadi — faqat **test bazasida** ishlating.

---

## Xavfsizlik

- `initData` HMAC-SHA256 bilan tekshiriladi, imzolar `timingSafeEqual` orqali solishtiriladi.
- 24 soatdan eski `initData` qabul qilinmaydi.
- Birovning arizasi `404` qaytaradi (ariza raqamlarini terib ko'rishdan foyda yo'q).
- Ichki xato tafsilotlari mijozga chiqmaydi, faqat loglarda qoladi.
- `ALLOW_DEV_USER` productionda (`NODE_ENV=production`) umuman ishlamaydi.

---

## Keyingi qadamlar

- **3-qadam:** Telegraf boti — `/start`, "Kurslarni ko'rish 📚" tugmasi, to'lov haqida xabar.
- **4-qadam:** Mini App — React + Vite + Tailwind, kurs katalogi va ariza formasi.
- **5-qadam:** Admin panel — arizalar va to'lovlar ro'yxati.
