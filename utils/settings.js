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
  const s = await readSettings();
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
  const s = await readSettings();
  s.services.push({ name, duration: Number(duration) });
  await saveSettings(s);
}

/**
 * Xizmatni o'chirish (indeks bo'yicha)
 * @param {number} index
 */
async function removeService(index) {
  const s = await readSettings();
  s.services.splice(index, 1);
  await saveSettings(s);
}

/**
 * Barcha xizmatlarni qaytarish
 * @returns {{ name: string, duration: number }[]}
 */
async function getServices() {
  return (await readSettings()).services;
}

/**
 * Default duration olish
 * @returns {number}
 */
async function getDefaultDuration() {
  return (await readSettings()).defaultDuration;
}

module.exports = {
  updateWorkHours,
  addService,
  removeService,
  getServices,
  getDefaultDuration,
};
