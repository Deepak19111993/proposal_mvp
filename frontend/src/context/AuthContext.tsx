import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface AuthContextType {
    user: { email: string, name?: string, role?: string } | null;
    token: string | null;
    login: (token: string, email: string, name?: string, role?: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<{ email: string, name?: string, role?: string } | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedEmail = localStorage.getItem('email');
        const storedName = localStorage.getItem('name');
        const storedRole = localStorage.getItem('role');
        if (storedToken && storedEmail) {
            setToken(storedToken);
            setUser({ email: storedEmail, name: storedName || undefined, role: storedRole || undefined });
        }
    }, []);

    const login = (newToken: string, email: string, name?: string, role?: string) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('email', email);
        if (name) localStorage.setItem('name', name);
        if (role) localStorage.setItem('role', role);
        setToken(newToken);
        setUser({ email, name, role });
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        localStorage.removeItem('name');
        localStorage.removeItem('role');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
