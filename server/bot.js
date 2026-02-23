import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { query } from './db.js';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const allowedId = String(process.env.TELEGRAM_ALLOWED_ID || '');

if (!token || !allowedId) {
  console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_ALLOWED_ID');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

const isAllowed = (msg) => String(msg.chat.id) === allowedId;

const ensureAllowed = (msg) => {
  if (!isAllowed(msg)) {
    bot.sendMessage(msg.chat.id, 'غير مصرح لك باستخدام هذا البوت.');
    return false;
  }
  return true;
};

const helpText = `
أوامر البوت:
/tasks - عرض آخر 10 مهام
/addtask نص المهمة
/donetask ID
/deltask ID
/transactions - آخر 10 معاملات
/addexpense المبلغ | الوصف | الفئة
/addincome المبلغ | الوصف | الفئة
/deltrans ID
/budget المبلغ
/goal الاسم | المبلغ | التاريخ (YYYY-MM-DD)
/goals - عرض الأهداف
/goalprogress ID | المبلغ المحقق
/delgoal ID
/debt النوع(creditor/debtor) | الاسم | المبلغ | التاريخ
/debts - عرض الديون
/paydebt ID | المبلغ
/deldebt ID
/sub الاسم | المبلغ | التكرار(monthly/yearly/weekly) | التاريخ
/subs - عرض الاشتراكات
/delsub ID
`;

bot.onText(/\/start|\/help/, (msg) => {
  if (!ensureAllowed(msg)) return;
  bot.sendMessage(msg.chat.id, helpText);
});

bot.onText(/\/tasks/, async (msg) => {
  if (!ensureAllowed(msg)) return;
  const tasks = await query('SELECT id, text, completed FROM tasks ORDER BY created_at DESC LIMIT 10');
  if (tasks.length === 0) return bot.sendMessage(msg.chat.id, 'لا توجد مهام.');
  const lines = tasks.map(t => `${t.id} - ${t.completed ? '✅' : '⏳'} ${t.text}`);
  bot.sendMessage(msg.chat.id, lines.join('\n'));
});

bot.onText(/\/addtask (.+)/, async (msg, match) => {
  if (!ensureAllowed(msg)) return;
  const text = match[1].trim();
  if (!text) return bot.sendMessage(msg.chat.id, 'نص المهمة فارغ.');
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date();
  await query(
    `INSERT INTO tasks (id, text, priority, category, repeat_type, completed, created_at, completed_at, time_spent, next_due)
     VALUES (?, ?, 'normal', 'personal', 'none', 0, ?, NULL, 0, NULL)`,
    [id, text, now]
  );
  bot.sendMessage(msg.chat.id, `تمت إضافة المهمة: ${id}`);
});

bot.onText(/\/donetask (.+)/, async (msg, match) => {
  if (!ensureAllowed(msg)) return;
  const id = match[1].trim();
  await query('UPDATE tasks SET completed = 1, completed_at = ? WHERE id = ?', [new Date(), id]);
  bot.sendMessage(msg.chat.id, 'تم تحديث المهمة.');
});

bot.onText(/\/deltask (.+)/, async (msg, match) => {
  if (!ensureAllowed(msg)) return;
  const id = match[1].trim();
  await query('DELETE FROM tasks WHERE id = ?', [id]);
  bot.sendMessage(msg.chat.id, 'تم حذف المهمة.');
});

bot.onText(/\/transactions/, async (msg) => {
  if (!ensureAllowed(msg)) return;
  const rows = await query('SELECT id, amount, type, description FROM transactions ORDER BY date DESC LIMIT 10');
  if (rows.length === 0) return bot.sendMessage(msg.chat.id, 'لا توجد معاملات.');
  const lines = rows.map(t => `${t.id} - ${t.type === 'income' ? '+' : '-'}${t.amount} ${t.description}`);
  bot.sendMessage(msg.chat.id, lines.join('\n'));
});

bot.onText(/\/deltrans (.+)/, async (msg, match) => {
  if (!ensureAllowed(msg)) return;
  const id = match[1].trim();
  await query('DELETE FROM transactions WHERE id = ?', [id]);
  bot.sendMessage(msg.chat.id, 'تم حذف المعاملة.');
});

const parseParts = (text) => text.split('|').map((p) => p.trim());

bot.onText(/\/addexpense (.+)/, async (msg, match) => {
  if (!ensureAllowed(msg)) return;
  const parts = parseParts(match[1]);
  const amount = parseFloat(parts[0]);
  const description = parts[1] || '';
  const category = parts[2] || 'other';
  if (!amount || !description) return bot.sendMessage(msg.chat.id, 'صيغة خاطئة.');
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date();
  await query(
    `INSERT INTO transactions (id, amount, type, description, category, date, month, year)
     VALUES (?, ?, 'expense', ?, ?, ?, ?, ?)`,
    [id, amount, description, category, now, now.getMonth(), now.getFullYear()]
  );
  bot.sendMessage(msg.chat.id, 'تمت إضافة المصروف.');
});

bot.onText(/\/addincome (.+)/, async (msg, match) => {
  if (!ensureAllowed(msg)) return;
  const parts = parseParts(match[1]);
  const amount = parseFloat(parts[0]);
  const description = parts[1] || '';
  const category = parts[2] || 'salary';
  if (!amount || !description) return bot.sendMessage(msg.chat.id, 'صيغة خاطئة.');
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date();
  await query(
    `INSERT INTO transactions (id, amount, type, description, category, date, month, year)
     VALUES (?, ?, 'income', ?, ?, ?, ?, ?)`,
    [id, amount, description, category, now, now.getMonth(), now.getFullYear()]
  );
  bot.sendMessage(msg.chat.id, 'تمت إضافة الدخل.');
});

bot.onText(/\/budget (.+)/, async (msg, match) => {
  if (!ensureAllowed(msg)) return;
  const amount = parseFloat(match[1]);
  if (!amount) return bot.sendMessage(msg.chat.id, 'صيغة خاطئة.');
  await query('UPDATE budget SET amount = ? WHERE id = 1', [amount]);
  bot.sendMessage(msg.chat.id, 'تم تحديث الميزانية.');
});

bot.onText(/\/goal (.+)/, async (msg, match) => {
  if (!ensureAllowed(msg)) return;
  const [name, amountStr, date] = parseParts(match[1]);
  const amount = parseFloat(amountStr);
  if (!name || !amount || !date) return bot.sendMessage(msg.chat.id, 'صيغة خاطئة.');
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await query(
    `INSERT INTO goals (id, name, target_amount, current_amount, target_date, created_at, completed)
     VALUES (?, ?, ?, 0, ?, ?, 0)`,
    [id, name, amount, new Date(date), new Date()]
  );
  bot.sendMessage(msg.chat.id, 'تمت إضافة الهدف.');
});

bot.onText(/\/goals/, async (msg) => {
  if (!ensureAllowed(msg)) return;
  const rows = await query('SELECT id, name, target_amount, current_amount FROM goals ORDER BY target_date ASC LIMIT 10');
  if (rows.length === 0) return bot.sendMessage(msg.chat.id, 'لا توجد أهداف.');
  const lines = rows.map(g => `${g.id} - ${g.name} (${g.current_amount}/${g.target_amount})`);
  bot.sendMessage(msg.chat.id, lines.join('\n'));
});

bot.onText(/\/goalprogress (.+)/, async (msg, match) => {
  if (!ensureAllowed(msg)) return;
  const [id, amountStr] = parseParts(match[1]);
  const amount = parseFloat(amountStr);
  if (!id || !amount) return bot.sendMessage(msg.chat.id, 'صيغة خاطئة.');
  const rows = await query('SELECT target_amount FROM goals WHERE id = ?', [id]);
  if (rows.length === 0) return bot.sendMessage(msg.chat.id, 'الهدف غير موجود.');
  const completed = amount >= Number(rows[0].target_amount) ? 1 : 0;
  await query('UPDATE goals SET current_amount = ?, completed = ? WHERE id = ?', [amount, completed, id]);
  bot.sendMessage(msg.chat.id, 'تم تحديث تقدم الهدف.');
});

bot.onText(/\/delgoal (.+)/, async (msg, match) => {
  if (!ensureAllowed(msg)) return;
  const id = match[1].trim();
  await query('DELETE FROM goals WHERE id = ?', [id]);
  bot.sendMessage(msg.chat.id, 'تم حذف الهدف.');
});

bot.onText(/\/debt (.+)/, async (msg, match) => {
  if (!ensureAllowed(msg)) return;
  const [type, name, amountStr, date] = parseParts(match[1]);
  const amount = parseFloat(amountStr);
  if (!type || !name || !amount || !date) return bot.sendMessage(msg.chat.id, 'صيغة خاطئة.');
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await query(
    `INSERT INTO debts (id, type, person_name, total_amount, paid_amount, due_date, created_at, status)
     VALUES (?, ?, ?, ?, 0, ?, ?, 'active')`,
    [id, type, name, amount, new Date(date), new Date()]
  );
  bot.sendMessage(msg.chat.id, 'تمت إضافة الدين.');
});

bot.onText(/\/debts/, async (msg) => {
  if (!ensureAllowed(msg)) return;
  const rows = await query('SELECT id, type, person_name, total_amount, paid_amount FROM debts ORDER BY due_date ASC LIMIT 10');
  if (rows.length === 0) return bot.sendMessage(msg.chat.id, 'لا توجد ديون.');
  const lines = rows.map(d => `${d.id} - ${d.type} ${d.person_name} (${d.paid_amount}/${d.total_amount})`);
  bot.sendMessage(msg.chat.id, lines.join('\n'));
});

bot.onText(/\/paydebt (.+)/, async (msg, match) => {
  if (!ensureAllowed(msg)) return;
  const [id, amountStr] = parseParts(match[1]);
  const amount = parseFloat(amountStr);
  if (!id || !amount) return bot.sendMessage(msg.chat.id, 'صيغة خاطئة.');
  const rows = await query('SELECT total_amount, paid_amount FROM debts WHERE id = ?', [id]);
  if (rows.length === 0) return bot.sendMessage(msg.chat.id, 'الدين غير موجود.');
  const total = Number(rows[0].total_amount);
  const paid = Number(rows[0].paid_amount) + amount;
  const status = paid >= total ? 'completed' : 'active';
  await query('UPDATE debts SET paid_amount = ?, status = ? WHERE id = ?', [paid, status, id]);
  bot.sendMessage(msg.chat.id, 'تم تحديث الدين.');
});

bot.onText(/\/deldebt (.+)/, async (msg, match) => {
  if (!ensureAllowed(msg)) return;
  const id = match[1].trim();
  await query('DELETE FROM debts WHERE id = ?', [id]);
  bot.sendMessage(msg.chat.id, 'تم حذف الدين.');
});

bot.onText(/\/sub (.+)/, async (msg, match) => {
  if (!ensureAllowed(msg)) return;
  const [name, amountStr, frequency, date] = parseParts(match[1]);
  const amount = parseFloat(amountStr);
  if (!name || !amount || !frequency || !date) return bot.sendMessage(msg.chat.id, 'صيغة خاطئة.');
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await query(
    `INSERT INTO subscriptions (id, name, amount, frequency, next_payment, created_at, status)
     VALUES (?, ?, ?, ?, ?, ?, 'active')`,
    [id, name, amount, frequency, new Date(date), new Date()]
  );
  bot.sendMessage(msg.chat.id, 'تمت إضافة الاشتراك.');
});

bot.onText(/\/subs/, async (msg) => {
  if (!ensureAllowed(msg)) return;
  const rows = await query('SELECT id, name, amount, frequency FROM subscriptions ORDER BY next_payment ASC LIMIT 10');
  if (rows.length === 0) return bot.sendMessage(msg.chat.id, 'لا توجد اشتراكات.');
  const lines = rows.map(s => `${s.id} - ${s.name} (${s.amount} ${s.frequency})`);
  bot.sendMessage(msg.chat.id, lines.join('\n'));
});

bot.onText(/\/delsub (.+)/, async (msg, match) => {
  if (!ensureAllowed(msg)) return;
  const id = match[1].trim();
  await query('DELETE FROM subscriptions WHERE id = ?', [id]);
  bot.sendMessage(msg.chat.id, 'تم حذف الاشتراك.');
});

bot.on('polling_error', (err) => {
  console.error('Bot polling error', err.message);
});
