/**
 * Routes for workspace-scoped resources: expenses, roadmap, backlog, org, team, etc.
 * All under /api/workspaces/:wid/...
 */
import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router({ mergeParams: true });

function wrap(fn) {
  return (req, res, next) => fn(req, res).catch(next);
}

const wid = (req) => req.params.wid;

// Expenses
router.get('/workspaces/:wid/expenses', wrap(async (req, res) => {
  const list = await db.listExpenses(wid(req));
  res.json(list);
}));
router.post('/workspaces/:wid/expenses', wrap(async (req, res) => {
  const row = await db.addExpense(wid(req), req.body);
  res.status(201).json(row);
}));
router.put('/workspaces/:wid/expenses/:id', wrap(async (req, res) => {
  const row = await db.updateExpense(req.params.id, req.body);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
}));
router.delete('/workspaces/:wid/expenses/:id', wrap(async (req, res) => {
  const ok = await db.deleteExpense(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
}));

// Roadmap (خطوات)
router.get('/workspaces/:wid/roadmap', wrap(async (req, res) => {
  res.json(await db.listRoadmapItems(wid(req)));
}));
router.post('/workspaces/:wid/roadmap', wrap(async (req, res) => {
  res.status(201).json(await db.addRoadmapItem(wid(req), req.body));
}));
router.put('/workspaces/:wid/roadmap/:id', wrap(async (req, res) => {
  const row = await db.updateRoadmapItem(req.params.id, req.body);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
}));
router.delete('/workspaces/:wid/roadmap/:id', wrap(async (req, res) => {
  const ok = await db.deleteRoadmapItem(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
}));

// Backlog
router.get('/workspaces/:wid/backlog', wrap(async (req, res) => {
  res.json(await db.listBacklogItems(wid(req)));
}));
router.post('/workspaces/:wid/backlog', wrap(async (req, res) => {
  res.status(201).json(await db.addBacklogItem(wid(req), req.body));
}));
router.put('/workspaces/:wid/backlog/:id', wrap(async (req, res) => {
  const row = await db.updateBacklogItem(req.params.id, req.body);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
}));
router.delete('/workspaces/:wid/backlog/:id', wrap(async (req, res) => {
  const ok = await db.deleteBacklogItem(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
}));

// Tech docs
router.get('/workspaces/:wid/docs', wrap(async (req, res) => {
  res.json(await db.listTechDocs(wid(req)));
}));
router.get('/workspaces/:wid/docs/:id', wrap(async (req, res) => {
  const doc = await db.getTechDoc(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
}));
router.post('/workspaces/:wid/docs', wrap(async (req, res) => {
  res.status(201).json(await db.addTechDoc(wid(req), req.body));
}));
router.put('/workspaces/:wid/docs/:id', wrap(async (req, res) => {
  const row = await db.updateTechDoc(req.params.id, req.body);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
}));
router.delete('/workspaces/:wid/docs/:id', wrap(async (req, res) => {
  const ok = await db.deleteTechDoc(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
}));

// Org roles (جاهزين)
router.get('/workspaces/:wid/org/roles', wrap(async (req, res) => {
  res.json(await db.listOrgRoles(wid(req)));
}));
router.post('/workspaces/:wid/org/roles', wrap(async (req, res) => {
  res.status(201).json(await db.addOrgRole(wid(req), req.body));
}));
router.put('/workspaces/:wid/org/roles/:id', wrap(async (req, res) => {
  const row = await db.updateOrgRole(req.params.id, req.body);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
}));
router.delete('/workspaces/:wid/org/roles/:id', wrap(async (req, res) => {
  const ok = await db.deleteOrgRole(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
}));

// Team members (جاهزين)
router.get('/workspaces/:wid/team', wrap(async (req, res) => {
  res.json(await db.listTeamMembers(wid(req)));
}));
router.post('/workspaces/:wid/team', wrap(async (req, res) => {
  res.status(201).json(await db.addTeamMember(wid(req), req.body));
}));
router.put('/workspaces/:wid/team/:id', wrap(async (req, res) => {
  const row = await db.updateTeamMember(req.params.id, req.body);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
}));
router.delete('/workspaces/:wid/team/:id', wrap(async (req, res) => {
  const ok = await db.deleteTeamMember(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
}));

// Department budgets (جاهزين)
router.get('/workspaces/:wid/budgets', wrap(async (req, res) => {
  res.json(await db.listDepartmentBudgets(wid(req)));
}));
router.post('/workspaces/:wid/budgets', wrap(async (req, res) => {
  res.status(201).json(await db.addDepartmentBudget(wid(req), req.body));
}));
router.put('/workspaces/:wid/budgets/:id', wrap(async (req, res) => {
  const row = await db.updateDepartmentBudget(req.params.id, req.body);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
}));
router.delete('/workspaces/:wid/budgets/:id', wrap(async (req, res) => {
  const ok = await db.deleteDepartmentBudget(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
}));

// Suppliers (رحال)
router.get('/workspaces/:wid/suppliers', wrap(async (req, res) => {
  res.json(await db.listSuppliers(wid(req)));
}));
router.post('/workspaces/:wid/suppliers', wrap(async (req, res) => {
  res.status(201).json(await db.addSupplier(wid(req), req.body));
}));
router.put('/workspaces/:wid/suppliers/:id', wrap(async (req, res) => {
  const row = await db.updateSupplier(req.params.id, req.body);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
}));
router.delete('/workspaces/:wid/suppliers/:id', wrap(async (req, res) => {
  const ok = await db.deleteSupplier(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
}));

// Inventory (رحال)
router.get('/workspaces/:wid/inventory', wrap(async (req, res) => {
  res.json(await db.listInventoryItems(wid(req)));
}));
router.post('/workspaces/:wid/inventory', wrap(async (req, res) => {
  res.status(201).json(await db.addInventoryItem(wid(req), req.body));
}));
router.put('/workspaces/:wid/inventory/:id', wrap(async (req, res) => {
  const row = await db.updateInventoryItem(req.params.id, req.body);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
}));
router.delete('/workspaces/:wid/inventory/:id', wrap(async (req, res) => {
  const ok = await db.deleteInventoryItem(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
}));

// Campaigns (رحال)
router.get('/workspaces/:wid/campaigns', wrap(async (req, res) => {
  res.json(await db.listCampaigns(wid(req)));
}));
router.post('/workspaces/:wid/campaigns', wrap(async (req, res) => {
  res.status(201).json(await db.addCampaign(wid(req), req.body));
}));
router.put('/workspaces/:wid/campaigns/:id', wrap(async (req, res) => {
  const row = await db.updateCampaign(req.params.id, req.body);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
}));
router.delete('/workspaces/:wid/campaigns/:id', wrap(async (req, res) => {
  const ok = await db.deleteCampaign(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
}));

// رحال: خطة محتوى شهرية
router.get('/workspaces/:wid/content-plan', wrap(async (req, res) => {
  const month = req.query.month || getCurrentMonthKey();
  const list = await db.listContentPlanItems(wid(req), month);
  res.json(list);
}));
router.post('/workspaces/:wid/content-plan', wrap(async (req, res) => {
  const month = req.query.month || req.body.planMonth || getCurrentMonthKey();
  const item = { ...req.body, planMonth: req.body.planMonth || month };
  res.status(201).json(await db.addContentPlanItem(wid(req), item));
}));
router.put('/workspaces/:wid/content-plan/:id', wrap(async (req, res) => {
  const row = await db.updateContentPlanItem(req.params.id, req.body);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
}));
router.delete('/workspaces/:wid/content-plan/:id', wrap(async (req, res) => {
  const ok = await db.deleteContentPlanItem(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
}));
router.post('/workspaces/:wid/content-plan/reset', wrap(async (req, res) => {
  const month = req.body.month || req.query.month || getCurrentMonthKey();
  await db.resetContentPlanMonth(wid(req), month);
  res.json({ ok: true, month });
}));
function getCurrentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Study terms & items (الدراسة)
router.get('/workspaces/:wid/study/terms', wrap(async (req, res) => {
  res.json(await db.listStudyTerms(wid(req)));
}));
router.post('/workspaces/:wid/study/terms', wrap(async (req, res) => {
  res.status(201).json(await db.addStudyTerm(wid(req), req.body));
}));
router.delete('/workspaces/:wid/study/terms/:id', wrap(async (req, res) => {
  const ok = await db.deleteStudyTerm(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
}));
router.get('/workspaces/:wid/study/items', wrap(async (req, res) => {
  res.json(await db.listStudyItems(wid(req), { termId: req.query.termId }));
}));
router.post('/workspaces/:wid/study/items', wrap(async (req, res) => {
  res.status(201).json(await db.addStudyItem(wid(req), req.body));
}));
router.put('/workspaces/:wid/study/items/:id', wrap(async (req, res) => {
  const row = await db.updateStudyItem(req.params.id, req.body);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
}));
router.delete('/workspaces/:wid/study/items/:id', wrap(async (req, res) => {
  const ok = await db.deleteStudyItem(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
}));

// Courses (شخصي)
router.get('/workspaces/:wid/courses', wrap(async (req, res) => {
  res.json(await db.listCourses(wid(req)));
}));
router.post('/workspaces/:wid/courses', wrap(async (req, res) => {
  res.status(201).json(await db.addCourse(wid(req), req.body));
}));
router.put('/workspaces/:wid/courses/:id', wrap(async (req, res) => {
  const row = await db.updateCourse(req.params.id, req.body);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
}));
router.delete('/workspaces/:wid/courses/:id', wrap(async (req, res) => {
  const ok = await db.deleteCourse(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
}));

// Fitness (شخصي)
router.get('/workspaces/:wid/fitness', wrap(async (req, res) => {
  res.json(await db.listFitnessEntries(wid(req), { from: req.query.from, to: req.query.to }));
}));
router.post('/workspaces/:wid/fitness', wrap(async (req, res) => {
  res.status(201).json(await db.addFitnessEntry(wid(req), req.body));
}));
router.delete('/workspaces/:wid/fitness/:id', wrap(async (req, res) => {
  const ok = await db.deleteFitnessEntry(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
}));

// Finance (transactions, budget, goals, debts, subscriptions) — per workspace
router.get('/workspaces/:wid/finance', wrap(async (req, res) => {
  const [transactions, budget, goals, debts, subscriptions] = await Promise.all([
    db.listTransactions(wid(req)),
    db.getBudget(wid(req)),
    db.listGoals(wid(req)),
    db.listDebts(wid(req)),
    db.listSubscriptions(wid(req)),
  ]);
  res.json({ transactions, budget, goals, debts, subscriptions, currency: 'د.ع' });
}));
router.post('/workspaces/:wid/finance/transactions', wrap(async (req, res) => {
  res.status(201).json(await db.addTransaction(wid(req), req.body));
}));
router.delete('/workspaces/:wid/finance/transactions/:id', wrap(async (req, res) => {
  const ok = await db.deleteTransaction(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
}));
router.put('/workspaces/:wid/finance/budget', wrap(async (req, res) => {
  const amount = await db.setBudget(wid(req), req.body.amount);
  res.json({ amount });
}));
router.post('/workspaces/:wid/finance/goals', wrap(async (req, res) => {
  res.status(201).json(await db.addGoal(wid(req), req.body));
}));
router.put('/workspaces/:wid/finance/goals/:id', wrap(async (req, res) => {
  const row = await db.updateGoal(req.params.id, req.body);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
}));
router.delete('/workspaces/:wid/finance/goals/:id', wrap(async (req, res) => {
  const ok = await db.deleteGoal(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
}));
router.post('/workspaces/:wid/finance/debts', wrap(async (req, res) => {
  res.status(201).json(await db.addDebt(wid(req), req.body));
}));
router.put('/workspaces/:wid/finance/debts/:id', wrap(async (req, res) => {
  const row = await db.updateDebt(req.params.id, req.body);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
}));
router.delete('/workspaces/:wid/finance/debts/:id', wrap(async (req, res) => {
  const ok = await db.deleteDebt(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
}));
router.post('/workspaces/:wid/finance/subscriptions', wrap(async (req, res) => {
  res.status(201).json(await db.addSubscription(wid(req), req.body));
}));
router.put('/workspaces/:wid/finance/subscriptions/:id', wrap(async (req, res) => {
  const row = await db.updateSubscription(req.params.id, req.body);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
}));
router.delete('/workspaces/:wid/finance/subscriptions/:id', wrap(async (req, res) => {
  const ok = await db.deleteSubscription(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
}));

export default router;
