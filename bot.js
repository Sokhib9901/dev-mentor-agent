import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import fs from "fs";
import { textToSpeechFile } from "./scheduler.js";

dotenv.config();

export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

export function initBotHandlers(handlers) {
  const { onText, onMedia, onReset, updateActivity } = handlers;

  bot.start(async (ctx) => {
    updateActivity(ctx.from.id);
    await ctx.reply(
      `🚀 Shaxsiy AI Mentor va Nazoratchingiz tayyor!\n` +
      `Sizning Telegram ID: ${ctx.from.id} (buni .env faylga MY_TELEGRAM_ID deb yozib qo'ying)\n\n` +
      `📌 Imkoniyatlar:\n` +
      `• Matn, ovozli xabar yoki kod skrinshotini yuboring\n` +
      `• Har 6 soatda o'qish progressini tekshirib ovozli tanbeh beraman\n` +
      `• /ovoz [matn] — javobni ovozli shaklda olish`
    );
  });

  bot.command("reset", (ctx) => {
    onReset(ctx.from.id);
    ctx.reply("🔄 Kontekst tozalandi!");
  });

  // 1. Oddiy matnli xabarlar
  bot.on("text", async (ctx) => {
    const userId = ctx.from.id;
    updateActivity(userId);
    await ctx.sendChatAction("typing");

    try {
      const reply = await onText(userId, ctx.message.text);
      await ctx.reply(reply);
    } catch (err) {
      await ctx.reply("❌ Xatolik: " + err.message);
    }
  });

  // 2. Skrinshot (Rasm) yuborilganda
  bot.on("photo", async (ctx) => {
    const userId = ctx.from.id;
    updateActivity(userId);
    await ctx.sendChatAction("typing");

    try {
      const photos = ctx.message.photo;
      const bestPhoto = photos[photos.length - 1]; // Eng sifatli rasm
      const fileLink = await ctx.telegram.getFileLink(bestPhoto.file_id);
      const caption = ctx.message.caption || "Ushbu skrinshotni tahlil qilib ber va xatolari bo'lsa tushuntir.";

      const reply = await onMedia(userId, fileLink.href, "image/jpeg", caption);
      await ctx.reply(reply);
    } catch (err) {
      await ctx.reply("❌ Rasmni o'qishda xatolik: " + err.message);
    }
  });

  // 3. Ovozli xabar (Voice) yuborilganda — Bot ham ovoz bilan javob beradi!
  bot.on("voice", async (ctx) => {
    const userId = ctx.from.id;
    updateActivity(userId);
    await ctx.sendChatAction("record_voice");

    try {
      const fileLink = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
      const prompt = "Foydalanuvchining ovozli xabarini tingla, savoliga javob ber yoki o'rgangan mavzusi bo'yicha qisqa savol-javob qil. Javobing qisqa va ovozda o'qishga qulay bo'lsin.";

    const replyText = await onMedia(userId, fileLink.href, "audio/ogg", prompt);

      if (!replyText || !replyText.trim()) {
        await ctx.reply("⚠️ Ovozli xabarni tushunmadim, iltimos aniqroq qilib qayta yuboring.");
        return;
      }

      // Avval ovozli javob yuborishga harakat qilamiz
      try {
        const audioPath = await textToSpeechFile(replyText, `reply_${Date.now()}.mp3`);
        await ctx.replyWithVoice({ source: audioPath });
        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
      } catch (ttsErr) {
        console.error("⚠️ Ovoz generatsiyasida xato:", ttsErr.message);
      }

      // Matn ko'rinishini har doim yuboramiz
      await ctx.reply(replyText);
    } catch (err) {
      await ctx.reply("❌ Ovozli xabarni tinglashda xatolik: " + err.message);
    }
  });
}