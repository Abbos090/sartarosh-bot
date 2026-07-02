// =====================================================
// utils/db.js - SQLite ulanishi, jadvallar va migratsiya
// =====================================================

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { DEFAULT_SETTINGS, PATHS } = require('../constants');

const DB_PATH = process.env.BOT_DB_PATH ||
  (process.env.NODE_ENV === 'production'
    ? '/data/bot.db'
    : path.join(__dirname, '..', 'bot.db'));

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new sqlite3.Database(DB_PATH);

function runRaw(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getRaw(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allRaw(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function readTxtLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

function readTxtJSON(filePath, defaultVal) {
  if (!fs.existsSync(filePath)) return defaultVal;
  try {
    const content = fs.readFileSync(filePath, 'utf8').trim();
    return content ? JSON.parse(content) : defaultVal;
  } catch {
    return defaultVal;
  }
}

async function createTables() {
  await runRaw(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY,
      full_name TEXT,
      contact TEXT
    )
  `);

  await runRaw(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      details TEXT
    )
  `);

  await runRaw(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT UNIQUE,
      value TEXT
    )
  `);

  await runRaw(`
    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      holiday_date TEXT UNIQUE
    )
  `);
}

async function migrateUsers() {
  const count = await getRaw('SELECT COUNT(*) AS count FROM users');
  if (count.count > 0) return;

  for (const line of readTxtLines(PATHS.USERS)) {
    const [chatId, fullname, phone] = line.split('|');
    if (!chatId) continue;
    await runRaw(
      'INSERT OR IGNORE INTO users (user_id, full_name, contact) VALUES (?, ?, ?)',
      [Number(chatId), fullname || '', phone || '']
    );
  }
}

async function migrateBookings() {
  const count = await getRaw('SELECT COUNT(*) AS count FROM bookings');
  if (count.count > 0) return;

  for (const line of readTxtLines(PATHS.BOOKINGS)) {
    const [bookingId, chatId, fullname, phone, date, time, service, duration] = line.split('|');
    if (!bookingId || !chatId) continue;

    const details = JSON.stringify({
      fullname: fullname || '',
      phone: phone || '',
      date: date || '',
      time: time || '',
      service: service || '',
      duration: Number(duration) || DEFAULT_SETTINGS.defaultDuration,
    });

    await runRaw(
      'INSERT OR IGNORE INTO bookings (id, user_id, details) VALUES (?, ?, ?)',
      [Number(bookingId), Number(chatId), details]
    );
  }
}

async function migrateSettings() {
  const count = await getRaw('SELECT COUNT(*) AS count FROM settings');
  if (count.count > 0) return;

  const settings = readTxtJSON(PATHS.SETTINGS, DEFAULT_SETTINGS);
  const merged = { ...DEFAULT_SETTINGS, ...settings };

  for (const [key, value] of Object.entries(merged)) {
    await runRaw(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, JSON.stringify(value)]
    );
  }
}

async function migrateHolidays() {
  const count = await getRaw('SELECT COUNT(*) AS count FROM holidays');
  if (count.count > 0) return;

  for (const dateStr of readTxtLines(PATHS.HOLIDAYS)) {
    await runRaw(
      'INSERT OR IGNORE INTO holidays (holiday_date) VALUES (?)',
      [dateStr]
    );
  }
}

async function initDatabase() {
  await createTables();
  await migrateUsers();
  await migrateBookings();
  await migrateSettings();
  await migrateHolidays();
}

const ready = initDatabase();

async function run(sql, params = []) {
  await ready;
  return runRaw(sql, params);
}

async function get(sql, params = []) {
  await ready;
  return getRaw(sql, params);
}

async function all(sql, params = []) {
  await ready;
  return allRaw(sql, params);
}

module.exports = {
  DB_PATH,
  ready,
  run,
  get,
  all,
};
