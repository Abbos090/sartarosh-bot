// =====================================================
// handlers/admin.js — Admin panel va barcha sozlamalar
// =====================================================

const { STATES, CB, ADMIN_ID } = require("../constants");
const {
  readUsers,
  readBookings,
  deleteBooking,
  deleteBookings,
  addHoliday,
} = require("../utils/file");
const {
  getTodayBookings,
  getAllBookingsSorted,
  formatBooking,
} = require("../utils/booking");
const {
  updateWorkHours,
  addService,
  removeService,
  getServices,
} = require("../utils/settings");
const { getUpcomingDays, formatDateUz } = require("../utils/time");

// ===================== ADMIN MENUSI =====================

async function showAdminMenu(bot, chatId) {
  await bot.sendMessage(chatId, "🛠 *Admin panel*\n\nNimani qilmoqchisiz?", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📅 Bugungi navbatlar", callback_data: CB.ADMIN_TODAY }],
        [{ text: "📆 Barcha navbatlar", callback_data: CB.ADMIN_ALL }],
        [{ text: "👥 Mijozlar", callback_data: CB.ADMIN_USERS }],
        [{ text: "⛔ Dam olish kuni", callback_data: CB.ADMIN_HOLIDAY }],
        [{ text: "⚙️ Ish vaqtini sozlash", callback_data: CB.ADMIN_WORK }],
        [{ text: "✂️ Xizmatlarni sozlash", callback_data: CB.ADMIN_SERVICE }],
        [{ text: "✅ Navbat bajarildi", callback_data: CB.ADMIN_DONE }],
        [{ text: "🗑 Navbatni o'chirish", callback_data: CB.ADMIN_DELETE }],
        [{ text: "📢 Xabar yuborish", callback_data: CB.ADMIN_BROADCAST }],
      ],
    },
  });
}

async function showAdminKeyboard(bot, chatId) {
  await bot.sendMessage(chatId, "Admin menyu tugmasi tayyor.", {
    reply_markup: {
      keyboard: [["menyu"]],
      resize_keyboard: true,
    },
  });
}

// ===================== CALLBACK HANDLER =====================

async function handleAdminCallback(bot, query, stateMap) {
  const chatId = query.message.chat.id;
  const data = query.data;
  const sd = stateMap[chatId] || {};

  await bot.answerCallbackQuery(query.id);

  // ---------- BUGUNGI NAVBATLAR ----------
  if (data === CB.ADMIN_TODAY) {
    const list = await getTodayBookings();
    if (!list.length)
      return bot.sendMessage(chatId, "📭 Bugun hech qanday navbat yo'q.");
    const text = list
      .map((b) => formatBooking(b))
      .join("\n\n─────────────\n\n");
    await bot.sendMessage(
      chatId,
      `📅 *Bugungi navbatlar (${list.length} ta):*\n\n${text}`,
      {
        parse_mode: "Markdown",
      },
    );
    return;
  }

  // ---------- BARCHA NAVBATLAR ----------
  if (data === CB.ADMIN_ALL) {
    const list = await getAllBookingsSorted();
    if (!list.length)
      return bot.sendMessage(chatId, "📭 Hozircha hech qanday navbat yo'q.");
    const text = list
      .map((b) => formatBooking(b))
      .join("\n\n─────────────\n\n");
    await bot.sendMessage(
      chatId,
      `📆 *Barcha navbatlar (${list.length} ta):*\n\n${text}`,
      {
        parse_mode: "Markdown",
      },
    );
    return;
  }

  // ---------- MIJOZLAR ----------
  if (data === CB.ADMIN_USERS) {
    const users = await readUsers();
    if (!users.length)
      return bot.sendMessage(
        chatId,
        "📭 Hozircha ro'yxatdan o'tgan foydalanuvchi yo'q.",
      );
    const text = users
      .map(
        (u, i) =>
          `${i + 1}. 👤 *${u.fullname}*\n   📞 [+${u.phone}](tel:+${u.phone})`,
      )
      .join("\n\n");
    await bot.sendMessage(
      chatId,
      `👥 *Mijozlar (${users.length} ta):*\n\n${text}`,
      {
        parse_mode: "Markdown",
      },
    );
    return;
  }

  // ---------- DAM OLISH KUNI ----------
  if (data === CB.ADMIN_HOLIDAY) {
    const days = getUpcomingDays();
    if (!days.length)
      return bot.sendMessage(chatId, "❌ Tanlash uchun kunlar mavjud emas.");
    stateMap[chatId] = { ...sd, state: STATES.ADMIN_HOLIDAY_SELECT };
    const keyboard = days.map((d) => [
      { text: formatDateUz(d), callback_data: CB.HOL_DAY + d },
    ]);
    await bot.sendMessage(
      chatId,
      "⛔ Dam olish kuni sifatida qaysi kunni belgilash kerak?",
      {
        reply_markup: { inline_keyboard: keyboard },
      },
    );
    return;
  }

  // Holiday kuni tanlash
  if (data.startsWith(CB.HOL_DAY)) {
    const dateStr = data.slice(CB.HOL_DAY.length);
    const bookings = (await readBookings()).filter((b) => b.date === dateStr);

    await addHoliday(dateStr);

    for (const b of bookings) {
      try {
        await bot.sendMessage(
          b.chatId,
          `ℹ️ Hurmatli *${b.fullname}*,\n\n` +
            `Sartaroshxona *${dateStr}* kuni ishlamaydi.\n` +
            `Navbatingiz (⏰ ${b.time}) bekor qilindi.\n\nUzr!`,
          { parse_mode: "Markdown" },
        );
      } catch (e) {
        console.error(
          `Foydalanuvchiga xabar yuborishda xatolik (${b.chatId}):`,
          e.message,
        );
      }
    }

    if (bookings.length) await deleteBookings(bookings.map((b) => b.bookingId));

    stateMap[chatId] = { state: STATES.ADMIN_MENU };
    await bot.sendMessage(
      chatId,
      `✅ *${dateStr}* dam olish kuni sifatida belgilandi.\n` +
        `❌ ${bookings.length} ta navbat bekor qilindi va foydalanuvchilarga xabar yuborildi.`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  // ---------- ISH VAQTINI SOZLASH ----------
  if (data === CB.ADMIN_WORK) {
    const s = await require("../utils/file").readSettings();
    stateMap[chatId] = { ...sd, state: STATES.ADMIN_WORK_START };
    await bot.sendMessage(
      chatId,
      `⚙️ *Ish vaqtini sozlash*\n\nHozirgi vaqt: ${s.workStart} — ${s.workEnd}\n\nYangi *boshlanish* vaqtini kiriting:\n_(Masalan: 09:00)_`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  // ---------- XIZMATLARNI SOZLASH ----------
  if (data === CB.ADMIN_SERVICE) {
    await sendServiceMenu(bot, chatId, stateMap, query.message.message_id);
    return;
  }

  if (data.startsWith(CB.SVC_DEL)) {
    const idx = parseInt(data.slice(CB.SVC_DEL.length), 10);
    await removeService(idx);
    await bot.sendMessage(chatId, "✅ Xizmat o'chirildi.");
    await sendServiceMenu(bot, chatId, stateMap);
    return;
  }

  if (data === CB.SVC_ADD) {
    stateMap[chatId] = { ...sd, state: STATES.ADMIN_SERVICE_NAME };
    await bot.sendMessage(
      chatId,
      "✂️ Yangi xizmat nomini kiriting:\n_(Masalan: Soqol olish)_",
      { parse_mode: "Markdown" },
    );
    return;
  }

  // ---------- NAVBAT BAJARILDI ----------
  if (data === CB.ADMIN_DONE) {
    const list = await getAllBookingsSorted();
    if (!list.length)
      return bot.sendMessage(chatId, "📭 Hozircha hech qanday navbat yo'q.");
    stateMap[chatId] = { ...sd, state: STATES.ADMIN_DONE_SELECT };
    const keyboard = list.map((b) => [
      {
        text: `#${b.bookingId} | ${b.date} ${b.time} — ${b.fullname}`,
        callback_data: CB.DONE_BOOK + b.bookingId,
      },
    ]);
    await bot.sendMessage(chatId, "✅ Bajarilgan navbatni tanlang:", {
      reply_markup: { inline_keyboard: keyboard },
    });
    return;
  }

  if (data.startsWith(CB.DONE_BOOK)) {
    const bookingId = data.slice(CB.DONE_BOOK.length);
    await deleteBooking(bookingId);
    stateMap[chatId] = { state: STATES.ADMIN_MENU };
    await bot.sendMessage(
      chatId,
      `✅ Navbat #${bookingId} bajarildi va o'chirildi.`,
    );
    return;
  }

  // ---------- NAVBATNI O'CHIRISH (foydalanuvchiga xabar bilan) ----------
  if (data === CB.ADMIN_DELETE) {
    const list = await getAllBookingsSorted();
    if (!list.length)
      return bot.sendMessage(chatId, "📭 Hozircha hech qanday navbat yo'q.");
    stateMap[chatId] = { ...sd, state: STATES.ADMIN_DELETE_SELECT };
    const keyboard = list.map((b) => [
      {
        text: `#${b.bookingId} | ${b.date} ${b.time} — ${b.fullname}`,
        callback_data: CB.DEL_BOOK + b.bookingId,
      },
    ]);
    await bot.sendMessage(chatId, "🗑 O'chirish uchun navbatni tanlang:", {
      reply_markup: { inline_keyboard: keyboard },
    });
    return;
  }

  if (data.startsWith(CB.DEL_BOOK)) {
    const bookingId = data.slice(CB.DEL_BOOK.length);
    const bookings = await readBookings();
    const booking = bookings.find((b) => b.bookingId === String(bookingId));

    if (booking) {
      // Foydalanuvchiga xabar yuborish
      try {
        await bot.sendMessage(
          booking.chatId,
          `ℹ️ Hurmatli *${booking.fullname}*,\n\n` +
            `Sizning *${booking.date}* kuni soat *${booking.time}* dagi navbatingiz admin tomonidan bekor qilindi.\n\n` +
            `Yangi navbat olish uchun /start ni bosing.`,
          { parse_mode: "Markdown" },
        );
      } catch (e) {
        console.error("Foydalanuvchiga xabar yuborishda xatolik:", e.message);
      }
      await deleteBooking(bookingId);
    }

    stateMap[chatId] = { state: STATES.ADMIN_MENU };
    await bot.sendMessage(
      chatId,
      `✅ Navbat #${bookingId} o'chirildi va foydalanuvchiga xabar yuborildi.`,
    );
    return;
  }

  // ---------- BROADCAST ----------
  if (data === CB.ADMIN_BROADCAST) {
    stateMap[chatId] = { state: STATES.ADMIN_BROADCAST };
    await bot.sendMessage(
      chatId,
      "📢 Barcha foydalanuvchilarga yuboriladigan xabarni kiriting:",
    );
    return;
  }
}

// ===================== MATN HANDLER =====================

async function handleAdminMessage(bot, msg, stateMap) {
  const chatId = msg.chat.id;
  const text = msg.text?.trim() || "";
  const sd = stateMap[chatId] || {};

  if (sd.state === STATES.ADMIN_WORK_START) {
    if (!isValidTime(text))
      return bot.sendMessage(
        chatId,
        "⚠️ Noto'g'ri format. HH:MM kiriting (masalan: 09:00)",
      );
    stateMap[chatId] = { ...sd, state: STATES.ADMIN_WORK_END, workStart: text };
    await bot.sendMessage(
      chatId,
      `✅ Boshlanish: *${text}*\n\nEndi *tugash* vaqtini kiriting:\n_(Masalan: 22:00 yoki 00:00)_`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  if (sd.state === STATES.ADMIN_WORK_END) {
    if (!isValidTime(text))
      return bot.sendMessage(chatId, "⚠️ Noto'g'ri format. HH:MM kiriting.");
    await updateWorkHours(sd.workStart, text);
    stateMap[chatId] = { state: STATES.ADMIN_MENU };
    await bot.sendMessage(
      chatId,
      `✅ Ish vaqti yangilandi:\n⏰ *${sd.workStart}* — *${text}*`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  if (sd.state === STATES.ADMIN_SERVICE_NAME) {
    stateMap[chatId] = {
      ...sd,
      state: STATES.ADMIN_SERVICE_DUR,
      serviceName: text,
    };
    await bot.sendMessage(
      chatId,
      `✅ Nom: *${text}*\n\nDavomiyligini daqiqada kiriting:\n_(Masalan: 30)_`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  if (sd.state === STATES.ADMIN_SERVICE_DUR) {
    const dur = parseInt(text, 10);
    if (isNaN(dur) || dur <= 0)
      return bot.sendMessage(
        chatId,
        "⚠️ To'g'ri daqiqa kiriting (masalan: 30)",
      );
    await addService(sd.serviceName, dur);
    stateMap[chatId] = { state: STATES.ADMIN_MENU };
    await bot.sendMessage(
      chatId,
      `✅ Yangi xizmat qo'shildi:\n✂️ *${sd.serviceName}* — ${dur} daqiqa`,
      { parse_mode: "Markdown" },
    );
    await sendServiceMenu(bot, chatId, stateMap);
    return;
  }

  if (sd.state === STATES.ADMIN_BROADCAST) {
    const users = await readUsers();
    let success = 0,
      failed = 0;
    for (const u of users) {
      try {
        await bot.sendMessage(u.chatId, `📢 *Sartaroshxona:*\n\n${text}`, {
          parse_mode: "Markdown",
        });
        success++;
      } catch (e) {
        failed++;
      }
    }
    stateMap[chatId] = { state: STATES.ADMIN_MENU };
    await bot.sendMessage(
      chatId,
      `📢 Xabar yuborildi:\n✅ ${success} ta muvaffaqiyatli\n❌ ${failed} ta xatolik`,
    );
    return;
  }
}

// ===================== YORDAMCHI FUNKSIYALAR =====================

async function sendServiceMenu(bot, chatId, stateMap, messageId = null) {
  const services = await getServices();
  stateMap[chatId] = { state: STATES.ADMIN_SERVICE_MENU };

  let text = "✂️ *Xizmatlar ro'yxati:*\n\n";
  const keyboard = [];

  services.forEach((s, i) => {
    text += `${i + 1}. ${s.name} — ${s.duration} daqiqa\n`;
    keyboard.push([{ text: `🗑 ${s.name}`, callback_data: CB.SVC_DEL + i }]);
  });

  keyboard.push([
    { text: "➕ Yangi xizmat qo'shish", callback_data: CB.SVC_ADD },
  ]);
  text += "\nO'chirish uchun xizmat tugmasini bosing:";

  const opts = {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard },
  };

  if (messageId) {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      ...opts,
    });
  } else {
    await bot.sendMessage(chatId, text, opts);
  }
}

function isValidTime(str) {
  return /^\d{2}:\d{2}$/.test(str);
}

async function handleAdminStart(bot, msg, stateMap) {
  const chatId = msg.chat.id;
  stateMap[chatId] = { state: STATES.ADMIN_MENU };
  await showAdminKeyboard(bot, chatId);
  await showAdminMenu(bot, chatId);
}

module.exports = {
  handleAdminStart,
  handleAdminCallback,
  handleAdminMessage,
  showAdminMenu,
};
