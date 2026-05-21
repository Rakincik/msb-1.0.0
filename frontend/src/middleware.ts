import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware — Server-side Route Protection
 * 
 * Cookie'deki accessToken'ı kontrol eder:
 * - Token yoksa → login'e yönlendir
 * - Token varsa + auth sayfasındaysa → dashboard'a yönlendir
 */
export function middleware(request: NextRequest) {
    const token = request.cookies.get('accessToken')?.value;
    const { pathname } = request.nextUrl;

    // Auth sayfaları (login, register)
    const isAuthPage = pathname === '/login' || pathname === '/register';

    // Public sayfalar (yönlendirme yapma)
    const isPublicPage = pathname === '/' || pathname.startsWith('/api');

    if (isPublicPage) {
        return NextResponse.next();
    }

    // Token yoksa + korumalı sayfa → login'e yönlendir
    if (!token && !isAuthPage) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Token varsa + auth sayfası → dashboard'a yönlendir
    if (token && isAuthPage) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico, grid.svg (public assets)
         * - uploads (uploaded files)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|grid.svg|uploads).*)',
    ],
};
