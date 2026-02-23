import { api } from '../api/client.js';

const PERSONAL_WID = 'personal';

/**
 * DataManager — المهام الشخصية عبر مساحة personal في الخادم (بدون Apps Script).
 */
export class DataManager {
  constructor() {
    this.tasks = [];
  }

  normalizeTaskId(taskId) {
    return String(taskId);
  }

  serverToTask(row) {
    const meta = (row.meta && typeof row.meta === 'object') ? row.meta : (typeof row.meta === 'string' ? (() => { try { return JSON.parse(row.meta); } catch (_) { return {}; } })() : {});
    return {
      id: row.id,
      text: row.title || row.text || '',
      completed: row.status === 'done' || !!(row.completedAt || row.completed_at),
      completedAt: row.completedAt || row.completed_at || null,
      createdAt: row.createdAt || row.created_at || new Date().toISOString(),
      timeSpent: Number.isFinite(row.timeSpent) ? row.timeSpent : (row.time_spent ?? 0),
      repeat: meta.repeat || row.repeatType || row.repeat_type || 'none',
      priority: row.priority || 'normal',
      category: meta.category || 'personal',
      nextDue: row.nextDue || row.next_due || null,
    };
  }

  async init() {
    try {
      const list = await api.get(`/workspaces/${PERSONAL_WID}/tasks`);
      this.tasks = Array.isArray(list) ? list.map((t) => this.serverToTask(t)) : [];
    } catch (e) {
      console.error('DataManager init', e);
      this.tasks = [];
    }
  }

  async addTask(taskText, priority = 'normal', category = 'personal', repeat = 'none') {
    const text = String(taskText || '').trim();
    if (!text) return null;

    const now = new Date();
    const nextDue = this.calculateNextDue(repeat);
    const payload = {
      id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
      title: text,
      text,
      status: 'todo',
      priority: priority || 'normal',
      meta: { category: category || 'personal', repeat: repeat || 'none' },
      nextDue: nextDue || null,
      repeatType: repeat || 'none',
    };

    const created = await api.post(`/workspaces/${PERSONAL_WID}/tasks`, payload);
    const task = this.serverToTask(created);
    this.tasks.push(task);
    return task;
  }

  calculateNextDue(repeat) {
    if (repeat === 'none') return null;
    const now = new Date();
    const next = new Date(now);
    switch (repeat) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      default:
        return null;
    }
    return next.toISOString();
  }

  async completeRecurringTask(taskId) {
    const normalizedId = this.normalizeTaskId(taskId);
    const task = this.tasks.find((t) => this.normalizeTaskId(t.id) === normalizedId);
    if (task && task.repeat !== 'none') {
      await this.setTaskCompleted(taskId, true);
      return await this.addTask(task.text, task.priority, task.category, task.repeat);
    }
    return this.setTaskCompleted(taskId, true);
  }

  async setTaskCompleted(taskId, completed) {
    const normalizedId = this.normalizeTaskId(taskId);
    const task = this.tasks.find((t) => this.normalizeTaskId(t.id) === normalizedId);
    if (!task) return null;

    task.completed = Boolean(completed);
    task.completedAt = completed ? new Date().toISOString() : null;
    await api.put(`/workspaces/${PERSONAL_WID}/tasks/${task.id}`, {
      completed: task.completed,
      completedAt: task.completedAt,
      status: task.completed ? 'done' : 'todo',
    });
    return task;
  }

  async updateTaskText(taskId, text) {
    const normalizedId = this.normalizeTaskId(taskId);
    const task = this.tasks.find((t) => this.normalizeTaskId(t.id) === normalizedId);
    if (!task) return null;
    const trimmed = String(text || '').trim();
    await api.put(`/workspaces/${PERSONAL_WID}/tasks/${task.id}`, { title: trimmed, text: trimmed });
    task.text = trimmed;
    return task;
  }

  async deleteTask(taskId) {
    const normalizedId = this.normalizeTaskId(taskId);
    const idx = this.tasks.findIndex((t) => this.normalizeTaskId(t.id) === normalizedId);
    if (idx !== -1) {
      await api.del(`/workspaces/${PERSONAL_WID}/tasks/${this.tasks[idx].id}`);
      this.tasks.splice(idx, 1);
    }
  }

  getAllTasks() {
    return this.tasks;
  }

  getTasksByCategory(category) {
    return this.tasks.filter((t) => t.category === category && !t.completed);
  }

  getFilteredTasks(filter = 'all', category = 'all') {
    let filtered = this.tasks;
    if (filter === 'completed') filtered = filtered.filter((t) => t.completed);
    else if (filter === 'pending') filtered = filtered.filter((t) => !t.completed);
    if (category !== 'all') filtered = filtered.filter((t) => t.category === category);
    return filtered;
  }

  searchTasks(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) return this.tasks;
    return this.tasks.filter(
      (t) =>
        (t.text && t.text.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.priority && t.priority.toLowerCase().includes(q)) ||
        (t.repeat && t.repeat.toLowerCase().includes(q))
    );
  }

  getRecurringTasks() {
    return this.tasks.filter((t) => t.repeat !== 'none' && !t.completed);
  }

  async checkDueRecurringTasks() {
    const now = new Date();
    const newTasks = [];
    for (const task of this.getRecurringTasks()) {
      if (task.nextDue && new Date(task.nextDue) <= now) {
        const created = await this.addTask(task.text, task.priority, task.category, task.repeat);
        if (created) newTasks.push(created);
      }
    }
    return newTasks;
  }

  getTaskStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter((t) => t.completed).length;
    const work = this.tasks.filter((t) => t.category === 'work').length;
    const personal = this.tasks.filter((t) => t.category === 'personal').length;
    const study = this.tasks.filter((t) => t.category === 'study').length;
    const recurring = this.getRecurringTasks().length;
    const urgent = this.tasks.filter((t) => t.priority === 'urgent' && !t.completed).length;
    return {
      total,
      completed,
      pending: total - completed,
      urgent,
      important: this.tasks.filter((t) => t.priority === 'important' && !t.completed).length,
      normal: this.tasks.filter((t) => t.priority === 'normal' && !t.completed).length,
      work,
      personal,
      study,
      recurring,
      productivityRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  getTasksByPriority(priority) {
    return this.tasks.filter((t) => t.priority === priority && !t.completed);
  }

  getProductivityData(days = 7) {
    const data = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      data.push({
        date: date.toLocaleDateString('ar-SA', { weekday: 'short' }),
        created: this.tasks.filter((t) => t.createdAt && t.createdAt.startsWith(dateStr)).length,
        completed: this.tasks.filter((t) => t.completedAt && t.completedAt.startsWith(dateStr)).length,
      });
    }
    return data;
  }

  getPriorityDistribution() {
    const s = this.getTaskStats();
    return { urgent: s.urgent, important: s.important, normal: s.normal };
  }

  async clearAllData() {
    await Promise.all(this.tasks.map((t) => api.del(`/workspaces/${PERSONAL_WID}/tasks/${t.id}`)));
    this.tasks = [];
  }

  exportData() {
    return { tasks: this.tasks, exportedAt: new Date().toISOString() };
  }

  async importData(data) {
    if (!data || !Array.isArray(data.tasks)) return false;
    await this.clearAllData();
    for (const t of data.tasks) {
      await this.addTask(t.text, t.priority || 'normal', t.category || 'personal', t.repeat || 'none');
    }
    return true;
  }
}
