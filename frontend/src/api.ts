
const API_URL = import.meta.env.VITE_API_URL || 'https://hono-app.deepak-kushwaha.workers.dev/api';

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const register = async (email: string, password: string, name: string) => {
    const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
    });
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Registration failed');
    }
    return response.json();
};

export const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
    }
    return response.json();
};

export const generateResume = async (role: string, description: string, domain?: string) => {
    const response = await fetch(`${API_URL}/resume/generate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ role, description, domain }),
    });
    if (!response.ok) throw new Error('Failed to generate resume');
    return response.json();
}

export const updateResume = async (id: string, domain: string) => {
    const response = await fetch(`${API_URL}/resume/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ domain }),
    });
    if (!response.ok) throw new Error('Failed to update resume');
    return response.json();
}

export const getResumes = async () => {
    const response = await fetch(`${API_URL}/resumes`, {
        headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch resumes');
    return response.json();
}

export const askGemini = async (input: string | { question: string; url?: string }) => {
    const body = typeof input === 'string' ? { question: input } : input;
    const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        try {
            const data = await response.json();
            throw new Error(data.error || 'Failed to fetch');
        } catch (e: any) {
            throw new Error(e.message || 'Failed to fetch');
        }
    }
    return response.json();
};

export const getHistory = async () => {
    const response = await fetch(`${API_URL}/history`, {
        headers: getHeaders(),
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch');
    }
    return response.json();
}

export const getHistoryDetail = async (id: string) => {
    const response = await fetch(`${API_URL}/history/${id}`, {
        headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Not found');
    return response.json();
}

export const deleteHistory = async (id: string) => {
    const response = await fetch(`${API_URL}/history/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete');
    return response.json();
}
export const deleteResume = async (id: string) => {
    const response = await fetch(`${API_URL}/resume/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete resume');
    return response.json();
}
export const createUser = async (email: string, password: string, name: string, role: string) => {
    const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email, password, name, role }),
    });
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create user');
    }
    return response.json();
}

export const getUsers = async () => {
    const response = await fetch(`${API_URL}/users`, {
        headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
}

export const deleteUser = async (id: string) => {
    const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete user');
    return response.json();
}

export const updateUser = async (id: string, data: { password?: string, email?: string, name?: string, role?: string }) => {
    const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update user');
    return response.json();
}
