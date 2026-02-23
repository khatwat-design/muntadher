import '../styles/main.css';
import { requireAuth, logout } from '../auth/guard.js';
import { api } from '../api/client.js';

const WID = 'khotawat';

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await requireAuth())) return;
  document.getElementById('logoutBtn')?.addEventListener('click', logout);

  document.querySelectorAll('.wtab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.wtab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab + 'Panel').classList.add('active');
      if (btn.dataset.tab === 'roadmap') loadRoadmap();
      else if (btn.dataset.tab === 'backlog') loadBacklog();
      else loadDocs();
    });
  });

  document.getElementById('roadmapAdd')?.addEventListener('click', addRoadmap);
  document.getElementById('backlogAdd')?.addEventListener('click', addBacklog);
  document.getElementById('docAdd')?.addEventListener('click', addDoc);
  document.getElementById('docSave')?.addEventListener('click', saveDoc);
  document.getElementById('docCancel')?.addEventListener('click', () => { document.getElementById('docEditor').classList.add('hidden'); });

  await loadRoadmap();
  await loadBacklog();
  await loadDocs();
});

async function loadRoadmap() {
  try {
    const list = await api.get(`/workspaces/${WID}/roadmap`);
    const el = document.getElementById('roadmapList');
    const statusAr = { planned: 'مخطط', in_progress: 'قيد التنفيذ', done: 'منتهي' };
    const typeAr = { feature: 'ميزة', milestone: 'معلم', epic: 'Epic' };
    el.innerHTML = (list || []).map(r => `
      <li class="item-row" data-id="${r.id}">
        <span><strong>${escapeHtml(r.title)}</strong> — ${typeAr[r.itemType] || r.itemType} · ${statusAr[r.status] || r.status} ${r.targetDate ? ' · ' + r.targetDate : ''}</span>
        <span class="row-actions">
          <button class="small-btn edit-roadmap" data-id="${r.id}">تعديل</button>
          <button class="small-btn delete-roadmap" data-id="${r.id}">حذف</button>
        </span>
      </li>
    `).join('') || '<li class="empty-msg">لا عناصر</li>';
    el.querySelectorAll('.delete-roadmap').forEach(b => b.addEventListener('click', () => deleteRoadmap(b.dataset.id)));
    el.querySelectorAll('.edit-roadmap').forEach(b => b.addEventListener('click', () => editRoadmap(b.dataset.id, list)));
  } catch (e) {
    document.getElementById('roadmapList').innerHTML = '<li class="error-msg">' + e.message + '</li>';
  }
}

async function addRoadmap() {
  const title = document.getElementById('roadmapTitle').value.trim();
  if (!title) return;
  try {
    await api.post(`/workspaces/${WID}/roadmap`, {
      title,
      targetDate: document.getElementById('roadmapTarget').value || null,
      itemType: document.getElementById('roadmapType').value,
      status: document.getElementById('roadmapStatus').value,
    });
    document.getElementById('roadmapTitle').value = '';
    document.getElementById('roadmapTarget').value = '';
    await loadRoadmap();
  } catch (e) { alert(e.message); }
}

async function deleteRoadmap(id) {
  if (!confirm('حذف؟')) return;
  try {
    await api.del(`/workspaces/${WID}/roadmap/${id}`);
    await loadRoadmap();
  } catch (e) { alert(e.message); }
}

function editRoadmap(id, list) {
  const r = list.find(x => x.id === id);
  if (!r) return;
  const title = prompt('العنوان:', r.title);
  if (title == null) return;
  const status = prompt('الحالة (planned / in_progress / done):', r.status) || r.status;
  api.put(`/workspaces/${WID}/roadmap/${id}`, { title, status }).then(loadRoadmap).catch(e => alert(e.message));
}

async function loadBacklog() {
  try {
    const list = await api.get(`/workspaces/${WID}/backlog`);
    const el = document.getElementById('backlogList');
    const typeAr = { feature: 'ميزة', bug: 'خلل', refactor: 'إعادة هيكلة' };
    const statusAr = { backlog: 'Backlog', todo: 'مهام', in_progress: 'قيد التنفيذ', done: 'منتهي' };
    el.innerHTML = (list || []).map(b => `
      <li class="item-row" data-id="${b.id}">
        <span><strong>${escapeHtml(b.title)}</strong> — ${typeAr[b.itemType] || b.itemType} · ${statusAr[b.status] || b.status} ${b.storyPoints != null ? ' · ' + b.storyPoints + ' نقاط' : ''}</span>
        <span class="row-actions">
          <button class="small-btn edit-backlog" data-id="${b.id}">تعديل</button>
          <button class="small-btn delete-backlog" data-id="${b.id}">حذف</button>
        </span>
      </li>
    `).join('') || '<li class="empty-msg">لا عناصر</li>';
    el.querySelectorAll('.delete-backlog').forEach(btn => btn.addEventListener('click', () => deleteBacklog(btn.dataset.id)));
    el.querySelectorAll('.edit-backlog').forEach(btn => btn.addEventListener('click', () => editBacklog(btn.dataset.id, list)));
  } catch (e) {
    document.getElementById('backlogList').innerHTML = '<li class="error-msg">' + e.message + '</li>';
  }
}

async function addBacklog() {
  const title = document.getElementById('backlogTitle').value.trim();
  if (!title) return;
  try {
    await api.post(`/workspaces/${WID}/backlog`, {
      title,
      itemType: document.getElementById('backlogType').value,
      priority: document.getElementById('backlogPriority').value,
      status: document.getElementById('backlogStatus').value,
      storyPoints: document.getElementById('backlogPoints').value ? parseInt(document.getElementById('backlogPoints').value, 10) : null,
    });
    document.getElementById('backlogTitle').value = '';
    document.getElementById('backlogPoints').value = '';
    await loadBacklog();
  } catch (e) { alert(e.message); }
}

async function deleteBacklog(id) {
  if (!confirm('حذف؟')) return;
  try {
    await api.del(`/workspaces/${WID}/backlog/${id}`);
    await loadBacklog();
  } catch (e) { alert(e.message); }
}

function editBacklog(id, list) {
  const b = list.find(x => x.id === id);
  if (!b) return;
  const title = prompt('العنوان:', b.title);
  if (title == null) return;
  const status = prompt('الحالة (backlog/todo/in_progress/done):', b.status) || b.status;
  api.put(`/workspaces/${WID}/backlog/${id}`, { title, status }).then(loadBacklog).catch(e => alert(e.message));
}

let editingDocId = null;

async function loadDocs() {
  try {
    const list = await api.get(`/workspaces/${WID}/docs`);
    const el = document.getElementById('docsList');
    el.innerHTML = (list || []).map(d => `
      <li class="item-row" data-id="${d.id}">
        <span><strong>${escapeHtml(d.title)}</strong> ${d.category ? ' · ' + escapeHtml(d.category) : ''}</span>
        <span class="row-actions">
          <button class="small-btn open-doc" data-id="${d.id}">فتح</button>
          <button class="small-btn delete-doc" data-id="${d.id}">حذف</button>
        </span>
      </li>
    `).join('') || '<li class="empty-msg">لا مستندات</li>';
    el.querySelectorAll('.delete-doc').forEach(btn => btn.addEventListener('click', () => deleteDoc(btn.dataset.id)));
    el.querySelectorAll('.open-doc').forEach(btn => btn.addEventListener('click', () => openDoc(btn.dataset.id, list)));
  } catch (e) {
    document.getElementById('docsList').innerHTML = '<li class="error-msg">' + e.message + '</li>';
  }
}

function openDoc(id, list) {
  const d = list.find(x => x.id === id);
  if (!d) return;
  editingDocId = id;
  document.getElementById('docEditorTitle').textContent = d.title;
  document.getElementById('docContent').value = d.content || '';
  document.getElementById('docEditor').classList.remove('hidden');
}

async function addDoc() {
  const title = document.getElementById('docTitle').value.trim();
  if (!title) return;
  try {
    await api.post(`/workspaces/${WID}/docs`, {
      title,
      category: document.getElementById('docCategory').value.trim() || null,
      content: '',
    });
    document.getElementById('docTitle').value = '';
    document.getElementById('docCategory').value = '';
    await loadDocs();
  } catch (e) { alert(e.message); }
}

async function saveDoc() {
  if (!editingDocId) return;
  try {
    await api.put(`/workspaces/${WID}/docs/${editingDocId}`, {
      content: document.getElementById('docContent').value,
    });
    document.getElementById('docEditor').classList.add('hidden');
    editingDocId = null;
    await loadDocs();
  } catch (e) { alert(e.message); }
}

async function deleteDoc(id) {
  if (!confirm('حذف المستند؟')) return;
  try {
    await api.del(`/workspaces/${WID}/docs/${id}`);
    document.getElementById('docEditor').classList.add('hidden');
    editingDocId = null;
    await loadDocs();
  } catch (e) { alert(e.message); }
}

function escapeHtml(t) {
  if (t == null) return '';
  const d = document.createElement('div');
  d.textContent = String(t);
  return d.innerHTML;
}
