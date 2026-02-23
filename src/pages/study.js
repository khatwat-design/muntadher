import '../styles/main.css';
import { requireAuth, logout } from '../auth/guard.js';
import { api } from '../api/client.js';

const WID = 'study';
let termsCache = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await requireAuth())) return;
  document.getElementById('logoutBtn')?.addEventListener('click', logout);

  document.querySelectorAll('.wtab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.wtab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab + 'Panel').classList.add('active');
      if (btn.dataset.tab === 'items') { fillTermSelect(); loadItems(); }
    });
  });

  document.getElementById('termAdd')?.addEventListener('click', addTerm);
  document.getElementById('itemAdd')?.addEventListener('click', addItem);

  await loadTerms();
  await loadItems();
});

function fillTermSelect() {
  const sel = document.getElementById('itemTerm');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- المادة --</option>' + (termsCache || []).map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
}

async function loadTerms() {
  try {
    const list = await api.get(`/workspaces/${WID}/study/terms`);
    termsCache = list || [];
    const el = document.getElementById('termsList');
    el.innerHTML = (list || []).map(t => `
      <li class="item-row" data-id="${t.id}">
        <span><strong>${escapeHtml(t.name)}</strong> · ${t.startDate || t.start_date} → ${t.endDate || t.end_date}</span>
        <span class="row-actions">
          <button class="small-btn delete-term" data-id="${t.id}">حذف</button>
        </span>
      </li>
    `).join('') || '<li class="empty-msg">لا مواد</li>';
    el.querySelectorAll('.delete-term').forEach(b => b.addEventListener('click', () => deleteTerm(b.dataset.id)));
    fillTermSelect();
  } catch (e) {
    document.getElementById('termsList').innerHTML = '<li class="error-msg">' + e.message + '</li>';
  }
}

async function addTerm() {
  const name = document.getElementById('termName').value.trim();
  const startDate = document.getElementById('termStart').value;
  const endDate = document.getElementById('termEnd').value;
  if (!name || !startDate || !endDate) { alert('أدخل اسم المادة وتواريخ البداية والنهاية'); return; }
  try {
    await api.post(`/workspaces/${WID}/study/terms`, { name, startDate, endDate });
    document.getElementById('termName').value = '';
    document.getElementById('termStart').value = '';
    document.getElementById('termEnd').value = '';
    await loadTerms();
  } catch (e) { alert(e.message); }
}

async function deleteTerm(id) {
  if (!confirm('حذف المادة؟')) return;
  try {
    await api.del(`/workspaces/${WID}/study/terms/${id}`);
    await loadTerms();
  } catch (e) { alert(e.message); }
}

async function loadItems() {
  try {
    const termId = document.getElementById('itemTerm')?.value || null;
    const list = await api.get(`/workspaces/${WID}/study/items${termId ? '?termId=' + termId : ''}`);
    const el = document.getElementById('itemsList');
    const typeAr = { lecture: 'محاضرة', practical: 'تدريب عملي', exam: 'امتحان' };
    el.innerHTML = (list || []).map(i => {
      const scheduled = i.scheduledAt || i.scheduled_at;
      const dateStr = scheduled ? new Date(scheduled).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' }) : '—';
      return `
      <li class="item-row" data-id="${i.id}">
        <span><strong>${escapeHtml(i.title)}</strong> · ${typeAr[i.itemType] || i.itemType} · ${dateStr}</span>
        <span class="row-actions">
          <button class="small-btn delete-item" data-id="${i.id}">حذف</button>
        </span>
      </li>`;
    }).join('') || '<li class="empty-msg">لا عناصر</li>';
    el.querySelectorAll('.delete-item').forEach(b => b.addEventListener('click', () => deleteItem(b.dataset.id)));
  } catch (e) {
    document.getElementById('itemsList').innerHTML = '<li class="error-msg">' + e.message + '</li>';
  }
}

async function addItem() {
  const title = document.getElementById('itemTitle').value.trim();
  if (!title) return;
  let scheduledAt = document.getElementById('itemScheduled').value;
  if (scheduledAt) scheduledAt = new Date(scheduledAt).toISOString();
  try {
    await api.post(`/workspaces/${WID}/study/items`, {
      termId: document.getElementById('itemTerm').value || null,
      title,
      itemType: document.getElementById('itemType').value,
      scheduledAt: scheduledAt || null,
    });
    document.getElementById('itemTitle').value = '';
    document.getElementById('itemScheduled').value = '';
    await loadItems();
  } catch (e) { alert(e.message); }
}

async function deleteItem(id) {
  if (!confirm('حذف؟')) return;
  try {
    await api.del(`/workspaces/${WID}/study/items/${id}`);
    await loadItems();
  } catch (e) { alert(e.message); }
}

function escapeHtml(t) {
  if (t == null) return '';
  const d = document.createElement('div');
  d.textContent = String(t);
  return d.innerHTML;
}
