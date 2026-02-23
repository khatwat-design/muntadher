/**
 * تهيئة قاعدة البيانات للنشر:
 * 1) إنشاء قاعدة البيانات muntadher_system إن لم توجد
 * 2) تنفيذ schema-unified.sql لإنشاء كل الجداول والبيانات الأولية
 *
 * الاستدعاء: node server/init-db.js
 * يقرأ من .env: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD أو DB_PASS
 */
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const DB_NAME = process.env.DB_NAME || 'muntadher_system';
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || process.env.DB_PASS,
  multipleStatements: false,
  charset: 'utf8mb4',
};

async function run() {
  if (!config.user) {
    console.error('ضع DB_USER في ملف .env');
    process.exit(1);
  }

  console.log('الاتصال بـ MySQL بدون قاعدة بيانات...');
  const conn = await mysql.createConnection({ ...config });

  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`قاعدة البيانات "${DB_NAME}" جاهزة.`);
  } finally {
    await conn.end();
  }

  console.log('تنفيذ الجداول الموحدة...');
  const connDb = await mysql.createConnection({ ...config, database: DB_NAME });
  const schemaPath = join(__dirname, 'schema-unified.sql');
  const sql = readFileSync(schemaPath, 'utf8');

  const statements = sql
    .replace(/--[^\n]*/g, '\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 2 && !s.startsWith('/*'));

  for (const stmt of statements) {
    try {
      await connDb.query(stmt + ';');
    } catch (err) {
      if (err.code !== 'ER_TABLE_EXISTS_ERROR' && err.code !== 'ER_DUP_ENTRY' && err.code !== 'ER_DUP_KEYNAME' && err.code !== 'ER_FK_DUP_NAME') {
        console.warn('تحذير:', err.message);
      }
    }
  }

  await connDb.end();
  console.log('تم تهيئة الجداول والبيانات الأولية بنجاح.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
