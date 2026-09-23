# 🚀 Render'ga joylashtirish — bot doim ishlashi uchun

Kompyuterda `npm start` bilan bot faqat kompyuter yoniq paytda ishlaydi. Render'ga
joylashtirsangiz, bot 24/7 internetda turadi va manzili **hech qachon o'zgarmaydi**.

Hammasi **bitta** Render xizmatida:

| Manzil | Nima |
|---|---|
| `https://<nom>.onrender.com/` | Mini App (mijozlar uchun) |
| `https://<nom>.onrender.com/admin/` | Admin panel |
| `https://<nom>.onrender.com/api/...` | API va Telegram webhook |

Mini App manzili, menyu tugmasi va webhook **o'zi** sozlanadi. Siz faqat tokenlarni kiritasiz.
Baza — o'sha Neon bazangiz (mahsulotlar va buyurtmalar saqlanib qoladi).

---

## 1-qadam. Render'da ro'yxatdan o'tish

1. <https://render.com> → **Get Started** → **GitHub** bilan kiring
2. Render GitHub'ga ruxsat so'raydi → `shoxrux` repozitoriyasiga ruxsat bering

## 2-qadam. Blueprint yaratish

1. Render Dashboard → **New +** → **Blueprint**
2. Ro'yxatdan `shoxrux` ni tanlang → **Connect**
3. **Branch**: `claude/keen-goldberg-rovlae` ni tanlang
   (yangi kod shu branchda; keyinchalik asosiy branchga birlashtirilsa, o'shani tanlaysiz)
4. Render loyihadagi `render.yaml` ni o'qiydi va `farhadskaya-bulochka` xizmatini ko'rsatadi

## 3-qadam. Tokenlarni kiritish

Render quyidagilarni so'raydi. Qiymatlarni **kompyuteringizdagi `.env` fayldan** nusxa oling
(VS Code'da `.env` ni oching):

| Kalit | Qayerdan |
|---|---|
| `DATABASE_URL` | `.env` dagi `DATABASE_URL` |
| `DIRECT_URL` | `.env` dagi `DIRECT_URL` |
| `BOT_TOKEN` | `.env` dagi `BOT_TOKEN` |
| `ADMIN_PASSWORD` | **Yangi, kuchli parol** o'ylab toping (admin panel internetga ochiq bo'ladi) |
| `ADMIN_IDS` | Telegram ID'ingiz (bilmasangiz: Telegramda `@userinfobot` ga yozing) |
| `CLICK_PROVIDER_TOKEN` | `.env` dagi (bo'lmasa bo'sh qoldiring) |
| `PAYME_PROVIDER_TOKEN` | `.env` dagi (bo'lmasa bo'sh qoldiring) |

> ⚠️ Qiymatlarni qo'shtirnoqsiz kiriting: `.env` da `BOT_TOKEN="123:ABC"` bo'lsa,
> Render'ga faqat `123:ABC` yozasiz.

**Deploy Blueprint** (yoki **Apply**) tugmasini bosing. Birinchi marta 5–8 daqiqa ketadi.

## 4-qadam. Kompyuterdagi botni to'xtating

Bot tokeni bitta — kompyuterda ham, Render'da ham bir vaqtda ishlay olmaydi.
VS Code terminalida **Ctrl+C** bosing va keyin `npm start` qilmang.

> Keyinchalik kompyuterda `npm start` bersangiz, u buni o'zi aniqlaydi va ogohlantiradi:
> «Bot hozir serverda ishlayapti».

## 5-qadam. Tekshirish

Render → `farhadskaya-bulochka` → **Logs**. Oxirida shu qatorlar chiqishi kerak
(nom band bo'lsa, manzil `farhadskaya-bulochka-xxxx.onrender.com` ko'rinishida bo'ladi —
quyida o'zingiznikini ishlating):

```
🗄️  PostgreSQL (Neon) bazasiga ulandi
🤖 Bot webhook rejimida: https://farhadskaya-bulochka.onrender.com/telegram/...
📱 Menyu tugmasi bog'landi: https://farhadskaya-bulochka.onrender.com
```

Keyin:

1. Telegramda botga `/start` yuboring → **🥨 Buyurtma berish** → Mini App ochiladi
2. Sinov buyurtma bering → bot javob beradi, adminga xabar keladi
3. Brauzerda `https://farhadskaya-bulochka.onrender.com/admin/` → parol bilan kiring →
   buyurtma ko'rinadi

Uchalasi ishlasa — tayyor! 🎉

---

## Bilish kerak bo'lgan narsalar

### Bepul tarif 15 daqiqa jimlikdan keyin "uxlaydi"

Uzoq vaqt hech kim kirmasa, server uxlaydi. Keyingi mijoz kirganda uyg'onadi, lekin
**birinchi ochilish 30–60 soniya** davom etadi. Buyurtmalar yo'qolmaydi.

Uxlamasligi uchun (ixtiyoriy, bepul): <https://cron-job.org> da ro'yxatdan o'ting va
har **10 daqiqada** shu manzilga so'rov qo'ying:

```
https://farhadskaya-bulochka.onrender.com/api/health
```

Yoki Render'ning pullik tarifi (~$7/oy) — umuman uxlamaydi.

### Kodni yangilash

Render GitHub'dagi branchni kuzatadi: yangi kod push qilinsa, o'zi qayta quriladi.
Qo'lda yangilash: Render → **Manual Deploy** → **Deploy latest commit**.

> Har yangilanishda mahsulotlar ro'yxati (`prisma/seed.js`) bazaga qayta yoziladi —
> kompyuterdagi `npm start` qanday qilsa, xuddi shunday. Admin panelda narxni o'zgartirsangiz,
> uni `prisma/seed.js` da ham o'zgartiring, aks holda keyingi yangilanishda eski narx qaytadi.

### Sinash uchun alohida bot

Kompyuterda sinab ko'rmoqchi bo'lsangiz, BotFather'da ikkinchi bot oching (`/newbot`)
va kompyuteringizdagi `.env` ga **o'sha** botning tokenini yozing. Shunda Render'dagi
asosiy bot to'xtamaydi.

---

## 🛠 Muammolar

| Belgi | Sabab va yechim |
|---|---|
| Build `DATABASE_URL`/`prisma` xatosi bilan to'xtadi | `DATABASE_URL` va `DIRECT_URL` ni qo'shtirnoqsiz, to'liq nusxa olganingizni tekshiring |
| Logda `Bot webhook rejimida` yo'q | `BOT_TOKEN` noto'g'ri. Environment → tuzating → Save (o'zi qayta ishga tushadi) |
| Bot javob bermayapti | Kompyuterda `npm start` ishlab turgan bo'lishi mumkin — to'xtating, keyin Render → Manual Deploy |
| Mini App 30–60 soniya ochilmayapti | Server uxlagan edi — kuting yoki cron-job.org ni sozlang |
| Admin panelga kira olmayapman | Render → Environment → `ADMIN_PASSWORD` ni tekshiring |
| Karta orqali to'lov ko'rinmayapti | `CLICK_PROVIDER_TOKEN` / `PAYME_PROVIDER_TOKEN` kiritilmagan |
