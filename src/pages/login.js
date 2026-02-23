import '../styles/main.css';
import { api, setAuthToken } from '../api/client.js';

const form = document.getElementById('loginForm');
const errorEl = document.getElementById('loginError');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        errorEl.textContent = 'الرجاء إدخال اسم المستخدم وكلمة المرور.';
        return;
    }

    try {
        const data = await api.post('/auth/login', { username, password });
        if (data && data.token) {
            setAuthToken(data.token);
        }
        window.location.href = '/index.html';
    } catch (err) {
        errorEl.textContent = err.message || 'فشل تسجيل الدخول.';
    }
});
