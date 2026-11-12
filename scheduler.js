import cron from "node-cron";
import { EdgeTTS } from "node-edge-tts";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const tts = new EdgeTTS({
  voice: "uz-UZ-SardorNeural",
  lang: "uz-UZ",
  outputFormat: "audio-24khz-48kbitrate-mono-mp3",
});

// PCM (24kHz, 16-bit, mono) ma'lumotini WAV faylga o'giruvchi yordamchi funksiya
function pcmToWav(pcmBuffer, sampleRate = 24000) {
  const header = Buffer.alloc(44);
  const dataSize = pcmBuffer.length;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuffer]);
}

// Gemini TTS orqali zaxira audio yaratish
async function generateGeminiTTS(text, outputPath) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `O'zbek tilida tabiiy va aniq ohangda o'qib ber: ${text}` }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini TTS xatosi: ${response.status}`);
  }

  const data = await response.json();
  const base64Audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Audio ma'lumot kelmadi");

  const wavBuffer = pcmToWav(Buffer.from(base64Audio, "base64"));
  fs.writeFileSync(outputPath, wavBuffer);
  return outputPath;
}

// Asosiy TTS funksiyasi (EdgeTTS -> xato bersa Gemini TTS)
export async function textToSpeechFile(text, fileName = "voice_reply.mp3") {
  const cleanText = text.replace(/[*#`_~]/g, "").slice(0, 1000);
  const mp3Path = path.resolve("./", fileName);

  try {
    await tts.ttsPromise(cleanText, mp3Path);
    return mp3Path;
  } catch (err) {
    console.log("⚠️ EdgeTTS band (429), Gemini TTS zaxirasiga o'tilmoqda...");
    const wavPath = mp3Path.replace(/\.mp3$/, ".wav");
    return await generateGeminiTTS(cleanText, wavPath);
  }
}

export function startAccountabilityScheduler(bot, getLastActivity, generateReprimand) {
  cron.schedule("0 */6 * * *", async () => {
    const userId = process.env.MY_TELEGRAM_ID;
    if (!userId) return;

    const lastTime = getLastActivity(Number(userId));
    const sixHoursMs = 6 * 60 * 60 * 1000;
    const isSlacking = !lastTime || Date.now() - lastTime > sixHoursMs;

    if (isSlacking) {
      try {
        const reprimandText = await generateReprimand(Number(userId));
        const audioPath = await textToSpeechFile(reprimandText, `tanbeh_${Date.now()}.mp3`);

        await bot.telegram.sendVoice(userId, { source: audioPath }, {
          caption: "⚠️ 6 SOATLIK NAZORAT: O'qish vaqti bo'ldi!"
        });

        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
      } catch (err) {
        console.error("Nazoratchi xatosi:", err.message);
      }
    }
  });

  console.log("⏰ 6 soatlik ovozli nazorat tizimi faollashtirildi!");
}