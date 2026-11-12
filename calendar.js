import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const auth = new google.auth.GoogleAuth({
  keyFile: "./google-credentials.json",
  scopes: ["https://www.googleapis.com/auth/calendar"],
});

const calendar = google.calendar({ version: "v3", auth });
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

/**
 * Kelgusi tadbirlarni o'qish (bo'sh vaqtni aniqlash uchun)
 */
export async function getUpcomingEvents(days = 7) {
  const now = new Date();
  const future = new Date();
  future.setDate(now.getDate() + days);

  const res = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  const events = res.data.items || [];
  if (events.length === 0) return "Kelgusi kunlarda kalendar bo'sh.";

  return events
    .map((e) => `${e.start.dateTime || e.start.date} — ${e.summary}`)
    .join("\n");
}

/**
 * Kalendarga bitta o'quv darsini eslatma bilan qo'shish
 */
export async function addStudyEvent({ title, description, startTimeISO, durationMinutes = 90 }) {
  const startDate = new Date(startTimeISO);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

  const event = {
    summary: `📚 Node.js: ${title}`,
    description: description,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: "Asia/Tashkent",
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: "Asia/Tashkent",
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 10 }, // Darsdan 10 daqiqa oldin telefonda eslatma chalinadi
        { method: "popup", minutes: 0 },  // Aynan dars boshlanganda signal beradi
      ],
    },
  };

  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    resource: event,
  });

  return `✅ Kalendarga qo'shildi: "${title}" (${startDate.toLocaleString("uz-UZ")})`;
}

/**
 * 1.5 oylik (42 kunlik) to'liq Node.js dasturini kalendarga avtomatik yozib chiqish
 */
export async function generateFull42DayPlan(dailyStartHour = 20) {
  const curriculum = [
    // 1-hafta: JS Core & Async
    "1-kun: Event Loop, Call Stack, Microtasks vs Macrotasks",
    "2-kun: Promises, async/await va Error Handling",
    "3-kun: Closures, Prototypes va ES6+ zamonaviy sintaksis",
    "4-kun: Streams, Buffers va File System (fs/promises)",
    "5-kun: EventEmitter va Custom Event arxitekturasi",
    "6-kun: Amaliyot — CLI Log Analyzer skripti yozish",
    "7-kun: 1-hafta takrorlash va Code Review",
    // 2-hafta: Node.js & Express.js
    "8-kun: HTTP moduli va Express.js arxitekturasi",
    "9-kun: REST API prinsiplari, Routing va Controllers",
    "10-kun: Custom Middlewares va Global Error Handler",
    "11-kun: Request Validation (Zod yoki Joi bilan)",
    "12-kun: Clean Architecture (Controller -> Service -> Repository)",
    "13-kun: Amaliyot — Task Manager REST API qurish",
    "14-kun: 2-hafta takrorlash va Refactoring",
    // 3-hafta: Ma'lumotlar bazasi (PostgreSQL & Prisma)
    "15-kun: Relyatsion bazalar dizayni, Normalization va Indexes",
    "16-kun: Prisma ORM sozlash, Schema va Migrations",
    "17-kun: CRUD operatsiyalar va Relations (1:1, 1:N, N:M)",
    "18-kun: Transactions, Pagination va Filtering",
    "19-kun: Query optimizatsiya (N+1 muammosini yechish)",
    "20-kun: Amaliyot — Blog/E-commerce DB qatlamini qurish",
    "21-kun: 3-hafta takrorlash va SQL tahlil",
    // 4-hafta: Xavfsizlik & Autentifikatsiya
    "22-kun: Password Hashing (bcrypt / argon2)",
    "23-kun: JWT (Access va Refresh Token) mexanizmi",
    "24-kun: Role-Based Access Control (RBAC) himoyasi",
    "25-kun: Rate Limiting, Helmet, CORS va XSS/SQLi himoya",
    "26-kun: File Upload (Multer / S3) va xavfsiz saqlash",
    "27-kun: Amaliyot — Auth & RBAC tizimini integratsiya qilish",
    "28-kun: 4-hafta takrorlash va Security Audit",
    // 5-6-haftalar: Capstone Portfolio Loyiha & Production
    "29-kun: Capstone loyiha arxitekturasi va DB loyihalash",
    "30-kun: Capstone — Auth va User moduli",
    "31-kun: Capstone — Asosiy biznes mantiq (Services)",
    "32-kun: Redis bilan Caching (tezlikni oshirish)",
    "33-kun: Background Jobs va Queues (BullMQ)",
    "34-kun: Unit va Integration testlar (Jest / Supertest)",
    "35-kun: Swagger / OpenAPI hujjatlashtirish",
    "36-kun: Docker va Docker Compose bilan konteynerlash",
    "37-kun: CI/CD (GitHub Actions) asoslari",
    "38-kun: Logging (Winston/Pino) va Monitoring",
    "39-kun: Serverga Deploy qilish (VPS / Render / Railway)",
    "40-kun: Load Testing va Performance tuning",
    "41-kun: GitHub README, arxitektura diagrammasi va Portfolio bezash",
    "42-kun: Yakuniy texnik intervyu simulyatsiyasi (AI Mentor bilan)"
  ];

  const today = new Date();
  let createdCount = 0;

  for (let i = 0; i < curriculum.length; i++) {
    const eventDate = new Date(today);
    eventDate.setDate(today.getDate() + i + 1); // Ertadan boshlab 42 kun
    eventDate.setHours(dailyStartHour, 0, 0, 0);

    await addStudyEvent({
      title: curriculum[i],
      description: `1.5 oylik Node.js Backend tiklash dasturi.\nBugungi vazifa: ${curriculum[i]}\nDars yakunida Telegram botga hisobot bering va savol-javobdan o'ting!`,
      startTimeISO: eventDate.toISOString(),
      durationMinutes: 90,
    });
    createdCount++;
  }

  return `🎯 Tayyor! Ertadan boshlab 42 kunlik (1.5 oylik) to'liq Node.js o'quv rejangiz har kuni soat ${dailyStartHour}:00 ga Google Kalendaringizga eslatmalar bilan joylashtirildi!`;
}