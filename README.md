# 🤖 DevMentor AI — Shaxsiy Backend Mentor va Nazoratchi Agent

**DevMentor AI** — bu Node.js backend ko'nikmalarini tizimli ravishda rivojlantirish va o'quv intizomini nazorat qilish uchun yaratilgan avtonom, multimodal Telegram AI agentidir. Loyiha Google Gemini API (Function Calling + Multimodal), Google Calendar API va ovozli sintez (TTS) texnologiyalarini birlashtiradi.

---

## ✨ Asosiy Imkoniyatlar

* **📅 Avtonom Kalendar Rejalashtirish (Function Calling):** AI foydalanuvchining Google Kalendaridagi bo'sh vaqtlarni tekshiradi va 42 kunlik (1.5 oylik) to'liq Node.js o'quv rejasini bildirishnomalar (eslatmalar) bilan avtomatik joylashtiradi.
* **🎙️ Multimodal Muloqot (Matn, Ovoz va Skrinshot):**
  * **Skrinshot tahlili:** Kod yoki terminal xatolari rasmini yuborsangiz, AI xatoni aniqlaydi va *Clean Code / SOLID* tamoyillari asosida yechim beradi.
  * **Ovozli savol-javob:** Foydalanuvchi ovozli xabar (*voice*) yuboradi, AI uni eshitib tushunadi va ovozli xabar ko'rinishida javob qaytaradi.
* **⏰ 6 Soatlik Nazorat Tizimi (Accountability Coach):** `node-cron` har 6 soatda foydalanuvchi faolligini tekshiradi. Agar o'qish bo'yicha hisobot berilmagan bo'lsa, bugungi kalendar mavzusini eslatib **ovozli tanbeh** yuboradi.
* **🧠 Aqlli Fallback Mexanizmi:** Asosiy AI modeli yoki TTS xizmati band bo'lganda (`503` / `429`), tizim uzluksiz ishlash uchun avtomatik ravishda zaxira modellariga o'tadi.

---

## 🛠️ Texnologiyalar Steki

* **Runtime:** Node.js (ES Modules)
* **AI Engine:** Google Generative AI SDK (`gemini-3.5-flash-lite`, `gemini-2.5-flash`, `gemini-2.5-flash-preview-tts`)
* **Bot Framework:** Telegraf.js
* **Integratsiyalar:** Google Calendar API (`googleapis`)
* **Rejalashtirish & Ovoz:** `node-cron`, `node-edge-tts`

---

## 📂 Loyiha Tuzilmasi

```text
dev-mentor-agent/
├── agent.js                 # Asosiy kirish nuqtasi, AI mantiqi va Function Calling ko'prigi
├── bot.js                   # Telegram bot handlerlari (matn, rasm, ovozli xabarlar)
├── calendar.js              # Google Calendar API va 42 kunlik reja generatori
├── scheduler.js             # Har 6 soatlik nazorat (cron) va TTS ovoz sintezi
├── .env.example             # Muhit o'zgaruvchilari namunasi
├── .gitignore               # Maxfiy fayllarni Git'dan yashirish qoidalari
└── package.json             # Loyiha bog'liqliklari va skriptlar