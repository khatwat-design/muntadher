const API_BASE = window.location.origin + '/api';
const getToken = () => localStorage.getItem('auth_token') || '';

const request = async (path, options = {}) => {
    const token = getToken();
    const response = await fetch(`${API_BASE}${path}`, {
        method: options.method || 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {})
        },
        credentials: 'include',
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (response.status === 204) return null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = data && data.error ? data.error : 'خطأ في الاتصال بالخادم';
        const err = new Error(message);
        err.status = response.status;
        throw err;
    }
    return data;
};

export const api = {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body }),
    put: (path, body) => request(path, { method: 'PUT', body }),
    del: (path) => request(path, { method: 'DELETE' })
};

export const ensureAuth = async () => {
    try {
        await api.get('/auth/me');
        return true;
    } catch (err) {
        if (err.status === 401) return false;
        throw err;
    }
};

export const setAuthToken = (token) => {
    localStorage.setItem('auth_token', token);
};

export const clearAuthToken = () => {
    localStorage.removeItem('auth_token');
};
