'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';
import { SelectGroup } from '@radix-ui/react-select';
import { Loader2, Flag, CheckCircle2, XCircle, AlertCircle, Eye, User } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { normalizeImageUrl } from '@/lib/image-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function QuestionReportsPage() {
    const [reports, setReports] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchReports = async () => {
        setIsLoading(true);
        try {
            const data = await apiClient.get('/question-reports');
            setReports(data);
        } catch (error) {
            console.error('Error fetching reports', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const updateStatus = async (id: string, status: string) => {
        try {
            await apiClient.patch(`/question-reports/${id}/status`, { status });
            // Optimistic update
            setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
        } catch (error) {
            console.error('Error updating status', error);
        }
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'PENDING':
                return { label: 'Beklemede', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: AlertCircle };
            case 'REVIEWING':
                return { label: 'İnceleniyor', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Eye };
            case 'RESOLVED':
                return { label: 'Çözüldü', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 };
            case 'DISMISSED':
                return { label: 'Reddedildi', color: 'bg-rose-100 text-rose-800 border-rose-200', icon: XCircle };
            default:
                return { label: 'Bilinmiyor', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: Flag };
        }
    };

    const renderContent = (content: any) => {
        if (!content) return null;
        if (typeof content === 'string') {
            return <div dangerouslySetInnerHTML={{ __html: content }} />;
        }
        if (content.type === 'text_image' || (content.text || content.image)) {
            return (
                <div className="space-y-4">
                    {content.text && (
                        <div dangerouslySetInnerHTML={{ __html: content.text }} />
                    )}
                    {content.image && (
                        <img
                            src={normalizeImageUrl(content.image)}
                            alt="Question"
                            className="max-h-48 object-contain rounded-lg border shadow-sm"
                        />
                    )}
                </div>
            );
        }
        return <div className="text-gray-500 italic">İçerik önizlemesi yok</div>;
    };

    return (
        <DashboardLayout allowedRoles={['SUPER_ADMIN', 'ADMIN', 'TEACHER']}>
            <div className="mx-auto max-w-7xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            <Flag className="h-6 w-6 text-indigo-600" />
                            Soru Bildirimleri
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">Öğrencilerin hatalı olarak bildirdiği soruları buradan inceleyin.</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : reports.length === 0 ? (
                    <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
                        <Flag className="h-12 w-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-bold text-slate-600">Henüz bildirim yok</h3>
                        <p className="text-slate-500">Tüm sorular harika görünüyor!</p>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {reports.map((report) => {
                            const config = getStatusConfig(report.status);
                            const StatusIcon = config.icon;

                            return (
                                <Card key={report.id} className="overflow-hidden hover:shadow-md transition-all border-l-4" style={{ borderLeftColor: report.status === 'PENDING' ? '#f59e0b' : report.status === 'RESOLVED' ? '#10b981' : report.status === 'DISMISSED' ? '#f43f5e' : '#cbd5e1' }}>
                                    <div className="flex flex-col sm:flex-row">
                                        <div className="p-5 flex-1 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5 text-sm font-medium bg-slate-100 text-slate-700 px-2 py-1 rounded-md">
                                                        <User className="h-4 w-4" />
                                                        {report.user?.firstName} {report.user?.lastName}
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        {format(new Date(report.createdAt), 'd MMMM yyyy HH:mm', { locale: tr })}
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className={cn("px-2.5 py-1 flex items-center gap-1 border", config.color)}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {config.label}
                                                </Badge>
                                            </div>

                                            <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 text-rose-900">
                                                <div className="text-xs font-bold uppercase tracking-wider text-rose-500 mb-1">Bildirim Mesajı</div>
                                                <p className="text-sm font-medium">{report.content}</p>
                                            </div>

                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="sm" className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                                                        <Eye className="h-4 w-4" /> İlgili Soruyu Görüntüle
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                                                    <DialogHeader>
                                                        <DialogTitle>Bildirilen Soru</DialogTitle>
                                                    </DialogHeader>
                                                    <ScrollArea className="flex-1 p-4 bg-slate-50 rounded-xl border">
                                                        {report.question ? (
                                                            <div className="prose max-w-none">
                                                                {report.question.isPastQuestion && (
                                                                    <Badge variant="secondary" className="mb-4 bg-amber-50 text-amber-700 border-amber-200">
                                                                        📌 {report.question.pastExamName} {report.question.pastExamYear}
                                                                    </Badge>
                                                                )}
                                                                {renderContent(report.question.content)}
                                                                <div className="mt-8 text-xs text-slate-400 border-t pt-4">
                                                                    Soru ID: {report.question.id}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-muted-foreground">Bu soru silinmiş olabilir.</p>
                                                        )}
                                                    </ScrollArea>
                                                </DialogContent>
                                            </Dialog>
                                        </div>

                                        <div className="bg-slate-50 p-5 sm:w-64 border-t sm:border-t-0 sm:border-l flex flex-col justify-center gap-3">
                                            <div className="text-xs font-semibold uppercase text-slate-500">Durum Güncelle</div>
                                            <Select value={report.status} onValueChange={(val) => updateStatus(report.id, val)}>
                                                <SelectTrigger className="bg-white">
                                                    <SelectValue placeholder="Durum seçin" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="PENDING">Beklemede</SelectItem>
                                                    <SelectItem value="REVIEWING">İnceleniyor</SelectItem>
                                                    <SelectItem value="RESOLVED">Çözüldü (Düzeltildi)</SelectItem>
                                                    <SelectItem value="DISMISSED">Reddedildi (Hata Yok)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
