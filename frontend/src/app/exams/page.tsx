'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Calendar, FileQuestion, ChevronRight, CheckCircle2, Plus } from 'lucide-react';
import { ExamFormDialog } from '@/components/exams/exam-form-dialog';
import { API_URL } from '@/lib/api-config';

interface Exam {
    id: string;
    title: string;
    description: string;
    type: string;
    status: string;
    duration: number;
    totalQuestions: number;
    startTime?: string;
    endTime?: string;
    isActive: boolean;
    userResult?: {
        id: string;
        netScore: number;
        finishedAt: string;
    };
}

export default function ExamsPage() {
    const { user , accessToken } = useAuth();
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);



    const fetchExams = async () => {
        try {
            const res = await fetch(`${API_URL}/exams`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setExams(data);
            }
        } catch (error) {
            console.error('Sınavlar yüklenemedi:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchExams();
    }, [API_URL]);

    const getStatusBadge = (status: string, result?: any) => {
        if (result) {
            return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Tamamlandı</Badge>;
        }
        switch (status) {
            case 'ACTIVE':
                return <Badge className="bg-green-500">Aktif</Badge>;
            case 'SCHEDULED':
                return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Planlandı</Badge>;
            case 'COMPLETED':
                return <Badge variant="secondary">Bitti</Badge>;
            case 'DRAFT':
                return <Badge variant="outline">Taslak</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const filteredExams = {
        active: exams.filter(e => e.status === 'ACTIVE' && !e.userResult),
        completed: exams.filter(e => e.userResult || e.status === 'COMPLETED'),
        upcoming: exams.filter(e => e.status === 'SCHEDULED'),
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Sınavlar</h1>
                        <p className="text-muted-foreground">Mevcut ve tamamlanan sınavlarınızı görüntüleyin.</p>
                    </div>
                    {user?.role !== 'STUDENT' && (
                        <Button onClick={() => setCreateDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Yeni Test
                        </Button>
                    )}
                </div>

                <Tabs defaultValue="active" className="w-full">
                    <TabsList>
                        <TabsTrigger value="active">Aktif Sınavlar ({filteredExams.active.length})</TabsTrigger>
                        <TabsTrigger value="completed">Tamamlananlar ({filteredExams.completed.length})</TabsTrigger>
                        <TabsTrigger value="upcoming">Gelecek Sınavlar ({filteredExams.upcoming.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="active" className="mt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredExams.active.length === 0 ? (
                                <div className="col-span-full text-center py-10 text-muted-foreground">
                                    Aktif sınav bulunmuyor.
                                </div>
                            ) : (
                                filteredExams.active.map(exam => (
                                    <ExamCard key={exam.id} exam={exam} role={user?.role} />
                                ))
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="completed" className="mt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredExams.completed.map(exam => (
                                <ExamCard key={exam.id} exam={exam} role={user?.role} isCompleted />
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="upcoming" className="mt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredExams.upcoming.map(exam => (
                                <ExamCard key={exam.id} exam={exam} role={user?.role} />
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>

                <ExamFormDialog
                    open={createDialogOpen}
                    onOpenChange={setCreateDialogOpen}
                    onSuccess={fetchExams}
                />
            </div>
        </DashboardLayout>
    );
}

function ExamCard({ exam, role, isCompleted }: { exam: Exam; role?: string; isCompleted?: boolean }) {
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="mb-2">{exam.type}</Badge>
                    {isCompleted && exam.userResult ? (
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                            {exam.userResult.netScore.toFixed(2)} Net
                        </Badge>
                    ) : (
                        <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground font-medium">
                            {exam.duration} dk
                        </span>
                    )}
                </div>
                <CardTitle className="line-clamp-1">{exam.title}</CardTitle>
                <CardDescription className="line-clamp-2 min-h-[40px]">
                    {exam.description || 'Açıklama yok'}
                </CardDescription>
            </CardHeader>

            <CardContent className="flex-1">
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <FileQuestion className="h-4 w-4" />
                        <span>{exam.totalQuestions} Soru</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                            {exam.startTime ? new Date(exam.startTime).toLocaleDateString('tr-TR') : 'Süresiz'}
                        </span>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="pt-4 border-t">
                {isCompleted && exam.userResult ? (
                    <Button asChild variant="outline" className="w-full">
                        <Link href={`/exams/${exam.id}/result`}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Sonucu Gör
                        </Link>
                    </Button>
                ) : role === 'STUDENT' ? (
                    <Button asChild className="w-full">
                        <Link href={`/exams/${exam.id}/take`}>
                            Sınava Başla
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                ) : (
                    <Button asChild variant="outline" className="w-full">
                        <Link href={`/exams/${exam.id}`}>
                            Detayları Gör
                        </Link>
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
