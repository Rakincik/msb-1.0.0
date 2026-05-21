'use client';

import { API_URL } from './api-config';
export { API_URL };

/**
 * Merkezi API Client — Token Refresh + Interceptor Pattern
 * 
 * Tüm API çağrıları bu client üzerinden yapılır:
 * - Otomatik Authorization header ekleme
 * - 401 hatalarında otomatik token refresh
 * - Aynı anda birden fazla 401 gelirse sadece 1 kez refresh (queue pattern)
 * - Refresh başarısızsa logout + redirect
 */

type QueueItem = {
    resolve: (value: string) => void;
    reject: (error: Error) => void;
};

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
        } else {
            resolve(token!);
        }
    });
    failedQueue = [];
};

async function refreshTokens(): Promise<string> {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
        throw new Error('No refresh token');
    }

    const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
        throw new Error('Refresh failed');
    }

    const data = await response.json();

    // Token'ları güncelle
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);

    // Cookie'yi de güncelle (middleware için)
    document.cookie = `accessToken=${data.accessToken}; path=/; SameSite=Strict; max-age=86400`;

    // Auth context'e bildir
    window.dispatchEvent(new CustomEvent('auth:tokens-updated', {
        detail: { accessToken: data.accessToken, user: data.user }
    }));

    return data.accessToken;
}

function triggerLogout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    document.cookie = 'accessToken=; path=/; max-age=0';
    window.dispatchEvent(new CustomEvent('auth:logout'));

    // Login'e yönlendir (sadece login sayfasında değilsek)
    if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
    }
}

async function fetchWithAuth(
    url: string,
    options: RequestInit = {},
    retry = true
): Promise<Response> {
    const accessToken = localStorage.getItem('accessToken');

    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> || {}),
    };

    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Content-Type sadece body varsa ve FormData değilse ekle
    if (options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    // 401 = Token expired → refresh dene
    if (response.status === 401 && retry) {
        if (isRefreshing) {
            // Zaten refresh yapılıyor → kuyruğa ekle
            return new Promise<Response>((resolve, reject) => {
                failedQueue.push({
                    resolve: (newToken: string) => {
                        headers['Authorization'] = `Bearer ${newToken}`;
                        fetch(url, { ...options, headers })
                            .then(resolve)
                            .catch(reject);
                    },
                    reject: (err: Error) => reject(err),
                });
            });
        }

        isRefreshing = true;

        try {
            const newToken = await refreshTokens();
            processQueue(null, newToken);

            // Orijinal isteği yeni token ile tekrar dene
            headers['Authorization'] = `Bearer ${newToken}`;
            return fetch(url, { ...options, headers });
        } catch (error) {
            processQueue(error as Error);
            triggerLogout();
            throw error;
        } finally {
            isRefreshing = false;
        }
    }

    return response;
}

// ==========================================
// PUBLIC API
// ==========================================

export const apiClient = {
    /**
     * GET isteği
     */
    async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
        let url = `${API_URL}${endpoint}`;

        if (params) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    searchParams.append(key, String(value));
                }
            });
            const queryString = searchParams.toString();
            if (queryString) url += `?${queryString}`;
        }

        const response = await fetchWithAuth(url);
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Hata oluştu' }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }
        return response.json();
    },

    /**
     * POST isteği
     */
    async post<T = any>(endpoint: string, body?: any): Promise<T> {
        const response = await fetchWithAuth(`${API_URL}${endpoint}`, {
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Hata oluştu' }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }
        if (response.status === 204) return {} as T;
        return response.json().catch(() => ({} as T));
    },

    /**
     * PATCH isteği
     */
    async patch<T = any>(endpoint: string, body?: any): Promise<T> {
        const response = await fetchWithAuth(`${API_URL}${endpoint}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Hata oluştu' }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }
        if (response.status === 204) return {} as T;
        return response.json().catch(() => ({} as T));
    },

    /**
     * DELETE isteği
     */
    async delete<T = any>(endpoint: string, body?: any): Promise<T> {
        const response = await fetchWithAuth(`${API_URL}${endpoint}`, {
            method: 'DELETE',
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Hata oluştu' }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }
        if (response.status === 204) return {} as T;
        return response.json().catch(() => ({} as T));
    },

    /**
     * Raw fetch — özel header veya body kontrolü için
     */
    async fetch(endpoint: string, options?: RequestInit): Promise<Response> {
        return fetchWithAuth(`${API_URL}${endpoint}`, options);
    },
};
