/**
 * MySQL data adapter — تخزين دائم. يقرأ الاتصال من .env
 * جميع الاستجابات camelCase.
 */
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || process.env.DB_PASS,
  database: process.env.DB_NAME || 'muntadher_system',
  connectionLimit: 10,
  charset: 'utf8mb4',
  dateStrings: true,
});

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    let val = v;
    if (typeof val === 'string' && (k === 'meta' || k === 'kpis' || k === 'materials' || k === 'settings') && (val.startsWith('{') || val.startsWith('['))) {
      try { val = JSON.parse(val); } catch (_) {}
    }
    out[key] = val;
  }
  return out;
}

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

export async function initMysql() {
  const schemaPath = join(__dirname, '..', 'schema-unified.sql');
  const sql = readFileSync(schemaPath, 'utf8');
  const conn = await pool.getConnection();
  try {
    const statements = sql
      .replace(/--[^\n]*/g, '\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 2 && !s.startsWith('/*'));
    for (const stmt of statements) {
      try {
        await conn.query(stmt + ';');
      } catch (err) {
        if (err.code !== 'ER_TABLE_EXISTS_ERROR' && err.code !== 'ER_DUP_ENTRY' && err.code !== 'ER_DUP_KEYNAME' && err.code !== 'ER_FK_DUP_NAME') {
          console.warn('Schema:', err.message);
        }
      }
    }
    console.log('MySQL schema initialized');
  } finally {
    conn.release();
  }
}

export const mysqlAdapter = {
  async listWorkspaces() {
    const rows = await query('SELECT * FROM workspaces ORDER BY sort_order');
    return rows.map(toCamel);
  },
  async getWorkspace(workspaceId) {
    const row = await queryOne('SELECT * FROM workspaces WHERE id = ?', [workspaceId]);
    return row ? toCamel(row) : null;
  },

  async listTasks(workspaceId, { status, priority } = {}) {
    let sql = 'SELECT * FROM tasks WHERE workspace_id = ?';
    const params = [workspaceId];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (priority) { sql += ' AND priority = ?'; params.push(priority); }
    sql += ' ORDER BY created_at DESC';
    const rows = await query(sql, params);
    return rows.map(toCamel).map(t => ({ ...t, text: t.title }));
  },
  async getTask(taskId) {
    const row = await queryOne('SELECT * FROM tasks WHERE id = ?', [taskId]);
    return row ? toCamel(row) : null;
  },
  async addTask(workspaceId, task) {
    const tid = task.id || id();
    const dueAt = task.dueAt || task.due_at || null;
    const completedAt = task.completedAt || (task.completed ? new Date() : null);
    await query(
      `INSERT INTO tasks (id, workspace_id, title, description, status, priority, due_at, completed_at, time_spent, repeat_type, next_due, meta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tid, workspaceId,
        task.title || task.text || '',
        task.description || null,
        task.status || 'todo',
        task.priority || 'normal',
        dueAt, completedAt,
        task.timeSpent ?? 0,
        task.repeatType || task.repeat || 'none',
        task.nextDue || task.next_due || null,
        task.meta ? JSON.stringify(task.meta) : null
      ]
    );
    return toCamel((await query('SELECT * FROM tasks WHERE id = ?', [tid]))[0]);
  },
  async updateTask(taskId, updates) {
    const sets = [];
    const params = [];
    if (updates.title !== undefined) { sets.push('title = ?'); params.push(updates.title); }
    if (updates.text !== undefined) { sets.push('title = ?'); params.push(updates.text); }
    if (updates.description !== undefined) { sets.push('description = ?'); params.push(updates.description); }
    if (updates.status !== undefined) { sets.push('status = ?'); params.push(updates.status); }
    if (updates.priority !== undefined) { sets.push('priority = ?'); params.push(updates.priority); }
    if (updates.dueAt !== undefined) { sets.push('due_at = ?'); params.push(updates.dueAt); }
    if (updates.completed !== undefined) {
      sets.push('completed_at = ?'); params.push(updates.completed ? new Date() : null);
      sets.push('status = ?'); params.push(updates.completed ? 'done' : 'todo');
    }
    if (updates.completedAt !== undefined) { sets.push('completed_at = ?'); params.push(updates.completedAt); }
    if (updates.timeSpent !== undefined) { sets.push('time_spent = ?'); params.push(updates.timeSpent); }
    if (updates.nextDue !== undefined) { sets.push('next_due = ?'); params.push(updates.nextDue); }
    if (sets.length === 0) return this.getTask(taskId);
    params.push(taskId);
    await query(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, params);
    return this.getTask(taskId);
  },
  async deleteTask(taskId) {
    const [r] = await pool.execute('DELETE FROM tasks WHERE id = ?', [taskId]);
    return r.affectedRows > 0;
  },

  async listCalendarEvents({ workspaceId, from, to } = {}) {
    let sql = 'SELECT * FROM calendar_events WHERE 1=1';
    const params = [];
    if (workspaceId) { sql += ' AND workspace_id = ?'; params.push(workspaceId); }
    if (from) { sql += ' AND end_at >= ?'; params.push(from); }
    if (to) { sql += ' AND start_at <= ?'; params.push(to); }
    sql += ' ORDER BY start_at';
    const rows = await query(sql, params);
    return rows.map(toCamel);
  },
  async addCalendarEvent(event) {
    const eid = event.id || id();
    await query(
      `INSERT INTO calendar_events (id, workspace_id, title, start_at, end_at, event_type, recurring_rule, meta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eid, event.workspaceId || null, event.title,
        event.startAt || event.start_at, event.endAt || event.end_at,
        event.eventType || event.event_type || 'event',
        event.recurringRule || null,
        event.meta ? JSON.stringify(event.meta) : null
      ]
    );
    return toCamel((await query('SELECT * FROM calendar_events WHERE id = ?', [eid]))[0]);
  },
  async updateCalendarEvent(eventId, updates) {
    const sets = [];
    const params = [];
    ['title', 'startAt', 'endAt', 'eventType', 'recurringRule', 'workspaceId'].forEach(k => {
      const snake = k.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
      if (updates[k] !== undefined) { sets.push(`${snake} = ?`); params.push(updates[k]); }
    });
    if (sets.length === 0) return (await query('SELECT * FROM calendar_events WHERE id = ?', [eventId]))[0] ? toCamel((await query('SELECT * FROM calendar_events WHERE id = ?', [eventId]))[0]) : null;
    params.push(eventId);
    await query(`UPDATE calendar_events SET ${sets.join(', ')} WHERE id = ?`, params);
    return toCamel((await queryOne('SELECT * FROM calendar_events WHERE id = ?', [eventId])));
  },
  async deleteCalendarEvent(eventId) {
    const [r] = await pool.execute('DELETE FROM calendar_events WHERE id = ?', [eventId]);
    return r.affectedRows > 0;
  },

  async listNotifications({ unreadOnly = false } = {}) {
    let sql = 'SELECT * FROM notifications';
    if (unreadOnly) sql += ' WHERE read_at IS NULL';
    sql += ' ORDER BY created_at DESC';
    const rows = await query(sql);
    return rows.map(toCamel);
  },
  async addNotification(notification) {
    const nid = notification.id || id();
    await query(
      'INSERT INTO notifications (id, workspace_id, title, body) VALUES (?, ?, ?, ?)',
      [nid, notification.workspaceId || null, notification.title, notification.body || null]
    );
    return toCamel((await queryOne('SELECT * FROM notifications WHERE id = ?', [nid])));
  },
  async markNotificationRead(notificationId) {
    const [r] = await pool.execute('UPDATE notifications SET read_at = NOW() WHERE id = ?', [notificationId]);
    return r.affectedRows > 0;
  },

  async listExpenses(workspaceId) {
    const rows = await query('SELECT * FROM expenses WHERE workspace_id = ? ORDER BY expense_date DESC', [workspaceId]);
    return rows.map(toCamel);
  },
  async addExpense(workspaceId, expense) {
    const eid = expense.id || id();
    const d = expense.expenseDate || expense.expense_date || new Date();
    await query(
      'INSERT INTO expenses (id, workspace_id, amount, category, description, expense_date, meta) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [eid, workspaceId, expense.amount, expense.category, expense.description || null, d, expense.meta ? JSON.stringify(expense.meta) : null]
    );
    return toCamel((await queryOne('SELECT * FROM expenses WHERE id = ?', [eid])));
  },
  async updateExpense(expenseId, updates) {
    const sets = []; const params = [];
    if (updates.amount !== undefined) { sets.push('amount = ?'); params.push(updates.amount); }
    if (updates.category !== undefined) { sets.push('category = ?'); params.push(updates.category); }
    if (updates.description !== undefined) { sets.push('description = ?'); params.push(updates.description); }
    if (updates.expenseDate !== undefined) { sets.push('expense_date = ?'); params.push(updates.expenseDate); }
    if (sets.length === 0) return toCamel(await queryOne('SELECT * FROM expenses WHERE id = ?', [expenseId]));
    params.push(expenseId);
    await query(`UPDATE expenses SET ${sets.join(', ')} WHERE id = ?`, params);
    return toCamel(await queryOne('SELECT * FROM expenses WHERE id = ?', [expenseId]));
  },
  async deleteExpense(expenseId) {
    const [r] = await pool.execute('DELETE FROM expenses WHERE id = ?', [expenseId]);
    return r.affectedRows > 0;
  },

  async listRoadmapItems(workspaceId) {
    const rows = await query('SELECT * FROM roadmap_items WHERE workspace_id = ? ORDER BY sort_order, target_date', [workspaceId]);
    return rows.map(toCamel);
  },
  async addRoadmapItem(workspaceId, item) {
    const rid = item.id || id();
    await query(
      `INSERT INTO roadmap_items (id, workspace_id, title, description, status, target_date, item_type, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [rid, workspaceId, item.title, item.description || null, item.status || 'planned', item.targetDate || item.target_date || null, item.itemType || item.item_type || 'feature', item.sortOrder ?? 0]
    );
    return toCamel((await queryOne('SELECT * FROM roadmap_items WHERE id = ?', [rid])));
  },
  async updateRoadmapItem(itemId, updates) {
    const sets = []; const params = [];
    ['title', 'description', 'status', 'targetDate', 'itemType', 'sortOrder'].forEach(k => {
      const snake = k.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
      if (updates[k] !== undefined) { sets.push(`${snake} = ?`); params.push(updates[k]); }
    });
    if (sets.length === 0) return toCamel(await queryOne('SELECT * FROM roadmap_items WHERE id = ?', [itemId]));
    params.push(itemId);
    await query(`UPDATE roadmap_items SET ${sets.join(', ')} WHERE id = ?`, params);
    return toCamel(await queryOne('SELECT * FROM roadmap_items WHERE id = ?', [itemId]));
  },
  async deleteRoadmapItem(itemId) {
    const [r] = await pool.execute('DELETE FROM roadmap_items WHERE id = ?', [itemId]);
    return r.affectedRows > 0;
  },

  async listBacklogItems(workspaceId) {
    const rows = await query('SELECT * FROM backlog_items WHERE workspace_id = ? ORDER BY created_at DESC', [workspaceId]);
    return rows.map(toCamel);
  },
  async addBacklogItem(workspaceId, item) {
    const bid = item.id || id();
    await query(
      `INSERT INTO backlog_items (id, workspace_id, title, item_type, priority, status, story_points, meta) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [bid, workspaceId, item.title, item.itemType || item.item_type || 'feature', item.priority || 'medium', item.status || 'backlog', item.storyPoints ?? item.story_points ?? null, item.meta ? JSON.stringify(item.meta) : null]
    );
    return toCamel((await queryOne('SELECT * FROM backlog_items WHERE id = ?', [bid])));
  },
  async updateBacklogItem(itemId, updates) {
    const sets = []; const params = [];
    ['title', 'itemType', 'priority', 'status', 'storyPoints'].forEach(k => {
      const snake = k.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
      if (updates[k] !== undefined) { sets.push(`${snake} = ?`); params.push(updates[k]); }
    });
    if (sets.length === 0) return toCamel(await queryOne('SELECT * FROM backlog_items WHERE id = ?', [itemId]));
    params.push(itemId);
    await query(`UPDATE backlog_items SET ${sets.join(', ')} WHERE id = ?`, params);
    return toCamel(await queryOne('SELECT * FROM backlog_items WHERE id = ?', [itemId]));
  },
  async deleteBacklogItem(itemId) {
    const [r] = await pool.execute('DELETE FROM backlog_items WHERE id = ?', [itemId]);
    return r.affectedRows > 0;
  },

  async listTechDocs(workspaceId) {
    const rows = await query('SELECT * FROM tech_docs WHERE workspace_id = ? ORDER BY updated_at DESC', [workspaceId]);
    return rows.map(toCamel);
  },
  async getTechDoc(docId) {
    const row = await queryOne('SELECT * FROM tech_docs WHERE id = ?', [docId]);
    return row ? toCamel(row) : null;
  },
  async addTechDoc(workspaceId, doc) {
    const did = doc.id || id();
    await query(
      'INSERT INTO tech_docs (id, workspace_id, title, content, category) VALUES (?, ?, ?, ?, ?)',
      [did, workspaceId, doc.title, doc.content || null, doc.category || null]
    );
    return toCamel((await queryOne('SELECT * FROM tech_docs WHERE id = ?', [did])));
  },
  async updateTechDoc(docId, updates) {
    const sets = []; const params = [];
    if (updates.title !== undefined) { sets.push('title = ?'); params.push(updates.title); }
    if (updates.content !== undefined) { sets.push('content = ?'); params.push(updates.content); }
    if (updates.category !== undefined) { sets.push('category = ?'); params.push(updates.category); }
    if (sets.length === 0) return this.getTechDoc(docId);
    params.push(docId);
    await query(`UPDATE tech_docs SET ${sets.join(', ')} WHERE id = ?`, params);
    return this.getTechDoc(docId);
  },
  async deleteTechDoc(docId) {
    const [r] = await pool.execute('DELETE FROM tech_docs WHERE id = ?', [docId]);
    return r.affectedRows > 0;
  },

  async listOrgRoles(workspaceId) {
    const rows = await query('SELECT * FROM org_roles WHERE workspace_id = ? ORDER BY sort_order', [workspaceId]);
    return rows.map(toCamel);
  },
  async addOrgRole(workspaceId, role) {
    const rid = role.id || id();
    await query(
      'INSERT INTO org_roles (id, workspace_id, title_ar, title_en, parent_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [rid, workspaceId, role.titleAr ?? role.title_ar, role.titleEn ?? role.title_en ?? null, role.parentId ?? role.parent_id ?? null, role.sortOrder ?? 0]
    );
    return toCamel((await queryOne('SELECT * FROM org_roles WHERE id = ?', [rid])));
  },
  async updateOrgRole(roleId, updates) {
    const sets = []; const params = [];
    if (updates.titleAr !== undefined) { sets.push('title_ar = ?'); params.push(updates.titleAr); }
    if (updates.titleEn !== undefined) { sets.push('title_en = ?'); params.push(updates.titleEn); }
    if (updates.parentId !== undefined) { sets.push('parent_id = ?'); params.push(updates.parentId); }
    if (updates.sortOrder !== undefined) { sets.push('sort_order = ?'); params.push(updates.sortOrder); }
    if (sets.length === 0) return toCamel(await queryOne('SELECT * FROM org_roles WHERE id = ?', [roleId]));
    params.push(roleId);
    await query(`UPDATE org_roles SET ${sets.join(', ')} WHERE id = ?`, params);
    return toCamel(await queryOne('SELECT * FROM org_roles WHERE id = ?', [roleId]));
  },
  async deleteOrgRole(roleId) {
    const [r] = await pool.execute('DELETE FROM org_roles WHERE id = ?', [roleId]);
    return r.affectedRows > 0;
  },

  async listTeamMembers(workspaceId) {
    const rows = await query('SELECT * FROM team_members WHERE workspace_id = ? ORDER BY name', [workspaceId]);
    return rows.map(toCamel);
  },
  async addTeamMember(workspaceId, member) {
    const mid = member.id || id();
    await query(
      'INSERT INTO team_members (id, workspace_id, name, role_id, contact, kpis, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [mid, workspaceId, member.name, member.roleId ?? member.role_id ?? null, member.contact || null, member.kpis ? JSON.stringify(member.kpis) : null, member.notes || null]
    );
    return toCamel((await queryOne('SELECT * FROM team_members WHERE id = ?', [mid])));
  },
  async updateTeamMember(memberId, updates) {
    const sets = []; const params = [];
    ['name', 'roleId', 'contact', 'kpis', 'notes'].forEach(k => {
      const snake = k.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
      if (updates[k] !== undefined) { sets.push(`${snake} = ?`); params.push(typeof updates[k] === 'object' && k === 'kpis' ? JSON.stringify(updates[k]) : updates[k]); }
    });
    if (sets.length === 0) return toCamel(await queryOne('SELECT * FROM team_members WHERE id = ?', [memberId]));
    params.push(memberId);
    await query(`UPDATE team_members SET ${sets.join(', ')} WHERE id = ?`, params);
    return toCamel(await queryOne('SELECT * FROM team_members WHERE id = ?', [memberId]));
  },
  async deleteTeamMember(memberId) {
    const [r] = await pool.execute('DELETE FROM team_members WHERE id = ?', [memberId]);
    return r.affectedRows > 0;
  },

  async listDepartmentBudgets(workspaceId) {
    const rows = await query('SELECT * FROM department_budgets WHERE workspace_id = ? ORDER BY period_start DESC', [workspaceId]);
    return rows.map(toCamel);
  },
  async addDepartmentBudget(workspaceId, budget) {
    const bid = budget.id || id();
    await query(
      'INSERT INTO department_budgets (id, workspace_id, role_id, amount, period_start, period_end) VALUES (?, ?, ?, ?, ?, ?)',
      [bid, workspaceId, budget.roleId ?? budget.role_id ?? null, budget.amount, budget.periodStart || budget.period_start, budget.periodEnd || budget.period_end]
    );
    return toCamel((await queryOne('SELECT * FROM department_budgets WHERE id = ?', [bid])));
  },
  async updateDepartmentBudget(budgetId, updates) {
    const sets = []; const params = [];
    if (updates.roleId !== undefined) { sets.push('role_id = ?'); params.push(updates.roleId); }
    if (updates.amount !== undefined) { sets.push('amount = ?'); params.push(updates.amount); }
    if (updates.periodStart !== undefined) { sets.push('period_start = ?'); params.push(updates.periodStart); }
    if (updates.periodEnd !== undefined) { sets.push('period_end = ?'); params.push(updates.periodEnd); }
    if (sets.length === 0) return toCamel(await queryOne('SELECT * FROM department_budgets WHERE id = ?', [budgetId]));
    params.push(budgetId);
    await query(`UPDATE department_budgets SET ${sets.join(', ')} WHERE id = ?`, params);
    return toCamel(await queryOne('SELECT * FROM department_budgets WHERE id = ?', [budgetId]));
  },
  async deleteDepartmentBudget(budgetId) {
    const [r] = await pool.execute('DELETE FROM department_budgets WHERE id = ?', [budgetId]);
    return r.affectedRows > 0;
  },

  async listSuppliers(workspaceId) {
    const rows = await query('SELECT * FROM suppliers WHERE workspace_id = ? ORDER BY name', [workspaceId]);
    return rows.map(toCamel);
  },
  async addSupplier(workspaceId, supplier) {
    const sid = supplier.id || id();
    await query(
      'INSERT INTO suppliers (id, workspace_id, name, contact, materials, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [sid, workspaceId, supplier.name, supplier.contact || null, supplier.materials ? JSON.stringify(supplier.materials) : null, supplier.notes || null]
    );
    return toCamel((await queryOne('SELECT * FROM suppliers WHERE id = ?', [sid])));
  },
  async updateSupplier(supplierId, updates) {
    const sets = []; const params = [];
    if (updates.name !== undefined) { sets.push('name = ?'); params.push(updates.name); }
    if (updates.contact !== undefined) { sets.push('contact = ?'); params.push(updates.contact); }
    if (updates.materials !== undefined) { sets.push('materials = ?'); params.push(JSON.stringify(updates.materials)); }
    if (updates.notes !== undefined) { sets.push('notes = ?'); params.push(updates.notes); }
    if (sets.length === 0) return toCamel(await queryOne('SELECT * FROM suppliers WHERE id = ?', [supplierId]));
    params.push(supplierId);
    await query(`UPDATE suppliers SET ${sets.join(', ')} WHERE id = ?`, params);
    return toCamel(await queryOne('SELECT * FROM suppliers WHERE id = ?', [supplierId]));
  },
  async deleteSupplier(supplierId) {
    const [r] = await pool.execute('DELETE FROM suppliers WHERE id = ?', [supplierId]);
    return r.affectedRows > 0;
  },

  async listInventoryItems(workspaceId) {
    const rows = await query('SELECT * FROM inventory_items WHERE workspace_id = ? ORDER BY name', [workspaceId]);
    return rows.map(toCamel);
  },
  async addInventoryItem(workspaceId, item) {
    const iid = item.id || id();
    await query(
      'INSERT INTO inventory_items (id, workspace_id, name, item_type, quantity, unit, min_level, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [iid, workspaceId, item.name, item.itemType || item.item_type || 'product', item.quantity ?? 0, item.unit || 'pcs', item.minLevel ?? item.min_level ?? null, item.notes || null]
    );
    return toCamel((await queryOne('SELECT * FROM inventory_items WHERE id = ?', [iid])));
  },
  async updateInventoryItem(itemId, updates) {
    const sets = []; const params = [];
    ['name', 'itemType', 'quantity', 'unit', 'minLevel', 'notes'].forEach(k => {
      const snake = k.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
      if (updates[k] !== undefined) { sets.push(`${snake} = ?`); params.push(updates[k]); }
    });
    if (sets.length === 0) return toCamel(await queryOne('SELECT * FROM inventory_items WHERE id = ?', [itemId]));
    params.push(itemId);
    await query(`UPDATE inventory_items SET ${sets.join(', ')} WHERE id = ?`, params);
    return toCamel(await queryOne('SELECT * FROM inventory_items WHERE id = ?', [itemId]));
  },
  async deleteInventoryItem(itemId) {
    const [r] = await pool.execute('DELETE FROM inventory_items WHERE id = ?', [itemId]);
    return r.affectedRows > 0;
  },

  async listCampaigns(workspaceId) {
    const rows = await query('SELECT * FROM campaigns WHERE workspace_id = ? ORDER BY start_date DESC', [workspaceId]);
    return rows.map(toCamel);
  },
  async addCampaign(workspaceId, campaign) {
    const cid = campaign.id || id();
    await query(
      'INSERT INTO campaigns (id, workspace_id, name, start_date, end_date, status, budget) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [cid, workspaceId, campaign.name, campaign.startDate || campaign.start_date, campaign.endDate || campaign.end_date, campaign.status || 'draft', campaign.budget ?? null]
    );
    return toCamel((await queryOne('SELECT * FROM campaigns WHERE id = ?', [cid])));
  },
  async updateCampaign(campaignId, updates) {
    const sets = []; const params = [];
    ['name', 'startDate', 'endDate', 'status', 'budget'].forEach(k => {
      const snake = k.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
      if (updates[k] !== undefined) { sets.push(`${snake} = ?`); params.push(updates[k]); }
    });
    if (sets.length === 0) return toCamel(await queryOne('SELECT * FROM campaigns WHERE id = ?', [campaignId]));
    params.push(campaignId);
    await query(`UPDATE campaigns SET ${sets.join(', ')} WHERE id = ?`, params);
    return toCamel(await queryOne('SELECT * FROM campaigns WHERE id = ?', [campaignId]));
  },
  async deleteCampaign(campaignId) {
    const [r] = await pool.execute('DELETE FROM campaigns WHERE id = ?', [campaignId]);
    return r.affectedRows > 0;
  },

  async listContentPlanItems(workspaceId, planMonth) {
    const rows = await query(
      'SELECT * FROM content_plan_items WHERE workspace_id = ? AND plan_month = ? ORDER BY day_of_month ASC, sort_order ASC',
      [workspaceId, planMonth]
    );
    return rows.map(toCamel);
  },
  async addContentPlanItem(workspaceId, item) {
    const cid = item.id || id();
    await query(
      'INSERT INTO content_plan_items (id, workspace_id, plan_month, day_of_month, title, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        cid,
        workspaceId,
        item.planMonth || item.plan_month,
        item.dayOfMonth ?? item.day_of_month ?? null,
        item.title,
        item.notes || null,
        item.sortOrder ?? item.sort_order ?? 0,
      ]
    );
    return toCamel((await queryOne('SELECT * FROM content_plan_items WHERE id = ?', [cid])));
  },
  async updateContentPlanItem(itemId, updates) {
    const sets = [];
    const params = [];
    if (updates.title !== undefined) { sets.push('title = ?'); params.push(updates.title); }
    if (updates.notes !== undefined) { sets.push('notes = ?'); params.push(updates.notes); }
    if (updates.dayOfMonth !== undefined) { sets.push('day_of_month = ?'); params.push(updates.dayOfMonth); }
    if (updates.day_of_month !== undefined) { sets.push('day_of_month = ?'); params.push(updates.day_of_month); }
    if (updates.sortOrder !== undefined) { sets.push('sort_order = ?'); params.push(updates.sortOrder); }
    if (sets.length === 0) return toCamel(await queryOne('SELECT * FROM content_plan_items WHERE id = ?', [itemId]));
    params.push(itemId);
    await query(`UPDATE content_plan_items SET ${sets.join(', ')} WHERE id = ?`, params);
    const row = await queryOne('SELECT * FROM content_plan_items WHERE id = ?', [itemId]);
    return row ? toCamel(row) : null;
  },
  async deleteContentPlanItem(itemId) {
    const [r] = await pool.execute('DELETE FROM content_plan_items WHERE id = ?', [itemId]);
    return r.affectedRows > 0;
  },
  async resetContentPlanMonth(workspaceId, planMonth) {
    const [r] = await pool.execute('DELETE FROM content_plan_items WHERE workspace_id = ? AND plan_month = ?', [
      workspaceId,
      planMonth,
    ]);
    return true;
  },

  async listStudyTerms(workspaceId) {
    const rows = await query('SELECT * FROM study_terms WHERE workspace_id = ? ORDER BY start_date DESC', [workspaceId]);
    return rows.map(toCamel);
  },
  async addStudyTerm(workspaceId, term) {
    const tid = term.id || id();
    await query(
      'INSERT INTO study_terms (id, workspace_id, name, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
      [tid, workspaceId, term.name, term.startDate || term.start_date, term.endDate || term.end_date]
    );
    return toCamel((await queryOne('SELECT * FROM study_terms WHERE id = ?', [tid])));
  },
  async deleteStudyTerm(termId) {
    const [r] = await pool.execute('DELETE FROM study_terms WHERE id = ?', [termId]);
    return r.affectedRows > 0;
  },
  async listStudyItems(workspaceId, { termId } = {}) {
    let sql = 'SELECT * FROM study_items WHERE workspace_id = ?';
    const params = [workspaceId];
    if (termId) { sql += ' AND term_id = ?'; params.push(termId); }
    sql += ' ORDER BY scheduled_at';
    const rows = await query(sql, params);
    return rows.map(toCamel);
  },
  async addStudyItem(workspaceId, item) {
    const sid = item.id || id();
    await query(
      'INSERT INTO study_items (id, workspace_id, term_id, title, item_type, scheduled_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [sid, workspaceId, item.termId ?? item.term_id ?? null, item.title, item.itemType || item.item_type || 'lecture', item.scheduledAt || item.scheduled_at || null, item.notes || null]
    );
    return toCamel((await queryOne('SELECT * FROM study_items WHERE id = ?', [sid])));
  },
  async updateStudyItem(itemId, updates) {
    const sets = []; const params = [];
    ['termId', 'title', 'itemType', 'scheduledAt', 'notes'].forEach(k => {
      const snake = k.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
      if (updates[k] !== undefined) { sets.push(`${snake} = ?`); params.push(updates[k]); }
    });
    if (sets.length === 0) return toCamel(await queryOne('SELECT * FROM study_items WHERE id = ?', [itemId]));
    params.push(itemId);
    await query(`UPDATE study_items SET ${sets.join(', ')} WHERE id = ?`, params);
    return toCamel(await queryOne('SELECT * FROM study_items WHERE id = ?', [itemId]));
  },
  async deleteStudyItem(itemId) {
    const [r] = await pool.execute('DELETE FROM study_items WHERE id = ?', [itemId]);
    return r.affectedRows > 0;
  },

  async listCourses(workspaceId) {
    const rows = await query('SELECT * FROM courses WHERE workspace_id = ? ORDER BY created_at DESC', [workspaceId]);
    return rows.map(toCamel);
  },
  async addCourse(workspaceId, course) {
    const cid = course.id || id();
    await query(
      'INSERT INTO courses (id, workspace_id, name, platform, progress_pct, target_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [cid, workspaceId, course.name, course.platform || null, course.progressPct ?? course.progress_pct ?? 0, course.targetDate || course.target_date || null, course.notes || null]
    );
    return toCamel((await queryOne('SELECT * FROM courses WHERE id = ?', [cid])));
  },
  async updateCourse(courseId, updates) {
    const sets = []; const params = [];
    ['name', 'platform', 'progressPct', 'targetDate', 'notes'].forEach(k => {
      const snake = k.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
      if (updates[k] !== undefined) { sets.push(`${snake} = ?`); params.push(updates[k]); }
    });
    if (sets.length === 0) return toCamel(await queryOne('SELECT * FROM courses WHERE id = ?', [courseId]));
    params.push(courseId);
    await query(`UPDATE courses SET ${sets.join(', ')} WHERE id = ?`, params);
    return toCamel(await queryOne('SELECT * FROM courses WHERE id = ?', [courseId]));
  },
  async deleteCourse(courseId) {
    const [r] = await pool.execute('DELETE FROM courses WHERE id = ?', [courseId]);
    return r.affectedRows > 0;
  },

  async listFitnessEntries(workspaceId, { from, to } = {}) {
    let sql = 'SELECT * FROM fitness_entries WHERE workspace_id = ?';
    const params = [workspaceId];
    if (from) { sql += ' AND fitness_date >= ?'; params.push(from); }
    if (to) { sql += ' AND fitness_date <= ?'; params.push(to); }
    sql += ' ORDER BY fitness_date DESC';
    const rows = await query(sql, params);
    return rows.map(toCamel);
  },
  async addFitnessEntry(workspaceId, entry) {
    const fid = entry.id || id();
    const d = entry.fitnessDate || entry.fitness_date || new Date();
    await query(
      'INSERT INTO fitness_entries (id, workspace_id, activity_type, duration_min, fitness_date, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [fid, workspaceId, entry.activityType || entry.activity_type, entry.durationMin ?? entry.duration_min, d, entry.notes || null]
    );
    return toCamel((await queryOne('SELECT * FROM fitness_entries WHERE id = ?', [fid])));
  },
  async deleteFitnessEntry(entryId) {
    const [r] = await pool.execute('DELETE FROM fitness_entries WHERE id = ?', [entryId]);
    return r.affectedRows > 0;
  },

  async listTransactions(workspaceId) {
    const rows = await query('SELECT * FROM transactions WHERE workspace_id = ? ORDER BY trans_date DESC', [workspaceId]);
    return rows.map(toCamel).map(t => ({ ...t, date: t.transDate }));
  },
  async addTransaction(workspaceId, trans) {
    const tid = trans.id || id();
    const d = trans.date ? new Date(trans.date) : new Date();
    await query(
      'INSERT INTO transactions (id, workspace_id, amount, type, description, category, trans_date, month, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [tid, workspaceId, trans.amount, trans.type, trans.description || '', trans.category || '', d, d.getMonth(), d.getFullYear()]
    );
    const row = await queryOne('SELECT * FROM transactions WHERE id = ?', [tid]);
    return toCamel({ ...row, date: row.trans_date });
  },
  async deleteTransaction(transId) {
    const [r] = await pool.execute('DELETE FROM transactions WHERE id = ?', [transId]);
    return r.affectedRows > 0;
  },
  async getBudget(workspaceId) {
    const row = await queryOne('SELECT amount FROM budget WHERE workspace_id = ?', [workspaceId]);
    return row ? Number(row.amount) : 0;
  },
  async setBudget(workspaceId, amount) {
    await query(
      'INSERT INTO budget (workspace_id, amount) VALUES (?, ?) ON DUPLICATE KEY UPDATE amount = VALUES(amount)',
      [workspaceId, Number(amount)]
    );
    return Number(amount);
  },
  async listGoals(workspaceId) {
    const rows = await query('SELECT * FROM goals WHERE workspace_id = ? ORDER BY target_date', [workspaceId]);
    return rows.map(toCamel);
  },
  async addGoal(workspaceId, goal) {
    const gid = goal.id || id();
    const createdAt = goal.createdAt ? new Date(goal.createdAt) : new Date();
    await query(
      'INSERT INTO goals (id, workspace_id, name, target_amount, current_amount, target_date, created_at, completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [gid, workspaceId, goal.name, goal.targetAmount ?? goal.target_amount, goal.currentAmount ?? goal.current_amount ?? 0, goal.targetDate || goal.target_date, createdAt, goal.completed ? 1 : 0]
    );
    return toCamel((await queryOne('SELECT * FROM goals WHERE id = ?', [gid])));
  },
  async updateGoal(goalId, updates) {
    const sets = []; const params = [];
    if (updates.currentAmount !== undefined) { sets.push('current_amount = ?'); params.push(updates.currentAmount); }
    if (updates.completed !== undefined) { sets.push('completed = ?'); params.push(updates.completed ? 1 : 0); }
    if (sets.length === 0) return toCamel(await queryOne('SELECT * FROM goals WHERE id = ?', [goalId]));
    params.push(goalId);
    await query(`UPDATE goals SET ${sets.join(', ')} WHERE id = ?`, params);
    return toCamel(await queryOne('SELECT * FROM goals WHERE id = ?', [goalId]));
  },
  async deleteGoal(goalId) {
    const [r] = await pool.execute('DELETE FROM goals WHERE id = ?', [goalId]);
    return r.affectedRows > 0;
  },
  async listDebts(workspaceId) {
    const rows = await query('SELECT * FROM debts WHERE workspace_id = ? ORDER BY due_date', [workspaceId]);
    return rows.map(toCamel);
  },
  async addDebt(workspaceId, debt) {
    const did = debt.id || id();
    const createdAt = debt.createdAt ? new Date(debt.createdAt) : new Date();
    await query(
      'INSERT INTO debts (id, workspace_id, type, person_name, total_amount, paid_amount, due_date, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [did, workspaceId, debt.type, debt.personName ?? debt.person_name, debt.totalAmount ?? debt.total_amount, debt.paidAmount ?? debt.paid_amount ?? 0, debt.dueDate || debt.due_date, createdAt, debt.status || 'active']
    );
    return toCamel((await queryOne('SELECT * FROM debts WHERE id = ?', [did])));
  },
  async updateDebt(debtId, updates) {
    const sets = []; const params = [];
    if (updates.paidAmount !== undefined) { sets.push('paid_amount = ?'); params.push(updates.paidAmount); }
    if (updates.status !== undefined) { sets.push('status = ?'); params.push(updates.status); }
    if (sets.length === 0) return toCamel(await queryOne('SELECT * FROM debts WHERE id = ?', [debtId]));
    params.push(debtId);
    await query(`UPDATE debts SET ${sets.join(', ')} WHERE id = ?`, params);
    return toCamel(await queryOne('SELECT * FROM debts WHERE id = ?', [debtId]));
  },
  async deleteDebt(debtId) {
    const [r] = await pool.execute('DELETE FROM debts WHERE id = ?', [debtId]);
    return r.affectedRows > 0;
  },
  async listSubscriptions(workspaceId) {
    const rows = await query('SELECT * FROM subscriptions WHERE workspace_id = ? ORDER BY next_payment', [workspaceId]);
    return rows.map(toCamel);
  },
  async addSubscription(workspaceId, sub) {
    const sid = sub.id || id();
    const createdAt = sub.createdAt ? new Date(sub.createdAt) : new Date();
    await query(
      'INSERT INTO subscriptions (id, workspace_id, name, amount, frequency, next_payment, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [sid, workspaceId, sub.name, sub.amount, sub.frequency, sub.nextPayment || sub.next_payment, createdAt, sub.status || 'active']
    );
    return toCamel((await queryOne('SELECT * FROM subscriptions WHERE id = ?', [sid])));
  },
  async updateSubscription(subId, updates) {
    const sets = []; const params = [];
    if (updates.nextPayment !== undefined) { sets.push('next_payment = ?'); params.push(updates.nextPayment); }
    if (updates.status !== undefined) { sets.push('status = ?'); params.push(updates.status); }
    if (sets.length === 0) return toCamel(await queryOne('SELECT * FROM subscriptions WHERE id = ?', [subId]));
    params.push(subId);
    await query(`UPDATE subscriptions SET ${sets.join(', ')} WHERE id = ?`, params);
    return toCamel(await queryOne('SELECT * FROM subscriptions WHERE id = ?', [subId]));
  },
  async deleteSubscription(subId) {
    const [r] = await pool.execute('DELETE FROM subscriptions WHERE id = ?', [subId]);
    return r.affectedRows > 0;
  },
};
