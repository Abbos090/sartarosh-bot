// =====================================================
// utils/settings.js — Sozlamalar bilan ishlash
// =====================================================

const { readSettings, saveSettings } = require('./file');

/**
 * Ish vaqtini yangilash
 * @param {string} workStart — "HH:MM"
 * @param {string} workEnd   — "HH:MM"
 */
async function updateWorkHours(workStart, workEnd) {
  const s = readSettings();
  s.workStart = workStart;
  s.workEnd   = workEnd;
  await saveSettings(s);
}

/**
 * Xizmat qo'shish
 * @param {string} name
 * @param {number} duration
 */
async function addService(name, duration) {
  const s = readSettings();
  s.services.push({ name, duration: Number(duration) });
  await saveSettings(s);
}

/**
 * Xizmatni o'chirish (indeks bo'yicha)
 * @param {number} index
 */
async function removeService(index) {
  const s = readSettings();
  s.services.splice(index, 1);
  await saveSettings(s);
}

/**
 * Barcha xizmatlarni qaytarish
 * @returns {{ name: string, duration: number }[]}
 */
function getServices() {
  return readSettings().services;
}

/**
 * Default duration olish
 * @returns {number}
 */
function getDefaultDuration() {
  return readSettings().defaultDuration;
}

module.exports = {
  updateWorkHours,
  addService,
  removeService,
  getServices,
  getDefaultDuration,
};
