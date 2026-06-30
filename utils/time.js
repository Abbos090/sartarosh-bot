// =====================================================
// utils/time.js — Vaqt hisoblash yordamchi funksiyalari
// =====================================================

const { TIME_INTERVAL_MINUTES, DAYS_AHEAD } = require('../constants');

/**
 * "HH:MM" formatidagi vaqtni daqiqaga aylantirish
 * @param {string} timeStr
 * @returns {number}
 */
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Daqiqani "HH:MM" formatiga aylantirish
 * @param {number} minutes
 * @returns {string}
 */
function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Ish vaqti oralig'ida barcha vaqt slotlarini generatsiya qilish
 * workEnd "00:00" bo'lsa — 1440 daqiqa (yarim tun) sifatida hisoblanadi
 * @param {string} workStart — "HH:MM"
 * @param {string} workEnd   — "HH:MM"
 * @returns {string[]}       — ["18:00", "18:15", ...]
 */
function generateTimeSlots(workStart, workEnd) {
  let start = timeToMinutes(workStart);
  let end   = workEnd === '00:00' ? 24 * 60 : timeToMinutes(workEnd);

  const slots = [];
  for (let t = start; t < end; t += TIME_INTERVAL_MINUTES) {
    slots.push(minutesToTime(t));
  }
  return slots;
}

/**
 * Hozirgi vaqtdan keyingi birinchi "to'liq" intervalga yaxlitlash
 * Masalan: 09:32 → 09:45 (15 daqiqalik interval uchun)
 * @param {number} nowMinutes
 * @returns {number}
 */
function roundUpToNextInterval(nowMinutes) {
  return Math.ceil((nowMinutes + 1) / TIME_INTERVAL_MINUTES) * TIME_INTERVAL_MINUTES;
}

/**
 * Bugungi sanani YYYY-MM-DD formatida qaytarish
 * @returns {string}
 */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * N kun keyingi sanani YYYY-MM-DD formatida qaytarish
 * @param {number} daysOffset
 * @returns {string}
 */
function dateOffset(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().slice(0, 10);
}

/**
 * Keyingi DAYS_AHEAD kunni qaytarish (bugun + ertaga + indinga)
 * @returns {string[]} — YYYY-MM-DD massiv
 */
function getUpcomingDays() {
  return Array.from({ length: DAYS_AHEAD }, (_, i) => dateOffset(i));
}

/**
 * Sanani o'zbek tilidagi chiroyli formatda ko'rsatish
 * @param {string} dateStr — YYYY-MM-DD
 * @returns {string}
 */
function formatDateUz(dateStr) {
  const today    = todayStr();
  const tomorrow = dateOffset(1);
  const dayAfter = dateOffset(2);

  if (dateStr === today)    return `📅 Bugun (${dateStr})`;
  if (dateStr === tomorrow) return `📅 Ertaga (${dateStr})`;
  if (dateStr === dayAfter) return `📅 Indinga (${dateStr})`;
  return `📅 ${dateStr}`;
}

/**
 * Bugungi kunning hozirgi daqiqasini qaytarish
 * @returns {number}
 */
function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Berilgan sana va vaqtgacha necha daqiqa qolganini hisoblash
 * @param {string} dateStr — YYYY-MM-DD
 * @param {string} timeStr — HH:MM
 * @returns {number} — daqiqalar (o'tgan bo'lsa manfiy)
 */
function minutesUntil(dateStr, timeStr) {
  const target = new Date(`${dateStr}T${timeStr}:00`);
  return Math.floor((target - Date.now()) / 60000);
}

module.exports = {
  timeToMinutes,
  minutesToTime,
  generateTimeSlots,
  roundUpToNextInterval,
  todayStr,
  dateOffset,
  getUpcomingDays,
  formatDateUz,
  nowMinutes,
  minutesUntil,
};
