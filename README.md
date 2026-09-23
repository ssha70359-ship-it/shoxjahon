# 🥨 Farhadskaya Bulochka — Telegram Mini App + Admin Panel

Farhadskaya Bulochka (Family Bakery, est. 1996) uchun buyurtma va yetkazib berish tizimi.

> 🆕 **Birinchi marta ishga tushiryapsizmi?** Kompyuteringizda hech narsa yo'q bo'lsa —
> [**BOSHLASH.md**](BOSHLASH.md) ni oching. Node.js o'rnatishdan tortib botni
> tekshirishgacha bosqichma-bosqich yozilgan.

💳 **Click va Payme** — mijoz Mini App ichida karta bilan to'laydi. Ulash:
[**docs/TOLOV.md**](docs/TOLOV.md).

Katalog, narxlar va rasmlar Instagram menyusidan olingan — [docs/INSTAGRAM-TAHLIL.md](docs/INSTAGRAM-TAHLIL.md).
Do'kon ma'lumotlari — filiallar, telefon, ish vaqti — `src/config/shop.js` faylida.

| Qism | Texnologiya | Manzil |
|------|-------------|--------|
| Backend (Bot + API) | Node.js, Express, Telegraf, Prisma | `http://localhost:5000` |
| Mini App (mijozlar) | React + Vite | `http://localhost:5173` |
| Admin Panel | React + Vite | `http://localhost:5174` |
| Baza | PostgreSQL (Neon) | — |

---

## 🚀 Ishga tushirish — bitta buyruq

```bash
npm start
```

Shu bitta buyruq hamma narsani o'zi bajaradi:

1. `.env` fayl yo'q bo'lsa — savollar berib yaratadi (Neon manzili, bot token, admin parol)
2. Uch papkaning paketlarini o'rnatadi (faqat kerak bo'lsa)
3. Prisma client yaratadi, jadvallarni bazaga yozadi, 23 ta mahsulotni qo'shadi
4. https tunnel ochadi (Cloudflare — token kerak emas; ngrok tokeni bo'lsa avval u sinaladi) va `WEBAPP_URL` ni `.env` ga yozadi
5. **Bot menyu tugmasini Mini App'ga o'zi bog'laydi — BotFather'ga kirish shart emas**
6. Backend, Mini App va Admin panelni bitta terminalda ishga tushiradi

To'xtatish uchun — `Ctrl+C`. Barcha jarayonlar toza yopiladi, portlar bo'shaydi.

### ngrok tunneli qayerdan topiladi

Skript https manzilni 4 ta usulda qidiradi, shu tartibda:

1. **Allaqachon ishlab turgan ngrok** — boshqa terminalda `ngrok http 5173` qilib qo'ygan bo'lsangiz
2. `.env` dagi `NGROK_AUTHTOKEN`
3. **`ngrok config add-authtoken ...` bilan saqlangan token** (ngrok'ning o'z config fayli)
4. Kompyuterdagi `ngrok` CLI

Eng ishonchli yo'l — tokenni bir marta `.env` ga yozib qo'yish, shunda ngrok
dasturini alohida o'rnatish ham shart emas:

```bash
npm run ngrok:token <sizning-authtokeningiz>
```

Tokenni bu yerdan olasiz: <https://dashboard.ngrok.com/get-started/your-authtoken>

`ngrok config add-authtoken <token>` qilgan bo'lsangiz ham bo'ladi — skript
ngrok'ning o'z config faylidan tokenni o'zi topadi.

**ngrok manzilini qo'lda ko'chirish hech qachon kerak emas** — uni `npm start` o'zi
oladi va `.env` ga yozadi.

Hech biri topilmasa loyiha faqat brauzerda (lokal) ishlaydi va skript sababini aytadi.

### Menyu tugmasi qanday yangilanadi

BotFather'da **hech narsa sozlash shart emas**. Manzil 3 ta joyda avtomatik yangilanadi:

1. `npm start` — botning umumiy menyu tugmasini joriy ngrok manziliga bog'laydi va
   Telegramdan qayta o'qib tekshiradi
2. `/start` — aynan shu suhbatning menyu tugmasini yangilaydi
   (suhbat sozlamasi BotFather'dagi umumiy sozlamadan ustun turadi)
3. `/start` xabaridagi tugmalar — har doim joriy manzilni oladi

Tunnel ochilmasa menyu tugmasi oddiy holatga qaytariladi, ya'ni eski ishlamaydigan
manzil (masalan `example.com`) ochilib qolmaydi.

---

## 🌍 Internetga chiqarish

Vercel (frontend) + Render (backend) uchun bosqichma-bosqich qo'llanma:
**[DEPLOY.md](DEPLOY.md)**

Qisqacha: `render.yaml` va ikkala `vercel.json` tayyor, backend serverda o'zi
**webhook** rejimiga o'tadi (ngrok kerak emas).

---

## 📦 Boshqa buyruqlar

| Buyruq | Vazifasi |
|--------|----------|
| `npm start` | Hamma narsani ishga tushiradi (asosiy buyruq) |
| `npm run setup` | Faqat `.env` faylni qaytadan yaratadi |
| `npm run ngrok:token <token>` | ngrok authtokenni `.env` ga yozadi |
| `npm run payment:token click\|payme <token>` | Click/Payme tokenini `.env` ga yozadi |
| `npm run dev` | Faqat backend (bot + API) |
| `npm run server` | Backend (serverda ishlatiladi) |
| `npm run build` | Prisma client + migratsiya (deploy uchun) |
| `npm run db:migrate` | Jadvallarni bazaga yozish |
| `npm run db:seed` | Boshlang'ich katalogni qo'shish |
| `npm run db:studio` | Bazani brauzerda ko'rish |

---

## 📁 Papka tuzilishi

```
shoxrux/
├── public/products/                # Mahsulot rasmlari (backend uzatadi)
├── src/
│   ├── config/default.js           # Sozlamalar va o'zgaruvchilar
│   ├── config/shop.js              # Filiallar, telefon, ish vaqti
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
│   └── seed.js                     # 23 ta mahsulot (4 kategoriya)
├── scripts/                        # Avtomatlashtirish (npm start shu yerdan)
│   ├── dev.js                      # Hamma narsani ishga tushiruvchi
│   ├── setup.js                    # .env yaratuvchi
│   ├── tunnel.js                   # ngrok
│   ├── telegram.js                 # Bot menyu tugmasini sozlaydi
│   └── utils.js
├── mini-app/                       # Mijozlar uchun React ilova
├── admin-panel/                    # Admin uchun React dashboard
├── .env                            # MAXFIY (git'ga tushmaydi)
└── .env.example
```

---

## 🔌 API yo'llari

### Mijoz (`x-telegram-init-data` header)
| Metod | Yo'l | Vazifasi |
|-------|------|----------|
| GET | `/api/client/me` | Profil |
| GET | `/api/client/products` | Mahsulotlar + kategoriyalar |
| GET | `/api/client/orders` | Buyurtmalar tarixi |
| POST | `/api/client/orders` | Yangi buyurtma (`paymentMethod`: NAQD / CLICK / PAYME) |
| POST | `/api/client/orders/:id/pay` | To'lanmagan buyurtmani to'lash yoki usulini almashtirish |
| POST | `/api/client/phone` | Telefon saqlash |
| GET | `/api/client/geocode?lat=&lng=` | Koordinatadan manzil (OpenStreetMap) |

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
- ngrok manzili har ishga tushganda o'zgaradi, lekin `npm start` uni o'zi yangilaydi —
  qo'lda hech narsa ko'chirish kerak emas.
- `ALLOW_DEV_USER=true` — brauzerdan test qilish uchun. Haqiqiy foydalanishda `false` qiling.
- Mahsulot **tarkibi** `description` maydonidan vergul bilan ajratib olinadi.
- Mahsulot rasmi bazada nisbiy yo'l sifatida saqlanadi (`/products/simit.jpg`) va
  backend `public/` papkasidan uzatiladi. Tashqi `https://...` manzil ham ishlaydi.
- Narxlar Instagram menyusidagidek **boshlang'ich** narx ("…so'mdan").

---

## 🛠 Muammolar

| Holat | Yechim |
|-------|--------|
| `Bazaga ulanib bo'lmadi` | Neon bazasi uxlab qolgan bo'lishi mumkin — neon.tech'ga kirib uyg'oting |
| `https tunnel ochilmadi` | `ngrok config add-authtoken <token>` qiling, yoki `.env` ga `NGROK_AUTHTOKEN="..."` yozing |
| Bot `Mini App hali sozlanmagan` deyapti | Tunnel ochilmagan — yuqoridagi qatorga qarang, keyin `npm start` ni qayta bering |
| Tugma bosilganda **Example Domain** ochilyapti | Bu BotFather'dagi eski manzil. `npm start` ishlab turganda botga `/start` yuboring — tugma o'zi yangilanadi |
| Telegramda ngrok ogohlantirishi | Bir marta **Visit Site** bosing (`npm start` buni avtomatik chetlab o'tishga harakat qiladi) |
| Port band | `Ctrl+C` bilan to'g'ri yoping; kerak bo'lsa terminalni qayta oching |
