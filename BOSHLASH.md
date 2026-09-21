# 🚀 Noldan ishga tushirish

Kompyuteringizda hech narsa yo'q bo'lsa — shu qo'llanmani boshidan oxirigacha
bajaring. Taxminan **20–30 daqiqa** oladi. Dasturlash bilishingiz shart emas.

Oxirida sizda ishlaydigan Telegram bot, Mini App va admin panel bo'ladi.

---

## Nima kerak bo'ladi

| Narsa | Nima uchun | Pul |
|-------|------------|-----|
| Node.js 20+ | Loyihani ishga tushiradi | Bepul |
| Git | Loyihani yuklab oladi | Bepul |
| Telegram akkaunt | Bot yaratish uchun | Bepul |
| Neon akkaunt | Ma'lumotlar bazasi | Bepul |
| ~~ngrok akkaunt~~ | Kerak emas — Cloudflare tunneli o'zi ishlaydi | — |

---

## 1-qadam. Node.js o'rnatish

<https://nodejs.org> saytiga kiring va **LTS** versiyasini yuklab oling
(20 yoki undan yuqori). O'rnatgandan keyin terminal/buyruq satrini oching:

- **Windows:** `Win + R` → `cmd` → Enter
- **macOS:** `Cmd + Space` → `Terminal` → Enter
- **Linux:** `Ctrl + Alt + T`

Tekshiring:

```bash
node -v
```

`v20.x.x` yoki undan yuqori chiqishi kerak. Chiqmasa — terminalni yopib qayta oching.

## 2-qadam. Git o'rnatish

<https://git-scm.com/downloads> dan yuklab oling. Windows'da o'rnatishda hamma
narsani standart holicha qoldiravering. Tekshiring:

```bash
git --version
```

## 3-qadam. Papka ochib, loyihani yuklash

Terminalda quyidagilarni **birma-bir** kiriting:

```bash
cd Desktop
git clone https://github.com/ssha70359-ship-it/shoxrux.git bulochka
cd bulochka
```

Endi ish stolingizda **bulochka** papkasi paydo bo'ladi — loyiha shu yerda.

> Git ishlamasa: GitHub sahifasida yashil **Code** tugmasi → **Download ZIP**,
> arxivni ish stoliga chiqaring va terminalda `cd` bilan o'sha papkaga kiring.

## 4-qadam. Telegram bot yaratish

Telegramda **[@BotFather](https://t.me/BotFather)** ni oching:

1. `/newbot` yuboring
2. Bot nomini yozing — masalan `Farhadskaya Bulochka`
3. Bot username'ini yozing — `bulochka` bilan tugashi va band bo'lmasligi kerak,
   masalan `farhadskaya_bulochka_bot`
4. BotFather sizga **token** beradi — `1234567890:AAE...` ko'rinishida

**Shu tokenni saqlang**, keyingi qadamda kerak bo'ladi.

> ⚠️ Tokenni hech kimga bermang. U botingizni to'liq boshqarish huquqini beradi.

Bir yo'la **Telegram ID**ingizni ham oling: **[@userinfobot](https://t.me/userinfobot)**
ga `/start` yuboring, u sizga raqam beradi (masalan `123456789`). Bu raqam sizni
admin qiladi.

## 5-qadam. Ma'lumotlar bazasi (Neon)

1. <https://neon.tech> ga kiring, **Sign up** (Google bilan kirsa ham bo'ladi)
2. Yangi loyiha yarating — nomi ixtiyoriy, masalan `bulochka`
3. **Connect** tugmasini bosing
4. Chiqqan matnni **to'liq nusxalang** — `postgresql://...` bilan boshlanadi

> Nusxada `psql` so'zi yoki qo'shtirnoq bo'lsa ham muammo yo'q — loyiha o'zi tozalaydi.

## 6-qadam. (o'tkazib yuboring)

Telegram Mini App'ni faqat **https** manzilda ochadi, kompyuteringiz esa
`localhost`. Loyiha buni o'zi hal qiladi — **Cloudflare tunneli** ishlatadi,
unga ro'yxatdan o'tish ham, token ham kerak emas.

> ngrok ishlatmoqchi bo'lsangiz ixtiyoriy: <https://dashboard.ngrok.com/signup>
> dan token olib, `npm run ngrok:token <token>` bering. Ishlamasa loyiha
> avtomatik Cloudflare'ga o'tadi.

## 7-qadam. Ishga tushirish

Terminal **bulochka** papkasida turganini tekshiring, keyin:

```bash
npm start
```

Birinchi marta loyiha sizdan 5 ta narsa so'raydi — yuqorida yig'ganlaringizni
kiritasiz:

| Savol | Nima kiritasiz |
|-------|----------------|
| Neon connection string | 5-qadamdagi `postgresql://...` |
| BotFather bergan Bot Token | 4-qadamdagi token |
| Admin panel uchun parol | O'zingiz o'ylab toping (Enter = `admin123`) |
| Telegram ID'ingiz | 4-qadamdagi raqam (Enter = bo'sh) |
| ngrok authtoken | **Enter bosing** — kerak emas |

Token to'g'ri bo'lsa ekranda `Bot topildi: @sizning_botingiz` chiqadi.

**Shundan keyin hamma narsa avtomatik bo'ladi:**

1. Paketlar o'rnatiladi (1–3 daqiqa, internetga bog'liq)
2. Bazaga jadvallar yoziladi
3. **23 ta mahsulot** rasmlari bilan bazaga qo'shiladi
4. ngrok https manzili ochiladi
5. Botning menyu tugmasi shu manzilga bog'lanadi — **BotFather'da hech narsa
   sozlash shart emas**
6. Uchta server ishga tushadi

Oxirida ekranda manzillar jadvali chiqadi.

## 8-qadam. Tekshirish

**Telegramda:** botingizni oching va `/start` yuboring. Pastda
**🥨 Buyurtma berish** tugmasi chiqadi — bosing, Mini App ochiladi.

`/manzil` yuborib ko'ring — filiallar, ish vaqti va hozir ochiq/yopiqligi chiqadi.

**Brauzerda:**

| Nima | Manzil |
|------|--------|
| Mini App | <http://localhost:5173> |
| Admin panel | <http://localhost:5174> |

Admin panelga 7-qadamda kiritgan parolingiz bilan kirasiz. U yerdan mahsulot
qo'shish, narx o'zgartirish, rasm almashtirish va buyurtmalarni ko'rish mumkin.

To'xtatish uchun terminalda **Ctrl + C** bosing.

---

## Keyingi safar

Ikkinchi marta hech narsa so'ralmaydi. Shunchaki:

```bash
cd Desktop/bulochka
npm start
```

> ngrok manzili har safar o'zgaradi, lekin `npm start` uni o'zi yangilaydi —
> qo'lda hech narsa ko'chirish kerak emas.

---

## Nimani birinchi bo'lib o'zgartirasiz

| Nima | Qayerdan |
|------|----------|
| Narx, mahsulot nomi, rasm | Admin panel → Mahsulotlar |
| Filial manzillari, telefon, ish vaqti | `src/config/shop.js` fayli |
| Savatchadagi qo'shimcha taklif | `src/config/default.js` → `extraOffer` |

`shop.js` ni tahrirlasangiz terminalda **Ctrl + C** bosib `npm start` ni qayta
ishga tushiring.

Rasmi yo'q 5 ta mahsulot bor — **Blinchik, Brauni, Medovik, San Sebastián,
Tiramisu**. Ularga admin paneldan rasm qo'shsangiz, emoji o'rniga rasm chiqadi.

---

## Muammolar

| Xato | Sabab va yechim |
|------|-----------------|
| `node` topilmadi | Node.js o'rnatilmagan yoki terminal qayta ochilmagan. 1-qadamga qayting. |
| `git` topilmadi | 3-qadamdagi ZIP usulidan foydalaning. |
| `Bazaga ulanib bo'lmadi` | Neon bazasi uxlab qolgan. neon.tech'ga kirib uyg'oting, keyin `npm start`. |
| `Noto'g'ri qiymat` (token) | Tokenni probel va qo'shtirnoqsiz, to'liq nusxalang. |
| `https tunnel ochilmadi` | Internet yoki VPN/antivirus tunnelni bloklayapti. Barcha terminallarni yoping (`taskkill /f /im node.exe`) va qayta urinib ko'ring. |
| Tugma bosilganda eski sayt ochiladi | `npm start` ishlab turganda botga `/start` yuboring — tugma yangilanadi. |
| Telegramda ngrok ogohlantirishi | Bir marta **Visit Site** bosing. |
| Port band | Ctrl + C bilan to'g'ri yoping, terminalni qayta oching. |
| Mahsulotlar ko'rinmayapti | `npm run db:seed` ni alohida ishga tushiring. |

`.env` faylingizda parollar saqlanadi va u **hech qachon GitHub'ga yuklanmaydi**
(`.gitignore` da). Uni hech kimga yubormang.

---

## Internetga chiqarish

Kompyuteringiz o'chsa bot ham to'xtaydi. Doimiy ishlashi uchun Vercel (frontend)
va Render (backend) ga joylashtirish kerak — bosqichma-bosqich qo'llanma:
**[DEPLOY.md](DEPLOY.md)**.

Loyiha tuzilishi va API haqida: **[README.md](README.md)**.
Katalog qayerdan olingani: **[docs/INSTAGRAM-TAHLIL.md](docs/INSTAGRAM-TAHLIL.md)**.
