/**
 * Unified data adapter.
 * يقرأ DB_HOST و DB_NAME و DB_USER من .env — إن وُجدت يُستخدم MySQL، وإلا الذاكرة.
 */
import { memoryAdapter } from './memory.js';
import { mysqlAdapter, initMysql } from './mysql.js';

const useMysql = !!(process.env.DB_HOST && process.env.DB_USER);

export const db = useMysql ? mysqlAdapter : memoryAdapter;

export async function initDb() {
  if (useMysql) return initMysql();
  return Promise.resolve();
}
