import '../styles/main.css';
import { requireAuth, logout } from '../auth/guard.js';
import { DataManager } from '../utils/dataManager.js';
import { Analytics } from '../utils/analytics.js';
import { AISuggestions } from '../utils/aiSuggestions.js';
import { TaskManager } from '../components/taskManager.js';

document.addEventListener('DOMContentLoaded', async () => {
    if (!(await requireAuth())) return;
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    const dataManager = new DataManager();
    await dataManager.init();
    const analytics = new Analytics(dataManager);
    const aiSuggestions = new AISuggestions(dataManager);
    const taskManager = new TaskManager(dataManager, analytics, aiSuggestions);

    await taskManager.init();
    window.taskManager = taskManager;
    window.toggleTask = (taskId, completed) => taskManager.toggleTask(taskId, completed);
    window.editTask = (taskId) => taskManager.editTask(taskId);
    window.deleteTask = (taskId) => taskManager.deleteTask(taskId);
});

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
}
