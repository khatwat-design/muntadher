# دليل النشر على الاستضافة المؤقتة

## 🚀 خيارات النشر المتاحة

### 1️⃣ Vercel (مجاني وموصى به)
**المميزات:**
- مجاني بالكامل
- نشر تلقائي من GitHub
- SSL مجاني
- سهل الإعداد

**الخطوات:**
1. ارفع المشروع على GitHub
2. اذهب إلى [vercel.com](https://vercel.com)
3. سجل دخول بحساب GitHub
4. اضغط "New Project"
5. اختر الريبو الخاص بالمشروع
6. أضف المتغيرات البيئية:
   - `GOOGLE_APPS_SCRIPT_URL`: رابط Google Apps Script
   - `JWT_SECRET`: أي سر عشوائي
   - `ADMIN_USERNAME`: 1xw
   - `ADMIN_PASSWORD_HASH`: `$2a$10$PKTMOHB5HzOtJiYWIq.A4OG103P/MvV63FULyuKy6Yo9uUCdIMOLS`
7. اضغط "Deploy"

### 2️⃣ Render (مجاني)
**المميزات:**
- مجاني للـ Backend
- يدعم Node.js
- SSL مجاني

**الخطوات:**
1. ارفع المشروع على GitHub
2. اذهب إلى [render.com](https://render.com)
3. اضغط "New" → "Web Service"
4. اختر الريبو
5. اضبط الإعدادات كالتالي:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
6. أضف متغيرات البيئة
7. اضغط "Create Web Service"

### 3️⃣ Netlify (للـ Frontend فقط)
**المميزات:**
- مجاني للـ Frontend
- نشر سهل
- SSL مجاني

**الخطوات:**
1. شغل `npm run build`
2. ارفع مجلد `dist` على Netlify
3. اضبط متغيرات البيئة

---

## 🔧 متغيرات البيئة المطلوبة

```env
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbxAF8eKX4bCJqs_cc3cs3s4HF3YEBaytlSNWvoaN19lhbGHl2tk3U9HDD9l3durRQrsnQ/exec
JWT_SECRET=your-secret-key-here
ADMIN_USERNAME=1xw
ADMIN_PASSWORD_HASH=$2a$10$PKTMOHB5HzOtJiYWIq.A4OG103P/MvV63FULyuKy6Yo9uUCdIMOLS
```

---

## 📱 تحديث Telegram Bot

بعد النشر، يجب تحديث Webhook URL للبوت:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-domain.com/api/bot"}'
```

---

## 🌐 الروابط بعد النشر

- **Vercel**: `https://your-app.vercel.app`
- **Render**: `https://your-app.onrender.com`
- **Netlify**: `https://your-app.netlify.app`

---

## ⚡ النشر السريع (Vercel)

```bash
# تثبيت Vercel CLI
npm i -g vercel

# نشر المشروع
vercel

# نشر للإنتاج
vercel --prod
```

---

## 🔄 تحديث Google Apps Script

بعد النشر، قد تحتاج لتحديث CORS في Google Apps Script:

```javascript
// في بداية دالة handleRequest
const headers = {
  'Access-Control-Allow-Origin': 'https://your-domain.vercel.app',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};
```

---

## 🎯 التوصية

**أفضل خيار:** Vercel
- لأنه يدعم Full-stack (Frontend + Backend)
- مجاني بالكامل
- نشر تلقائي
- سهل الإدارة

**بعد النشر:**
1. اختبر التطبيق على الرابط الجديد
2. تأكد من اتصال Google Sheets
3. اختبر Telegram Bot
4. شارك الرابط مع الآخرين!
