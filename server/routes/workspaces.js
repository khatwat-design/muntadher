import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

router.get('/workspaces', async (req, res) => {
  try {
    const list = await db.listWorkspaces();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/workspaces/:id', async (req, res) => {
  try {
    const w = await db.getWorkspace(req.params.id);
    if (!w) return res.status(404).json({ error: 'Workspace not found' });
    res.json(w);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
