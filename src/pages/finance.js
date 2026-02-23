import '../styles/main.css';
import { requireAuth, logout } from '../auth/guard.js';
import { FinanceManager } from '../utils/financeManager.js';
import { FinanceUI } from '../components/financeUI.js';

document.addEventListener('DOMContentLoaded', async () => {
    if (!(await requireAuth())) return;
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    const financeManager = new FinanceManager();
    await financeManager.init();
    const financeUI = new FinanceUI(financeManager);
    await financeUI.init();

    window.financeManager = financeManager;
    window.financeUI = financeUI;
});

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
}
