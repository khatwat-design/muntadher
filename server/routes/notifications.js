import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

router.get('/notifications', async (req, res) => {
  try {
    const unreadOnly = req.query.unreadOnly === 'true';
    const list = await db.listNotifications({ unreadOnly });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/notifications', async (req, res) => {
  try {
    const notification = await db.addNotification(req.body);
    res.status(201).json(notification);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/notifications/:id/read', async (req, res) => {
  try {
    const ok = await db.markNotificationRead(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
