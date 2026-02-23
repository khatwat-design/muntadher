import '../styles/main.css';
import { requireAuth, logout } from '../auth/guard.js';
import { api } from '../api/client.js';

const workspaceNames = {
  khotawat: 'خطوات',
  jahzeen: 'جاهزين',
  rahal: 'رحال',
  study: 'الدراسة',
  personal: 'الشخصي',
};

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await requireAuth())) return;
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  const params = new URLSearchParams(window.location.search);
  const wid = params.get('w') || 'personal';
  window.currentWorkspaceId = wid;

  document.getElementById('workspaceTitle').textContent = workspaceNames[wid] || wid;
  document.getElementById('workspaceSubtitle').textContent = `المهام والأنشطة — ${workspaceNames[wid] || wid}`;

  document.querySelectorAll('.nav-btn[href]').forEach(btn => {
    if (btn.href && btn.href.includes('command-center')) btn.classList.remove('active');
  });

  await loadTasks(wid);
  bindEvents(wid);
});

function bindEvents(wid) {
  document.getElementById('addTaskBtn').addEventListener('click', () => addTask(wid));
  document.getElementById('taskInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask(wid);
  });
  document.querySelectorAll('#workspaceRoot .filter-btn[data-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#workspaceRoot .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const status = btn.dataset.status;
      loadTasks(wid, status || undefined);
    });
  });
}

async function loadTasks(wid, status) {
  const url = status ? `/workspaces/${wid}/tasks?status=${status}` : `/workspaces/${wid}/tasks`;
  try {
    const tasks = await api.get(url);
    window.lastTasks = tasks;
    renderTasks(tasks, wid);
  } catch (e) {
    document.getElementById('tasksList').innerHTML = `<p class="error-msg">فشل التحميل: ${e.message}</p>`;
  }
}

function renderTasks(tasks, wid) {
  const el = document.getElementById('tasksList');
  if (!tasks || !tasks.length) {
    el.innerHTML = '<p class="empty-msg">لا توجد مهام. أضف مهمة جديدة.</p>';
    return;
  }
  const statusText = { todo: 'مهام', in_progress: 'قيد التنفيذ', review: 'مراجعة', done: 'منتهي' };
  const priorityText = { urgent: 'عاجل', important: 'مهم', normal: 'عادي' };
  el.innerHTML = tasks.map(t => {
    const title = (t.title || t.text || '').trim() || 'بدون عنوان';
    const done = !!t.completedAt || t.status === 'done';
    return `
      <div class="task-item ${done ? 'completed' : ''}" data-task-id="${t.id}">
        <input type="checkbox" class="task-checkbox" ${done ? 'checked' : ''} data-id="${t.id}">
        <div class="task-text">${escapeHtml(title)}</div>
        <div class="task-meta">
          <span class="task-priority priority-${t.priority || 'normal'}">${priorityText[t.priority] || 'عادي'}</span>
          <span class="task-status">${statusText[t.status] || t.status}</span>
        </div>
        <div class="task-actions">
          <button class="task-btn edit" data-id="${t.id}">تعديل</button>
          <button class="task-btn delete" data-id="${t.id}">حذف</button>
        </div>
      </div>
    `;
  }).join('');

  el.querySelectorAll('.task-checkbox').forEach(cb => {
    cb.addEventListener('change', () => toggleTask(cb.dataset.id, wid));
  });
  el.querySelectorAll('.task-btn.delete').forEach(btn => {
    btn.addEventListener('click', () => deleteTask(btn.dataset.id));
  });
  el.querySelectorAll('.task-btn.edit').forEach(btn => {
    btn.addEventListener('click', () => editTask(btn.dataset.id, tasks.find(x => x.id === btn.dataset.id)));
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

async function addTask(wid) {
  const input = document.getElementById('taskInput');
  const title = (input && input.value || '').trim();
  if (!title) return;
  const priority = document.getElementById('prioritySelect').value || 'normal';
  const status = document.getElementById('statusSelect').value || 'todo';
  try {
    await api.post(`/workspaces/${wid}/tasks`, { title, priority, status });
    if (input) input.value = '';
    await loadTasks(wid);
  } catch (e) {
    alert('فشل الإضافة: ' + e.message);
  }
}

async function toggleTask(taskId, wid) {
  wid = wid || window.currentWorkspaceId;
  if (!wid) return;
  const task = (window.lastTasks || []).find(t => t.id === taskId);
  const currentlyDone = !!(task && (task.completedAt || task.status === 'done'));
  try {
    await api.put(`/workspaces/${wid}/tasks/${taskId}`, { completed: !currentlyDone });
    await loadTasks(wid);
  } catch (e) {
    alert('فشل التحديث: ' + e.message);
  }
}

async function deleteTask(taskId) {
  if (!confirm('حذف المهمة؟')) return;
  const wid = window.currentWorkspaceId;
  try {
    await api.del(`/workspaces/${wid}/tasks/${taskId}`);
    await loadTasks(wid);
  } catch (e) {
    alert('فشل الحذف: ' + e.message);
  }
}

async function editTask(taskId, task) {
  const title = task && (task.title || task.text);
  const newTitle = prompt('عدل نص المهمة:', title);
  if (newTitle == null || (newTitle.trim() === (title || '').trim())) return;
  const wid = window.currentWorkspaceId;
  try {
    await api.put(`/workspaces/${wid}/tasks/${taskId}`, { title: newTitle.trim() });
    await loadTasks(wid);
  } catch (e) {
    alert('فشل التعديل: ' + e.message);
  }
}
