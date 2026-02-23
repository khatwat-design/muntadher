import '../styles/main.css';
import { requireAuth, logout } from '../auth/guard.js';
import { api } from '../api/client.js';

const WID = 'rahal';

function getMonthKey(d) {
  const date = d instanceof Date ? d : new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getCurrentMonthKey() {
  return getMonthKey(new Date());
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await requireAuth())) return;
  document.getElementById('logoutBtn')?.addEventListener('click', logout);

  const planMonthInput = document.getElementById('planMonth');
  const month = getCurrentMonthKey();
  planMonthInput.value = month;

  const setMonth = (key) => {
    planMonthInput.value = key;
    loadPlan();
  };

  planMonthInput.addEventListener('change', () => loadPlan());
  document.getElementById('btnPrevMonth')?.addEventListener('click', () => {
    const [y, m] = planMonthInput.value.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setMonth(getMonthKey(d));
  });
  document.getElementById('btnNextMonth')?.addEventListener('click', () => {
    const [y, m] = planMonthInput.value.split('-').map(Number);
    const d = new Date(y, m, 1);
    setMonth(getMonthKey(d));
  });

  document.getElementById('itemAdd')?.addEventListener('click', addItem);
  document.getElementById('btnExport')?.addEventListener('click', exportPlan);
  document.getElementById('btnResetMonth')?.addEventListener('click', resetMonth);

  await loadPlan();
});

let planItems = [];

async function loadPlan() {
  const month = document.getElementById('planMonth').value || getCurrentMonthKey();
  try {
    planItems = await api.get(`/workspaces/${WID}/content-plan?month=${month}`);
    planItems = Array.isArray(planItems) ? planItems : [];
    renderList();
    renderCalendarStrip(month);
  } catch (e) {
    planItems = [];
    document.getElementById('planList').innerHTML = '<li class="error-msg">' + (e.message || 'خطأ في التحميل') + '</li>';
  }
}

function renderCalendarStrip(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const byDay = {};
  planItems.forEach((p) => {
    const d = p.dayOfMonth ?? p.day_of_month;
    if (d) byDay[d] = (byDay[d] || 0) + 1;
  });
  const strip = document.getElementById('calendarStrip');
  let html = '<div class="calendar-strip-inner">';
  for (let d = 1; d <= daysInMonth; d++) {
    const count = byDay[d] || 0;
    html += `<span class="cal-day ${count ? 'has-items' : ''}" title="اليوم ${d}: ${count} عنصر">${d}<small>${count ? count : ''}</small></span>`;
  }
  html += '</div>';
  strip.innerHTML = html;
}

function renderList() {
  const el = document.getElementById('planList');
  el.innerHTML =
    planItems
      .map(
        (p) => `
    <li class="item-row" data-id="${escapeAttr(p.id)}">
      <span><strong>${escapeHtml(p.title)}</strong>${p.dayOfMonth || p.day_of_month ? ' · يوم ' + (p.dayOfMonth ?? p.day_of_month) : ''}${p.notes ? ' · ' + escapeHtml(p.notes) : ''}</span>
      <span class="row-actions">
        <button class="small-btn edit-plan" data-id="${escapeAttr(p.id)}">تعديل</button>
        <button class="small-btn delete-plan" data-id="${escapeAttr(p.id)}">حذف</button>
      </span>
    </li>
  `
      )
      .join('') || '<li class="empty-msg">لا عناصر في هذا الشهر. أضف عناصر للخطة.</li>';

  el.querySelectorAll('.delete-plan').forEach((b) => b.addEventListener('click', () => deleteItem(b.dataset.id)));
  el.querySelectorAll('.edit-plan').forEach((b) => b.addEventListener('click', () => editItem(b.dataset.id)));
}

async function addItem() {
  const title = document.getElementById('itemTitle').value.trim();
  if (!title) return;
  const month = document.getElementById('planMonth').value || getCurrentMonthKey();
  const dayRaw = document.getElementById('itemDay').value;
  const day = dayRaw ? parseInt(dayRaw, 10) : null;
  const notes = document.getElementById('itemNotes').value.trim() || null;
  try {
    await api.post(`/workspaces/${WID}/content-plan?month=${month}`, {
      planMonth: month,
      title,
      dayOfMonth: day && day >= 1 && day <= 31 ? day : null,
      notes,
    });
    document.getElementById('itemTitle').value = '';
    document.getElementById('itemDay').value = '';
    document.getElementById('itemNotes').value = '';
    await loadPlan();
  } catch (e) {
    alert(e.message || 'خطأ في الإضافة');
  }
}

async function deleteItem(id) {
  if (!confirm('حذف هذا العنصر؟')) return;
  try {
    await api.del(`/workspaces/${WID}/content-plan/${id}`);
    await loadPlan();
  } catch (e) {
    alert(e.message);
  }
}

function editItem(id) {
  const p = planItems.find((x) => x.id === id);
  if (!p) return;
  const title = prompt('العنوان:', p.title);
  if (title == null) return;
  const dayStr = prompt('اليوم (1–31 أو اتركه فارغاً):', p.dayOfMonth ?? p.day_of_month ?? '');
  const day = dayStr ? parseInt(dayStr, 10) : null;
  const notes = prompt('ملاحظات:', p.notes || '') || null;
  api
    .put(`/workspaces/${WID}/content-plan/${id}`, {
      title: title.trim(),
      dayOfMonth: day && day >= 1 && day <= 31 ? day : null,
      notes,
    })
    .then(loadPlan)
    .catch((e) => alert(e.message));
}

function exportPlan() {
  const month = document.getElementById('planMonth').value || getCurrentMonthKey();
  const data = { month: month, items: planItems, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `rahal-plan-${month}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function resetMonth() {
  const month = document.getElementById('planMonth').value || getCurrentMonthKey();
  if (!confirm(`تصفير كل عناصر خطة شهر ${month}؟ لا يمكن التراجع.`)) return;
  try {
    await api.post(`/workspaces/${WID}/content-plan/reset`, { month });
    await loadPlan();
  } catch (e) {
    alert(e.message);
  }
}

function escapeHtml(t) {
  if (t == null) return '';
  const d = document.createElement('div');
  d.textContent = String(t);
  return d.innerHTML;
}

function escapeAttr(t) {
  return String(t == null ? '' : t).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
