/**
 * تحذير التضارب: مهمة برمجية (خطوات) تتزامن مع محاضرة/تدريب (الدراسة)
 */
import { db } from '../db/index.js';

const KHOTAWAT = 'khotawat';
const STUDY = 'study';

function toDate(d) {
  if (!d) return null;
  const x = new Date(d);
  return isNaN(x.getTime()) ? null : x;
}

/**
 * يتحقق من تداخل وقت المهمة (due_at) مع أي عنصر دراسة (scheduled_at).
 * إن وُجد تضارب يُنشئ تنبيهاً.
 */
export async function checkTaskStudyConflict(workspaceId, taskTitle, dueAt) {
  if (workspaceId !== KHOTAWAT || !dueAt) return;
  const taskTime = toDate(dueAt);
  if (!taskTime) return;

  const studyItems = await db.listStudyItems(STUDY, {});
  const conflicts = studyItems.filter(item => {
    const scheduled = toDate(item.scheduledAt || item.scheduled_at);
    if (!scheduled) return false;
    const sameDay = taskTime.toDateString() === scheduled.toDateString();
    const start = new Date(scheduled);
    const end = new Date(scheduled.getTime() + 60 * 60 * 1000);
    const overlap = taskTime >= start && taskTime <= end;
    return sameDay && (overlap || Math.abs(taskTime - scheduled) < 2 * 60 * 60 * 1000);
  });

  if (conflicts.length > 0) {
    const titles = conflicts.map(c => c.title).join('، ');
    await db.addNotification({
      workspaceId: KHOTAWAT,
      title: 'تحذير تضارب مع الدراسة',
      body: `المهمة "${(taskTitle || '').slice(0, 50)}" تتزامن مع: ${titles}. راجع جدول الدراسة.`,
    });
  }
}
