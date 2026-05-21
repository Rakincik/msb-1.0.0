'use client';

import { useEffect, useState } from 'react';
import { API_URL } from '@/lib/api-config';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle2, XCircle, Trophy, Target, Clock, ArrowLeft, FileText, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

interface TopicAnalysis {
    id: string;
    topicId: string;
    correctCount: number;
    wrongCount: number;
    emptyCount: number;
    successRate: number;
    topic: {
        name: string;
    };
}

interface ExamResult {
    id: string;
    examId: string;
    correctCount: number;
    wrongCount: number;
    emptyCount: number;
    netScore: number;
    rawScore: number;
    duration: number;
    finishedAt: string;
    exam: {
        title: string;
        description: string;
        totalQuestions: number;
        correctPoints: number;
        pdfDocument?: {
            id: string;
            title: string;
            url?: string; // Assuming URL might be available or we use ID to fetch
        }
    };
    topicAnalysis: TopicAnalysis[];
}

export default function ExamResultPage() {
    const { accessToken } = useAuth();
    const { id } = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [result, setResult] = useState<ExamResult | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResult = async () => {
            try {
                const response = await fetch(`${API_URL}/exams/${id}/my-result`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        toast({
                            title: 'Bulunamadı',
                            description: 'Bu sınava ait sonuç kaydı bulunamadı.',
                            variant: 'destructive',
                        });
                        router.push('/exams');
                        return;
                    }
                    throw new Error('Sonuçlar alınamadı');
                }

                const data = await response.json();
                setResult(data);
            } catch (error) {
                console.error(error);
                toast({
                    title: 'Hata',
                    description: 'Sınav sonuçları yüklenirken bir hata oluştu.',
                    variant: 'destructive',
                });
        } finally {
                setLoading(false);
        }
    };

        if (accessToken && id) {
            fetchResult();
        }
    }, [id, router, toast]);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Sonuçlar hesaplanıyor...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!result) {
        return null;
    }

    const formatDuration = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}dk ${remainingSeconds}sn`;
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 50) return 'text-yellow-600';
        return 'text-red-600';
    };

    const successPercentage = result.exam.totalQuestions > 0
        ? (result.correctCount / result.exam.totalQuestions) * 100
        : 0;

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-in fade-in-50 duration-500">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
                    <div>
                        <Button
                            variant="ghost"
                            className="mb-2 pl-0 hover:bg-transparent hover:text-primary -ml-2"
                            onClick={() => router.push('/exams')}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Sınavlara Dön
                        </Button>
                        <h1 className="text-3xl font-bold tracking-tight">{result.exam.title}</h1>
                        <p className="text-muted-foreground mt-1 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Sınav Sonuç Raporu
                            <span className="text-gray-300">|</span>
                            {new Date(result.finishedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-lg border border-border/50">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatDuration(result.duration)}</span>
                        <span className="text-muted-foreground text-sm">süre</span>
                    </div>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-background to-secondary/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Toplam Puan</CardTitle>
                            <Trophy className={`h-4 w-4 ${getScoreColor(result.rawScore)}`} />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-3xl font-bold ${getScoreColor(result.rawScore)}`}>
                                {result.rawScore.toFixed(2)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Maksimum puan üzerinden
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Net Sayısı</CardTitle>
                            <Target className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{result.netScore.toFixed(2)}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Yanlışlar doğruları götürdükten sonra
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Doğru / Yanlış</CardTitle>
                            <div className="flex gap-1">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <XCircle className="h-4 w-4 text-red-500" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline gap-3">
                                <div className="flex flex-col">
                                    <span className="text-2xl font-bold text-green-600">{result.correctCount}</span>
                                    <span className="text-[10px] uppercase text-muted-foreground font-semibold">Doğru</span>
                                </div>
                                <span className="text-gray-300 text-2xl font-light">|</span>
                                <div className="flex flex-col">
                                    <span className="text-2xl font-bold text-red-600">{result.wrongCount}</span>
                                    <span className="text-[10px] uppercase text-muted-foreground font-semibold">Yanlış</span>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                {result.emptyCount} boş bırakıldı
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Başarı Oranı</CardTitle>
                            <Target className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-600">
                                %{successPercentage.toFixed(1)}
                            </div>
                            <Progress
                                value={successPercentage}
                                className="h-2 mt-2 bg-blue-100"
                                indicatorClassName="bg-blue-600"
                            />
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="analysis" className="w-full">
                    <TabsList className="w-full md:w-auto grid grid-cols-2 md:inline-flex">
                        <TabsTrigger value="analysis">Konu Analizi</TabsTrigger>
                        <TabsTrigger value="answers">Cevap Anahtarı & Çözümler</TabsTrigger>
                    </TabsList>

                    <TabsContent value="analysis" className="mt-6 space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            {result.topicAnalysis && result.topicAnalysis.length > 0 ? (
                                result.topicAnalysis.map((analysis) => (
                                    <Card key={analysis.id} className="overflow-hidden">
                                        <CardHeader className="pb-3 bg-muted/20">
                                            <CardTitle className="text-base flex justify-between items-center">
                                                <span className="truncate mr-2" title={analysis.topic.name}>{analysis.topic.name}</span>
                                                <span className={`text-sm px-2 py-0.5 rounded-full ${analysis.successRate >= 70 ? 'bg-green-100 text-green-700' :
                                                    analysis.successRate >= 40 ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                    %{Math.round(analysis.successRate)}
                                                </span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-4">
                                            <Progress
                                                value={analysis.successRate}
                                                className="h-2 mb-4"
                                                indicatorClassName={
                                                    analysis.successRate >= 70 ? 'bg-green-500' :
                                                        analysis.successRate >= 40 ? 'bg-yellow-500' :
                                                            'bg-red-500'
                                                }
                                            />
                                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                                <div className="bg-green-50 p-2 rounded border border-green-100">
                                                    <div className="font-bold text-green-700 text-lg">{analysis.correctCount}</div>
                                                    <div className="text-green-600">Doğru</div>
                                                </div>
                                                <div className="bg-red-50 p-2 rounded border border-red-100">
                                                    <div className="font-bold text-red-700 text-lg">{analysis.wrongCount}</div>
                                                    <div className="text-red-600">Yanlış</div>
                                                </div>
                                                <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                                    <div className="font-bold text-gray-700 text-lg">{analysis.emptyCount}</div>
                                                    <div className="text-gray-600">Boş</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <div className="col-span-full text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                    Konu analizi bulunamadı.
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="answers" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Cevap Anahtarı ve Çözümler</CardTitle>
                                <CardDescription>
                                    Sınav sorularını ve doğru cevaplarını aşağıdaki seçeneklerden inceleyebilirsiniz.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center justify-center p-8 min-h-[200px] gap-4">
                                <FileText className="h-16 w-16 text-muted-foreground/50" />
                                <p className="text-center text-muted-foreground max-w-md">
                                    Detaylı soru çözümleri ve cevap anahtarı PDF dökümanında mevcuttur.
                                </p>
                                {result.exam.pdfDocument && (
                                    <Button className="gap-2">
                                        <Download className="h-4 w-4" />
                                        PDF Çözüm Kitapçığını İndir
                                    </Button>
                                )}
                                {!result.exam.pdfDocument && (
                                    <p className="text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded">
                                        Bu sınava bağlı bir PDF dökümanı bulunmamaktadır.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
