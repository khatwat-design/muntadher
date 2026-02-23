const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const getToken = () => localStorage.getItem('auth_token');

const request = async (path, options = {}) => {
    const headers = options.headers || {};
    const token = getToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers
    });
    if (!response.ok) {
        let error = 'Request failed';
        try {
            const data = await response.json();
            error = data.error || error;
        } catch (_) {}
        throw new Error(error);
    }
    return response.json();
};

export const api = {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (path) => request(path, { method: 'DELETE' })
};

export const requireAuth = () => {
    const token = getToken();
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
};
