/**
 * In-memory data store for unified system (workspaces, tasks, calendar, etc.)
 * Same API as future MySQL adapter — swap without changing routes.
 */

const defaultWorkspaces = [
  { id: 'khotawat', code: 'khotawat', name_ar: 'خطوات', name_en: 'Khotawat', type: 'saas', settings: null, sort_order: 1 },
  { id: 'jahzeen', code: 'jahzeen', name_ar: 'جاهزين', name_en: 'Jahzeen', type: 'company', settings: null, sort_order: 2 },
  { id: 'rahal', code: 'rahal', name_ar: 'رحال', name_en: 'Rahal', type: 'brand', settings: null, sort_order: 3 },
  { id: 'study', code: 'study', name_ar: 'الدراسة', name_en: 'Study', type: 'academic', settings: null, sort_order: 4 },
  { id: 'personal', code: 'personal', name_ar: 'الشخصي', name_en: 'Personal', type: 'personal', settings: null, sort_order: 5 },
];

const store = {
  workspaces: [...defaultWorkspaces.map(w => ({ ...w, created_at: new Date(), updated_at: new Date() }))],
  tasks: [],
  calendar_events: [],
  notifications: [],
  expenses: [],
  roadmap_items: [],
  backlog_items: [],
  tech_docs: [],
  org_roles: [],
  team_members: [],
  department_budgets: [],
  suppliers: [],
  inventory_items: [],
  campaigns: [],
  study_terms: [],
  study_items: [],
  courses: [],
  fitness_entries: [],
  transactions: [],
  budget: {}, // workspace_id -> amount
  goals: [],
  debts: [],
  subscriptions: [],
};

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[key] = v;
  }
  return out;
}

function toSnake(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = k.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
    out[key] = v;
  }
  return out;
}

export const memoryAdapter = {
  // Workspaces
  async listWorkspaces() {
    return store.workspaces.map(toCamel);
  },
  async getWorkspace(workspaceId) {
    const w = store.workspaces.find(x => x.id === workspaceId);
    return w ? toCamel(w) : null;
  },

  // Tasks (unified, with status Kanban)
  async listTasks(workspaceId, { status, priority } = {}) {
    let list = store.tasks.filter(t => t.workspace_id === workspaceId);
    if (status) list = list.filter(t => t.status === status);
    if (priority) list = list.filter(t => t.priority === priority);
    return list.map(toCamel).map(t => ({ ...t, text: t.title }));
  },
  async getTask(taskId) {
    const t = store.tasks.find(x => x.id === taskId);
    return t ? toCamel(t) : null;
  },
  async addTask(workspaceId, task) {
    const row = {
      id: task.id || id(),
      workspace_id: workspaceId,
      title: task.title || task.text || '',
      description: task.description || null,
      status: task.status || 'todo',
      priority: task.priority || 'normal',
      due_at: task.dueAt || task.due_at || null,
      completed_at: task.completedAt || (task.completed ? new Date() : null),
      time_spent: task.timeSpent ?? 0,
      repeat_type: task.repeatType || task.repeat || 'none',
      next_due: task.nextDue || task.next_due || null,
      meta: task.meta ? JSON.stringify(task.meta) : null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    store.tasks.push(row);
    return toCamel(row);
  },
  async updateTask(taskId, updates) {
    const t = store.tasks.find(x => x.id === taskId);
    if (!t) return null;
    if (updates.title !== undefined) t.title = updates.title;
    if (updates.text !== undefined) t.title = updates.text;
    if (updates.description !== undefined) t.description = updates.description;
    if (updates.status !== undefined) t.status = updates.status;
    if (updates.priority !== undefined) t.priority = updates.priority;
    if (updates.dueAt !== undefined) t.due_at = updates.dueAt;
    if (updates.completed !== undefined) {
      t.completed_at = updates.completed ? new Date() : null;
    }
    if (updates.completedAt !== undefined) t.completed_at = updates.completedAt;
    if (updates.timeSpent !== undefined) t.time_spent = updates.timeSpent;
    if (updates.nextDue !== undefined) t.next_due = updates.nextDue;
    t.updated_at = new Date();
    return toCamel(t);
  },
  async deleteTask(taskId) {
    const i = store.tasks.findIndex(x => x.id === taskId);
    if (i === -1) return false;
    store.tasks.splice(i, 1);
    return true;
  },

  // Calendar
  async listCalendarEvents({ workspaceId, from, to } = {}) {
    let list = store.calendar_events;
    if (workspaceId) list = list.filter(e => e.workspace_id === workspaceId);
    if (from) list = list.filter(e => new Date(e.end_at) >= new Date(from));
    if (to) list = list.filter(e => new Date(e.start_at) <= new Date(to));
    return list.map(toCamel);
  },
  async addCalendarEvent(event) {
    const row = {
      id: event.id || id(),
      workspace_id: event.workspaceId || null,
      title: event.title,
      start_at: event.startAt || event.start_at,
      end_at: event.endAt || event.end_at,
      event_type: event.eventType || event.event_type || 'event',
      recurring_rule: event.recurringRule || null,
      meta: event.meta ? JSON.stringify(event.meta) : null,
      created_at: new Date(),
    };
    store.calendar_events.push(row);
    return toCamel(row);
  },
  async updateCalendarEvent(eventId, updates) {
    const e = store.calendar_events.find(x => x.id === eventId);
    if (!e) return null;
    Object.assign(e, toSnake(updates));
    e.updated_at = new Date();
    return toCamel(e);
  },
  async deleteCalendarEvent(eventId) {
    const i = store.calendar_events.findIndex(x => x.id === eventId);
    if (i === -1) return false;
    store.calendar_events.splice(i, 1);
    return true;
  },

  // Notifications
  async listNotifications({ unreadOnly = false } = {}) {
    let list = store.notifications;
    if (unreadOnly) list = list.filter(n => !n.read_at);
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(toCamel);
  },
  async addNotification(notification) {
    const row = {
      id: notification.id || id(),
      workspace_id: notification.workspaceId || null,
      title: notification.title,
      body: notification.body || null,
      read_at: null,
      created_at: new Date(),
    };
    store.notifications.push(row);
    return toCamel(row);
  },
  async markNotificationRead(notificationId) {
    const n = store.notifications.find(x => x.id === notificationId);
    if (!n) return false;
    n.read_at = new Date();
    return true;
  },

  // Expenses (per workspace)
  async listExpenses(workspaceId) {
    return store.expenses.filter(e => e.workspace_id === workspaceId).map(toCamel);
  },
  async addExpense(workspaceId, expense) {
    const row = {
      id: expense.id || id(),
      workspace_id: workspaceId,
      amount: expense.amount,
      category: expense.category,
      description: expense.description || null,
      expense_date: expense.expenseDate || expense.expense_date || new Date(),
      meta: expense.meta ? JSON.stringify(expense.meta) : null,
      created_at: new Date(),
    };
    store.expenses.push(row);
    return toCamel(row);
  },
  async updateExpense(expenseId, updates) {
    const e = store.expenses.find(x => x.id === expenseId);
    if (!e) return null;
    Object.assign(e, toSnake(updates));
    return toCamel(e);
  },
  async deleteExpense(expenseId) {
    const i = store.expenses.findIndex(x => x.id === expenseId);
    if (i === -1) return false;
    store.expenses.splice(i, 1);
    return true;
  },

  // Roadmap (خطوات)
  async listRoadmapItems(workspaceId) {
    return store.roadmap_items.filter(r => r.workspace_id === workspaceId).map(toCamel);
  },
  async addRoadmapItem(workspaceId, item) {
    const row = {
      id: item.id || id(),
      workspace_id: workspaceId,
      title: item.title,
      description: item.description || null,
      status: item.status || 'planned',
      target_date: item.targetDate || item.target_date || null,
      item_type: item.itemType || item.item_type || 'feature',
      sort_order: item.sortOrder ?? 0,
      created_at: new Date(),
      updated_at: new Date(),
    };
    store.roadmap_items.push(row);
    return toCamel(row);
  },
  async updateRoadmapItem(itemId, updates) {
    const r = store.roadmap_items.find(x => x.id === itemId);
    if (!r) return null;
    Object.assign(r, toSnake(updates));
    r.updated_at = new Date();
    return toCamel(r);
  },
  async deleteRoadmapItem(itemId) {
    const i = store.roadmap_items.findIndex(x => x.id === itemId);
    if (i === -1) return false;
    store.roadmap_items.splice(i, 1);
    return true;
  },

  // Backlog (خطوات / جاهزين)
  async listBacklogItems(workspaceId) {
    return store.backlog_items.filter(b => b.workspace_id === workspaceId).map(toCamel);
  },
  async addBacklogItem(workspaceId, item) {
    const row = {
      id: item.id || id(),
      workspace_id: workspaceId,
      title: item.title,
      item_type: item.itemType || item.item_type || 'feature',
      priority: item.priority || 'medium',
      status: item.status || 'backlog',
      story_points: item.storyPoints ?? item.story_points ?? null,
      meta: item.meta ? JSON.stringify(item.meta) : null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    store.backlog_items.push(row);
    return toCamel(row);
  },
  async updateBacklogItem(itemId, updates) {
    const b = store.backlog_items.find(x => x.id === itemId);
    if (!b) return null;
    Object.assign(b, toSnake(updates));
    b.updated_at = new Date();
    return toCamel(b);
  },
  async deleteBacklogItem(itemId) {
    const i = store.backlog_items.findIndex(x => x.id === itemId);
    if (i === -1) return false;
    store.backlog_items.splice(i, 1);
    return true;
  },

  // Tech docs (خطوات)
  async listTechDocs(workspaceId) {
    return store.tech_docs.filter(d => d.workspace_id === workspaceId).map(toCamel);
  },
  async getTechDoc(docId) {
    const d = store.tech_docs.find(x => x.id === docId);
    return d ? toCamel(d) : null;
  },
  async addTechDoc(workspaceId, doc) {
    const row = {
      id: doc.id || id(),
      workspace_id: workspaceId,
      title: doc.title,
      content: doc.content || null,
      category: doc.category || null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    store.tech_docs.push(row);
    return toCamel(row);
  },
  async updateTechDoc(docId, updates) {
    const d = store.tech_docs.find(x => x.id === docId);
    if (!d) return null;
    Object.assign(d, toSnake(updates));
    d.updated_at = new Date();
    return toCamel(d);
  },
  async deleteTechDoc(docId) {
    const i = store.tech_docs.findIndex(x => x.id === docId);
    if (i === -1) return false;
    store.tech_docs.splice(i, 1);
    return true;
  },

  // Org roles (جاهزين)
  async listOrgRoles(workspaceId) {
    return store.org_roles.filter(r => r.workspace_id === workspaceId).map(toCamel);
  },
  async addOrgRole(workspaceId, role) {
    const row = {
      id: role.id || id(),
      workspace_id: workspaceId,
      title_ar: role.titleAr || role.title_ar,
      title_en: role.titleEn || role.title_en || null,
      parent_id: role.parentId || role.parent_id || null,
      sort_order: role.sortOrder ?? 0,
      created_at: new Date(),
    };
    store.org_roles.push(row);
    return toCamel(row);
  },
  async updateOrgRole(roleId, updates) {
    const r = store.org_roles.find(x => x.id === roleId);
    if (!r) return null;
    Object.assign(r, toSnake(updates));
    return toCamel(r);
  },
  async deleteOrgRole(roleId) {
    const i = store.org_roles.findIndex(x => x.id === roleId);
    if (i === -1) return false;
    store.org_roles.splice(i, 1);
    return true;
  },

  // Team members (جاهزين)
  async listTeamMembers(workspaceId) {
    return store.team_members.filter(m => m.workspace_id === workspaceId).map(toCamel);
  },
  async addTeamMember(workspaceId, member) {
    const row = {
      id: member.id || id(),
      workspace_id: workspaceId,
      name: member.name,
      role_id: member.roleId || member.role_id || null,
      contact: member.contact || null,
      kpis: member.kpis ? JSON.stringify(member.kpis) : null,
      notes: member.notes || null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    store.team_members.push(row);
    return toCamel(row);
  },
  async updateTeamMember(memberId, updates) {
    const m = store.team_members.find(x => x.id === memberId);
    if (!m) return null;
    Object.assign(m, toSnake(updates));
    m.updated_at = new Date();
    return toCamel(m);
  },
  async deleteTeamMember(memberId) {
    const i = store.team_members.findIndex(x => x.id === memberId);
    if (i === -1) return false;
    store.team_members.splice(i, 1);
    return true;
  },

  // Department budgets (جاهزين)
  async listDepartmentBudgets(workspaceId) {
    return store.department_budgets.filter(b => b.workspace_id === workspaceId).map(toCamel);
  },
  async addDepartmentBudget(workspaceId, budget) {
    const row = {
      id: budget.id || id(),
      workspace_id: workspaceId,
      role_id: budget.roleId || budget.role_id || null,
      amount: budget.amount,
      period_start: budget.periodStart || budget.period_start,
      period_end: budget.periodEnd || budget.period_end,
      created_at: new Date(),
    };
    store.department_budgets.push(row);
    return toCamel(row);
  },
  async updateDepartmentBudget(budgetId, updates) {
    const b = store.department_budgets.find(x => x.id === budgetId);
    if (!b) return null;
    Object.assign(b, toSnake(updates));
    return toCamel(b);
  },
  async deleteDepartmentBudget(budgetId) {
    const i = store.department_budgets.findIndex(x => x.id === budgetId);
    if (i === -1) return false;
    store.department_budgets.splice(i, 1);
    return true;
  },

  // Suppliers (رحال)
  async listSuppliers(workspaceId) {
    return store.suppliers.filter(s => s.workspace_id === workspaceId).map(toCamel);
  },
  async addSupplier(workspaceId, supplier) {
    const row = {
      id: supplier.id || id(),
      workspace_id: workspaceId,
      name: supplier.name,
      contact: supplier.contact || null,
      materials: supplier.materials ? JSON.stringify(supplier.materials) : null,
      notes: supplier.notes || null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    store.suppliers.push(row);
    return toCamel(row);
  },
  async updateSupplier(supplierId, updates) {
    const s = store.suppliers.find(x => x.id === supplierId);
    if (!s) return null;
    Object.assign(s, toSnake(updates));
    s.updated_at = new Date();
    return toCamel(s);
  },
  async deleteSupplier(supplierId) {
    const i = store.suppliers.findIndex(x => x.id === supplierId);
    if (i === -1) return false;
    store.suppliers.splice(i, 1);
    return true;
  },

  // Inventory (رحال)
  async listInventoryItems(workspaceId) {
    return store.inventory_items.filter(i => i.workspace_id === workspaceId).map(toCamel);
  },
  async addInventoryItem(workspaceId, item) {
    const row = {
      id: item.id || id(),
      workspace_id: workspaceId,
      name: item.name,
      item_type: item.itemType || item.item_type || 'product',
      quantity: item.quantity ?? 0,
      unit: item.unit || 'pcs',
      min_level: item.minLevel ?? item.min_level ?? null,
      notes: item.notes || null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    store.inventory_items.push(row);
    return toCamel(row);
  },
  async updateInventoryItem(itemId, updates) {
    const i = store.inventory_items.find(x => x.id === itemId);
    if (!i) return null;
    Object.assign(i, toSnake(updates));
    i.updated_at = new Date();
    return toCamel(i);
  },
  async deleteInventoryItem(itemId) {
    const idx = store.inventory_items.findIndex(x => x.id === itemId);
    if (idx === -1) return false;
    store.inventory_items.splice(idx, 1);
    return true;
  },

  // Campaigns (رحال)
  async listCampaigns(workspaceId) {
    return store.campaigns.filter(c => c.workspace_id === workspaceId).map(toCamel);
  },
  async addCampaign(workspaceId, campaign) {
    const row = {
      id: campaign.id || id(),
      workspace_id: workspaceId,
      name: campaign.name,
      start_date: campaign.startDate || campaign.start_date,
      end_date: campaign.endDate || campaign.end_date,
      status: campaign.status || 'draft',
      budget: campaign.budget ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    store.campaigns.push(row);
    return toCamel(row);
  },
  async updateCampaign(campaignId, updates) {
    const c = store.campaigns.find(x => x.id === campaignId);
    if (!c) return null;
    Object.assign(c, toSnake(updates));
    c.updated_at = new Date();
    return toCamel(c);
  },
  async deleteCampaign(campaignId) {
    const i = store.campaigns.findIndex(x => x.id === campaignId);
    if (i === -1) return false;
    store.campaigns.splice(i, 1);
    return true;
  },

  // Study terms & items (الدراسة)
  async listStudyTerms(workspaceId) {
    return store.study_terms.filter(t => t.workspace_id === workspaceId).map(toCamel);
  },
  async addStudyTerm(workspaceId, term) {
    const row = {
      id: term.id || id(),
      workspace_id: workspaceId,
      name: term.name,
      start_date: term.startDate || term.start_date,
      end_date: term.endDate || term.end_date,
      created_at: new Date(),
    };
    store.study_terms.push(row);
    return toCamel(row);
  },
  async deleteStudyTerm(termId) {
    const i = store.study_terms.findIndex(x => x.id === termId);
    if (i === -1) return false;
    store.study_terms.splice(i, 1);
    return true;
  },
  async listStudyItems(workspaceId, { termId } = {}) {
    let list = store.study_items.filter(i => i.workspace_id === workspaceId);
    if (termId) list = list.filter(i => i.term_id === termId);
    return list.map(toCamel);
  },
  async addStudyItem(workspaceId, item) {
    const row = {
      id: item.id || id(),
      workspace_id: workspaceId,
      term_id: item.termId || item.term_id || null,
      title: item.title,
      item_type: item.itemType || item.item_type || 'lecture',
      scheduled_at: item.scheduledAt || item.scheduled_at || null,
      notes: item.notes || null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    store.study_items.push(row);
    return toCamel(row);
  },
  async updateStudyItem(itemId, updates) {
    const i = store.study_items.find(x => x.id === itemId);
    if (!i) return null;
    Object.assign(i, toSnake(updates));
    i.updated_at = new Date();
    return toCamel(i);
  },
  async deleteStudyItem(itemId) {
    const idx = store.study_items.findIndex(x => x.id === itemId);
    if (idx === -1) return false;
    store.study_items.splice(idx, 1);
    return true;
  },

  // Courses (شخصي)
  async listCourses(workspaceId) {
    return store.courses.filter(c => c.workspace_id === workspaceId).map(toCamel);
  },
  async addCourse(workspaceId, course) {
    const row = {
      id: course.id || id(),
      workspace_id: workspaceId,
      name: course.name,
      platform: course.platform || null,
      progress_pct: course.progressPct ?? course.progress_pct ?? 0,
      target_date: course.targetDate || course.target_date || null,
      notes: course.notes || null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    store.courses.push(row);
    return toCamel(row);
  },
  async updateCourse(courseId, updates) {
    const c = store.courses.find(x => x.id === courseId);
    if (!c) return null;
    Object.assign(c, toSnake(updates));
    c.updated_at = new Date();
    return toCamel(c);
  },
  async deleteCourse(courseId) {
    const i = store.courses.findIndex(x => x.id === courseId);
    if (i === -1) return false;
    store.courses.splice(i, 1);
    return true;
  },

  // Fitness (شخصي)
  async listFitnessEntries(workspaceId, { from, to } = {}) {
    let list = store.fitness_entries.filter(e => e.workspace_id === workspaceId);
    if (from) list = list.filter(e => new Date(e.fitness_date) >= new Date(from));
    if (to) list = list.filter(e => new Date(e.fitness_date) <= new Date(to));
    return list.map(toCamel);
  },
  async addFitnessEntry(workspaceId, entry) {
    const row = {
      id: entry.id || id(),
      workspace_id: workspaceId,
      activity_type: entry.activityType || entry.activity_type,
      duration_min: entry.durationMin ?? entry.duration_min,
      fitness_date: entry.fitnessDate || entry.fitness_date || new Date(),
      notes: entry.notes || null,
      created_at: new Date(),
    };
    store.fitness_entries.push(row);
    return toCamel(row);
  },
  async deleteFitnessEntry(entryId) {
    const i = store.fitness_entries.findIndex(x => x.id === entryId);
    if (i === -1) return false;
    store.fitness_entries.splice(i, 1);
    return true;
  },

  // Finance (transactions, budget, goals, debts, subscriptions) — per workspace
  async listTransactions(workspaceId) {
    return store.transactions.filter(t => t.workspace_id === workspaceId).map(toCamel);
  },
  async addTransaction(workspaceId, trans) {
    const d = trans.date ? new Date(trans.date) : new Date();
    const row = {
      id: trans.id || id(),
      workspace_id: workspaceId,
      amount: trans.amount,
      type: trans.type,
      description: trans.description || '',
      category: trans.category || '',
      trans_date: d,
      month: d.getMonth(),
      year: d.getFullYear(),
      created_at: new Date(),
    };
    store.transactions.push(row);
    return toCamel(row);
  },
  async deleteTransaction(transId) {
    const i = store.transactions.findIndex(x => x.id === transId);
    if (i === -1) return false;
    store.transactions.splice(i, 1);
    return true;
  },
  async getBudget(workspaceId) {
    return store.budget[workspaceId] ?? 0;
  },
  async setBudget(workspaceId, amount) {
    store.budget[workspaceId] = Number(amount);
    return store.budget[workspaceId];
  },
  async listGoals(workspaceId) {
    return store.goals.filter(g => g.workspace_id === workspaceId).map(toCamel);
  },
  async addGoal(workspaceId, goal) {
    const row = {
      id: goal.id || id(),
      workspace_id: workspaceId,
      name: goal.name,
      target_amount: goal.targetAmount ?? goal.target_amount,
      current_amount: goal.currentAmount ?? goal.current_amount ?? 0,
      target_date: goal.targetDate || goal.target_date,
      created_at: goal.createdAt ? new Date(goal.createdAt) : new Date(),
      completed: goal.completed ? 1 : 0,
    };
    store.goals.push(row);
    return toCamel(row);
  },
  async updateGoal(goalId, updates) {
    const g = store.goals.find(x => x.id === goalId);
    if (!g) return null;
    Object.assign(g, toSnake(updates));
    return toCamel(g);
  },
  async deleteGoal(goalId) {
    const i = store.goals.findIndex(x => x.id === goalId);
    if (i === -1) return false;
    store.goals.splice(i, 1);
    return true;
  },
  async listDebts(workspaceId) {
    return store.debts.filter(d => d.workspace_id === workspaceId).map(toCamel);
  },
  async addDebt(workspaceId, debt) {
    const row = {
      id: debt.id || id(),
      workspace_id: workspaceId,
      type: debt.type,
      person_name: debt.personName ?? debt.person_name,
      total_amount: debt.totalAmount ?? debt.total_amount,
      paid_amount: debt.paidAmount ?? debt.paid_amount ?? 0,
      due_date: debt.dueDate || debt.due_date,
      created_at: debt.createdAt ? new Date(debt.createdAt) : new Date(),
      status: debt.status || 'active',
    };
    store.debts.push(row);
    return toCamel(row);
  },
  async updateDebt(debtId, updates) {
    const d = store.debts.find(x => x.id === debtId);
    if (!d) return null;
    Object.assign(d, toSnake(updates));
    return toCamel(d);
  },
  async deleteDebt(debtId) {
    const i = store.debts.findIndex(x => x.id === debtId);
    if (i === -1) return false;
    store.debts.splice(i, 1);
    return true;
  },
  async listSubscriptions(workspaceId) {
    return store.subscriptions.filter(s => s.workspace_id === workspaceId).map(toCamel);
  },
  async addSubscription(workspaceId, sub) {
    const row = {
      id: sub.id || id(),
      workspace_id: workspaceId,
      name: sub.name,
      amount: sub.amount,
      frequency: sub.frequency,
      next_payment: sub.nextPayment || sub.next_payment,
      created_at: sub.createdAt ? new Date(sub.createdAt) : new Date(),
      status: sub.status || 'active',
    };
    store.subscriptions.push(row);
    return toCamel(row);
  },
  async updateSubscription(subId, updates) {
    const s = store.subscriptions.find(x => x.id === subId);
    if (!s) return null;
    Object.assign(s, toSnake(updates));
    return toCamel(s);
  },
  async deleteSubscription(subId) {
    const i = store.subscriptions.findIndex(x => x.id === subId);
    if (i === -1) return false;
    store.subscriptions.splice(i, 1);
    return true;
  },
};
