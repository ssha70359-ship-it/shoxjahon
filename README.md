# 🍕 Pizza Delivery — Telegram Mini App + Admin Panel

Localhost'da to'liq ishlaydigan pizza yetkazib berish tizimi.

| Qism | Texnologiya | Manzil |
|------|-------------|--------|
| Backend (Bot + API) | Node.js, Express, Telegraf, Prisma | `http://localhost:5000` |
| Mini App (mijozlar) | React + Vite | `http://localhost:5173` |
| Admin Panel | React + Vite | `http://localhost:5174` |
| Baza | PostgreSQL (Neon) | — |

---

## 📁 Papka tuzilishi

```
shoxrux/
├── src/
│   ├── config/default.js           # Sozlamalar va o'zgaruvchilar
│   ├── core/bot.js                 # Bot instansiyasi
│   ├── database/connection.js      # PostgreSQL (Prisma) ulanishi
│   ├── models/                     # User.js, Product.js, Order.js
│   ├── controllers/                # botController, cartController, adminController
│   ├── routes/                     # bot.routes, client.routes, admin.routes
│   ├── middlewares/auth.middleware.js
│   └── index.js                    # Asosiy ishga tushirish fayli
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.js                     # 4 ta pizza
├── mini-app/                       # Mijozlar uchun React ilova
├── admin-panel/                    # Admin uchun React dashboard
├── .env                            # MAXFIY (git'ga tushmaydi)
└── .env.example
```

---

## 1️⃣ O'rnatish

Terminalda loyiha papkasiga kiring va 3 ta buyruqni ketma-ket bajaring:

```bash
npm install
cd mini-app && npm install && cd ..
cd admin-panel && npm install && cd ..
```

---

## 2️⃣ `.env` faylni tayyorlash

Loyiha ildizidagi `.env.example` dan nusxa oling va o'z ma'lumotlaringizni yozing:

```bash
cp .env.example .env
```

---

## 3️⃣ Bazani tayyorlash (migratsiya + seed)

```bash
npx prisma generate      # Prisma client yaratish
npx prisma migrate deploy # Jadvallarni bazaga yozish
npm run db:seed          # 4 ta pizzani bazaga qo'shish
```

Bazani ko'z bilan ko'rmoqchi bo'lsangiz:

```bash
npx prisma studio
```

---

## 4️⃣ Ishga tushirish (3 ta alohida terminal)

**1-terminal — Backend (bot + API):**
```bash
npm run dev
```

**2-terminal — Mini App:**
```bash
cd mini-app
npm run dev
```

**3-terminal — Admin Panel:**
```bash
cd admin-panel
npm run dev
```

Admin panel: <http://localhost:5174> (parol `.env` dagi `ADMIN_PASSWORD`)

---

## 5️⃣ ngrok orqali Telegramga ulash

Telegram Mini App faqat **https** manzil bilan ishlaydi, shuning uchun localhost'ni ngrok orqali internetga chiqaramiz.

**4-terminal:**
```bash
ngrok http 5173 --request-header-add "ngrok-skip-browser-warning: true"
```

ngrok bergan `https://...` manzilni nusxa oling va:

1. `.env` faylda `WEBAPP_URL` ni o'zgartiring
2. Backend'ni qayta ishga tushiring (`Ctrl+C` → `npm run dev`)
3. BotFather → `/mybots` → botingiz → **Bot Settings → Menu Button** → o'sha manzilni kiriting

> Mini App `/api` so'rovlarini Vite proxy orqali backendga uzatadi, shuning uchun **bitta ngrok tunneli yetarli**.

---

## 🔌 API yo'llari

### Mijoz (`x-telegram-init-data` header)
| Metod | Yo'l | Vazifasi |
|-------|------|----------|
| GET | `/api/client/me` | Profil |
| GET | `/api/client/products` | Mahsulotlar + kategoriyalar |
| GET | `/api/client/orders` | Buyurtmalar tarixi |
| POST | `/api/client/orders` | Yangi buyurtma |
| POST | `/api/client/phone` | Telefon saqlash |

### Admin (`x-admin-password` header)
| Metod | Yo'l | Vazifasi |
|-------|------|----------|
| POST | `/api/admin/login` | Kirish |
| GET | `/api/admin/stats` | Statistika |
| GET | `/api/admin/orders` | Buyurtmalar |
| PATCH | `/api/admin/orders/:id` | Holatni o'zgartirish |
| DELETE | `/api/admin/orders/:id` | O'chirish |
| GET/POST | `/api/admin/products` | Ro'yxat / qo'shish |
| PUT/DELETE | `/api/admin/products/:id` | Tahrirlash / o'chirish |

---

## ⚠️ Muhim eslatmalar

- `.env` fayl `.gitignore` da — parollaringiz GitHub'ga hech qachon yuklanmaydi.
- `ALLOW_DEV_USER=true` — brauzerdan test qilish uchun. Haqiqiy foydalanishda `false` qiling.
- Mahsulot **tarkibi** `description` maydonidan vergul bilan ajratib olinadi.
