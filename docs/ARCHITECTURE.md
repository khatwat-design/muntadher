# هندسة النظام الموحد — لوحة القيادة المركزية

## 1. الرؤية

نظام إدارة شخصي موحد يربط:
- **خطوات** (SaaS e-commerce)
- **جاهزين** (شركة برمجية — إدارة تنفيذية)
- **رحال** (براند عطور)
- **الدراسة** (تمريض)
- **الشخصي** (تطوير، كورسات، مالية، لياقة)

مع **قاعدة بيانات مركزية**، **تقويم موحد**، **تنبيهات موحدة**، و**تتبع حالة Kanban/Agile** لجميع المهام.

---

## 2. المبادئ التقنية (للتجنب أخطاء عند تغيير الإطار/اللغة)

| المبدأ | التطبيق |
|--------|---------|
| **طبقة البيانات المجردة** | جميع القراءة/الكتابة تمر عبر واجهة (Adapter). التنفيذ يمكن أن يكون MySQL أو SQLite أو Google Sheets/Apps Script. تغيير قاعدة البيانات لا يمس منطق الأعمال. |
| **مساحات عمل (Workspaces)** | كل مشروع/قسم = `workspace_id`. المهام، المصروفات، الأهداف مرتبطة بـ workspace. |
| **حالة موحدة (Status)** | جميع المهام/البطاقات تستخدم نفس الحالات: `backlog` \| `todo` \| `in_progress` \| `review` \| `done` (قابل للتخصيص حسب المساحة). |
| **واجهة API ثابتة** | المسارات والأجسام (request/response) موثقة. تغيير لغة الخادم (Node → Go مثلاً) يبقى نفس الـ API. |
| **وحدات أمامية منفصلة** | كل مساحة لها صفحة/موديول خاص. لوحة القيادة تجمع الملخصات فقط. |

---

## 3. هيكل المساحات (Workspaces)

| الكود | الاسم | الوصف |
|-------|-------|--------|
| `khotawat` | خطوات | منصة SaaS — roadmap، backlog، مصاريف، توثيق تقني |
| `jahzeen` | جاهزين | شركة — هيكل تنظيمي، فريق، KPIs، تكاليف أقسام |
| `rahal` | رحال | براند عطور — سلسلة توريد، مخزون، مهام تصنيع/حملات |
| `study` | الدراسة | تمريض — محاضرات، تدريب عملي، مناهج |
| `personal` | الشخصي | تطوير ذاتي، كورسات، مالية شخصية، تمارين |

---

## 4. نموذج البيانات الموحد (Logical Model)

### 4.1 الجداول المشتركة

- **workspaces** — تعريف المساحات (id, code, name_ar, name_en, type, settings JSON, sort_order).
- **tasks** — مهام موحدة: (id, workspace_id, title, description, status, priority, due_at, completed_at, time_spent, repeat_type, next_due, meta JSON). الـ status يتبع Kanban.
- **calendar_events** — أحداث تقويم: (id, workspace_id nullable, title, start_at, end_at, type, recurring_rule, meta).
- **notifications** — تنبيهات: (id, user_id, workspace_id nullable, title, body, read_at, created_at).
- **expenses** — مصروفات حسب المساحة: (id, workspace_id, amount, category, description, date, meta).

### 4.2 خطوات (Khotawat)

- **roadmap_items** — عناصر خريطة الطريق: (id, workspace_id, title, description, status, target_date, type: feature|milestone|epic).
- **backlog_items** — عناصر الـ Backlog: (id, workspace_id, title, type: bug|feature|refactor, priority, status, story_points nullable).
- **tech_docs** — توثيق تقني: (id, workspace_id, title, content, category, updated_at).

### 4.3 جاهزين (Jahzeen)

- **org_roles** — أدوار في الهيكل: (id, workspace_id, title_ar, title_en, parent_id, sort_order).
- **team_members** — أفراد الفريق: (id, workspace_id, name, role_id, contact, kpis JSON, notes).
- **department_budgets** — ميزانيات أقسام: (id, workspace_id, role_id, amount, period_start, period_end).

### 4.4 رحال (Rahal)

- **suppliers** — موردون: (id, workspace_id, name, contact, materials JSON, notes).
- **inventory_items** — أصناف مخزون: (id, workspace_id, name, type: raw|packaging|product, quantity, unit, min_level).
- **campaigns** — حملات: (id, workspace_id, name, start_date, end_date, status, budget).

### 4.5 الدراسة والشخصي

- **study_terms** — فصول/فترات دراسية: (id, workspace_id, name, start_date, end_date).
- **study_items** — محاضرات/مواد: (id, workspace_id, term_id, title, type: lecture|practical|exam, scheduled_at, notes).
- **courses** — كورسات (تطوير/مهارات): (id, workspace_id, name, platform, progress_pct, target_date, notes).
- **fitness_entries** — سجل تمارين: (id, workspace_id, activity_type, duration_min, date, notes).

المالية الشخصية (معاملات، ميزانية، أهداف، ديون، اشتراكات) تبقى كما هي مع ربطها بـ `workspace_id = personal` أو جدول منفصل يربط بـ workspace.

---

## 5. واجهة API المقترحة (ثابتة)

- `GET/POST /api/workspaces` — قائمة/إنشاء مساحات (إنشاء قد يكون محدوداً).
- `GET /api/workspaces/:id` — تفاصيل مساحة.
- `GET/POST/PUT/DELETE /api/workspaces/:wid/tasks` — مهام المساحة (مع فلتر status, priority, due).
- `GET/POST/PUT/DELETE /api/workspaces/:wid/roadmap` — خطوات فقط.
- `GET/POST/PUT/DELETE /api/workspaces/:wid/backlog` — جاهزين + خطوات.
- `GET/POST/PUT/DELETE /api/workspaces/:wid/expenses` — مصروفات المساحة.
- `GET/POST /api/calendar` — أحداث (مع workspace_id اختياري).
- `GET/POST /api/notifications` — تنبيهات (قراءة/تعليم كمقروء).
- باقي الموارد (org, team, suppliers, inventory, study, courses, fitness, finance) تحت `/api/workspaces/:wid/...` حسب الحاجة.

---

## 6. لوحة القيادة (Command Center)

- **ملخص عام**: عدد المهام حسب الحالة (مجمعة من كل المساحات)، قادم اليوم/هذا الأسبوع من التقويم، تنبيهات غير مقروءة.
- **بطاقات مساحات**: لكل مساحة (خطوات، جاهزين، رحال، دراسة، شخصي) بطاقة تعرض: مهام عاجلة، آخر نشاط، رابط الدخول للموديول الكامل.
- **تقويم موحد**: عرض أحداث كل المساحات مع فلتر.
- **محدد المساحة**: عند الدخول إلى موديول معين، كل الطلبات تُرسل مع نفس `workspace_id`.

---

## 7. الأتمتة المقترحة

- **تجنب التضارب مع الجامعة**: عند إضافة مهمة برمجية (خطوات) مع وقت محدد، التحقق من تقويم "الدراسة"؛ إن كان هناك محاضرة/تدريب في نفس الوقت، تحذير أو اقتراح وقت بديل.
- **تنبيهات**: مهام متأخرة، أهداف مالية، استحقاق ديون، تجديد اشتراكات — كلها عبر جدول `notifications` ومحرك تنبيهات واحد.

---

## 8. هيكل الملفات (مقترح)

```
server/
  db/              ← طبقة البيانات
    adapter.js      ← واجهة موحدة (getTasks, addTask, ...)
    mysql.js        ← تنفيذ MySQL
    memory.js       ← تنفيذ في الذاكرة للتطوير/اختبار
  routes/
    workspaces.js
    tasks.js
    roadmap.js
    backlog.js
    expenses.js
    calendar.js
    notifications.js
    ...
  index.js          ← يربط المسارات ويستخدم adapter
docs/
  ARCHITECTURE.md   ← هذا الملف
  API.md            ← توثيق تفصيلي للـ API (لاحقاً)
src/
  command-center/   ← صفحة لوحة القيادة
  workspaces/       ← موديولات المساحات (خطوات، جاهزين، رحال، دراسة، شخصي)
  shared/           ← تقويم، تنبيهات، مكونات مشتركة
```

هذا التصميم يسمح لاحقاً باستبدال الإطار (Front/Back) أو اللغة مع الحفاظ على نفس الهيكل المنطقي والـ API.

---

## 9. ما تم تنفيذه (المرحلة الأولى)

- **docs/ARCHITECTURE.md** — وثيقة الهندسة والمساحات والـ API.
- **server/schema-unified.sql** — مخطط SQL موحد لجميع الجداول (للاستخدام عند تفعيل MySQL).
- **server/db/memory.js** — محول تخزين في الذاكرة يوفر نفس واجهة البيانات (workspaces, tasks, calendar, notifications, expenses, roadmap, backlog, tech_docs, org, team, budgets, suppliers, inventory, campaigns, study, courses, fitness, finance).
- **server/db/index.js** — تصدير المحول (حالياً الذاكرة فقط؛ جاهز لإضافة mysql.js لاحقاً).
- **server/routes/** — مسارات: workspaces، unifiedTasks، commandCenter، calendar، notifications، workspaceResources (كل موارد المساحات).
- **لوحة القيادة** — صفحة command-center.html + src/pages/commandCenter.js تعرض ملخص المهام لكل المساحات، بطاقات المساحات، التنبيهات، والأحداث القادمة.
- **صفحة مساحة واحدة** — workspace.html?w=كود المساحة تعرض مهام المساحة مع إضافة/تعديل/حذف/حالة (Kanban).
- **الواجهة القديمة** — مسارات المهام والمالية عبر Apps Script ما زالت تعمل للتوافق مع الصفحات الحالية (index، finance، analytics).

الخطوة التالية: بناء واجهات موديولات لكل مساحة (خطوات: roadmap + backlog + expenses + docs؛ جاهزين: org + team + budgets؛ رحال: suppliers + inventory + campaigns؛ دراسة: terms + items؛ شخصي: courses + fitness + finance) واستخدام نفس الـ API تحت `/api/workspaces/:wid/...`.
