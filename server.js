const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = '8571942063:AAFOQ42Kc7KQM2lezYzGKIstGi50ow-5tjg';
const GEMINI_KEY = process.env.GEMINI_KEY || 'AQ.Ab8RN6I5TTzXaQXY1towOWF-vcrEmVRNOu4SSgXsGVQw_9GNiA';
let OWNER_ID = null;

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ===== ملفات الموقع =====
// يخدم كل الملفات من المجلد الأب (azma2)
app.use(express.static(path.join(__dirname, '..')));

// ===== Telegram Bot =====
const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  if (!OWNER_ID) {
    OWNER_ID = chatId;
    bot.sendMessage(chatId,
      '✅ تم ربطك كمالك لأزما!\n\n' +
      'الآن أي عميل يرسل رسالة من الموقع، راح توصلك هنا.'
    );
  } else if (chatId === OWNER_ID) {
    bot.sendMessage(chatId, '✅ أهلاً بك مرة أخرى! البوت شغال.');
  } else {
    bot.sendMessage(chatId, 'عذراً، المالك مسجل مسبقاً.');
  }
});

// ===== API — رسالة عميل =====
app.post('/api/contact', (req, res) => {
  const { name, phone, message, page } = req.body;
  if (!message) return res.json({ ok: false, error: 'الرسالة مطلوبة' });
  if (!OWNER_ID) return res.json({ ok: false, error: 'لم يسجل المالك بعد' });

  const text =
    '🔔 *رسالة عميل جديد* 🔔\n\n' +
    `👤 *الاسم:* ${name || 'غير معروف'}\n` +
    `📞 *الجوال:* ${phone || 'غير معروف'}\n` +
    `📄 *الصفحة:* ${page || 'الرئيسية'}\n` +
    `💬 *الرسالة:*\n${message}`;

  bot.sendMessage(OWNER_ID, text, { parse_mode: 'Markdown' })
    .then(() => res.json({ ok: true }))
    .catch(err => res.json({ ok: false, error: err.message }));
});

// ===== API — طلب منتج =====
app.post('/api/order', (req, res) => {
  const { name, phone, message, image, page } = req.body;
  if (!message) return res.json({ ok: false, error: 'الرسالة مطلوبة' });
  if (!OWNER_ID) return res.json({ ok: false, error: 'لم يسجل المالك بعد' });

  const text =
    '🛒 *طلب منتج جديد* 🛒\n\n' +
    `${message}\n\n` +
    `📄 *الصفحة:* ${page || 'غير معروف'}`;

  async function sendOrder() {
    try {
      if (image) {
        const matches = image.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);
        if (matches) {
          const buffer = Buffer.from(matches[2], 'base64');
          await bot.sendPhoto(OWNER_ID, buffer, { caption: text, parse_mode: 'Markdown' });
        } else {
          await bot.sendMessage(OWNER_ID, text, { parse_mode: 'Markdown' });
        }
      } else {
        await bot.sendMessage(OWNER_ID, text, { parse_mode: 'Markdown' });
      }
      return res.json({ ok: true });
    } catch (err) {
      return res.json({ ok: false, error: err.message });
    }
  }
  sendOrder();
});

// ===== إعدادات المساعد الذكي (في الذاكرة) =====
let botSettings = {
  systemPrompt: 'أنت مساعد متجر أزما للتصميم الفاخر. أجب العملاء بلباقة وقدم المساعدة في الاستفسار عن المنتجات والطلبات والأسعار. أزما متجر متخصص في تصميم وطباعة تيشيرتات ومجات وقبعات ووسائد بتصاميم فاخرة ومميزة.',
  botName: 'مساعد أزما',
  welcomeMessage: 'مرحباً بك في أزما! 🎨 كيف أقدر أساعدك اليوم؟'
};

// API — حفظ إعدادات المساعد
app.post('/api/save-bot-settings', (req, res) => {
  const { systemPrompt, botName, welcomeMessage } = req.body;
  if (systemPrompt !== undefined) botSettings.systemPrompt = systemPrompt;
  if (botName !== undefined) botSettings.botName = botName;
  if (welcomeMessage !== undefined) botSettings.welcomeMessage = welcomeMessage;
  res.json({ ok: true });
});

// API — جلب إعدادات المساعد
app.get('/api/get-bot-settings', (req, res) => {
  res.json({ ok: true, settings: botSettings });
});

// ===== الشات بوت مع Gemini =====
app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;
  if (!message) return res.json({ ok: false, error: 'الرسالة مطلوبة' });

  const contents = [];
  if (Array.isArray(history)) {
    history.forEach(function(h) {
      const role = h.role === 'assistant' ? 'model' : h.role;
      if (role === 'user' || role === 'model') {
        contents.push({ role: role, parts: [{ text: h.content }] });
      }
    });
  }
  contents.push({ role: 'user', parts: [{ text: message }] });

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMINI_KEY
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: botSettings.systemPrompt }] },
        contents: contents,
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7
        }
      })
    });
    const data = await response.json();
    console.log('Gemini:', JSON.stringify(data).substring(0, 300));
    if (data.candidates && data.candidates.length > 0) {
      const text = data.candidates[0].content.parts.map(function(p) { return p.text; }).join('');
      res.json({ ok: true, reply: text });
    } else {
      res.json({ ok: false, error: data.error?.message || 'لم يتم الحصول على رد' });
    }
  } catch (err) {
    console.log('Chat error:', err.message);
    res.json({ ok: false, error: err.message });
  }
});

// ===== الصفحة الرئيسية =====
app.get('/', (req, res) => res.send('Azma Bot OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port', PORT));
