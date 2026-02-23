import '../styles/main.css';
import { requireAuth, logout } from '../auth/guard.js';
import { api } from '../api/client.js';

const WID = 'rahal';

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await requireAuth())) return;
  document.getElementById('logoutBtn')?.addEventListener('click', logout);

  document.querySelectorAll('.wtab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.wtab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab + 'Panel').classList.add('active');
    });
  });

  document.getElementById('supplierAdd')?.addEventListener('click', addSupplier);
  document.getElementById('invAdd')?.addEventListener('click', addInventory);
  document.getElementById('campAdd')?.addEventListener('click', addCampaign);

  await loadSuppliers();
  await loadInventory();
  await loadCampaigns();
});

async function loadSuppliers() {
  try {
    const list = await api.get(`/workspaces/${WID}/suppliers`);
    const el = document.getElementById('suppliersList');
    el.innerHTML = (list || []).map(s => `
      <li class="item-row" data-id="${s.id}">
        <span><strong>${escapeHtml(s.name)}</strong> ${s.contact ? ' · ' + escapeHtml(s.contact) : ''}</span>
        <span class="row-actions">
          <button class="small-btn delete-supplier" data-id="${s.id}">حذف</button>
        </span>
      </li>
    `).join('') || '<li class="empty-msg">لا موردين</li>';
    el.querySelectorAll('.delete-supplier').forEach(b => b.addEventListener('click', () => deleteSupplier(b.dataset.id)));
  } catch (e) {
    document.getElementById('suppliersList').innerHTML = '<li class="error-msg">' + e.message + '</li>';
  }
}

async function addSupplier() {
  const name = document.getElementById('supplierName').value.trim();
  if (!name) return;
  try {
    await api.post(`/workspaces/${WID}/suppliers`, {
      name,
      contact: document.getElementById('supplierContact').value.trim() || null,
    });
    document.getElementById('supplierName').value = '';
    document.getElementById('supplierContact').value = '';
    await loadSuppliers();
  } catch (e) { alert(e.message); }
}

async function deleteSupplier(id) {
  if (!confirm('حذف المورد؟')) return;
  try {
    await api.del(`/workspaces/${WID}/suppliers/${id}`);
    await loadSuppliers();
  } catch (e) { alert(e.message); }
}

async function loadInventory() {
  try {
    const list = await api.get(`/workspaces/${WID}/inventory`);
    const el = document.getElementById('inventoryList');
    const typeAr = { product: 'منتج', raw: 'مادة خام', packaging: 'تغليف' };
    el.innerHTML = (list || []).map(i => `
      <li class="item-row" data-id="${i.id}">
        <span><strong>${escapeHtml(i.name)}</strong> · ${typeAr[i.itemType] || i.itemType} · ${i.quantity} ${i.unit || 'pcs'} ${i.minLevel != null ? ' (حد أدنى ' + i.minLevel + ')' : ''}</span>
        <span class="row-actions">
          <button class="small-btn delete-inv" data-id="${i.id}">حذف</button>
        </span>
      </li>
    `).join('') || '<li class="empty-msg">لا أصناف</li>';
    el.querySelectorAll('.delete-inv').forEach(b => b.addEventListener('click', () => deleteInventory(b.dataset.id)));
  } catch (e) {
    document.getElementById('inventoryList').innerHTML = '<li class="error-msg">' + e.message + '</li>';
  }
}

async function addInventory() {
  const name = document.getElementById('invName').value.trim();
  if (!name) return;
  try {
    await api.post(`/workspaces/${WID}/inventory`, {
      name,
      itemType: document.getElementById('invType').value,
      quantity: parseFloat(document.getElementById('invQty').value) || 0,
      unit: document.getElementById('invUnit').value.trim() || 'pcs',
      minLevel: document.getElementById('invMin').value ? parseFloat(document.getElementById('invMin').value) : null,
    });
    document.getElementById('invName').value = '';
    document.getElementById('invQty').value = '0';
    document.getElementById('invMin').value = '';
    await loadInventory();
  } catch (e) { alert(e.message); }
}

async function deleteInventory(id) {
  if (!confirm('حذف الصنف؟')) return;
  try {
    await api.del(`/workspaces/${WID}/inventory/${id}`);
    await loadInventory();
  } catch (e) { alert(e.message); }
}

async function loadCampaigns() {
  try {
    const list = await api.get(`/workspaces/${WID}/campaigns`);
    const el = document.getElementById('campaignsList');
    const statusAr = { draft: 'مسودة', active: 'نشطة', done: 'منتهية' };
    el.innerHTML = (list || []).map(c => `
      <li class="item-row" data-id="${c.id}">
        <span><strong>${escapeHtml(c.name)}</strong> · ${statusAr[c.status] || c.status} · ${c.startDate || c.start_date} → ${c.endDate || c.end_date} ${c.budget != null ? ' · ' + c.budget + ' د.ع' : ''}</span>
        <span class="row-actions">
          <button class="small-btn delete-camp" data-id="${c.id}">حذف</button>
        </span>
      </li>
    `).join('') || '<li class="empty-msg">لا حملات</li>';
    el.querySelectorAll('.delete-camp').forEach(b => b.addEventListener('click', () => deleteCampaign(b.dataset.id)));
  } catch (e) {
    document.getElementById('campaignsList').innerHTML = '<li class="error-msg">' + e.message + '</li>';
  }
}

async function addCampaign() {
  const name = document.getElementById('campName').value.trim();
  const startDate = document.getElementById('campStart').value;
  const endDate = document.getElementById('campEnd').value;
  if (!name || !startDate || !endDate) { alert('أدخل الاسم وتواريخ البداية والنهاية'); return; }
  try {
    await api.post(`/workspaces/${WID}/campaigns`, {
      name,
      startDate,
      endDate,
      status: document.getElementById('campStatus').value,
      budget: document.getElementById('campBudget').value ? parseFloat(document.getElementById('campBudget').value) : null,
    });
    document.getElementById('campName').value = '';
    document.getElementById('campStart').value = '';
    document.getElementById('campEnd').value = '';
    document.getElementById('campBudget').value = '';
    await loadCampaigns();
  } catch (e) { alert(e.message); }
}

async function deleteCampaign(id) {
  if (!confirm('حذف الحملة؟')) return;
  try {
    await api.del(`/workspaces/${WID}/campaigns/${id}`);
    await loadCampaigns();
  } catch (e) { alert(e.message); }
}

function escapeHtml(t) {
  if (t == null) return '';
  const d = document.createElement('div');
  d.textContent = String(t);
  return d.innerHTML;
}
