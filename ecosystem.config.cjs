/**
 * PM2 — تشغيل التطبيق واستمراريته على السيرفر
 * الاستخدام: pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'muntadher',
      script: 'server/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 5000,
      kill_timeout: 3000,
    },
  ],
};
