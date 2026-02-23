import '../styles/main.css';
import { requireAuth, logout } from '../auth/guard.js';
import { api } from '../api/client.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await requireAuth())) return;
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  await loadCommandCenter();
});

async function loadCommandCenter() {
  try {
    const data = await api.get('/command-center');
    renderSummary(data.summary);
    renderWorkspaceCards(data.workspaces);
    renderNotifications(data.notifications);
    renderUpcomingEvents(data.upcomingEvents);
  } catch (e) {
    document.getElementById('summaryCards').innerHTML = `<p class="error-msg">فشل تحميل لوحة القيادة: ${e.message}</p>`;
  }
}

function renderSummary(summary) {
  const el = document.getElementById('summaryCards');
  if (!summary) return;
  el.innerHTML = `
    <div class="stat-card">
      <h3>إجمالي المهام</h3>
      <p class="stat-number">${summary.totalTasks}</p>
    </div>
    <div class="stat-card">
      <h3>قيد التنفيذ</h3>
      <p class="stat-number">${summary.totalTodo}</p>
    </div>
    <div class="stat-card">
      <h3>مكتمل</h3>
      <p class="stat-number">${summary.totalDone}</p>
    </div>
    <div class="stat-card">
      <h3>متأخر</h3>
      <p class="stat-number">${summary.overdueCount}</p>
    </div>
    <div class="stat-card">
      <h3>معدل الإنجاز</h3>
      <p class="stat-number">${summary.productivityRate}%</p>
    </div>
  `;
}

const workspacePageLink = {
  khotawat: '/khotawat.html',
  jahzeen: '/jahzeen.html',
  rahal: '/rahal.html',
  study: '/study.html',
  personal: '/index.html',
};
function workspaceLink(code) {
  return workspacePageLink[code] || `/workspace.html?w=${encodeURIComponent(code)}`;
}

function renderWorkspaceCards(workspaces) {
  const el = document.getElementById('workspaceCards');
  if (!workspaces || !workspaces.length) {
    el.innerHTML = '<p class="empty-msg">لا توجد مساحات.</p>';
    return;
  }
  el.innerHTML = workspaces.map(ws => {
    const link = workspaceLink(ws.code);
    const urgent = (ws.urgentTasks || []).slice(0, 2).map(t => escapeHtml(t.title || t.text)).join('، ') || '—';
    return `
      <div class="workspace-card" data-workspace="${ws.id}">
        <div class="workspace-card-header">
          <h3>${escapeHtml(ws.name_ar || ws.nameAr || ws.code)}</h3>
          <span class="workspace-type">${ws.type || ''}</span>
        </div>
        <div class="workspace-card-stats">
          <span>مهام: ${ws.taskCount}</span>
          <span>قيد التنفيذ: ${ws.todoCount}</span>
          ${ws.overdueCount ? `<span class="overdue">متأخر: ${ws.overdueCount}</span>` : ''}
        </div>
        ${urgent !== '—' ? `<p class="workspace-urgent">عاجل: ${urgent}</p>` : ''}
        <a href="${link}" class="workspace-card-link">فتح المساحة</a>
      </div>
    `;
  }).join('');
}

function renderNotifications(notifications) {
  const el = document.getElementById('notificationsList');
  if (!notifications || !notifications.length) {
    el.innerHTML = '<p class="empty-msg">لا توجد تنبيهات جديدة.</p>';
    return;
  }
  el.innerHTML = notifications.map(n => `
    <div class="notification-item">
      <strong>${escapeHtml(n.title)}</strong>
      ${n.body ? `<p>${escapeHtml(n.body)}</p>` : ''}
    </div>
  `).join('');
}

function renderUpcomingEvents(events) {
  const el = document.getElementById('upcomingEvents');
  if (!events || !events.length) {
    el.innerHTML = '<p class="empty-msg">لا أحداث قادمة.</p>';
    return;
  }
  el.innerHTML = events.map(e => {
    const start = e.startAt ? new Date(e.startAt).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' }) : '';
    return `<div class="event-item"><strong>${escapeHtml(e.title)}</strong> <span class="event-date">${start}</span></div>`;
  }).join('');
}

function escapeHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}
