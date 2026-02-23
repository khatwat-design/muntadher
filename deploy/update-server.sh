#!/bin/bash
# تشغيل من مجلد المشروع: cd /var/www/muntadher ثم: bash deploy/update-server.sh
set -e
cd "$(dirname "$0")/.."
echo ">>> npm ci"
npm ci
echo ">>> npm run build"
npm run build
echo ">>> pm2 restart muntadher"
pm2 restart muntadher
echo ">>> pm2 save"
pm2 save
echo ">>> تم التحديث."
