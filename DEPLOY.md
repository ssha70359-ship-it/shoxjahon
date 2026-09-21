# 🚀 Internetga chiqarish — Vercel + Render

Loyiha 3 ta bo'lakka bo'linib joylashtiriladi:

| Qism | Qayerga | Nima uchun |
|---|---|---|
| Mini App (React) | **Vercel** | Statik sayt, bepul, tez |
| Admin panel (React) | **Vercel** | Statik sayt, bepul |
| Backend (bot + API) | **Render.com** | Doim ishlab turadigan server kerak |
| Baza | **Neon** | Allaqachon ishlayapti, o'zgartirish shart emas |

---

## ⚠️ Tartib muhim

Bir-biriga bog'liq: Vercel backend manzilini bilishi kerak, Render esa Mini App manzilini.
Shuning uchun **aynan shu ketma-ketlikda** boring:

```
1-qadam:  Render     → backend ko'tariladi, manzil olinadi
2-qadam:  Vercel     → Mini App, backend manzili bilan
3-qadam:  Render     → WEBAPP_URL ga Mini App manzili yoziladi
4-qadam:  Vercel     → Admin panel
5-qadam:  Telegram   → tekshirish
```

---

# 1-QADAM — Backend'ni Render.com'ga joylash

## 1.1. Ro'yxatdan o'tish

1. <https://render.com> → **Get Started** → **GitHub** bilan kiring
2. Render GitHub'ga ulanishni so'raydi → **Authorize Render**
3. Repozitoriya tanlashda `janob_shox_bot` ni belgilang (yoki **All repositories**)

## 1.2. Servis yaratish

1. Dashboard → **New +** → **Web Service**
2. Ro'yxatdan `janob_shox_bot` ni tanlang → **Connect**
3. Sozlamalarni quyidagicha to'ldiring:

| Maydon | Qiymat |
|---|---|
| **Name** | `bulochka-backend` (istalgan nom) |
| **Region** | `Ohio (US East)` — bazangiz shu yerda, tezroq ishlaydi |
| **Branch** | `main` |
| **Root Directory** | **bo'sh qoldiring** |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run server` |
| **Instance Type** | `Free` |

> ⚠️ **Start Command'ga `npm start` YOZMANG.** `npm start` — bu kompyuterda ishlaydigan
> yordamchi skript (ngrok ochadi, 3 ta server ko'taradi). Serverda faqat `npm run server` kerak.

## 1.3. Environment Variables (muhit o'zgaruvchilari)

Pastdagi **Advanced** → **Add Environment Variable** bo'limida quyidagilarni qo'shing:

| Key | Value |
|---|---|
| `DATABASE_URL` | `postgresql://neondb_owner:...@ep-nameless-rice-b5hbic9j-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `DIRECT_URL` | `postgresql://neondb_owner:...@ep-nameless-rice-b5hbic9j.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `BOT_TOKEN` | BotFather bergan token |
| `ADMIN_PASSWORD` | **Kuchli parol qo'ying** (`admin123` emas!) |
| `ADMIN_IDS` | `1002799987` |
| `ALLOW_DEV_USER` | `false` |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |

> Aniq qiymatlarni kompyuteringizdagi `.env` fayldan nusxa oling.
> `WEBAPP_URL` ni hozir qo'shmaysiz — u 3-qadamda qo'shiladi.

4. **Create Web Service** bosing va 3–5 daqiqa kuting.

## 1.4. Tekshirish

Loglarda shu qatorlarni ko'rishingiz kerak:

```
🗄️  PostgreSQL (Neon) bazasiga ulandi
🤖 Bot webhook rejimida: https://bulochka-backend-xxxx.onrender.com/telegram/...
🚀 API server: https://bulochka-backend-xxxx.onrender.com
```

Brauzerda oching: `https://bulochka-backend-xxxx.onrender.com/api/health`
→ `{"ok":true,"time":"..."}` chiqishi kerak.

**Shu manzilni nusxa oling** — keyingi qadamda kerak bo'ladi.

> 💡 Bot avtomatik **webhook** rejimiga o'tadi. Kodda hech narsa o'zgartirish kerak emas —
> Render `RENDER_EXTERNAL_URL` ni o'zi beradi, loyiha uni ko'rib webhook o'rnatadi.

---

# 2-QADAM — Mini App'ni Vercel'ga joylash

## 2.1. Ro'yxatdan o'tish

1. <https://vercel.com> → **Sign Up** → **Continue with GitHub**
2. **Authorize Vercel**

## 2.2. Loyiha yaratish

1. Dashboard → **Add New...** → **Project**
2. `janob_shox_bot` yonidagi **Import** ni bosing
3. Sozlamalar:

| Maydon | Qiymat |
|---|---|
| **Project Name** | `bulochka-mini-app` |
| **Framework Preset** | `Vite` (o'zi topadi) |
| **Root Directory** | **`mini-app`** ← **Edit** bosib o'zgartiring, eng muhim qadam! |
| Build Command | `npm run build` (avtomatik) |
| Output Directory | `dist` (avtomatik) |

4. **Environment Variables** bo'limini oching va qo'shing:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://bulochka-backend-xxxx.onrender.com` ← 1-qadamdagi manzil |

> Oxirida `/` qo'ymang. To'g'ri: `https://...onrender.com`

5. **Deploy** bosing, 1–2 daqiqa kuting.

## 2.3. Manzilni olish

Deploy tugagach `https://bulochka-mini-app-xxxx.vercel.app` ko'rinishidagi manzil beriladi.
**Uni nusxa oling.**

> Brauzerda ochsangiz «Avtorizatsiya xatosi. Ilovani Telegram orqali oching» chiqadi —
> bu **to'g'ri**. Mini App faqat Telegram ichida ishlashi kerak.

---

# 3-QADAM — Render'ga Mini App manzilini berish

1. Render → `bulochka-backend` → chap menyuda **Environment**
2. **Add Environment Variable**:

| Key | Value |
|---|---|
| `WEBAPP_URL` | `https://bulochka-mini-app-xxxx.vercel.app` ← 2-qadamdagi manzil |

3. **Save Changes** → servis o'zi qayta ishga tushadi

Loglarda ko'rinadi:

```
📱 Mini App: https://bulochka-mini-app-xxxx.vercel.app
📱 Menyu tugmasi bog'landi: https://bulochka-mini-app-xxxx.vercel.app
```

BotFather'ga kirish **shart emas** — bot menyu tugmasini o'zi yangilaydi.

---

# 4-QADAM — Admin panelni Vercel'ga joylash

1. Vercel → **Add New...** → **Project** → yana o'sha `janob_shox_bot` → **Import**
2. Sozlamalar:

| Maydon | Qiymat |
|---|---|
| **Project Name** | `bulochka-admin` |
| **Root Directory** | **`admin-panel`** ← Edit bosib o'zgartiring |
| `VITE_API_URL` | `https://bulochka-backend-xxxx.onrender.com` |

3. **Deploy**

Manzil: `https://bulochka-admin-xxxx.vercel.app` — parol bilan kirasiz.

> 🔒 Bu sahifa internetga ochiq. **Kuchli parol** qo'ying. Parolni birma-bir terib
> topishga urinish 15 daqiqada 8 martadan keyin bloklanadi.

---

# 5-QADAM — Telegramda tekshirish

1. Botga `/start` yuboring
2. **🥨 Buyurtma berish** tugmasini bosing → Mini App ochiladi
3. Mahsulot tanlang → savatchaga qo'shing → buyurtmani tasdiqlang
4. Bot javob berishi kerak: «Buyurtmangiz muvaffaqiyatli qabul qilindi!»
5. `https://bulochka-admin-xxxx.vercel.app` ni oching → buyurtma jadvalda ko'rinsin

Beshtasi ham o'tsa — loyiha to'liq internetda ishlayapti. 🎉

---

# ⚠️ Muhim ogohlantirishlar

## 1. Lokal `npm start` production botni buzadi

Bot tokeni bitta. Kompyuterda `npm start` bersangiz, bot **long polling** rejimiga
o'tadi va Render'dagi webhook'ni **o'chirib yuboradi**. Natijada internetdagi bot
ishlamay qoladi.

**Yechim:** BotFather'da lokal test uchun **ikkinchi bot** oching
(`/newbot` → masalan `janob_shox_test_bot`) va kompyuteringizdagi `.env` faylga
o'sha yangi tokenni yozing. Shunda ikkalasi bir-biriga xalaqit bermaydi.

Agar shunday bo'lib qolsa, tuzatish oson: Render → `bulochka-backend` →
**Manual Deploy** → **Deploy latest commit** → webhook qayta o'rnatiladi.

## 2. Render bepul tarifi 15 daqiqadan keyin uxlaydi

Uzoq vaqt buyurtma bo'lmasa server uxlaydi. Keyingi xabar kelganda uyg'onadi,
lekin **birinchi javob 30–60 soniya kechikadi**. Telegram xabarni qayta yuboradi,
shuning uchun buyurtma yo'qolmaydi — faqat sekin bo'ladi.

Yechimlar:
- Shundayligicha qoldirish (test uchun yetarli)
- Render'ning pullik tarifiga o'tish ($7/oy — uxlamaydi)
- <https://cron-job.org> da har 10 daqiqada `/api/health` ga so'rov qo'yish (bepul)

## 3. Baza allaqachon to'la

Neon bazangizda mahsulotlar va eski buyurtmalar bor — Render o'sha bazaga ulanadi,
qayta seed qilish shart emas.

Agar kerak bo'lsa, kompyuteringizdan turib production bazani to'ldirishingiz mumkin
(baza bitta):

```bash
npm run db:seed
```

## 4. Har `git push` dan keyin avtomatik yangilanadi

Vercel ham, Render ham GitHub'ga bog'langan. `main` branchga push qilsangiz,
ikkalasi ham o'zi qayta quriladi. Qo'lda hech narsa qilish kerak emas.

---

# 🛠 Muammolar

| Xato | Sabab va yechim |
|---|---|
| Render logida `PrismaClientInitializationError` | `DATABASE_URL` noto'g'ri yoki Neon uxlagan. Neon panelida bazani uyg'oting |
| Render `Cannot find module '@prisma/client'` | Build Command `npm install && npm run build` ekanini tekshiring |
| Bot javob bermayapti | Render logida `Bot webhook rejimida:` qatori bormi? Yo'q bo'lsa `BOT_TOKEN` ni tekshiring |
| Mini App'da «Server bilan bog'lanib bo'lmadi» | Vercel'da `VITE_API_URL` yo'q yoki oxirida `/` bor. Tuzatib **Redeploy** qiling |
| Mini App'da oq ekran | Vercel'da **Root Directory** `mini-app` ekanini tekshiring |
| Admin panelga kira olmayapman | Render'dagi `ADMIN_PASSWORD` ni tekshiring. 8 marta xato kiritsangiz 15 daqiqa bloklanadi |
| Tugma eski manzilni ochyapti | Render → Manual Deploy, keyin Telegramda `/start` |

> Vercel'da environment o'zgaruvchisini o'zgartirgandan keyin **albatta Redeploy** qiling —
> u build paytida kodga yoziladi, keyin o'zgarmaydi.
