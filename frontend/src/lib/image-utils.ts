import { API_URL } from './api-config';

/**
 * Resim URL'lerini ortamdan bağımsız olarak backend'e yönlendirir.
 */
export function normalizeImageUrl(url: string | null | undefined): string {
    if (!url) return '';

    // Dış kaynaklı bir resimse (Cloudinary vs) direkt dön
    if (url.startsWith('http') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
        return url;
    }

    let normalized = url;

    // Eski/eski format path temizliği
    normalized = normalized.replace(/^https?:\/\/localhost(:\d+)?/, '');
    normalized = normalized.replace(/^https?:\/\/127\.0\.0\.1(:\d+)?/, '');

    // "/uploads/..." gelirse Next.js API Rewrite beklemek yerine => API_URL base URL ile birleştir
    // Örn: API_URL="http://localhost:3001/api" ise base="http://localhost:3001"
    const apiBase = API_URL.replace(/\/api$/, '');

    if (normalized.startsWith('/api/uploads/')) {
        return apiBase + normalized;
    }

    if (normalized.startsWith('/uploads/')) {
        return apiBase + '/api' + normalized;
    }

    return normalized;
}
