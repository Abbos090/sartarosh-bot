// =====================================================
// utils/file.js - Ma'lumotlarni SQLite orqali o'qish/yozish
// =====================================================

const { DEFAULT_SETTINGS } = require('../constants');
const db = require('./db');

function parseBooking(row) {
  let details = {};
  try {
    details = row.details ? JSON.parse(row.details) : {};
  } catch {
    details = {};
  }

  return {
    bookingId: String(row.id),
    chatId: String(row.user_id),
    fullname: details.fullname || '',
    phone: details.phone || '',
    date: details.date || '',
    time: details.time || '',
    service: details.service || '',
    duration: Number(details.duration) || DEFAULT_SETTINGS.defaultDuration,
  };
}

// -------- USERS --------

/**
 * Barcha foydalanuvchilarni o'qish
 * @returns {Promise<{ chatId, fullname, phone }[]>}
 */
async function readUsers() {
  const rows = await db.all('SELECT user_id, full_name, contact FROM users ORDER BY user_id');
  return rows.map(row => ({
    chatId: String(row.user_id),
    fullname: row.full_name || '',
    phone: row.contact || '',
  }));
}

/**
 * ID bo'yicha foydalanuvchi topish
 * @param {string|number} chatId
 * @returns {Promise<object|null>}
 */
async function findUser(chatId) {
  const row = await db.get(
    'SELECT user_id, full_name, contact FROM users WHERE user_id = ?',
    [Number(chatId)]
  );
  if (!row) return null;
  return {
    chatId: String(row.user_id),
    fullname: row.full_name || '',
    phone: row.contact || '',
  };
}

/**
 * Yangi foydalanuvchi qo'shish
 * @param {string|number} chatId
 * @param {string} fullname
 * @param {string} phone
 */
async function saveUser(chatId, fullname, phone) {
  await db.run(
    `INSERT INTO users (user_id, full_name, contact)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       full_name = excluded.full_name,
       contact = excluded.contact`,
    [Number(chatId), fullname, phone]
  );
}

// -------- BOOKINGS --------

/**
 * Barcha bronlarni o'qish
 * @returns {Promise<object[]>}
 */
async function readBookings() {
  const rows = await db.all('SELECT id, user_id, details FROM bookings ORDER BY id');
  return rows.map(parseBooking);
}

/**
 * Yangi bron yozish
 * @param {object} booking
 */
async function saveBooking(booking) {
  const { bookingId, chatId, fullname, phone, date, time, service, duration } = booking;
  const details = JSON.stringify({ fullname, phone, date, time, service, duration: Number(duration) });

  if (bookingId) {
    await db.run(
      'INSERT INTO bookings (id, user_id, details) VALUES (?, ?, ?)',
      [Number(bookingId), Number(chatId), details]
    );
    return String(bookingId);
  }

  const result = await db.run(
    'INSERT INTO bookings (user_id, details) VALUES (?, ?)',
    [Number(chatId), details]
  );
  return String(result.lastID);
}

/**
 * Bron ID generatsiya qilish
 * @returns {Promise<string>}
 */
async function generateBookingId() {
  const row = await db.get('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM bookings');
  return String(row.nextId);
}

/**
 * Bronni o'chirish
 * @param {string} bookingId
 */
async function deleteBooking(bookingId) {
  await db.run('DELETE FROM bookings WHERE id = ?', [Number(bookingId)]);
}

/**
 * Bir nechta bronni o'chirish
 * @param {string[]} ids
 */
async function deleteBookings(ids) {
  const cleanIds = ids.map(Number).filter(Number.isFinite);
  if (!cleanIds.length) return;

  const placeholders = cleanIds.map(() => '?').join(',');
  await db.run(`DELETE FROM bookings WHERE id IN (${placeholders})`, cleanIds);
}

// -------- SETTINGS --------

/**
 * Sozlamalarni o'qish
 * @returns {Promise<object>}
 */
async function readSettings() {
  const rows = await db.all('SELECT key, value FROM settings');
  const settings = { ...DEFAULT_SETTINGS };

  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }

  return settings;
}

/**
 * Sozlamalarni saqlash
 * @param {object} settings
 */
async function saveSettings(settings) {
  const merged = { ...DEFAULT_SETTINGS, ...settings };

  for (const [key, value] of Object.entries(merged)) {
    await db.run(
      `INSERT INTO settings (key, value)
       VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, JSON.stringify(value)]
    );
  }
}

// -------- HOLIDAYS --------

/**
 * Dam olish kunlarini o'qish
 * @returns {Promise<string[]>}
 */
async function readHolidays() {
  const rows = await db.all('SELECT holiday_date FROM holidays ORDER BY holiday_date');
  return rows.map(row => row.holiday_date);
}

/**
 * Dam olish kuni qo'shish
 * @param {string} dateStr - YYYY-MM-DD
 */
async function addHoliday(dateStr) {
  await db.run(
    'INSERT OR IGNORE INTO holidays (holiday_date) VALUES (?)',
    [dateStr]
  );
}

/**
 * Dam olish kunini o'chirish
 * @param {string} dateStr
 */
async function removeHoliday(dateStr) {
  await db.run('DELETE FROM holidays WHERE holiday_date = ?', [dateStr]);
}

module.exports = {
  readUsers, findUser, saveUser,
  readBookings, saveBooking, generateBookingId, deleteBooking, deleteBookings,
  readSettings, saveSettings,
  readHolidays, addHoliday, removeHoliday,
};
