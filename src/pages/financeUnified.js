import '../styles/main.css';
import Chart from 'chart.js/auto';
import { requireAuth, logout } from '../auth/guard.js';
import { api } from '../api/client.js';

const WORKSPACES = [
  { id: 'personal', name: 'الشخصي' },
  { id: 'khotawat', name: 'خطوات' },
  { id: 'jahzeen', name: 'جاهزين' },
  { id: 'rahal', name: 'رحال' },
  { id: 'study', name: 'الدراسة' },
];

let financeChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await requireAuth())) return;
  document.getElementById('logoutBtn')?.addEventListener('click', logout);
  document.getElementById('transAdd')?.addEventListener('click', addTransaction);
  await loadAll();
});

async function loadAll() {
  await Promise.all([loadChart(), loadSummary(), loadRecentTransactions()]);
}

async function loadChart() {
  const all = [];
  for (const w of WORKSPACES) {
    try {
      const data = await api.get(`/workspaces/${w.id}/finance`);
      (data.transactions || []).forEach(t => all.push({ ...t, workspaceId: w.id, workspaceName: w.name }));
    } catch (_) {}
  }
  const now = new Date();
  const months = [];
  const incomeByMonth = [];
  const expenseByMonth = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push(d.toLocaleDateString('ar-SA', { month: 'short', year: '2-digit' }));
    let income = 0, expense = 0;
    all.forEach(t => {
      const tDate = t.transDate || t.date;
      if (!tDate) return;
      const td = new Date(tDate);
      const tk = `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, '0')}`;
      if (tk !== monthKey) return;
      if (t.type === 'income') income += Number(t.amount);
      else expense += Number(t.amount);
    });
    incomeByMonth.push(income);
    expenseByMonth.push(expense);
  }
  const ctx = document.getElementById('financeChart');
  if (!ctx) return;
  if (financeChart) financeChart.destroy();
  financeChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { label: 'الدخل', data: incomeByMonth, backgroundColor: 'rgba(16, 185, 129, 0.8)', borderColor: '#10b981', borderWidth: 2 },
        { label: 'المصروفات', data: expenseByMonth, backgroundColor: 'rgba(239, 68, 68, 0.8)', borderColor: '#ef4444', borderWidth: 2 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#fff', font: { family: 'Tajawal' } } },
        title: { display: true, text: 'الدخل والمصروفات الشهرية', color: '#fff', font: { family: 'Tajawal', size: 16 } },
      },
      scales: {
        x: { grid: { color: '#333' }, ticks: { color: '#9ca3af' } },
        y: { grid: { color: '#333' }, ticks: { color: '#9ca3af' } },
      },
    },
  });
}

async function loadSummary() {
  const el = document.getElementById('workspaceFinanceSummary');
  const rows = [];
  for (const w of WORKSPACES) {
    try {
      const data = await api.get(`/workspaces/${w.id}/finance`);
      const trans = data.transactions || [];
      const income = trans.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expense = trans.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      const budget = Number(data.budget) || 0;
      rows.push(`
        <div class="finance-ws-row">
          <strong>${w.name}</strong>
          <span>دخل: ${income.toFixed(2)} د.ع</span>
          <span>مصروف: ${expense.toFixed(2)} د.ع</span>
          <span>ميزانية: ${budget.toFixed(2)} د.ع</span>
        </div>
      `);
    } catch (_) {
      rows.push(`<div class="finance-ws-row"><strong>${w.name}</strong> <span class="error-msg">—</span></div>`);
    }
  }
  el.innerHTML = rows.join('') || '<p class="empty-msg">لا بيانات</p>';
}

async function loadRecentTransactions() {
  const all = [];
  for (const w of WORKSPACES) {
    try {
      const data = await api.get(`/workspaces/${w.id}/finance`);
      (data.transactions || []).slice(0, 15).forEach(t => all.push({ ...t, workspaceId: w.id, workspaceName: w.name }));
    } catch (_) {}
  }
  all.sort((a, b) => new Date(b.transDate || b.date || 0) - new Date(a.transDate || a.date || 0));
  const el = document.getElementById('transList');
  el.innerHTML = all.slice(0, 25).map(t => {
    const date = t.transDate || t.date;
    const dateStr = date ? new Date(date).toLocaleDateString('ar-SA', { dateStyle: 'short' }) : '—';
    return `
      <li class="item-row">
        <span><strong>${t.workspaceName}</strong> · ${dateStr} · ${t.type === 'income' ? 'دخل' : 'مصروف'} · ${Number(t.amount).toFixed(2)} د.ع · ${escapeHtml(t.description || '')}</span>
        <span class="row-actions">
          <button class="small-btn del-trans" data-id="${t.id}" data-wid="${t.workspaceId}">حذف</button>
        </span>
      </li>`;
  }).join('') || '<li class="empty-msg">لا معاملات</li>';
  el.querySelectorAll('.del-trans').forEach(b => b.addEventListener('click', () => deleteTrans(b.dataset.wid, b.dataset.id)));
}

async function addTransaction() {
  const wid = document.getElementById('transWorkspace').value;
  const amount = parseFloat(document.getElementById('transAmount').value);
  const type = document.getElementById('transType').value;
  const description = document.getElementById('transDesc').value.trim() || '—';
  const category = document.getElementById('transCategory').value.trim() || 'other';
  if (!wid || !amount || amount <= 0) { alert('اختر المساحة وأدخل المبلغ'); return; }
  try {
    await api.post(`/workspaces/${wid}/finance/transactions`, {
      amount,
      type,
      description,
      category,
    });
    document.getElementById('transAmount').value = '';
    document.getElementById('transDesc').value = '';
    await loadAll();
  } catch (e) { alert(e.message); }
}

async function deleteTrans(wid, id) {
  if (!confirm('حذف المعاملة؟')) return;
  try {
    await api.del(`/workspaces/${wid}/finance/transactions/${id}`);
    await loadAll();
  } catch (e) { alert(e.message); }
}

function escapeHtml(t) {
  if (t == null) return '';
  const d = document.createElement('div');
  d.textContent = String(t);
  return d.innerHTML;
}
