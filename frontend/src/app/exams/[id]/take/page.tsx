'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PdfViewer } from '@/components/pdf/pdf-viewer';
import { OpticForm } from '@/components/exams/optic-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, CheckCircle } from 'lucide-react';
import { API_URL } from '@/lib/api-config';

interface ExamTakePageProps {
    params: {
        id: string;
    };
}

export default function ExamTakePage({ params }: ExamTakePageProps) {
    const { id: examId } = params;
    const { toast } = useToast();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(true);
    const [exam, setExam] = useState<any>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [timeLeft, setTimeLeft] = useState<number>(0);

    const fetchExamDetails = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`${API_URL}/exams/${examId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });
            if (res.ok) {
                const data = await res.json();
                setExam(data);
                setPdfUrl(data.pdfUrl || null);
            }
        } catch (error) {
            console.error('Failed to fetch exam details', error);
        } finally {
            setIsLoading(false);
        }
    }, [examId]);

    const handleAnswerChange = (qIndex: string | number, answer: string) => {
        setAnswers(prev => ({ ...prev, [String(qIndex)]: answer }));
    };

    const handleSubmit = async () => {
        try {
            const res = await fetch(`${API_URL}/exams/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
                body: JSON.stringify({ examId, answers })
            });

            if (!res.ok) throw new Error('Teslim edilemedi');

            toast({ title: 'Tebrikler', description: 'Sınavınız başarıyla teslim edildi.' });
            router.push('/exams');
        } catch (error) {
            console.error(error);
            toast({ title: 'Hata', description: 'Sınav teslim edilirken hata oluştu.', variant: 'destructive' });
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    useEffect(() => {
        fetchExamDetails();
    }, [fetchExamDetails]);

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center">Yükleniyor...</div>;
    }

    if (!exam) {
        return <div className="flex h-screen items-center justify-center">Sınav bulunamadı.</div>;
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            {/* Header */}
            <header className="h-16 border-b flex items-center justify-between px-6 bg-card shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="font-bold text-lg">{exam.title}</h1>
                    <span className="text-xs px-2 py-1 bg-muted rounded">{exam.type}</span>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 font-mono text-xl font-bold text-primary">
                        <Clock className="h-5 w-5" />
                        {formatTime(timeLeft)}
                    </div>
                    <Button onClick={handleSubmit} variant="default" className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Sınavı Bitir
                    </Button>
                </div>
            </header>

            {/* Main Content (Split Screen) */}
            <div className="flex-1 flex overflow-hidden">
                {/* Check if PDF is available */}
                {pdfUrl ? (
                    <div className="flex-1 border-r bg-slate-100 p-4 relative">
                        <PdfViewer url={pdfUrl} />
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        PDF Dosyası Yüklenemedi veya Bağlı Değil.
                    </div>
                )}

                {/* Right Side: Optic Form */}
                <div className="w-[400px] flex flex-col bg-card shrink-0 shadow-lg z-20">
                    <div className="p-4 border-b font-semibold flex items-center justify-between">
                        <span>Cevap Anahtarı</span>
                        <span className="text-xs text-muted-foreground">
                            {Object.keys(answers).length} / {exam.questionCount || 20} İşaretlendi
                        </span>
                    </div>

                    <div className="flex-1 p-4 overflow-hidden">
                        <OpticForm
                            questionCount={exam.questionCount || 40} // Default to 40 if not set
                            answers={answers}
                            onAnswerChange={handleAnswerChange}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
