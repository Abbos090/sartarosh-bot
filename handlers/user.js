// =====================================================
// handlers/user.js — Foydalanuvchi xabarlari va bronlash
// =====================================================

const { STATES, CB, ADMIN_ID, CANCEL_NOTIFY_MINUTES } = require('../constants');
const { findUser, saveUser, saveBooking, deleteBooking } = require('../utils/file');
const { getActiveBooking, isSlotAvailable, formatBooking } = require('../utils/booking');
const { buildDayKeyboard, buildTimeKeyboard, buildServiceKeyboard } = require('../utils/calendar');
const { getServices, getDefaultDuration } = require('../utils/settings');
const { minutesUntil } = require('../utils/time');

/**
 * Asosiy foydalanuvchi menyusini ko'rsatish
 * @param {object} bot
 * @param {number} chatId
 */
async function showUserMenu(bot, chatId) {
  await bot.sendMessage(chatId,
    '👋 Assalomu alaykum! Sartaroshxonaga xush kelibsiz.\n\nQuyidagi amallardan birini tanlang:',
    {
      reply_markup: {
        keyboard: [
          [{ text: '📅 Navbat olish' }],
          [{ text: '❌ Navbatni bekor qilish' }],
        ],
        resize_keyboard: true,
      },
    }
  );
}

/**
 * Registratsiyani boshlash — ism so'rash
 * @param {object} bot
 * @param {number} chatId
 * @param {object} stateMap
 */
async function startRegistration(bot, chatId, stateMap) {
  stateMap[chatId] = { state: STATES.WAIT_NAME };
  await bot.sendMessage(chatId,
    '📝 Ro\'yxatdan o\'tish\n\nIsmingiz va familiyangizni kiriting:\n_(Masalan: Ali Valiyev)_',
    {
      parse_mode: 'Markdown',
      reply_markup: { remove_keyboard: true },
    }
  );
}

/**
 * /start buyrug'ini qayta ishlash
 * @param {object} bot
 * @param {object} msg
 * @param {object} stateMap
 */
async function handleStart(bot, msg, stateMap) {
  const chatId = msg.chat.id;
  const user   = await findUser(chatId);

  if (user) {
    stateMap[chatId] = { state: STATES.IDLE };
    await showUserMenu(bot, chatId);
  } else {
    await startRegistration(bot, chatId, stateMap);
  }
}

/**
 * Matn xabarlarini qayta ishlash (state machine)
 * @param {object} bot
 * @param {object} msg
 * @param {object} stateMap
 */
async function handleMessage(bot, msg, stateMap) {
  const chatId = msg.chat.id;
  const text   = msg.text || '';
  const sd     = stateMap[chatId] || { state: STATES.IDLE };

  // --- ISM KUTILMOQDA ---
  if (sd.state === STATES.WAIT_NAME) {
    if (!text.trim()) {
      return bot.sendMessage(chatId, '⚠️ Iltimos, ism familiyangizni kiriting.');
    }
    stateMap[chatId] = { state: STATES.WAIT_PHONE, fullname: text.trim() };

    await bot.sendMessage(chatId,
      '📱 Telefon raqamingizni yuboring.\n\nPastdagi tugmani bosing 👇',
      {
        reply_markup: {
          keyboard: [[{ text: '📱 Raqamni yuborish', request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
    return;
  }

  // --- TELEFON KUTILMOQDA (matn yozgan bo'lsa) ---
  if (sd.state === STATES.WAIT_PHONE) {
    await bot.sendMessage(chatId,
      '⛔ Iltimos, telefon raqamingizni faqat tugma orqali yuboring.',
      {
        reply_markup: {
          keyboard: [[{ text: '📱 Raqamni yuborish', request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
    return;
  }

  // --- ASOSIY MENU ---
  if (sd.state === STATES.IDLE) {
    if (text === '📅 Navbat olish')          return handleBookingStart(bot, chatId, stateMap);
    if (text === '❌ Navbatni bekor qilish')  return handleCancelStart(bot, chatId, stateMap);
    await showUserMenu(bot, chatId);
  }
}

/**
 * Contact (telefon) xabarini qayta ishlash
 * @param {object} bot
 * @param {object} msg
 * @param {object} stateMap
 */
async function handleContact(bot, msg, stateMap) {
  const chatId  = msg.chat.id;
  const sd      = stateMap[chatId] || {};

  if (sd.state !== STATES.WAIT_PHONE) return;

  const phone    = msg.contact.phone_number.replace(/\D/g, '');
  const fullname = sd.fullname || msg.chat.first_name || 'Noma\'lum';

  await saveUser(chatId, fullname, phone);
  stateMap[chatId] = { state: STATES.IDLE };

  await bot.sendMessage(chatId,
    `✅ Ro'yxatdan muvaffaqiyatli o'tdingiz!\n\n👤 *${fullname}*\n📞 ${phone}`,
    { parse_mode: 'Markdown' }
  );
  await showUserMenu(bot, chatId);
}

/**
 * Navbat olishni boshlash
 */
async function handleBookingStart(bot, chatId, stateMap) {
  // Aktiv bronni tekshirish
  const active = await getActiveBooking(chatId);
  if (active) {
    return bot.sendMessage(chatId,
      `⚠️ Sizda allaqachon aktiv navbat mavjud:\n\n${formatBooking(active)}\n\nYangi navbat olish uchun avval mavjud navbatingizni bekor qiling.`,
      { parse_mode: 'Markdown' }
    );
  }

  // Xizmat tanlash
  const services = await getServices();
  const keyboard = buildServiceKeyboard(services);

  stateMap[chatId] = { state: STATES.SELECT_SERVICE };
  await bot.sendMessage(chatId,
    '✂️ Xizmat turini tanlang:',
    { reply_markup: { inline_keyboard: keyboard } }
  );
}

/**
 * Navbatni bekor qilishni boshlash
 */
async function handleCancelStart(bot, chatId, stateMap) {
  const booking = await getActiveBooking(chatId);
  if (!booking) {
    return bot.sendMessage(chatId, '📭 Sizda aktiv navbat mavjud emas.');
  }

  stateMap[chatId] = { state: STATES.CANCEL_CONFIRM, bookingId: booking.bookingId };
  await bot.sendMessage(chatId,
    `❓ Quyidagi navbatni bekor qilishni tasdiqlaysizmi?\n\n${formatBooking(booking)}`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Ha, bekor qilish', callback_data: CB.CANCEL_YES },
          { text: '🔙 Yo\'q',            callback_data: CB.CANCEL_NO  },
        ]],
      },
    }
  );
}

/**
 * Inline callback so'rovlarini qayta ishlash
 * @param {object} bot
 * @param {object} query
 * @param {object} stateMap
 */
async function handleCallback(bot, query, stateMap) {
  const chatId = query.message.chat.id;
  const data   = query.data;
  const sd     = stateMap[chatId] || {};

  await bot.answerCallbackQuery(query.id);

  // --- XIZMAT TANLASH ---
  if (data.startsWith(CB.SERVICE)) {
    const val      = data.slice(CB.SERVICE.length);
    const services = await getServices();
    let service, duration;

    if (val === 'skip') {
      service  = null;
      duration = await getDefaultDuration();
    } else {
      const idx = parseInt(val, 10);
      service   = services[idx]?.name || null;
      duration  = services[idx]?.duration || (await getDefaultDuration());
    }

    stateMap[chatId] = { state: STATES.SELECT_DAY, service, duration };

    // Kun tanlash
    const keyboard = await buildDayKeyboard();
    if (!keyboard) {
      return bot.sendMessage(chatId,
        '😔 Hozircha barcha kunlar dam olish kuni.\n\nKeyinroq urinib ko\'ring.'
      );
    }

    await bot.editMessageText('📅 Qaysi kuni kelasiz?', {
      chat_id:      chatId,
      message_id:   query.message.message_id,
      reply_markup: { inline_keyboard: keyboard },
    });
    return;
  }

  // --- KUN TANLASH ---
  if (data.startsWith(CB.DAY) && sd.state === STATES.SELECT_DAY) {
    const dateStr = data.slice(CB.DAY.length);
    const slots   = await require('../utils/booking').getAvailableSlots(dateStr, sd.duration);

    if (!slots.length) {
      return bot.editMessageText(
        '😔 Bu kuni bo\'sh vaqt qolmagan.\n\nBoshqa kun tanlang yoki keyinroq urinib ko\'ring.',
        { chat_id: chatId, message_id: query.message.message_id }
      );
    }

    stateMap[chatId] = { ...sd, state: STATES.SELECT_TIME, date: dateStr };
    const keyboard   = buildTimeKeyboard(slots);

    await bot.editMessageText(`⏰ Vaqt tanlang (${dateStr}):`, {
      chat_id:      chatId,
      message_id:   query.message.message_id,
      reply_markup: { inline_keyboard: keyboard },
    });
    return;
  }

  // --- VAQT TANLASH ---
  if (data.startsWith(CB.TIME) && sd.state === STATES.SELECT_TIME) {
    const timeStr = data.slice(CB.TIME.length);

    stateMap[chatId] = { ...sd, state: STATES.CONFIRM_BOOKING, time: timeStr };

    const svcText = sd.service || `(Standart — ${sd.duration} daqiqa)`;
    const confirm =
      `📋 *Navbat ma'lumotlari*\n\n` +
      `✂️ Xizmat: ${svcText}\n` +
      `📅 Sana: ${sd.date}\n` +
      `⏰ Vaqt: ${timeStr}\n` +
      `🕐 Davomiyligi: ${sd.duration} daqiqa\n\n` +
      `Tasdiqlaysizmi?`;

    await bot.editMessageText(confirm, {
      chat_id:      chatId,
      message_id:   query.message.message_id,
      parse_mode:   'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Tasdiqlash', callback_data: CB.CONFIRM_YES },
          { text: '❌ Bekor qilish', callback_data: CB.CONFIRM_NO },
        ]],
      },
    });
    return;
  }

  // --- BRON TASDIQLASH ---
  if (data === CB.CONFIRM_YES && sd.state === STATES.CONFIRM_BOOKING) {
    // Oxirgi tekshiruv — ikki user bir vaqtda bosishi holati
    const still = await isSlotAvailable(sd.date, sd.time, sd.duration);
    if (!still) {
      stateMap[chatId] = { state: STATES.IDLE };
      await bot.editMessageText(
        '😔 Uzr, bu vaqt hozir band bo\'lib qoldi.\n\nIltimos, boshqa vaqt tanlang.',
        { chat_id: chatId, message_id: query.message.message_id }
      );
      await handleBookingStart(bot, chatId, stateMap);
      return;
    }

    const user    = await findUser(chatId);
    const svcName = sd.service || 'Standart';

    const bookingId = await saveBooking({
      chatId:   String(chatId),
      fullname: user?.fullname || 'Noma\'lum',
      phone:    user?.phone    || '—',
      date:     sd.date,
      time:     sd.time,
      service:  svcName,
      duration: sd.duration,
    });

    stateMap[chatId] = { state: STATES.IDLE };

    await bot.editMessageText(
      `✅ *Navbatingiz qabul qilindi!*\n\n` +
      `✂️ ${svcName}\n📅 ${sd.date} — ⏰ ${sd.time}\n🕐 ${sd.duration} daqiqa\n🆔 Bron #${bookingId}`,
      { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown' }
    );
    await showUserMenu(bot, chatId);
    return;
  }

  // --- BRON RAD ETISH ---
  if (data === CB.CONFIRM_NO && sd.state === STATES.CONFIRM_BOOKING) {
    stateMap[chatId] = { state: STATES.IDLE };
    await bot.editMessageText('❌ Navbat bekor qilindi.', {
      chat_id:    chatId,
      message_id: query.message.message_id,
    });
    await showUserMenu(bot, chatId);
    return;
  }

  // --- BEKOR QILISHNI TASDIQLASH ---
  if (data === CB.CANCEL_YES && sd.state === STATES.CANCEL_CONFIRM) {
    const bookingId = sd.bookingId;
    const bookings  = await require('../utils/file').readBookings();
    const booking   = bookings.find(b => b.bookingId === String(bookingId));

    if (booking) {
      const minsLeft = minutesUntil(booking.date, booking.time);
      if (minsLeft <= CANCEL_NOTIFY_MINUTES) {
        // Admin ga xabar yuborish
        const adminMsg =
          `⚠️ *So'nggi daqiqada bekor qilish!*\n\n` +
          `👤 ${booking.fullname}\n` +
          `📞 ${booking.phone}\n` +
          `📅 ${booking.date}\n` +
          `⏰ ${booking.time}\n` +
          `✂️ ${booking.service}`;
        try {
          await bot.sendMessage(ADMIN_ID, adminMsg, { parse_mode: 'Markdown' });
        } catch (e) {
          console.error('Admin ga xabar yuborishda xatolik:', e.message);
        }
      }
      await deleteBooking(bookingId);
    }

    stateMap[chatId] = { state: STATES.IDLE };
    await bot.editMessageText('✅ Navbatingiz bekor qilindi.', {
      chat_id:    chatId,
      message_id: query.message.message_id,
    });
    await showUserMenu(bot, chatId);
    return;
  }

  // --- BEKOR QILISHDAN VOZ KECHISH ---
  if (data === CB.CANCEL_NO) {
    stateMap[chatId] = { state: STATES.IDLE };
    await bot.editMessageText('🔙 Bekor qilish to\'xtatildi.', {
      chat_id:    chatId,
      message_id: query.message.message_id,
    });
    await showUserMenu(bot, chatId);
  }
}

module.exports = {
  handleStart,
  handleMessage,
  handleContact,
  handleCallback,
  showUserMenu,
};
