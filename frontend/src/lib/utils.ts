import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { API_URL } from "./api-config"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFileUrl(path?: string) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    
    // Remove /api from the end of API_URL if present, since upload URLs start with /api/uploads
    const baseUrl = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}
