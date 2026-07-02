// =====================================================
// utils/calendar.js — Kun tanlash va holidaylar
// =====================================================

const { readHolidays } = require('./file');
const { getUpcomingDays, formatDateUz } = require('./time');
const { CB } = require('../constants');

/**
 * Keyingi 3 kunni qaytarish (holidaylar olib tashlangan)
 * @returns {string[]} — mavjud kunlar YYYY-MM-DD massiv
 */
async function getAvailableDays() {
  const holidays  = await readHolidays();
  const upcoming  = getUpcomingDays();
  return upcoming.filter(d => !holidays.includes(d));
}

/**
 * Kun tanlash inline keyboard yaratish
 * @returns {object[][]|null} — InlineKeyboard yoki null (hech kun yo'q)
 */
async function buildDayKeyboard() {
  const days = await getAvailableDays();
  if (!days.length) return null;

  const rows = days.map(d => [
    { text: formatDateUz(d), callback_data: CB.DAY + d }
  ]);
  rows.push([{ text: 'Orqaga', callback_data: CB.USER_BACK }]);
  return rows;
}

/**
 * Vaqt tanlash inline keyboard yaratish (qatorlarga bo'lingan)
 * @param {string[]} slots — ["18:00", "18:15", ...]
 * @returns {object[][]}
 */
function buildTimeKeyboard(slots) {
  const ROW_SIZE = 4;
  const rows = [];
  for (let i = 0; i < slots.length; i += ROW_SIZE) {
    rows.push(
      slots.slice(i, i + ROW_SIZE).map(t => ({
        text: t,
        callback_data: CB.TIME + t,
      }))
    );
  }
  rows.push([{ text: 'Orqaga', callback_data: CB.USER_BACK }]);
  return rows;
}

/**
 * Xizmat tanlash inline keyboard yaratish
 * @param {object[]} services — [{ name, duration }, ...]
 * @returns {object[][]}
 */
function buildServiceKeyboard(services) {
  const rows = services.map((s, i) => [
    { text: `✂️ ${s.name} (${s.duration} daq)`, callback_data: CB.SERVICE + i }
  ]);
  // O'tkazib yuborish tugmasi
  rows.push([{ text: "⏭ O'tkazib yuborish", callback_data: CB.SERVICE + 'skip' }]);
  return rows;
}

module.exports = {
  getAvailableDays,
  buildDayKeyboard,
  buildTimeKeyboard,
  buildServiceKeyboard,
};
