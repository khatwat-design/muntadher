// Auto-deployment script
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

console.log('🚀 بدء النشر التلقائي...');

// Create vercel.json with auto-config
const vercelConfig = {
  "version": 2,
  "builds": [
    {
      "src": "server/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "GOOGLE_APPS_SCRIPT_URL": "https://script.google.com/macros/s/AKfycbxAF8eKX4bCJqs_cc3cs3s4HF3YEBaytlSNWvoaN19lhbGHl2tk3U9HDD9l3durRQrsnQ/exec",
    "JWT_SECRET": "mdre-secret-2026-auto-deploy",
    "ADMIN_USERNAME": "1xw",
    "ADMIN_PASSWORD_HASH": "$2a$10$PKTMOHB5HzOtJiYWIq.A4OG103P/MvV63FULyuKy6Yo9uUCdIMOLS"
  }
};

writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));
console.log('✅ تم إنشاء ملف الإعداد');

// Auto deploy
try {
  console.log('🔄 جاري النشر...');
  const output = execSync('vercel --prod --yes', { encoding: 'utf8', stdio: 'pipe' });
  console.log('✅ تم النشر بنجاح!');
  console.log(output);
} catch (error) {
  console.log('❌ خطأ في النشر، جرب الطريقة اليدوية');
  console.log('📖 اتبع الخطوات في ملف QUICK_DEPLOY.md');
}
