const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = '8571942063:AAFOQ42Kc7KQM2lezYzGKIstGi50ow-5tjg';
let OWNER_ID = null; // يسجل أول مرة يرسل فيها المالك /start

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

app.get('/', (req, res) => res.send('Azma Bot OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port', PORT));
