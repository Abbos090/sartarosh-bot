// =====================================================
// utils/booking.js — Bron hisoblash va bo'sh vaqtlar
// =====================================================

const { readBookings, readSettings } = require('./file');
const {
  timeToMinutes,
  minutesToTime,
  generateTimeSlots,
  roundUpToNextInterval,
  todayStr,
  nowMinutes,
} = require('./time');

/**
 * Ikki interval kesishadimi tekshirish (overlap)
 * [aStart, aEnd) va [bStart, bEnd)
 * @param {number} aStart
 * @param {number} aEnd
 * @param {number} bStart
 * @param {number} bEnd
 * @returns {boolean}
 */
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Berilgan sana va duration uchun bo'sh vaqtlarni hisoblash
 * @param {string} dateStr   — YYYY-MM-DD
 * @param {number} duration  — daqiqalarda
 * @returns {string[]}       — bo'sh vaqtlar ["18:00", "18:30", ...]
 */
async function getAvailableSlots(dateStr, duration) {
  const settings = await readSettings();
  const allSlots = generateTimeSlots(settings.workStart, settings.workEnd);
  const bookings = (await readBookings()).filter(b => b.date === dateStr);

  // Bugungi kun uchun o'tgan vaqtlarni filterlash
  let minMinutes = 0;
  if (dateStr === todayStr()) {
    minMinutes = roundUpToNextInterval(nowMinutes());
  }

  const workEndMinutes = settings.workEnd === '00:00'
    ? 24 * 60
    : timeToMinutes(settings.workEnd);

  const available = allSlots.filter(slot => {
    const slotStart = timeToMinutes(slot);
    const slotEnd   = slotStart + duration;

    // O'tgan vaqtlar chiqmasin
    if (dateStr === todayStr() && slotStart < minMinutes) return false;

    // Ish vaqtidan chiqmasin
    if (slotEnd > workEndMinutes) return false;

    // Mavjud bronlar bilan overlap tekshirish
    for (const b of bookings) {
      const bStart = timeToMinutes(b.time);
      const bEnd   = bStart + b.duration;
      if (overlaps(slotStart, slotEnd, bStart, bEnd)) return false;
    }

    return true;
  });

  return available;
}

/**
 * Berilgan vaqt hali ham bo'sh ekanligini tekshirish (ikki kishi bir vaqtda bosishi holati)
 * @param {string} dateStr
 * @param {string} timeStr
 * @param {number} duration
 * @returns {boolean}
 */
async function isSlotAvailable(dateStr, timeStr, duration) {
  const available = await getAvailableSlots(dateStr, duration);
  return available.includes(timeStr);
}

/**
 * Foydalanuvchining hali tugamagan aktiv broni bor-yo'qligini tekshirish
 * @param {string|number} chatId
 * @returns {object|null}
 */
async function getActiveBooking(chatId) {
  const now     = new Date();
  const bookings = (await readBookings()).filter(b => b.chatId === String(chatId));

  for (const b of bookings) {
    const bookingEnd = new Date(`${b.date}T${b.time}:00`);
    bookingEnd.setMinutes(bookingEnd.getMinutes() + b.duration);
    if (bookingEnd > now) return b;
  }
  return null;
}

/**
 * Bugungi navbatlarni vaqt bo'yicha tartiblangan holda qaytarish
 * @returns {object[]}
 */
async function getTodayBookings() {
  const today = todayStr();
  return (await readBookings())
    .filter(b => b.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * Barcha navbatlarni sana keyin vaqt bo'yicha tartiblash
 * @returns {object[]}
 */
async function getAllBookingsSorted() {
  return (await readBookings()).sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    return d !== 0 ? d : a.time.localeCompare(b.time);
  });
}

/**
 * Bron ma'lumotini chiroyli matn ko'rinishida qaytarish
 * @param {object} b — booking obyekti
 * @returns {string}
 */
function formatBooking(b) {
  return (
    `👤 *${b.fullname}*\n` +
    `📞 ${b.phone}\n` +
    `📅 ${b.date} — ⏰ ${b.time}\n` +
    `✂️ ${b.service} (${b.duration} daq)\n` +
    `🆔 Bron #${b.bookingId}`
  );
}

module.exports = {
  getAvailableSlots,
  isSlotAvailable,
  getActiveBooking,
  getTodayBookings,
  getAllBookingsSorted,
  formatBooking,
};
