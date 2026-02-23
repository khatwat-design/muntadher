# أوامر السيرفر — نظام منتظر (بورت 4001، بدون تداخل مع خطوات)

نفّذها بالترتيب بعد تسجيل الدخول: `ssh root@187.77.68.2`

---

## 1) مجلد التطبيق (منفصل عن خطوات)

```bash
export APP_DIR=/var/www/muntadher
mkdir -p $APP_DIR
cd $APP_DIR
```

---

## 2) استنساخ المشروع من GitHub

```bash
git clone https://github.com/khatwat-design/muntadher.git .
```

---

## 3) إعداد ملف البيئة (بورت 4001)

```bash
cp server/env.example.txt server/.env
nano server/.env
```

**اضبط هذه القيم (والبورت 4001):**

```env
NODE_ENV=production
API_PORT=4001
PORT=4001
JWT_SECRET=مفتاح-سري-قوي
ADMIN_USERNAME=اسمك
ADMIN_PASSWORD_HASH=هاش-bcrypt

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=كلمة_سر_mysql
DB_NAME=muntadher_system
```

احفظ واخرج من nano: `Ctrl+O` ثم `Enter` ثم `Ctrl+X`.

---

## 4) تهيئة قاعدة البيانات (إنشاء muntadher_system + الجداول)

```bash
node server/init-db.js
```

المتوقع: `قاعدة البيانات "muntadher_system" جاهزة` ثم `تم تهيئة الجداول...`

---

## 5) تثبيت الحزم وبناء الواجهة

```bash
npm ci
npm run build
```

---

## 6) تشغيل التطبيق بـ PM2 (بورت 4001)

```bash
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

نفّذ الأمر الذي يظهر من `pm2 startup` (يبدأ عادة بـ `sudo env PATH=...`) ثم:

```bash
pm2 save
```

---

## 7) التحقق

```bash
pm2 status
curl -s http://127.0.0.1:4001/api/health
```

المتوقع: `{"ok":true}`

---

## 8) Nginx — الدومين الفرعي (بورت 4001)

```bash
cp $APP_DIR/deploy/nginx-muntadher.conf /etc/nginx/sites-available/muntadher
nano /etc/nginx/sites-available/muntadher
```

- غيّر `server_name` إلى الدومين الفرعي لنظام منتظر فقط (مثلاً `muntadher.khatwat-design.com` أو `app.example.com`).
- تأكد أن السطر يحتوي: `proxy_pass http://127.0.0.1:4001;`
- غيّر `root` إن كان مسار المشروع مختلفاً (مثلاً `/var/www/muntadher/dist`).

ثم:

```bash
ln -sf /etc/nginx/sites-available/muntadher /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## أوامر لاحقة مفيدة

| الهدف | الأمر |
|--------|--------|
| حالة التطبيق | `pm2 status` |
| سجلات | `pm2 logs muntadher` |
| إعادة تشغيل | `pm2 restart muntadher` |
| تحديث بعد تعديلات | `cd /var/www/muntadher && git pull && npm ci && npm run build && pm2 restart muntadher` |

بهذا يعمل نظام منتظر على البورت **4001** فقط ولا يتداخل مع نظام خطوات على بورتّه الحالي.
