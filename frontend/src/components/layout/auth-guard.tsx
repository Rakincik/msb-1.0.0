'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthGuardProps {
    children: React.ReactNode;
    allowedRoles?: ('SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT')[];
}

/**
 * AuthGuard — Client-Side Rol Bazlı Koruma
 * 
 * Middleware token varlığını kontrol eder (server-side).
 * AuthGuard ise rol bazlı erişim kontrolü yapar (client-side).
 * 
 * Kullanım:
 *   <AuthGuard allowedRoles={['ADMIN', 'TEACHER']}>
 *     <AdminContent />
 *   </AuthGuard>
 */
export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/login');
        }

        if (!isLoading && user && allowedRoles && !allowedRoles.includes(user.role)) {
            router.replace('/dashboard');
        }
    }, [user, isLoading, allowedRoles, router]);

    // Yüklenirken skeleton göster
    if (isLoading) {
        return (
            <div className="flex min-h-screen w-full">
                <div className="w-64 border-r bg-background p-4 space-y-4">
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <div className="space-y-2 mt-8">
                        {[1, 2, 3, 4, 5].map(i => (
                            <Skeleton key={i} className="h-9 w-full rounded-lg" />
                        ))}
                    </div>
                </div>
                <div className="flex-1 p-6 space-y-6">
                    <Skeleton className="h-8 w-64 rounded-lg" />
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {[1, 2, 3, 4].map(i => (
                            <Skeleton key={i} className="h-32 rounded-xl" />
                        ))}
                    </div>
                    <Skeleton className="h-64 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    // Yetkisiz durum
    if (!user) return null;
    if (allowedRoles && !allowedRoles.includes(user.role)) return null;

    return <>{children}</>;
}
