// =====================================================
// utils/file.js — Fayl o'qish/yozish va lock mexanizmi
// =====================================================

const fs   = require('fs');
const path = require('path');
const { PATHS } = require('../constants');

// Oddiy in-memory lock (process ichida)
const locks = {};

/**
 * Fayl lock olish — boshqa yozuv kutadi
 * @param {string} filePath
 * @returns {Promise<Function>} — unlock funksiyasi
 */
async function acquireLock(filePath) {
  while (locks[filePath]) {
    await new Promise(r => setTimeout(r, 20));
  }
  locks[filePath] = true;
  return () => { delete locks[filePath]; };
}

/**
 * Fayl mavjudligini tekshirish, yo'q bo'lsa yaratish
 * @param {string} filePath
 * @param {string} defaultContent
 */
function ensureFile(filePath, defaultContent = '') {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, defaultContent, 'utf8');
}

/**
 * Fayl satrlarini o'qish (bo'sh satrlar o'tkazib yuboriladi)
 * @param {string} filePath
 * @returns {string[]}
 */
function readLines(filePath) {
  ensureFile(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  return content.split('\n').map(l => l.trim()).filter(Boolean);
}

/**
 * Fayl satrlarini yozish (lock bilan)
 * @param {string} filePath
 * @param {string[]} lines
 */
async function writeLines(filePath, lines) {
  const unlock = await acquireLock(filePath);
  try {
    ensureFile(filePath);
    fs.writeFileSync(filePath, lines.join('\n') + (lines.length ? '\n' : ''), 'utf8');
  } finally {
    unlock();
  }
}

/**
 * Faylga bir satr qo'shish (lock bilan)
 * @param {string} filePath
 * @param {string} line
 */
async function appendLine(filePath, line) {
  const unlock = await acquireLock(filePath);
  try {
    ensureFile(filePath);
    fs.appendFileSync(filePath, line + '\n', 'utf8');
  } finally {
    unlock();
  }
}

/**
 * JSON faylini o'qish
 * @param {string} filePath
 * @param {object} defaultVal
 * @returns {object}
 */
function readJSON(filePath, defaultVal = {}) {
  ensureFile(filePath, JSON.stringify(defaultVal, null, 2));
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return defaultVal;
  }
}

/**
 * JSON faylini yozish (lock bilan)
 * @param {string} filePath
 * @param {object} data
 */
async function writeJSON(filePath, data) {
  const unlock = await acquireLock(filePath);
  try {
    ensureFile(filePath);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } finally {
    unlock();
  }
}

// -------- USERS --------

/**
 * Barcha foydalanuvchilarni o'qish
 * @returns {{ chatId, fullname, phone }[]}
 */
function readUsers() {
  return readLines(PATHS.USERS).map(line => {
    const [chatId, fullname, phone] = line.split('|');
    return { chatId, fullname, phone };
  });
}

/**
 * ID bo'yicha foydalanuvchi topish
 * @param {string|number} chatId
 * @returns {object|null}
 */
function findUser(chatId) {
  return readUsers().find(u => u.chatId === String(chatId)) || null;
}

/**
 * Yangi foydalanuvchi qo'shish
 * @param {string|number} chatId
 * @param {string} fullname
 * @param {string} phone
 */
async function saveUser(chatId, fullname, phone) {
  await appendLine(PATHS.USERS, `${chatId}|${fullname}|${phone}`);
}

// -------- BOOKINGS --------

/**
 * Barcha bronlarni o'qish
 * @returns {object[]}
 */
function readBookings() {
  return readLines(PATHS.BOOKINGS).map(line => {
    const [bookingId, chatId, fullname, phone, date, time, service, duration] = line.split('|');
    return { bookingId, chatId, fullname, phone, date, time, service, duration: Number(duration) };
  });
}

/**
 * Yangi bron yozish
 * @param {object} booking
 */
async function saveBooking(booking) {
  const { bookingId, chatId, fullname, phone, date, time, service, duration } = booking;
  await appendLine(PATHS.BOOKINGS, `${bookingId}|${chatId}|${fullname}|${phone}|${date}|${time}|${service}|${duration}`);
}

/**
 * Bron ID generatsiya qilish
 * @returns {string}
 */
function generateBookingId() {
  const all = readBookings();
  if (!all.length) return '1';
  const maxId = Math.max(...all.map(b => Number(b.bookingId) || 0));
  return String(maxId + 1);
}

/**
 * Bronni o'chirish
 * @param {string} bookingId
 */
async function deleteBooking(bookingId) {
  const all = readBookings().filter(b => b.bookingId !== String(bookingId));
  await writeLines(PATHS.BOOKINGS, all.map(b =>
    `${b.bookingId}|${b.chatId}|${b.fullname}|${b.phone}|${b.date}|${b.time}|${b.service}|${b.duration}`
  ));
}

/**
 * Bir nechta bronni o'chirish
 * @param {string[]} ids
 */
async function deleteBookings(ids) {
  const set = new Set(ids.map(String));
  const all = readBookings().filter(b => !set.has(b.bookingId));
  await writeLines(PATHS.BOOKINGS, all.map(b =>
    `${b.bookingId}|${b.chatId}|${b.fullname}|${b.phone}|${b.date}|${b.time}|${b.service}|${b.duration}`
  ));
}

// -------- SETTINGS --------

/**
 * Sozlamalarni o'qish
 * @returns {object}
 */
function readSettings() {
  const { DEFAULT_SETTINGS } = require('../constants');
  return readJSON(PATHS.SETTINGS, DEFAULT_SETTINGS);
}

/**
 * Sozlamalarni saqlash
 * @param {object} settings
 */
async function saveSettings(settings) {
  await writeJSON(PATHS.SETTINGS, settings);
}

// -------- HOLIDAYS --------

/**
 * Dam olish kunlarini o'qish
 * @returns {string[]}
 */
function readHolidays() {
  return readLines(PATHS.HOLIDAYS);
}

/**
 * Dam olish kuni qo'shish
 * @param {string} dateStr — YYYY-MM-DD
 */
async function addHoliday(dateStr) {
  const existing = readHolidays();
  if (!existing.includes(dateStr)) {
    await appendLine(PATHS.HOLIDAYS, dateStr);
  }
}

/**
 * Dam olish kunini o'chirish
 * @param {string} dateStr
 */
async function removeHoliday(dateStr) {
  const all = readHolidays().filter(d => d !== dateStr);
  await writeLines(PATHS.HOLIDAYS, all);
}

module.exports = {
  readUsers, findUser, saveUser,
  readBookings, saveBooking, generateBookingId, deleteBooking, deleteBookings,
  readSettings, saveSettings,
  readHolidays, addHoliday, removeHoliday,
};
