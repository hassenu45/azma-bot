const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = '8571942063:AAFOQ42Kc7KQM2lezYzGKIstGi50ow-5tjg';
const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY || 'sk-a8f465d090b045dc9c2873c74a3d9221';
let OWNER_ID = null;

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Service static files (website) من المجلد الأب
app.use(express.static(path.join(__dirname, '..')));

const bot = new TelegramBot(TOKEN, { polling: true });

// أول شخص يرسل /start يصير المالك
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

// API — الموقع يرسل رسالة العميل
app.post('/api/contact', (req, res) => {
  const { name, phone, message, page } = req.body;

  if (!message) {
    return res.json({ ok: false, error: 'الرسالة مطلوبة' });
  }

  if (!OWNER_ID) {
    return res.json({ ok: false, error: 'لم يسجل المالك بعد' });
  }

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

// API — استلام طلب مع صورة
app.post('/api/order', (req, res) => {
  const { name, phone, message, image, page } = req.body;

  if (!message) {
    return res.json({ ok: false, error: 'الرسالة مطلوبة' });
  }

  if (!OWNER_ID) {
    return res.json({ ok: false, error: 'لم يسجل المالك بعد' });
  }

  const text =
    '🛒 *طلب منتج جديد* 🛒\n\n' +
    `${message}\n\n` +
    `📄 *الصفحة:* ${page || 'غير معروف'}`;

  async function sendOrder() {
    try {
      if (image) {
        // image = "data:image/png;base64,iVBOR..."
        const matches = image.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);
        if (matches) {
          const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const buffer = Buffer.from(matches[2], 'base64');
          await bot.sendPhoto(OWNER_ID, buffer, {
            caption: text,
            parse_mode: 'Markdown'
          });
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

// ===== إعدادات المساعد الذكي (مخزنة في ملف) =====
const SETTINGS_FILE = path.join(__dirname, 'bot-settings.json');
function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
  } catch (_) {}
  return { systemPrompt: 'أنت مساعد متجر أزما للتصميم الفاخر. أجب العملاء بلباقة وقدم المساعدة في الاستفسار عن المنتجات والطلبات.', botName: 'مساعد أزما', welcomeMessage: 'مرحباً بك في أزما! كيف أقدر أساعدك اليوم؟' };
}
let botSettings = loadSettings();
function saveSettings() {
  try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(botSettings, null, 2)); } catch (_) {}
}

// API — حفظ إعدادات البوت
app.post('/api/save-bot-settings', (req, res) => {
  const { systemPrompt, botName, welcomeMessage } = req.body;
  if (systemPrompt !== undefined) botSettings.systemPrompt = systemPrompt;
  if (botName !== undefined) botSettings.botName = botName;
  if (welcomeMessage !== undefined) botSettings.welcomeMessage = welcomeMessage;
  saveSettings();
  res.json({ ok: true });
});

// API — جلب إعدادات البوت
app.get('/api/get-bot-settings', (req, res) => {
  res.json({ ok: true, settings: botSettings });
});

// API — الشات مع DeepSeek
app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.json({ ok: false, error: 'الرسالة مطلوبة' });
  }

  const messages = [
    { role: 'system', content: botSettings.systemPrompt },
    ...(Array.isArray(history) ? history : []),
    { role: 'user', content: message }
  ];

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        max_tokens: 500,
        temperature: 0.7
      })
    });
    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      res.json({ ok: true, reply: data.choices[0].message.content });
    } else {
      res.json({ ok: false, error: 'لم يتم الحصول على رد' });
    }
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.get('/', (req, res) => res.send('Azma Bot OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port', PORT));
