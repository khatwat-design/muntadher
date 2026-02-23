# 🚀 نشر سريع للمشروع

## الطريقة الأسهل: Vercel

### 1️⃣ تثبيت Vercel CLI (تم تثبيته)

### 2️⃣ تسجيل الدخول
```bash
vercel login
```

### 3️⃣ نشر المشروع
```bash
vercel
```

### 4️⃣ إضافة متغيرات البيئة
عندما يسألك Vercel عن المتغيرات، أضف:

```
GOOGLE_APPS_SCRIPT_URL = https://script.google.com/macros/s/AKfycbxAF8eKX4bCJqs_cc3cs3s4HF3YEBaytlSNWvoaN19lhbGHl2tk3U9HDD9l3durRQrsnQ/exec
JWT_SECRET = mdre-secret-2026
ADMIN_USERNAME = 1xw
ADMIN_PASSWORD_HASH = $2a$10$PKTMOHB5HzOtJiYWIq.A4OG103P/MvV63FULyuKy6Yo9uUCdIMOLS
```

### 5️⃣ نشر للإنتاج
```bash
vercel --prod
```

## 🎯 النتيجة

بعد النشر ستحصل على رابط مثل:
`https://mdre-xyz.vercel.app`

يمكنك استخدامه من أي مكان في العالم!

## 📱 تحديث البوت

بعد النشر، حدث webhook البوت:
```bash
curl -X POST "https://api.telegram.org/bot7199640793:AAEdt6KgBsJ52jDCQzquUCsQZHg80N3Fv6Q/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-domain.vercel.app/api/bot"}'
```

## ✅ المزايا

- ✅ مجاني 100%
- ✅ يعمل 24/7
- ✅ SSL مجاني
- ✅ يتواصل مع Google Sheets
- ✅ يتواصل مع Telegram Bot
- ✅ يمكن الوصول من أي مكان

جرب تشغيل `vercel` الآن!
