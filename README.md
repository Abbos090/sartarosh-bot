# 💈 Sartaroshxona Telegram Boti

Node.js va node-telegram-bot-api asosida yozilgan professional navbat boti.
Ma'lumotlar faqat txt fayllarida saqlanadi — hech qanday database yo'q.

---

## 📁 Loyiha tuzilishi

```
project/
├── bot.js              ← Asosiy fayl
├── constants.js        ← Barcha konstantalar
├── package.json
├── .env.example
├── handlers/
│   ├── user.js         ← Foydalanuvchi xabarlari
│   └── admin.js        ← Admin panel
├── utils/
│   ├── file.js         ← Fayl o'qish/yozish (lock bilan)
│   ├── booking.js      ← Bron hisoblash
│   ├── calendar.js     ← Kun va vaqt keyboard
│   ├── time.js         ← Vaqt yordamchi funksiyalar
│   └── settings.js     ← Sozlamalar
└── data/
    ├── users.txt       ← Foydalanuvchilar
    ├── bookings.txt    ← Bronlar
    ├── settings.txt    ← Sozlamalar (JSON)
    └── holidays.txt    ← Dam olish kunlari
```

---

## 🚀 Ishga tushirish

### 1. O'rnatish

```bash
cd project
npm install
```

### 2. Token va Admin ID sozlash

**`constants.js`** faylini oching va `ADMIN_ID` ni o'zingizning Telegram ID ingizga o'zgartiring:

```js
const ADMIN_ID = 123456789; // ← sizning ID ingiz
```

Keyin **`.env`** fayl yarating:

```bash
cp .env.example .env
```

`.env` faylga bot tokeningizni yozing:

```
BOT_TOKEN=1234567890:AABBCCDDEEFFaabbccddeeff1234567890
```

> Bot tokenini [@BotFather](https://t.me/BotFather) dan olasiz.
> O'z Telegram ID ingizni [@userinfobot](https://t.me/userinfobot) dan bilib olasiz.

### 3. Ishga tushirish

```bash
# Oddiy
node bot.js

# Yoki dotenv bilan
BOT_TOKEN=tokeningiz node bot.js
```

---

## 👤 Foydalanuvchi imkoniyatlari

| Amal | Tavsif |
|------|--------|
| `/start` | Botni boshlash / menyuni ochish |
| 📅 Navbat olish | Xizmat → Kun → Vaqt tanlash |
| ❌ Navbatni bekor qilish | Mavjud navbatni bekor qilish |

---

## 👑 Admin imkoniyatlari

| Tugma | Tavsif |
|-------|--------|
| 📅 Bugungi navbatlar | Bugungi bronlar ro'yxati |
| 📆 Barcha navbatlar | Barcha bronlar (sanali) |
| 👥 Mijozlar | Ro'yxatdan o'tgan foydalanuvchilar |
| ⛔ Dam olish kuni | Kun belgilash + bronlar bekor qilish |
| ⚙️ Ish vaqtini sozlash | Boshlanish va tugash vaqti |
| ✂️ Xizmatlarni sozlash | Xizmat qo'shish/o'chirish |
| ✅ Navbat bajarildi | Bajarilgan bronni o'chirish |
| 📢 Xabar yuborish | Barcha foydalanuvchilarga broadcast |

---

## 📋 Txt fayl formatlari

**users.txt:**
```
chatId|Ism Familiya|998901234567
```

**bookings.txt:**
```
bookingId|chatId|Ism Familiya|telefon|YYYY-MM-DD|HH:MM|xizmat nomi|davomiyligi
```

**settings.txt:** JSON formatida

**holidays.txt:**
```
YYYY-MM-DD
```

---

## ⚙️ Muhim xususiyatlar

- **File lock** — bir vaqtda ikki yozuv bir-birini bosib ketmaydi
- **Overlap tekshiruvi** — bron vaqtlari kesishmaydi
- **Real-time tekshiruv** — bron tasdiqlashda oxirgi tekshiruv (ikki kishi bir vaqtda bosishi holati)
- **Admin xabardorlik** — navbatga 60 daqiqa qolsa bekor qilinganda admin ogohlantiriladi
- **Bot restart bardoshligi** — state tozalanadi lekin ma'lumotlar saqlanadi
