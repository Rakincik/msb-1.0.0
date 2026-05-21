'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { API_URL } from '@/lib/api-config';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT';
    tenantId?: string;
    avatar?: string;
}

interface AuthContextType {
    user: User | null;
    accessToken: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => void;
}

interface RegisterData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Cookie helper
function setCookie(name: string, value: string, days = 1) {
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value}; path=/; SameSite=Lax; max-age=${maxAge}`;
}

function removeCookie(name: string) {
    document.cookie = `${name}=; path=/; max-age=0`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProfile = useCallback(async (token: string) => {
        try {
            const res = await fetch(`${API_URL}/auth/profile`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            } else {
                // Token geçersiz — temizle
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                removeCookie('accessToken');
                setAccessToken(null);
                setUser(null);
            }
        } catch (error) {
            console.error('Profile fetch error:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // localStorage'dan token'ı kontrol et
        const token = localStorage.getItem('accessToken');
        if (token) {
            setAccessToken(token);
            setCookie('accessToken', token); // Sync cookie to avoid middleware issues
            fetchProfile(token);
        } else {
            setIsLoading(false);
        }
    }, [fetchProfile]);

    // apiClient'tan gelen event'leri dinle
    useEffect(() => {
        const handleTokensUpdated = (event: CustomEvent) => {
            const { accessToken: newToken, user: newUser } = event.detail;
            setAccessToken(newToken);
            if (newUser) setUser(newUser);
        };

        const handleLogout = () => {
            setUser(null);
            setAccessToken(null);
        };

        window.addEventListener('auth:tokens-updated', handleTokensUpdated as EventListener);
        window.addEventListener('auth:logout', handleLogout as EventListener);

        return () => {
            window.removeEventListener('auth:tokens-updated', handleTokensUpdated as EventListener);
            window.removeEventListener('auth:logout', handleLogout as EventListener);
        };
    }, []);

    const login = async (email: string, password: string) => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Giriş başarısız');
        }

        const data = await res.json();
        setAccessToken(data.accessToken);
        setUser(data.user);

        // localStorage + cookie sync
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        setCookie('accessToken', data.accessToken);
    };

    const register = async (data: RegisterData) => {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Kayıt başarısız');
        }
    };

    const logout = () => {
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        removeCookie('accessToken');
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, accessToken, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
