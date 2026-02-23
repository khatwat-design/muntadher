import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

router.get('/calendar', async (req, res) => {
  try {
    const { workspaceId, from, to } = req.query;
    const list = await db.listCalendarEvents({ workspaceId, from, to });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/calendar', async (req, res) => {
  try {
    const event = await db.addCalendarEvent(req.body);
    res.status(201).json(event);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/calendar/:id', async (req, res) => {
  try {
    const event = await db.updateCalendarEvent(req.params.id, req.body);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/calendar/:id', async (req, res) => {
  try {
    const ok = await db.deleteCalendarEvent(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Event not found' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
