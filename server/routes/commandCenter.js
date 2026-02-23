import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

/** لوحة القيادة: ملخص كل المساحات + مهام مجمعة + تنبيهات + أحداث قادمة */
router.get('/command-center', async (req, res) => {
  try {
    const workspaces = await db.listWorkspaces();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const byWorkspace = [];
    let totalTasks = 0;
    let totalTodo = 0;
    let totalDone = 0;
    let overdueCount = 0;

    for (const ws of workspaces) {
      const tasks = await db.listTasks(ws.id, {});
      const todo = tasks.filter(t => !t.completedAt && t.status !== 'done').length;
      const done = tasks.filter(t => t.completedAt || t.status === 'done').length;
      const overdue = tasks.filter(t => !t.completedAt && t.dueAt && new Date(t.dueAt) < now).length;
      totalTasks += tasks.length;
      totalTodo += todo;
      totalDone += done;
      overdueCount += overdue;

      byWorkspace.push({
        id: ws.id,
        code: ws.code,
        name_ar: ws.nameAr || ws.name_ar,
        name_en: ws.nameEn || ws.name_en,
        type: ws.type,
        taskCount: tasks.length,
        todoCount: todo,
        doneCount: done,
        overdueCount: overdue,
        urgentTasks: tasks.filter(t => t.priority === 'urgent' && !t.completedAt).slice(0, 3),
      });
    }

    const notifications = await db.listNotifications({ unreadOnly: true });
    const calendarEvents = await db.listCalendarEvents({
      from: todayStart.toISOString(),
      to: weekEnd.toISOString(),
    });

    res.json({
      workspaces: byWorkspace,
      summary: {
        totalTasks,
        totalTodo,
        totalDone,
        overdueCount,
        productivityRate: totalTasks ? Math.round((totalDone / totalTasks) * 100) : 0,
      },
      notifications: notifications.slice(0, 10),
      upcomingEvents: calendarEvents.slice(0, 15),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
