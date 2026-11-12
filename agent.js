import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { bot, initBotHandlers } from "./bot.js";
import { startAccountabilityScheduler } from "./scheduler.js";
import { getUpcomingEvents, addStudyEvent, generateFull42DayPlan } from "./calendar.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const calendarTools = [
  {
    functionDeclarations: [
      {
        name: "getUpcomingEvents",
        description: "Foydalanuvchining Google Kalendaridagi kelgusi tadbirlari va bo'sh vaqtlarini ko'radi.",
        parameters: {
          type: "OBJECT",
          properties: {
            days: { type: "NUMBER", description: "Necha kunlik jadvalni ko'rish kerak (standart 7)" },
          },
        },
      },
      {
        name: "addStudyEvent",
        description: "Kalendarga bitta aniq o'quv darsi yoki vazifani eslatma bilan qo'shadi.",
        parameters: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING", description: "Dars mavzusi" },
            description: { type: "STRING", description: "Dars tafsiloti va vazifa" },
            startTimeISO: { type: "STRING", description: "Boshlanish vaqti ISO formatda (masalan: 2026-11-13T20:00:00+05:00)" },
            durationMinutes: { type: "NUMBER", description: "Davomiyligi daqiqada (standart 90)" },
          },
          required: ["title", "startTimeISO"],
        },
      },
      {
        name: "generateFull42DayPlan",
        description: "1.5 oylik (42 kunlik) to'liq Node.js backend tiklash rejasini foydalanuvchining Google Kalendariga avtomatik joylashtiradi.",
        parameters: {
          type: "OBJECT",
          properties: {
            dailyStartHour: { type: "NUMBER", description: "Har kuni dars boshlanadigan soat (0-23 oralig'ida, masalan 20)" },
          },
          required: ["dailyStartHour"],
        },
      },
    ],
  },
];

const SYSTEM_INSTRUCTION = `
Siz foydalanuvchining shaxsiy AI Yordamchisi, Senior Mentori va Qattiqqo'l Nazoratchisisiz.
Bugungi sana: ${new Date().toLocaleDateString("uz-UZ")} (Vaqt mintaqasi: Asia/Tashkent, +05:00).

Vazifalaringiz:
1. Kalendar bilan ishlash: Foydalanuvchi jadval tuzishni, bo'sh vaqtini tekshirishni yoki 1.5 oylik (42 kunlik) rejani kalendarga qo'shishni so'rasa, albatta kalendar vositalaridan (tools) foydalaning.
2. Kunlik nazorat va Savol-javob: Kalendardagi bugungi mavzuni tekshirib, foydalanuvchiga qayerdan qayergacha o'rganishini ayting va o'rgangan joyidan qisqa, chuqur savol-javob o'tkazing.
3. Multimodal tahlil: Skrinshot va ovozli xabarlarni aniq tahlil qilib, Clean Code/SOLID bo'yicha maslahat bering.
4. Qattiqqo'l ohang: Dangasalikka yo'l qo'ymang, 1.5 oylik maqsadni doim eslatib turing. Muloqot tili: O'zbek tili.
`;

// Biri 503 (band) bo'lsa, avtomatik keyingisiga o'tadigan modellar ro'yxati
const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
  "gemini-3.8-flash"
];

const userHistories = new Map();
const lastActivityMap = new Map();

function getHistory(userId) {
  if (!userHistories.has(userId)) {
    userHistories.set(userId, []);
  }
  return userHistories.get(userId);
}

// 503 yoki vaqtinchalik yuklama bo'lganda keyingi modelga o'tuvchi funksiya
async function generateWithFallback(contents) {
  let lastError;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: calendarTools,
      });
      return await model.generateContent({ contents });
    } catch (err) {
      lastError = err;
      console.log(`⚠️ ${modelName} band (${err.status || "xato"}), keyingi modelga o'tilmoqda...`);
    }
  }
  throw lastError;
}

async function executeFunctionCall(call) {
  const { name, args } = call;
  console.log(`🛠️ AI Kalendar funksiyasini ishga tushirdi: ${name}`, args);

  if (name === "getUpcomingEvents") {
    return await getUpcomingEvents(args.days || 7);
  }
  if (name === "addStudyEvent") {
    return await addStudyEvent(args);
  }
  if (name === "generateFull42DayPlan") {
    return await generateFull42DayPlan(args.dailyStartHour || 20);
  }
  return "Noma'lum funksiya.";
}

async function handleText(userId, text) {
  const history = getHistory(userId);
  history.push({ role: "user", parts: [{ text }] });

  let result = await generateWithFallback(history);
  let responseContent = result.response.candidates[0].content;
  history.push(responseContent);

  const calls = result.response.functionCalls();
  if (calls && calls.length > 0) {
    const toolResponseParts = [];

    for (const call of calls) {
      const apiResult = await executeFunctionCall(call);
      toolResponseParts.push({
        functionResponse: {
          name: call.name,
          response: { result: apiResult },
        },
      });
    }

    history.push({
      role: "user",
      parts: toolResponseParts,
    });

    result = await generateWithFallback(history);
    responseContent = result.response.candidates[0].content;
    history.push(responseContent);
  }

  return result.response.text();
}

async function handleMedia(userId, fileUrl, mimeType, promptText) {
  const response = await fetch(fileUrl);
  const arrayBuffer = await response.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString("base64");

  const history = getHistory(userId);
  history.push({
    role: "user",
    parts: [
      { inlineData: { data: base64Data, mimeType } },
      { text: promptText },
    ],
  });

  const result = await generateWithFallback(history);
  const responseContent = result.response.candidates[0].content;
  history.push(responseContent);

  return result.response.text();
}

async function generateReprimand(userId) {
  const todaySchedule = await getUpcomingEvents(1);
  return await handleText(
    userId,
    `6 soat o'tdi, foydalanuvchi aloqaga chiqmadi. Bugungi kalendar rejasi:\n${todaySchedule}\n\nUnga 3-4 gapdan iborat qattiqqo'l ovozli tanbeh matni yoz va bugungi mavzuni eslat!`
  );
}

async function startAgent() {
  initBotHandlers({
    onText: handleText,
    onMedia: handleMedia,
    onReset: (id) => userHistories.delete(id),
    updateActivity: (id) => lastActivityMap.set(id, Date.now()),
  });

  startAccountabilityScheduler(
    bot,
    (id) => lastActivityMap.get(id),
    generateReprimand
  );

  console.log("🤖 Kalendar + Multimodal + 6-soatlik Nazoratchi Agent ishga tushdi!");
  await bot.launch();
}

startAgent();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));