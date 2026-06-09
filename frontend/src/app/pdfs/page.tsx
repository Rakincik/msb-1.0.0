'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, FileText, Calendar, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { PdfUploadDialog } from '@/components/pdf/pdf-upload-dialog';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/context/confirm-context';
import Link from 'next/link';
import { API_URL } from '@/lib/api-config';

interface PdfDocument {
    id: string;
    title: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    createdAt: string;
}

export default function PdfsPage() {
    const { user, accessToken } = useAuth();
    const { toast } = useToast();
    const confirm = useConfirm();
    const [pdfs, setPdfs] = useState<PdfDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

    const fetchPdfs = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/pdf`, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (res.ok) {
                const data = await res.json();
                setPdfs(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [accessToken]);

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: 'Doküman Silme',
            description: 'Silmek istediğinize emin misiniz?',
            confirmText: 'Sil',
            isDangerous: true,
        });
        if (!confirmed) return;
        try {
            const res = await fetch(`${API_URL}/pdf/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
            if (res.ok) {
                toast({ title: 'Başarılı', description: 'Doküman silindi.' });
                fetchPdfs();
            } else {
                throw new Error('Silinemedi');
            }
        } catch (e) {
            console.error(e);
            toast({ title: 'Hata', description: 'Silme işlemi başarısız.', variant: 'destructive' });
        }
    };

    useEffect(() => {
        if (accessToken) fetchPdfs();
    }, [accessToken, fetchPdfs]);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const dm = 2;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">PDF Dokümanlar</h1>
                        <p className="text-muted-foreground">
                            Sisteme yüklenen tüm PDF dokümanları buradan yönetebilirsiniz.
                        </p>
                    </div>
                    {(user?.role === 'ADMIN' || user?.role === 'TEACHER' || user?.role === 'SUPER_ADMIN') && (
                        <Button onClick={() => setUploadDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Yeni PDF Yükle
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pdfs.map((pdf) => (
                        <Card key={pdf.id} className="flex flex-col">
                            <CardHeader className="flex-row gap-4 items-start space-y-0 pb-2">
                                <div className="p-2 bg-red-100 rounded text-red-600">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <CardTitle className="text-base line-clamp-1" title={pdf.title}>{pdf.title}</CardTitle>
                                    <CardDescription className="text-xs break-all line-clamp-1">{pdf.fileName}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 pt-4">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>{new Date(pdf.createdAt).toLocaleDateString('tr-TR')}</span>
                                    </div>
                                    <span>{formatBytes(pdf.fileSize)}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="border-t pt-4 gap-2">
                                <Button variant="outline" size="sm" className="flex-1" asChild>
                                    <Link href={pdf.fileUrl} target="_blank">
                                        <Download className="mr-2 h-3 w-3" />
                                        İndir
                                    </Link>
                                </Button>
                                {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(pdf.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                    {pdfs.length === 0 && !isLoading && (
                        <div className="col-span-full text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                            Henüz PDF dokümanı yüklenmemiş.
                        </div>
                    )}
                </div>

                <PdfUploadDialog
                    open={uploadDialogOpen}
                    onOpenChange={setUploadDialogOpen}
                    onSuccess={fetchPdfs}
                />
            </div>
        </DashboardLayout>
    );
}
