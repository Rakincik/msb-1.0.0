'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, BookOpen, Loader2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { ContentTree } from '@/components/content/content-tree';
import { ContentManagementModal } from '@/components/content/content-management-modal';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { API_URL } from '@/lib/api-config';

export default function ContentPage() {
    const { user, accessToken } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [lessons, setLessons] = useState([]);
    const [contentManagementOpen, setContentManagementOpen] = useState(false);

    const fetchContentTree = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/content/tree`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setLessons(data);
            }
        } catch (error) {
            console.error('İçerik yüklenemedi:', error);
        } finally {
            setIsLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        fetchContentTree();
    }, [fetchContentTree]);

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-96 items-center justify-center">
                    <LoadingSpinner />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Ders İçerikleri</h1>
                        <p className="text-muted-foreground">
                            Soru bankası için ders, ünite ve konu hiyerarşisini buradan yönetebilirsiniz.
                        </p>
                    </div>
                    {user?.role !== 'STUDENT' && (
                        <div className="flex gap-2">
                            <Button onClick={() => setContentManagementOpen(true)} className="bg-violet-600 hover:bg-violet-700">
                                <Settings2 className="mr-2 h-4 w-4" />
                                İçerik Yönetimi
                            </Button>
                        </div>
                    )}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5" />
                            İçerik Ağacı
                        </CardTitle>
                        <CardDescription>
                            Mevcut içerik hiyerarşisinin önizlemesi.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ContentTree lessons={lessons} onRefresh={fetchContentTree} />
                    </CardContent>
                </Card>

                <ContentManagementModal
                    open={contentManagementOpen}
                    onOpenChange={(open) => {
                        setContentManagementOpen(open);
                        if (!open) fetchContentTree();
                    }}
                />
            </div>
        </DashboardLayout>
    );
}

function LoadingSpinner() {
    return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
}
