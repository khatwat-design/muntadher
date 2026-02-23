import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { appsScriptDB } from './apps-script-client.js';
import workspacesRouter from './routes/workspaces.js';
import unifiedTasksRouter from './routes/unifiedTasks.js';
import commandCenterRouter from './routes/commandCenter.js';
import calendarRouter from './routes/calendar.js';
import notificationsRouter from './routes/notifications.js';
import workspaceResourcesRouter from './routes/workspaceResources.js';
import { initDb } from './db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const app = express();
app.use(cors({
  origin: true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const ensureSchema = async () => {
  await initDb();
};

const createToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

const authMiddleware = (req, res, next) => {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }
  const adminUser = process.env.ADMIN_USERNAME || '';
  const adminHash = process.env.ADMIN_PASSWORD_HASH || '';
  if (!adminUser || !adminHash) {
    return res.status(500).json({ error: 'Server not configured' });
  }
  if (username !== adminUser) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const ok = await bcrypt.compare(password, adminHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = createToken({ username });
  return res.json({ token });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ ok: true, user: req.user });
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api', authMiddleware);

// Unified system: workspaces, command center, calendar, notifications, workspace-scoped resources
app.use('/api', workspacesRouter);
app.use('/api', unifiedTasksRouter);
app.use('/api', commandCenterRouter);
app.use('/api', calendarRouter);
app.use('/api', notificationsRouter);
app.use('/api', workspaceResourcesRouter);

// Legacy: Tasks (Apps Script — يمكن لاحقاً تحويلها إلى adapter مع workspace=personal)
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await appsScriptDB.getTasks();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { id, text, priority, category, repeat, completed, createdAt, completedAt, timeSpent, nextDue } = req.body;
    const result = await appsScriptDB.addTask({
      id, text, priority, category, repeat, completed, createdAt, completedAt, timeSpent, nextDue
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, completed, completedAt, timeSpent, nextDue } = req.body;
    const result = await appsScriptDB.updateTask(id, {
      text, completed, completedAt, timeSpent, nextDue
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await appsScriptDB.deleteTask(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Finance
app.get('/api/finance', async (req, res) => {
  try {
    const finance = await appsScriptDB.getFinanceData();
    res.json(finance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/finance/transactions', async (req, res) => {
  try {
    const { id, amount, type, description, category, date, month, year } = req.body;
    const result = await appsScriptDB.addTransaction({
      id, amount, type, description, category, date, month, year
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/finance/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await appsScriptDB.deleteTransaction(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/finance/budget', async (req, res) => {
  try {
    const { amount } = req.body;
    const result = await appsScriptDB.updateBudget(amount);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/finance/goals', async (req, res) => {
  try {
    const { id, name, targetAmount, currentAmount, targetDate, createdAt, completed } = req.body;
    const result = await appsScriptDB.addGoal({
      id, name, targetAmount, currentAmount, targetDate, createdAt, completed
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/finance/goals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentAmount, completed } = req.body;
    const result = await appsScriptDB.updateGoal(id, {
      currentAmount, completed
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/finance/goals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await appsScriptDB.deleteGoal(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/finance/debts', async (req, res) => {
  try {
    const { id, type, personName, totalAmount, paidAmount, dueDate, createdAt, status } = req.body;
    const result = await appsScriptDB.addDebt({
      id, type, personName, totalAmount, paidAmount, dueDate, createdAt, status
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/finance/debts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { paidAmount, status } = req.body;
    const result = await appsScriptDB.updateDebt(id, {
      paidAmount, status
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/finance/debts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await appsScriptDB.deleteDebt(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/finance/subscriptions', async (req, res) => {
  try {
    const { id, name, amount, frequency, nextPayment, createdAt, status } = req.body;
    const result = await appsScriptDB.addSubscription({
      id, name, amount, frequency, nextPayment, createdAt, status
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/finance/subscriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nextPayment, status } = req.body;
    const result = await appsScriptDB.updateSubscription(id, {
      nextPayment, status
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/finance/subscriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await appsScriptDB.deleteSubscription(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get(['/', '/index.html', '/finance.html', '/login.html', '/command-center.html', '/workspace.html', '/khotawat.html', '/jahzeen.html', '/rahal.html', '/study.html', '/finance-unified.html'], (req, res) => {
    const filePath = req.path === '/' ? 'index.html' : req.path.slice(1);
    res.sendFile(path.join(distPath, filePath));
  });
}

const port = Number(process.env.PORT || process.env.API_PORT || 3001);

ensureSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to init schema:', err);
    process.exit(1);
  });
