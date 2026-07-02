// =====================================================
// bot.js — Asosiy kirish nuqtasi (entry point)
// =====================================================

const TelegramBot = require('node-telegram-bot-api');
const { ADMIN_ID, STATES } = require('./constants');
const { DB_PATH, ready: dbReady } = require('./utils/db');

// Handlerlar
const userHandler  = require('./handlers/user');
const adminHandler = require('./handlers/admin');

// ===================== KONFIGURATSIYA =====================

// O'z bot tokeningizni shu yerga yozing yoki .env orqali bering
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';

if (BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
  console.error('❌ BOT_TOKEN o\'rnatilmagan! .env faylga yoki environment ga qo\'ying.');
  process.exit(1);
}

// Bot yaratish (polling rejimi)
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ===================== STATE STORAGE =====================
// In-memory state — bot restart bo'lganda state tozalanadi
// Lekin fayllar (users, bookings) saqlanib qoladi
const stateMap = {};

// ===================== YORDAMCHI =====================

/**
 * Berilgan chatId admin ekanligini tekshirish
 * @param {number} chatId
 * @returns {boolean}
 */
function isAdmin(chatId) {
  return chatId === ADMIN_ID;
}

// ===================== /start BUYRUG'I =====================

bot.onText(/\/start/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    if (isAdmin(chatId)) {
      await adminHandler.handleAdminStart(bot, msg, stateMap);
    } else {
      await userHandler.handleStart(bot, msg, stateMap);
    }
  } catch (err) {
    console.error('/start xatolik:', err.message);
  }
});

// ===================== MATN XABARLARI =====================

bot.on('message', async (msg) => {
  try {
    // Buyruqlarni o'tkazib yuborish (/start va boshqalar)
    if (msg.text?.startsWith('/')) return;

    // Contact xabari alohida ishlanadi
    if (msg.contact) return;

    const chatId = msg.chat.id;

    if (isAdmin(chatId)) {
      if ((msg.text || '').trim().toLowerCase() === 'menyu') {
        stateMap[chatId] = { state: STATES.ADMIN_MENU };
        await adminHandler.showAdminMenu(bot, chatId);
        return;
      }

      const sd = stateMap[chatId] || {};
      // Admin faqat ma'lum statelarda matn yuboradi
      const adminTextStates = [
        STATES.ADMIN_WORK_START,
        STATES.ADMIN_WORK_END,
        STATES.ADMIN_SERVICE_NAME,
        STATES.ADMIN_SERVICE_DUR,
        STATES.ADMIN_BROADCAST,
      ];
      if (adminTextStates.includes(sd.state)) {
        await adminHandler.handleAdminMessage(bot, msg, stateMap);
      } else {
        // Boshqa holatlarda admin menyusini ko'rsatish
        await adminHandler.showAdminMenu(bot, chatId);
      }
    } else {
      await userHandler.handleMessage(bot, msg, stateMap);
    }
  } catch (err) {
    console.error('Xabar xatolik:', err.message);
  }
});

// ===================== CONTACT (TELEFON) =====================

bot.on('contact', async (msg) => {
  try {
    const chatId = msg.chat.id;
    if (!isAdmin(chatId)) {
      await userHandler.handleContact(bot, msg, stateMap);
    }
  } catch (err) {
    console.error('Contact xatolik:', err.message);
  }
});

// ===================== INLINE CALLBACK =====================

bot.on('callback_query', async (query) => {
  try {
    const chatId = query.message.chat.id;
    const data   = query.data;

    // Admin callbacklari
    const adminCbs = [
      'ADMIN_TODAY', 'ADMIN_ALL', 'ADMIN_USERS',
      'ADMIN_HOLIDAY', 'ADMIN_WORK', 'ADMIN_SERVICE',
      'ADMIN_DONE', 'ADMIN_BROADCAST',
    ];

    const isAdminCb = isAdmin(chatId) && (
      adminCbs.some(k => data === k || data.startsWith(k + ':')) ||
      data.startsWith('HOL_DAY:') ||
      data.startsWith('SVC_DEL:') ||
      data === 'SVC_ADD' ||
      data.startsWith('DONE_BOOK:')
    );

    if (isAdmin(chatId) && isAdminCb) {
      await adminHandler.handleAdminCallback(bot, query, stateMap);
    } else {
      await userHandler.handleCallback(bot, query, stateMap);
    }
  } catch (err) {
    console.error('Callback xatolik:', err.message);
    try {
      await bot.answerCallbackQuery(query.id, { text: '⚠️ Xatolik yuz berdi.' });
    } catch {}
  }
});

// ===================== XATOLIK USHLOVCHI =====================

bot.on('polling_error', (err) => {
  console.error('Polling xatolik:', err.message);
});

bot.on('error', (err) => {
  console.error('Bot xatolik:', err.message);
});

// ===================== ISHGA TUSHISH =====================

dbReady
  .then(() => console.log(`SQLite baza tayyor: ${DB_PATH}`))
  .catch((err) => {
    console.error('SQLite bazani tayyorlashda xatolik:', err.message);
    process.exit(1);
  });

console.log('✅ Sartaroshxona boti ishga tushdi!');
console.log(`👑 Admin ID: ${ADMIN_ID}`);
