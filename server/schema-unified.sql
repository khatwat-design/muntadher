-- ============================================================
-- النظام الموحد — لوحة القيادة (Workspaces + Modules)
-- متوافق مع MySQL 8 / MariaDB. للاستخدام مع SQLite نعدل أنواع البيانات فقط.
-- ============================================================

-- مساحات العمل (خطوات، جاهزين، رحال، دراسة، شخصي)
CREATE TABLE IF NOT EXISTS workspaces (
  id VARCHAR(32) PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  name_ar VARCHAR(128) NOT NULL,
  name_en VARCHAR(128) NULL,
  type VARCHAR(32) NOT NULL,
  settings JSON NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- المهام الموحدة (كل المساحات) — Kanban status
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(32) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'todo',
  priority VARCHAR(16) NOT NULL DEFAULT 'normal',
  due_at DATETIME NULL,
  completed_at DATETIME NULL,
  time_spent INT NOT NULL DEFAULT 0,
  repeat_type VARCHAR(16) NOT NULL DEFAULT 'none',
  next_due DATETIME NULL,
  meta JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_tasks_workspace (workspace_id),
  INDEX idx_tasks_status (workspace_id, status),
  INDEX idx_tasks_due (due_at)
);

-- أحداث التقويم (مشتركة، مع ربط اختياري بمساحة)
CREATE TABLE IF NOT EXISTS calendar_events (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(32) NULL,
  title VARCHAR(255) NOT NULL,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  event_type VARCHAR(32) NOT NULL DEFAULT 'event',
  recurring_rule VARCHAR(128) NULL,
  meta JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL,
  INDEX idx_cal_workspace (workspace_id),
  INDEX idx_cal_start (start_at)
);

-- التنبيهات
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(32) NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NULL,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL,
  INDEX idx_notif_read (read_at),
  INDEX idx_notif_created (created_at)
);

-- مصروفات حسب المساحة
CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(32) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category VARCHAR(64) NOT NULL,
  description TEXT NULL,
  expense_date DATE NOT NULL,
  meta JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_exp_workspace (workspace_id),
  INDEX idx_exp_date (expense_date)
);

-- ----- خطوات: خريطة الطريق -----
CREATE TABLE IF NOT EXISTS roadmap_items (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'planned',
  target_date DATE NULL,
  item_type VARCHAR(24) NOT NULL DEFAULT 'feature',
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_roadmap_workspace (workspace_id)
);

-- ----- خطوات: Backlog (Bugs, Features, Refactoring) -----
CREATE TABLE IF NOT EXISTS backlog_items (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  item_type VARCHAR(24) NOT NULL,
  priority VARCHAR(16) NOT NULL DEFAULT 'medium',
  status VARCHAR(24) NOT NULL DEFAULT 'backlog',
  story_points INT NULL,
  meta JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_backlog_workspace (workspace_id),
  INDEX idx_backlog_status (workspace_id, status)
);

-- ----- خطوات: توثيق تقني -----
CREATE TABLE IF NOT EXISTS tech_docs (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT NULL,
  category VARCHAR(64) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_docs_workspace (workspace_id)
);

-- ----- جاهزين: هيكل تنظيمي -----
CREATE TABLE IF NOT EXISTS org_roles (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(32) NOT NULL,
  title_ar VARCHAR(128) NOT NULL,
  title_en VARCHAR(128) NULL,
  parent_id VARCHAR(64) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES org_roles(id) ON DELETE SET NULL,
  INDEX idx_org_workspace (workspace_id)
);

-- ----- جاهزين: أعضاء الفريق و KPIs -----
CREATE TABLE IF NOT EXISTS team_members (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(32) NOT NULL,
  name VARCHAR(128) NOT NULL,
  role_id VARCHAR(64) NULL,
  contact VARCHAR(255) NULL,
  kpis JSON NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES org_roles(id) ON DELETE SET NULL,
  INDEX idx_team_workspace (workspace_id)
);

-- ----- جاهزين: ميزانيات أقسام -----
CREATE TABLE IF NOT EXISTS department_budgets (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(32) NOT NULL,
  role_id VARCHAR(64) NULL,
  amount DECIMAL(12,2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES org_roles(id) ON DELETE SET NULL,
  INDEX idx_dept_workspace (workspace_id)
);

-- ----- رحال: موردون -----
CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  contact TEXT NULL,
  materials JSON NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_supp_workspace (workspace_id)
);

-- ----- رحال: مخزون -----
CREATE TABLE IF NOT EXISTS inventory_items (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  item_type VARCHAR(32) NOT NULL DEFAULT 'product',
  quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
  unit VARCHAR(32) NOT NULL DEFAULT 'pcs',
  min_level DECIMAL(12,3) NULL,
  notes TEXT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_inv_workspace (workspace_id)
);

-- ----- رحال: حملات -----
CREATE TABLE IF NOT EXISTS campaigns (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'draft',
  budget DECIMAL(12,2) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_camp_workspace (workspace_id)
);

-- ----- الدراسة: فصول -----
CREATE TABLE IF NOT EXISTS study_terms (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(32) NOT NULL,
  name VARCHAR(128) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_terms_workspace (workspace_id)
);

-- ----- الدراسة: محاضرات / تدريب / امتحانات -----
CREATE TABLE IF NOT EXISTS study_items (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(32) NOT NULL,
  term_id VARCHAR(64) NULL,
  title VARCHAR(255) NOT NULL,
  item_type VARCHAR(32) NOT NULL DEFAULT 'lecture',
  scheduled_at DATETIME NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (term_id) REFERENCES study_terms(id) ON DELETE SET NULL,
  INDEX idx_study_workspace (workspace_id),
  INDEX idx_study_scheduled (scheduled_at)
);

-- ----- شخصي: كورسات (تطوير ذاتي) -----
CREATE TABLE IF NOT EXISTS courses (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  platform VARCHAR(128) NULL,
  progress_pct INT NOT NULL DEFAULT 0,
  target_date DATE NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_courses_workspace (workspace_id)
);

-- ----- شخصي: تمارين -----
CREATE TABLE IF NOT EXISTS fitness_entries (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(32) NOT NULL,
  activity_type VARCHAR(64) NOT NULL,
  duration_min INT NOT NULL,
  fitness_date DATE NOT NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_fitness_workspace (workspace_id),
  INDEX idx_fitness_date (fitness_date)
);

-- ----- المالية (معاملات، ميزانية، أهداف، ديون، اشتراكات) — مرتبطة بمساحة أو عالمية -----
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(32) NOT NULL DEFAULT 'personal',
  amount DECIMAL(12,2) NOT NULL,
  type VARCHAR(16) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(32) NOT NULL,
  trans_date DATETIME NOT NULL,
  month INT NOT NULL,
  year INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_trans_workspace (workspace_id),
  INDEX idx_trans_date (trans_date)
);

CREATE TABLE IF NOT EXISTS budget (
  id INT PRIMARY KEY AUTO_INCREMENT,
  workspace_id VARCHAR(32) NOT NULL DEFAULT 'personal',
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_budget_workspace (workspace_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS goals (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(32) NOT NULL DEFAULT 'personal',
  name VARCHAR(255) NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  target_date DATE NOT NULL,
  created_at DATETIME NOT NULL,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_goals_workspace (workspace_id)
);

CREATE TABLE IF NOT EXISTS debts (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(32) NOT NULL DEFAULT 'personal',
  type VARCHAR(16) NOT NULL,
  person_name VARCHAR(255) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  created_at DATETIME NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_debts_workspace (workspace_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(32) NOT NULL DEFAULT 'personal',
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  frequency VARCHAR(16) NOT NULL,
  next_payment DATE NOT NULL,
  created_at DATETIME NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_subs_workspace (workspace_id)
);

-- ============================================================
-- بيانات أولية: المساحات الافتراضية
-- ============================================================
INSERT INTO workspaces (id, code, name_ar, name_en, type, sort_order) VALUES
  ('khotawat', 'khotawat', 'خطوات', 'Khotawat', 'saas', 1),
  ('jahzeen', 'jahzeen', 'جاهزين', 'Jahzeen', 'company', 2),
  ('rahal', 'rahal', 'رحال', 'Rahal', 'brand', 3),
  ('study', 'study', 'الدراسة', 'Study', 'academic', 4),
  ('personal', 'personal', 'الشخصي', 'Personal', 'personal', 5)
ON DUPLICATE KEY UPDATE name_ar = VALUES(name_ar), name_en = VALUES(name_en), type = VALUES(type), sort_order = VALUES(sort_order);
