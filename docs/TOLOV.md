# 💳 Click va Payme orqali to'lov

Mijoz Mini App'dan chiqmasdan, **shu yerning o'zida** karta bilan to'laydi.
To'lov Telegram Payments orqali o'tadi — karta ma'lumotlari sizning serveringizga
umuman kelmaydi, ularni Click/Payme o'zi qabul qiladi.

Naqd to'lov doim ishlaydi. Click va Payme — ixtiyoriy, ulasangiz Mini App'da
paydo bo'ladi.

---

## 1-qadam. Tokenni olish (BotFather)

Telegramda [@BotFather](https://t.me/BotFather):

```
/mybots → botingiz → Payments
```

Ro'yxatdan **CLICK Uzbekistan** ni tanlang. BotFather ikki variant beradi:

| Variant | Nima uchun |
|---------|-----------|
| **CLICK Terminal Test** | Sinov. Pul yechilmaydi. Avval shuni ulang |
| **CLICK Terminal Live** | Haqiqiy to'lovlar. Click bilan shartnoma kerak |

BotFather sizni Click botiga yo'naltiradi, ko'rsatmalarni bajaring. Oxirida
BotFather **token** beradi — `398062629:TEST:...` ko'rinishida.

Payme uchun ham xuddi shunday: `Payments` → **Payme**.

## 2-qadam. Tokenni loyihaga yozish

`.env` faylni qo'lda tahrirlash shart emas:

```bash
npm run payment:token click 398062629:TEST:sizning_tokeningiz
npm run payment:token payme 387026696:TEST:sizning_tokeningiz
```

Keyin qayta ishga tushiring:

```bash
npm start
```

Terminalda shunday qator chiqadi:

```
💳 To'lov: Naqd + Click + Payme
```

## 3-qadam. Adminlar xabar olishi uchun

To'langan buyurtma haqida xabar **ADMIN_IDS** dagi odamlarga keladi.
`.env` faylda o'z Telegram ID'ingiz turganiga ishonch hosil qiling:

```
ADMIN_IDS="123456789"
```

ID'ni [@userinfobot](https://t.me/userinfobot) beradi. Bir necha admin bo'lsa —
vergul bilan: `"111,222"`.

---

## Mijoz qanday to'laydi

1. Savatchada **To'lov usuli** bo'limidan Click, Payme yoki Naqd tanlaydi
2. **Click orqali to'lash** tugmasini bosadi
3. Mini App ustida to'lov oynasi ochiladi — karta ma'lumotini kiritadi
4. To'lagach **"To'lov qabul qilindi!"** ekrani chiqadi

Bir vaqtning o'zida:
- mijozga chatda **chek** keladi (mahsulotlar, jami, to'lov usuli)
- adminlarga **yangi buyurtma** xabari keladi (telefon, manzil, xarita havolasi)

Mijoz to'lovni bekor qilsa — buyurtma saqlanadi, uni shu ekranning o'zida
boshqa usul bilan to'lashi yoki **Profil → To'lash** orqali keyinroq to'lashi mumkin.

## Adminlar uchun

| Belgi | Ma'nosi |
|-------|---------|
| 🟢 **Click · to'langan** | Pul tushdi — yetkazib bering |
| 🟠 **Payme · to'lanmagan** | Mijoz hali to'lamagan — **yetkazmang** |
| ⚪ **Naqd · kuryerga** | Pulni kuryer oladi |

Admin paneldagi **"Umumiy tushum"** faqat naqd buyurtmalar va **to'langan**
karta buyurtmalarini hisoblaydi.

---

## Minimal summa

Telegram karta orqali to'lov uchun minimal summa qo'yadi — taxminan **1 AQSh
dollari** ekvivalenti (hozir ~13 000 so'm atrofida, kursga qarab o'zgaradi).
Loyiha bu chegarani Telegram'ning o'zidan avtomatik oladi.

Summa kam bo'lsa Mini App Click va Payme'ni o'chirib, sababini ko'rsatadi:

> Kamida 12 700 so'm · yana 5 700 so'm qo'shing

Mijoz yana biror narsa qo'shsa, karta avtomatik yoqiladi. Yoki naqd to'laydi.

## Test rejimi

Test token bilan haqiqiy pul yechilmaydi. Click va Payme test kartalarini o'z
hujjatlarida beradi. Hammasi ishlagach BotFather'dan **Live** tokenni olib,
`npm run payment:token` bilan almashtirasiz — kodda hech narsa o'zgarmaydi.

## Muammolar

| Holat | Yechim |
|-------|--------|
| Mini App'da Click/Payme ko'rinmaydi | Token yozilmagan. `npm run payment:token ...` → `npm start` |
| "Telegram ichida ochganda ishlaydi" | Brauzerda sinayapsiz. Karta faqat Telegram ichida ishlaydi |
| "vaqtincha ishlamayapti" | Token noto'g'ri yoki eskirgan. BotFather'dan yangisini oling |
| Adminlarga xabar kelmayapti | `.env` da `ADMIN_IDS` ni tekshiring, admin botga `/start` bosgan bo'lishi kerak |
