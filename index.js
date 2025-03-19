require("dotenv").config();

const { Bot, InlineKeyboard, webhookCallback } = require("grammy");
const express = require("express");
const translations = require("./translations");

const { TELEGRAM_TOKEN, TELEGRAM_WEBHOOK_URL } = process.env;

const bot = new Bot(TELEGRAM_TOKEN);

const langMap = new Map();

function getLang(userId) {
  return langMap.get(userId) || "en";
}

async function selectLang(ctx) {
  const inlineKeyboard = new InlineKeyboard()
    .text(translations.en.language_select.value, "en")
    .text(translations.ru.language_select.value, "ru");

  const languageSelect = [
    translations.en.language_select.label,
    translations.ru.language_select.label,
  ].join(" | ");

  await ctx.reply(languageSelect, {
    reply_markup: inlineKeyboard,
  });
}

bot.command("start", async (ctx) => {
  const greeting = [
    translations.en.greeting,
    translations.ru.greeting,
  ].join(
    "\n"
  );

  await ctx.reply(greeting);

  await selectLang(ctx);
});

bot.command("setlang", async (ctx) => {
  await selectLang(ctx);
});

bot.command("joingame", async (ctx) => {
  await ctx.reply("joingame");
});

bot.command("mygames", async (ctx) => {
  await ctx.reply("mygames");
});

bot.on("callback_query:data", async (ctx) => {
  await ctx.answerCallbackQuery();

  const userId = ctx.from.id;
  const filter = ctx.callbackQuery.data;
  const lang = getLang(userId);

  const mainMenuKeyboard = new InlineKeyboard()
    .text(translations[lang].main_menu.join_game, "joingame")
    .text(translations[lang].main_menu.my_games, "mygames");

  if (filter === "en") {
    langMap.set(userId, "en");
    await ctx.reply(translations.en.getting_started, {
      reply_markup: mainMenuKeyboard,
    });
  } else if (filter === "ru") {
    langMap.set(userId, "ru");
    await ctx.reply(translations.ru.getting_started, {
      reply_markup: mainMenuKeyboard,
    });
  } else {
    await ctx.reply(filter);
  }
});

bot.on("message", async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text.trim();
  const lang = getLang(userId);

  await ctx.reply(`${userId} ${text} ${lang}`);
});

async function setupWebhook() {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook?url=${TELEGRAM_WEBHOOK_URL}`
    );
    if (!res.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await res.json();
    console.log("Telegram webhook", data);
  } catch (err) {
    console.error("An error occured while setting telegram webhook", err);
  }
}

// Start the server
if (process.env.NODE_ENV === "production") {
  // Use Webhooks for the production server
  const app = express();
  app.use(express.json());
  app.use(webhookCallback(bot, "express"));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Bot listening on port ${PORT}`);
  });

  setupWebhook();
} else {
  // Use Long Polling for development
  bot.start();
}
