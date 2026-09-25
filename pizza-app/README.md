# 🔥 Olov Pizza — Telegram bot + Mini App

Pitsaxona uchun Telegram Mini App. Oddiy "katalog va savat" emas: pitsa ko'z oldingizda
yig'iladi, do'stlar bilan bitta buyurtma berasiz, buyurtmani pechdan eshigingizgacha jonli
kuzatasiz.

![Olov Pizza ekranlari](docs/screens.png)

## Nimasi bilan boshqalardan ajralib turadi

| Xususiyat | Nima qiladi |
|-----------|-------------|
| 🎨 **Jonli konstruktor** | Pitsa rasmlari fotosurat emas: har biri masalliqlaridan SVG ko'rinishida chiziladi. Masalliq qo'shsangiz, u pitsaga "tushib" joylashadi, sous rangi o'zgaradi, o'lcham tanlansa pitsa kattalashadi |
| ◐ **Yarim-yarim** | Bitta pitsada ikki xil ta'm. Har bir yarmiga alohida sous va masalliq. Narx qimmatroq yarmi bo'yicha, qo'shimchalar yarim narxda |
| 👥 **Davra** (birga buyurtma) | Havolani chatga tashlaysiz, har kim o'z pitsasini o'zi tanlaydi, hammasi jonli ko'rinib turadi. Host bitta tugma bilan buyurtma beradi, **kim qancha to'lashi avtomatik hisoblanadi** |
| 🔥 **Jonli kuzatuv** | Chek → xamir yoyilyapti → **aynan siz buyurtma qilgan pitsa pechda** → kuryer yo'lda → konfetti. Holat oshxona tugmani bosgan zahoti yangilanadi (SSE) |
| 🍕 **Tilim kartasi** | Har bir pitsa — bitta tilim. 8 tilim = bepul pitsa. Karta pitsa ko'rinishida to'lib boradi |
| 🎲 **Silkiting** | Tanlay olmayapsizmi? Telefonni silkiting — ruletka tasodifiy pitsa tanlaydi |
| 📱 **Telegram 8.0 imkoniyatlari** | Giroskop (pitsa telefon bilan birga qiyshayadi), akselerometr, LocationManager, CloudStorage (savat telefon va kompyuter orasida sinxron), `shareMessage`, bosh ekranga qo'shish, haptic, BackButton |
| 🇺🇿 🇷🇺 **Ikki til** | O'zbekcha va ruscha, Telegram tiliga qarab avtomatik |
| 🌗 **Yorug' / qorong'i** | Telegram mavzusiga moslashadi |
| 🧑‍🍳 **Oshxona Telegramda** | Alohida admin panel shart emas: buyurtma guruhga kartochka bo'lib keladi, holat tugmalar bilan o'zgaradi, `/stop` — tugagan mahsulotlar, `/stats` — bugungi tushum |

## Tez ishga tushirish

Talab: **Node.js 22.13+** (SQLite Node ichida tayyor, alohida baza o'rnatish shart emas).

```bash
cd pizza-app
npm install
npm run dev
```

`npm run dev` o'zi:

1. `.env` yo'q bo'lsa `.env.example` dan nusxa oladi
2. `.env` da `NGROK_AUTHTOKEN` bo'lsa — https tunnel ochadi va uni `PUBLIC_URL` qiladi
3. API serverni (3000) va Mini App'ni (5173) birga ishga tushiradi
4. Bot menyu tugmasini joriy manzilga o'zi bog'laydi — BotFather'da URL yozish shart emas

**Brauzerda sinash (botsiz ham):** <http://localhost:5173/?dev=1>.
Davrani sinash uchun ikkinchi oynada `?dev=2` oching: bu boshqa foydalanuvchi bo'ladi.

**Kuzatuvni botsiz sinash:** buyurtma berganingizdan keyin buyurtmani keyingi holatga
o'tkazing (faqat `ALLOW_DEV_USER=true` bo'lganda ishlaydi):

```bash
curl -X POST localhost:3000/api/dev/orders/1001/advance -H 'x-dev-user: 1'
```

## Botni sozlash

1. [@BotFather](https://t.me/BotFather) → `/newbot` → tokenni `.env` dagi `BOT_TOKEN` ga yozing
2. Oshxona uchun Telegram guruh oching, botni qo'shing. Guruh ID sini `ADMIN_CHAT_ID` ga yozing
   (masalan `-1001234567890`; bilish uchun guruhga [@RawDataBot](https://t.me/RawDataBot) ni qo'shing)
3. Faqat ma'lum xodimlar holatni o'zgartirsin desangiz, ularning ID larini `ADMIN_IDS` ga yozing
4. *(Ixtiyoriy)* Onlayn to'lov: BotFather → bot → **Payments** → Click yoki Payme →
   tokenni `PAYMENT_PROVIDER_TOKEN` ga yozing
5. *(Ixtiyoriy)* BotFather → `/newapp` → qisqa nom (masalan `menu`) → `MINIAPP_SHORT_NAME=menu`.
   Shunda "Davra" havolasi botni chetlab, to'g'ridan-to'g'ri ilovani ochadi

### Oshxona qanday ishlaydi

Yangi buyurtma guruhga shunday keladi: mijoz, telefon, har bir pitsa tarkibi (−piyoz, +halapenyo),
davra bo'lsa — kim nima olgani, manzil va xaritada nuqta. Tugmalar:

`✅ Qabul qilish` → `🔥 Pechga` → `🛵 Kuryerga berildi` (yoki `📦 Tayyor`) → `🏁 Yetkazildi`

Har bosishda mijozning ilovasi darhol yangilanadi va bot unga xabar yozadi.

| Buyruq | Kim uchun | Vazifasi |
|--------|-----------|----------|
| `/start` | mijoz | Salomlashish va menyu tugmasi |
| `/orders` | mijoz | So'nggi 5 ta buyurtma |
| `/help` | mijoz | Yordam va telefon |
| `/stats` | oshxona | Bugungi buyurtmalar, tushum, o'rtacha chek, top pitsalar |
| `/stop` | oshxona | Stop-list: tugagan pitsa/masalliqni bir bosishda o'chirish-yoqish |

## Menyu va sozlamalarni o'zgartirish

| Nima | Qayerda |
|------|---------|
| Nom, telefon, manzil, ish vaqti, yetkazish narxi, bepul yetkazish chegarasi, radius | `shared/shop.js` |
| Pitsalar, narxlar, masalliqlar, ichimliklar, gazaklar | `shared/menu.js` |
| Matnlar (o'zbekcha/ruscha) | `src/lib/i18n.js` (ilova), `server/texts.js` (bot) |
| Ranglar, shriftlar | `src/styles/app.css` (boshida `:root` o'zgaruvchilari) |

Yangi pitsa qo'shish uchun rasm kerak emas — `shared/menu.js` ga masalliqlari bilan yozing,
ilova uni o'zi chizadi. Server narxni aynan shu fayllardan qayta hisoblaydi, mijoz yuborgan
narxga ishonilmaydi.

## Serverga joylash (Render)

Bitta servis: API, bot (webhook) va Mini App bitta manzilda.

1. [Render](https://render.com) → **New → Web Service** → shu repozitoriya
2. **Root Directory:** `pizza-app`
3. **Build Command:** `npm ci --include=dev && npm run build`
4. **Start Command:** `npm start`
5. Environment: `NODE_VERSION=22`, `NODE_ENV=production`, `BOT_TOKEN`, `ADMIN_CHAT_ID`
   (va kerak bo'lsa `ADMIN_IDS`, `PAYMENT_PROVIDER_TOKEN`)

`PUBLIC_URL` ni yozish shart emas: Render o'zi `RENDER_EXTERNAL_URL` beradi, server webhook
va menyu tugmasini shu manzilga o'rnatadi. `render.yaml` ham tayyor (Blueprint path:
`pizza-app/render.yaml`).

> ⚠️ **Baza haqida.** Render'ning bepul tarifida disk vaqtinchalik — har deploy'da
> `data/pizza.db` tozalanadi. Haqiqiy pitsaxona uchun Render **Disk** ulang
> (`DATABASE_FILE=/var/data/pizza.db`, `render.yaml` da izohda bor) yoki VPS ishlating.

VPS'da: `npm ci --include=dev && npm run build`, keyin `NODE_ENV=production PUBLIC_URL=https://domen.uz npm start`
(nginx orqasida; SSE uchun `proxy_buffering off`).

## Tuzilma

```
pizza-app/
├── shared/                 # Server va ilova uchun umumiy kod
│   ├── shop.js             # Pitsaxona sozlamalari, ish vaqti, masofa
│   ├── menu.js             # Menyu
│   ├── pricing.js          # Narx, tekshiruv, hisobni bo'lish
│   ├── status.js           # Buyurtma holatlari
│   └── format.js           # Pul, vaqt, telefon formati
├── server/
│   ├── index.js            # Ishga tushirish
│   ├── app.js              # Express + SSE + bot yig'ilishi
│   ├── routes.js           # /api yo'llari
│   ├── auth.js             # Telegram initData HMAC tekshiruvi
│   ├── telegram.js         # Bot: buyruqlar, oshxona tugmalari, to'lov, ulashish
│   ├── texts.js            # Bot xabarlari
│   ├── events.js           # Server-Sent Events
│   ├── db.js               # SQLite (node:sqlite)
│   └── services/           # users, orders, groups (Davra), stoplist
├── src/                    # Mini App (React + Vite)
│   ├── pizza/              # Pitsa renderer: Pizza.jsx, toppings.jsx, rng.js
│   ├── screens/            # Home, Builder, Cart, Checkout, Tracker, Group, Profile
│   ├── components/         # Kartochkalar, sahnalar (pech, kuryer), UI
│   └── lib/                # store, api, telegram, sensors, i18n
├── test/                   # node:test — narx, auth, API, Davra, SSE, bot (soxta Telegram)
└── scripts/dev.js          # npm run dev
```

## API

Barcha so'rovlar `x-telegram-init-data` header bilan (Telegram imzosi serverda tekshiriladi).

| Metod | Yo'l | Vazifasi |
|-------|------|----------|
| GET | `/api/bootstrap` | Foydalanuvchi, ish vaqti, stop-list, faol buyurtmalar, davra |
| PATCH | `/api/me` | Tilni saqlash |
| GET | `/api/orders` · `/api/orders/:id` | Buyurtmalar |
| POST | `/api/orders` | Yangi buyurtma (narx serverda qayta hisoblanadi) |
| POST | `/api/orders/:id/cancel` · `/invoice` · `/cash` | Bekor qilish, to'lov havolasi, naqdga o'tish |
| POST | `/api/groups` | Davra ochish |
| GET/POST | `/api/groups/:code` · `/join` · `/leave` | Davra |
| POST/PATCH | `/api/groups/:code/items` | Davraga qo'shish / sonini o'zgartirish |
| POST | `/api/groups/:code/share` | Ulashish uchun tayyor xabar |
| GET | `/api/stream` | Jonli yangilanishlar (SSE) |

## Tekshirish

```bash
npm test        # 48 ta test: narx, auth, API, Davra, SSE, bot (soxta Telegram server bilan)
npm run build   # Mini App yig'ilishi
```
