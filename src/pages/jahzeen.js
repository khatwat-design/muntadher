import '../styles/main.css';
import { requireAuth, logout } from '../auth/guard.js';
import { api } from '../api/client.js';

const WID = 'jahzeen';
let rolesCache = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await requireAuth())) return;
  document.getElementById('logoutBtn')?.addEventListener('click', logout);

  document.querySelectorAll('.wtab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.wtab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab + 'Panel').classList.add('active');
      if (btn.dataset.tab === 'team') fillRoleSelect('memberRole');
      if (btn.dataset.tab === 'budgets') { fillRoleSelect('budgetRole'); loadBudgets(); }
    });
  });

  document.getElementById('roleAdd')?.addEventListener('click', addRole);
  document.getElementById('memberAdd')?.addEventListener('click', addMember);
  document.getElementById('budgetAdd')?.addEventListener('click', addBudget);

  await loadRoles();
  await loadTeam();
  await loadBudgets();
});

function fillRoleSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">-- اختر الدور --</option>' + rolesCache.map(r => `<option value="${r.id}">${r.titleAr || r.title_ar || r.id}</option>`).join('');
}

async function loadRoles() {
  try {
    const list = await api.get(`/workspaces/${WID}/org/roles`);
    rolesCache = list || [];
    const el = document.getElementById('rolesList');
    el.innerHTML = (list || []).map(r => `
      <li class="item-row" data-id="${r.id}">
        <span><strong>${escapeHtml(r.titleAr || r.title_ar)}</strong> ${r.titleEn || r.title_en ? ' · ' + escapeHtml(r.titleEn || r.title_en) : ''}</span>
        <span class="row-actions">
          <button class="small-btn delete-role" data-id="${r.id}">حذف</button>
        </span>
      </li>
    `).join('') || '<li class="empty-msg">لا أدوار</li>';
    el.querySelectorAll('.delete-role').forEach(b => b.addEventListener('click', () => deleteRole(b.dataset.id)));
    fillRoleSelect('memberRole');
    fillRoleSelect('budgetRole');
  } catch (e) {
    document.getElementById('rolesList').innerHTML = '<li class="error-msg">' + e.message + '</li>';
  }
}

async function addRole() {
  const titleAr = document.getElementById('roleTitleAr').value.trim();
  if (!titleAr) return;
  try {
    await api.post(`/workspaces/${WID}/org/roles`, {
      titleAr,
      titleEn: document.getElementById('roleTitleEn').value.trim() || null,
      sortOrder: parseInt(document.getElementById('roleSort').value, 10) || 0,
    });
    document.getElementById('roleTitleAr').value = '';
    document.getElementById('roleTitleEn').value = '';
    await loadRoles();
  } catch (e) { alert(e.message); }
}

async function deleteRole(id) {
  if (!confirm('حذف الدور؟')) return;
  try {
    await api.del(`/workspaces/${WID}/org/roles/${id}`);
    await loadRoles();
  } catch (e) { alert(e.message); }
}

async function loadTeam() {
  try {
    const list = await api.get(`/workspaces/${WID}/team`);
    const el = document.getElementById('teamList');
    el.innerHTML = (list || []).map(m => {
      const role = rolesCache.find(r => r.id === m.roleId);
      return `
      <li class="item-row" data-id="${m.id}">
        <span><strong>${escapeHtml(m.name)}</strong> ${role ? ' · ' + (role.titleAr || role.title_ar) : ''} ${m.contact ? ' · ' + escapeHtml(m.contact) : ''}</span>
        <span class="row-actions">
          <button class="small-btn delete-member" data-id="${m.id}">حذف</button>
        </span>
      </li>`;
    }).join('') || '<li class="empty-msg">لا أعضاء</li>';
    el.querySelectorAll('.delete-member').forEach(b => b.addEventListener('click', () => deleteMember(b.dataset.id)));
  } catch (e) {
    document.getElementById('teamList').innerHTML = '<li class="error-msg">' + e.message + '</li>';
  }
}

async function addMember() {
  const name = document.getElementById('memberName').value.trim();
  if (!name) return;
  try {
    await api.post(`/workspaces/${WID}/team`, {
      name,
      roleId: document.getElementById('memberRole').value || null,
      contact: document.getElementById('memberContact').value.trim() || null,
    });
    document.getElementById('memberName').value = '';
    document.getElementById('memberContact').value = '';
    await loadTeam();
  } catch (e) { alert(e.message); }
}

async function deleteMember(id) {
  if (!confirm('حذف العضو؟')) return;
  try {
    await api.del(`/workspaces/${WID}/team/${id}`);
    await loadTeam();
  } catch (e) { alert(e.message); }
}

async function loadBudgets() {
  try {
    const list = await api.get(`/workspaces/${WID}/budgets`);
    const el = document.getElementById('budgetsList');
    el.innerHTML = (list || []).map(b => {
      const role = rolesCache.find(r => r.id === b.roleId);
      return `
      <li class="item-row" data-id="${b.id}">
        <span>${role ? (role.titleAr || role.title_ar) : '—'} · ${b.amount} د.ع · ${b.periodStart || b.period_start} → ${b.periodEnd || b.period_end}</span>
        <span class="row-actions">
          <button class="small-btn delete-budget" data-id="${b.id}">حذف</button>
        </span>
      </li>`;
    }).join('') || '<li class="empty-msg">لا ميزانيات</li>';
    el.querySelectorAll('.delete-budget').forEach(b => b.addEventListener('click', () => deleteBudget(b.dataset.id)));
  } catch (e) {
    document.getElementById('budgetsList').innerHTML = '<li class="error-msg">' + e.message + '</li>';
  }
}

async function addBudget() {
  const amount = parseFloat(document.getElementById('budgetAmount').value);
  const periodStart = document.getElementById('budgetStart').value;
  const periodEnd = document.getElementById('budgetEnd').value;
  if (!amount || !periodStart || !periodEnd) { alert('أدخل المبلغ وبداية ونهاية الفترة'); return; }
  try {
    await api.post(`/workspaces/${WID}/budgets`, {
      roleId: document.getElementById('budgetRole').value || null,
      amount,
      periodStart,
      periodEnd,
    });
    document.getElementById('budgetAmount').value = '';
    document.getElementById('budgetStart').value = '';
    document.getElementById('budgetEnd').value = '';
    await loadBudgets();
  } catch (e) { alert(e.message); }
}

async function deleteBudget(id) {
  if (!confirm('حذف الميزانية؟')) return;
  try {
    await api.del(`/workspaces/${WID}/budgets/${id}`);
    await loadBudgets();
  } catch (e) { alert(e.message); }
}

function escapeHtml(t) {
  if (t == null) return '';
  const d = document.createElement('div');
  d.textContent = String(t);
  return d.innerHTML;
}
