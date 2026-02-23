import { api, ensureAuth, clearAuthToken } from '../api/client.js';

export async function requireAuth() {
    const ok = await ensureAuth();
    if (!ok) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

export async function logout() {
    try {
        await api.post('/auth/logout', {});
    } catch {
        // ignore
    }
    clearAuthToken();
    window.location.href = '/login.html';
}
