import { Router } from 'express';
import { db } from '../db/index.js';
import { checkTaskStudyConflict } from '../services/conflictCheck.js';

const router = Router({ mergeParams: true });

router.get('/workspaces/:wid/tasks', async (req, res) => {
  try {
    const { wid } = req.params;
    const { status, priority } = req.query;
    const list = await db.listTasks(wid, { status, priority });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/workspaces/:wid/tasks', async (req, res) => {
  try {
    const { wid } = req.params;
    const task = await db.addTask(wid, req.body);
    const dueAt = req.body.dueAt || req.body.due_at || task.dueAt;
    await checkTaskStudyConflict(wid, task.title || task.text, dueAt);
    res.status(201).json(task);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/workspaces/:wid/tasks/:id', async (req, res) => {
  try {
    const task = await db.getTask(req.params.id);
    if (!task || task.workspaceId !== req.params.wid) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/workspaces/:wid/tasks/:id', async (req, res) => {
  try {
    const { wid } = req.params;
    const task = await db.updateTask(req.params.id, req.body);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const dueAt = req.body.dueAt || req.body.due_at || task.dueAt;
    await checkTaskStudyConflict(wid, task.title || task.text, dueAt);
    res.json(task);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/workspaces/:wid/tasks/:id', async (req, res) => {
  try {
    const ok = await db.deleteTask(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Task not found' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
