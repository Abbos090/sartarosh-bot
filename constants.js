// =====================================================
// KONSTANTALAR - Barcha doimiy qiymatlar shu yerda
// =====================================================

const path = require("path");

// Admin Telegram ID si - o'zgartiring!
const ADMIN_ID = 6878633471;

// Fayl yo'llari
const PATHS = {
  USERS: path.join(__dirname, "data", "users.txt"),
  BOOKINGS: path.join(__dirname, "data", "bookings.txt"),
  SETTINGS: path.join(__dirname, "data", "settings.txt"),
  HOLIDAYS: path.join(__dirname, "data", "holidays.txt"),
};

// Default settings (agar settings.txt bo'sh yoki yo'q bo'lsa)
const DEFAULT_SETTINGS = {
  workStart: "18:00",
  workEnd: "00:00",
  defaultDuration: 30,
  services: [
    { name: "Oddiy soch olish", duration: 30 },
    { name: "Kalga olish", duration: 15 },
    { name: "Soqol olish", duration: 10 },
  ],
};

// Foydalanuvchi holatlari (state)
const STATES = {
  IDLE: "IDLE",
  WAIT_NAME: "WAIT_NAME",
  WAIT_PHONE: "WAIT_PHONE",
  SELECT_SERVICE: "SELECT_SERVICE",
  SELECT_DAY: "SELECT_DAY",
  SELECT_TIME: "SELECT_TIME",
  CONFIRM_BOOKING: "CONFIRM_BOOKING",
  CANCEL_CONFIRM: "CANCEL_CONFIRM",

  // Admin holatlari
  ADMIN_MENU: "ADMIN_MENU",
  ADMIN_BROADCAST: "ADMIN_BROADCAST",
  ADMIN_WORK_START: "ADMIN_WORK_START",
  ADMIN_WORK_END: "ADMIN_WORK_END",
  ADMIN_SERVICE_MENU: "ADMIN_SERVICE_MENU",
  ADMIN_SERVICE_NAME: "ADMIN_SERVICE_NAME",
  ADMIN_SERVICE_DUR: "ADMIN_SERVICE_DUR",
  ADMIN_HOLIDAY_SELECT: "ADMIN_HOLIDAY_SELECT",
  ADMIN_DONE_SELECT: "ADMIN_DONE_SELECT",
  ADMIN_DELETE_SELECT: "ADMIN_DELETE_SELECT", // ← yangi
};

// Callback data prefikslari (inline keyboard uchun)
const CB = {
  DAY: "DAY:",
  TIME: "TIME:",
  SERVICE: "SERVICE:",
  CONFIRM_YES: "CONFIRM_YES",
  CONFIRM_NO: "CONFIRM_NO",
  CANCEL_YES: "CANCEL_YES",
  CANCEL_NO: "CANCEL_NO",
  ADMIN_TODAY: "ADMIN_TODAY",
  ADMIN_ALL: "ADMIN_ALL",
  ADMIN_USERS: "ADMIN_USERS",
  ADMIN_HOLIDAY: "ADMIN_HOLIDAY",
  ADMIN_WORK: "ADMIN_WORK",
  ADMIN_SERVICE: "ADMIN_SERVICE",
  ADMIN_DONE: "ADMIN_DONE",
  ADMIN_DELETE: "ADMIN_DELETE", // ← yangi
  ADMIN_BROADCAST: "ADMIN_BROADCAST",
  DONE_BOOK: "DONE_BOOK:",
  DEL_BOOK: "DEL_BOOK:", // ← yangi
  SVC_DEL: "SVC_DEL:",
  SVC_ADD: "SVC_ADD",
  HOL_DAY: "HOL_DAY:",
  USER_BACK: "USER_BACK",
};

// Ish vaqti intervali (daqiqa)
const TIME_INTERVAL_MINUTES = 15;

// Neча kun oldinga bron qilish mumkin
const DAYS_AHEAD = 3;

// Bekor qilish uchun limit (daqiqa)
const CANCEL_NOTIFY_MINUTES = 60;

module.exports = {
  ADMIN_ID,
  PATHS,
  DEFAULT_SETTINGS,
  STATES,
  CB,
  TIME_INTERVAL_MINUTES,
  DAYS_AHEAD,
  CANCEL_NOTIFY_MINUTES,
};
