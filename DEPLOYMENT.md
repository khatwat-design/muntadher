# رفع النظام على السيرفر (Deployment)

## المتطلبات على السيرفر

- Node.js 18+
- MySQL 8 أو MariaDB
- Nginx
- PM2 (`npm i -g pm2`)
- Git

---

## 1) إعداد المستودع وربطه بـ GitHub (على جهازك المحلي)

```bash
cd c:\Users\k2o0r\Desktop\mdre

git init
git add .
git commit -m "Initial: muntadher system with MySQL, PM2, Nginx"

git remote add origin https://github.com/khatwat-design/muntadher.git
git branch -M main
git push -u origin main
```

> إذا كان المستودع موجوداً مسبقاً ومرتبطاً، يكفي:
> `git add . && git commit -m "Deploy setup" && git push`

---

## 2) أوامر التنفيذ على السيرفر (SSH)

اتصل بالسيرفر ثم نفّذ الأوامر بالترتيب.

```bash
# الاتصال
ssh root@187.77.68.2
```

### تثبيت المتطلبات (مرة واحدة)

```bash
# Node (إن لم يكن مثبتاً)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# MySQL (إن لم يكن مثبتاً)
apt-get update && apt-get install -y nginx mysql-server
systemctl enable nginx mysql
systemctl start mysql

# PM2 عالمياً
npm install -g pm2
```

### استنساخ المشروع وبناء الواجهة

```bash
# مجلد التطبيق (غيّره إن رغبت)
export APP_DIR=/var/www/muntadher
mkdir -p $APP_DIR
cd $APP_DIR

# استنساخ من GitHub
git clone https://github.com/khatwat-design/muntadher.git .
# أو إذا المجلد موجود مسبقاً:
# git pull origin main
```

### إعداد ملف البيئة (.env)

```bash
cd $APP_DIR
cp server/env.example.txt server/.env
nano server/.env
```

اضبط القيم التالية في `server/.env`:

```env
NODE_ENV=production
API_PORT=3001
PORT=3001
JWT_SECRET=مفتاح-سري-قوي-وعشوائي
ADMIN_USERNAME=اسمك
ADMIN_PASSWORD_HASH=هاش-bcrypt-للكلمة-السرية

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=كلمة_سر_MySQL
DB_NAME=muntadher_system
```

> يمكن استخدام `DB_PASS` بدلاً من `DB_PASSWORD`.  
> لتوليد هاش كلمة المرور: `node -e "const bcrypt=require('bcryptjs'); console.log(bcrypt.hashSync('كلمتك',10));"`

### إنشاء قاعدة البيانات وتشغيل الـ Migration (الجداول)

```bash
cd $APP_DIR
node server/init-db.js
```

المتوقع: رسالة مثل `قاعدة البيانات "muntadher_system" جاهزة` ثم `تم تهيئة الجداول والبيانات الأولية بنجاح.`

### تثبيت الحزم وبناء الواجهة

```bash
cd $APP_DIR
npm ci
npm run build
```

### تشغيل التطبيق بـ PM2

```bash
cd $APP_DIR
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

> إذا طلب منك `pm2 startup` تنفيذ أمر كـ root، نفّذه كما يظهر ثم `pm2 save` مرة أخرى.

### التحقق

```bash
pm2 status
curl -s http://127.0.0.1:3001/api/health
```

إذا ظهر `{"ok":true}` فالتطبيق يعمل.

---

## 3) إعداد Nginx (الدومين الفرعي)

```bash
# نسخ الملف المقترح
sudo cp $APP_DIR/deploy/nginx-muntadher.conf /etc/nginx/sites-available/muntadher

# تعديل الدومين والبورت
sudo nano /etc/nginx/sites-available/muntadher
```

- غيّر `server_name` إلى الدومين الفرعي الفعلي (مثلاً `muntadher.khatwat-design.com`).
- تأكد أن `proxy_pass http://127.0.0.1:3001` يطابق قيمة `PORT` أو `API_PORT` في `.env`.
- غيّر `root` إلى مسار الـ build إن اختلف (مثلاً `$APP_DIR/dist`).

```bash
sudo ln -sf /etc/nginx/sites-available/muntadher /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 4) أوامر سريعة للمراجعة

| الهدف              | الأمر |
|--------------------|--------|
| حالة التطبيق      | `pm2 status` |
| سجلات التطبيق     | `pm2 logs muntadher` |
| إعادة تشغيل       | `pm2 restart muntadher` |
| إيقاف             | `pm2 stop muntadher` |
| تحديث بعد git pull | `cd $APP_DIR && git pull && npm ci && npm run build && pm2 restart muntadher` |

---

## 5) ملخص المتغيرات في .env

| المتغير | الوصف |
|---------|--------|
| `DB_HOST` | عنوان MySQL (عادة `localhost`) |
| `DB_PORT` | منفذ MySQL (عادة `3306`) |
| `DB_USER` | مستخدم MySQL |
| `DB_PASSWORD` أو `DB_PASS` | كلمة سر MySQL |
| `DB_NAME` | اسم القاعدة (افتراضي `muntadher_system`) |
| `PORT` أو `API_PORT` | منفذ التطبيق (يجب أن يطابق Nginx، مثلاً `3001`) |
| `JWT_SECRET` | مفتاح سري قوي لـ JWT |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` | تسجيل دخول لوحة التحكم |

تم تجهيز النظام للرفع مع إنشاء قاعدة البيانات `muntadher_system` وتشغيل الـ schema تلقائياً عبر `node server/init-db.js`.
