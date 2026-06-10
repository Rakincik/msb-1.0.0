'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Flag, PanelRightClose, PanelRightOpen, Moon, Sun, AlertTriangle, AlertOctagon, Lightbulb, PlayCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { normalizeImageUrl } from '@/lib/image-utils';
import { apiClient } from '@/lib/api-client';
import { ScrollArea } from '@/components/ui/scroll-area';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { CanvasRef } from './practice/drawing-canvas';

const DrawingCanvas = dynamic(() => import('./practice/drawing-canvas').then(mod => mod.DrawingCanvas), { ssr: false });
import { QuestionNavigator } from './practice/question-navigator';
import { useToast } from '@/hooks/use-toast';

interface Question {
    id: string;
    content: any;
    options: {
        id: string;
        text: string;
        label?: string;
    }[];
    correctAnswer: string;
    explanation?: any;
    videoSolution?: string;
}

interface PracticeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    topicId?: string;
    lessonId?: string;
    topicName: string;
    mode?: 'topic' | 'mixed' | 'lesson';
    examAreaId?: string;
}

export function PracticeModal({ open, onOpenChange, topicId, lessonId, topicName, mode = 'topic', examAreaId }: PracticeModalProps) {
    const { accessToken } = useAuth();
    const { toast } = useToast();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Session State
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [results, setResults] = useState<Record<string, boolean>>({});
    const [drawings, setDrawings] = useState<Record<string, string>>({});
    const [flags, setFlags] = useState<Record<string, boolean>>({});

    // UI State
    const [view, setView] = useState<'practice' | 'summary'>('practice');
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [showSolutionMap, setShowSolutionMap] = useState<Record<string, boolean>>({});
    
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
            setIsNavOpen(true);
        }
    }, []);
    
    // Report Modal State
    const [reportOpen, setReportOpen] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [isReporting, setIsReporting] = useState(false);
    const [reportedQuestions, setReportedQuestions] = useState<Record<string, boolean>>({});

    const canvasRef = useRef<CanvasRef>(null);


    useEffect(() => {
        if (open) {
        fetchQuestions();
            setCurrentIndex(0);
            setAnswers({});
            setResults({});
            setDrawings({});
            setFlags({});
            setShowSolutionMap({});
            setView('practice');
        }
    }, [open, topicId, lessonId, mode]);

    const fetchQuestions = async () => {
        setIsLoading(true);
        try {
            let qList: Question[] = [];

            if (mode === 'mixed' && examAreaId) {
                // Fetch random questions
                const data = await apiClient.post('/questions/random', {
                    examAreaIds: [examAreaId],
                    count: 20
                });
                qList = data;
            } else if (mode === 'lesson' && lessonId) {
                // Fetch Questions by Lesson and Progress
                const [questionsData, progressData] = await Promise.all([
                    apiClient.get(`/questions?lessonId=${lessonId}`),
                    apiClient.get(`/question-progress/by-lesson?lessonId=${lessonId}`)
                ]).catch(() => [[], []]);

                qList = Array.isArray(questionsData) ? questionsData : questionsData.data || [];

                // Initialize state from progress
                if (progressData && progressData.length > 0) {
                    const newAnswers: Record<string, string> = {};
                    const newResults: Record<string, boolean> = {};

                    progressData.forEach((p: any) => {
                        newAnswers[p.questionId] = p.optionId;
                        newResults[p.questionId] = p.isCorrect;
                    });

                    setAnswers(newAnswers);
                    setResults(newResults);
                }
            } else if (topicId) {
                // Fetch Questions by Topic and Progress in parallel
                const [questionsData, progressData] = await Promise.all([
                    apiClient.get(`/questions?topicId=${topicId}`),
                    apiClient.get(`/question-progress/by-topic?topicId=${topicId}`)
                ]).catch(() => [[], []]);

                qList = Array.isArray(questionsData) ? questionsData : questionsData.data || [];

                // Initialize state from progress (only for topic mode)
                if (progressData && progressData.length > 0) {
                    const newAnswers: Record<string, string> = {};
                    const newResults: Record<string, boolean> = {};

                    progressData.forEach((p: any) => {
                        newAnswers[p.questionId] = p.optionId;
                        newResults[p.questionId] = p.isCorrect;
                    });

                    setAnswers(newAnswers);
                    setResults(newResults);
                }
            }

            setQuestions(qList);

            // Find first unanswered question (if any progress loaded, otherwise just 0)
            const firstUnanswered = qList.findIndex((q: any) => !answers[q.id]);
            if (firstUnanswered !== -1) {
                setCurrentIndex(firstUnanswered);
            }

        } catch (error) {
            console.error('Data fetch error', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNavigate = (newIndex: number) => {
        // Save current drawing
        if (questions[currentIndex]) {
            const data = canvasRef.current?.getData();
            if (data) {
                setDrawings(prev => ({ ...prev, [questions[currentIndex].id]: data }));
            }
        }
        setCurrentIndex(newIndex);
    };

    const currentQuestion = questions[currentIndex];

    const handleAnswer = async (optionId: string) => {
        if (results[currentQuestion?.id] !== undefined) return;
        
        // 1. Cevabı set et
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: optionId }));

        // 2. Anında Kontrol Et (Auto-Check)
        const isCorrect = optionId === currentQuestion.correctAnswer;
        setResults(prev => ({ ...prev, [currentQuestion.id]: isCorrect }));

        // 3. Arka planda kaydet
        try {
            await apiClient.post('/question-progress', {
                questionId: currentQuestion.id,
                optionId: optionId,
                isCorrect: isCorrect
            });
        } catch (e) {
            console.error('Failed to save progress', e);
        }
    };



    const toggleFlag = () => {
        if (!currentQuestion) return;
        setFlags(prev => ({ ...prev, [currentQuestion.id]: !prev[currentQuestion.id] }));
    };

    const handleReportSubmit = async () => {
        if (!currentQuestion || !reportReason.trim()) return;
        setIsReporting(true);
        try {
            await apiClient.post('/question-reports', {
                questionId: currentQuestion.id,
                content: reportReason
            });
            setReportedQuestions(prev => ({ ...prev, [currentQuestion.id]: true }));
            setReportOpen(false);
            setReportReason('');
            toast({
                title: 'Bildirim Gönderildi',
                description: 'Geri bildiriminiz için teşekkürler. Editörlerimiz en kısa sürede inceleyecektir.',
                variant: 'default',
            });
        } catch (error) {
            console.error('Report submission failed', error);
            toast({
                title: 'Hata',
                description: 'Bildirim gönderilirken bir hata oluştu. Lütfen tekrar deneyin.',
                variant: 'destructive',
            });
        } finally {
            setIsReporting(false);
        }
    };

    // Helper to extract stats
    const getStats = () => {
        const total = questions.length;
        const answered = Object.keys(answers).length;
        const flagged = Object.values(flags).filter(Boolean).length;
        const empty = total - answered;
        return { total, answered, flagged, empty };
    };

    // Render Content
    const renderContent = (content: any) => {
        // Handle string content (raw HTML)
        if (typeof content === 'string') {
            return (
                <div 
                    className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed break-words overflow-x-auto [&_*]:max-w-full" 
                    dangerouslySetInnerHTML={{ __html: content }} 
                />
            );
        }

        // Handle {text, image, type: 'text_image'} format from PDF cropper/manual entry
        if (typeof content === 'object' && content?.type === 'text_image') {
            return (
                <div className="space-y-4">
                    {content.text && (
                        <div
                            className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed break-words overflow-x-auto [&_*]:max-w-full"
                            dangerouslySetInnerHTML={{ __html: content.text }}
                        />
                    )}
                    {content.image && (
                        <div className="flex justify-center">
                            <Image
                                src={normalizeImageUrl(content.image)}
                                alt="Soru görseli"
                                width={1200}
                                height={800}
                                className="max-w-full w-auto h-auto max-h-64 sm:max-h-80 object-contain rounded-lg border shadow-sm"
                                unoptimized={normalizeImageUrl(content.image).startsWith('http://localhost')}
                            />
                        </div>
                    )}
                </div>
            );
        }

        // Handle TipTap doc format
        if (typeof content === 'object' && content?.type === 'doc') {
            return (
                <div className="prose dark:prose-invert max-w-none pointer-events-none select-none">
                    {content.content?.map((node: any, i: number) => {
                        if (node.type === 'paragraph') {
                            return <p key={i}>{node.content?.map((c: any) => c.text).join('')}</p>
                        }
                        return null;
                    })}
                </div>
            );
        }

        // Handle plain object with image/text but no type
        if (typeof content === 'object' && (content?.image || content?.text)) {
            return (
                <div className="space-y-4">
                    {content.text && (
                        <div
                            className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed break-words overflow-x-auto [&_*]:max-w-full"
                            dangerouslySetInnerHTML={{ __html: content.text }}
                        />
                    )}
                    {content.image && (
                        <div className="flex justify-center">
                            <Image
                                src={normalizeImageUrl(content.image)}
                                alt="Soru görseli"
                                width={1200}
                                height={800}
                                className="max-w-full w-auto h-auto max-h-64 sm:max-h-80 object-contain rounded-lg border shadow-sm"
                                unoptimized={normalizeImageUrl(content.image).startsWith('http://localhost')}
                            />
                        </div>
                    )}
                </div>
            );
        }

        return <div className="text-gray-500 italic">İçerik yüklenemedi</div>;
    };

    // Helper to safely parse options
    const getParsedOptions = (q: Question) => {
        try {
            let opts: any = q.options;

            // Parse if string
            if (typeof opts === 'string') {
                opts = JSON.parse(opts);
            }

            // If already an array, return as-is
            if (Array.isArray(opts)) return opts;

            // If object format {A: {text, image}, B: {...}}, convert to array
            if (typeof opts === 'object' && opts !== null) {
                const keys = ['A', 'B', 'C', 'D', 'E'];
                return keys
                    .filter(key => opts[key])
                    .map(key => ({
                        id: key,
                        text: opts[key]?.text || '',
                        image: opts[key]?.image || null,
                        label: key
                    }));
            }

            return [];
        } catch (e) {
            console.error("Failed to parse options", e);
            return [];
        }
    };

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn(
                "max-w-[100vw] h-[100vh] sm:max-w-[95vw] sm:h-[95vh] flex flex-col p-0 gap-0 border-0 rounded-none sm:rounded-2xl overflow-hidden shadow-2xl transition-colors duration-300",
                "bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50"
            )}>
                {/* Header (Reader style) */}
                <div className="flex flex-col bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-50 shadow-sm shrink-0">
                    {/* Top Top Bar: Timeline Progress (Instagram style) */}
                    <div className="flex gap-1 h-1 w-full px-2 pt-2">
                        {questions.map((q, idx) => {
                            const isAnswered = answers[q.id] !== undefined;
                            let barColor = "bg-slate-200 dark:bg-slate-800";
                            if (isAnswered) barColor = "bg-indigo-500";
                            else if (idx === currentIndex) barColor = "bg-indigo-300 dark:bg-indigo-700";
                            
                            return (
                                <div key={idx} className="flex-1 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                                    <div className={cn("h-full transition-all duration-300", barColor)} />
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="h-14 flex items-center justify-between px-4 sm:px-6">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="hover:bg-slate-100 dark:hover:bg-slate-800">
                                <ChevronLeft className="h-6 w-6 text-slate-700 dark:text-slate-300" />
                            </Button>
                            <div>
                                <h2 className="font-bold text-sm md:text-base text-slate-800 dark:text-slate-100">{topicName}</h2>
                                <p className="text-xs text-slate-500 font-medium tracking-wide">
                                    {currentIndex + 1} / {questions.length}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setIsNavOpen(!isNavOpen)}
                                className={cn("rounded-xl font-medium", isNavOpen ? "bg-slate-200" : "hover:bg-slate-100")}
                            >
                                <PanelRightOpen className="h-5 w-5 sm:mr-2" />
                                <span className="hidden sm:inline">Sorular</span>
                            </Button>
                            
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setReportOpen(true)}
                                className={cn("rounded-xl font-medium text-slate-500", reportedQuestions[currentQuestion?.id] ? "text-rose-600 bg-rose-50" : "hover:bg-rose-50 hover:text-rose-600")}
                                disabled={reportedQuestions[currentQuestion?.id]}
                            >
                                <AlertOctagon className={cn("h-4 w-4 sm:mr-2", reportedQuestions[currentQuestion?.id] && "fill-current")} />
                                <span className="hidden sm:inline">{reportedQuestions[currentQuestion?.id] ? 'Bildirildi' : 'Hatalı Soru?'}</span>
                            </Button>

                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={toggleFlag}
                                className={cn("rounded-xl font-medium", flags[currentQuestion?.id] ? "text-orange-600 bg-orange-50" : "text-slate-500")}
                            >
                                <Flag className={cn("h-4 w-4 sm:mr-2", flags[currentQuestion?.id] && "fill-current")} />
                                <span className="hidden sm:inline">{flags[currentQuestion?.id] ? 'İşaretli' : 'İşaretle'}</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* View Switcher */}
                {view === 'summary' ? (
                    <div className={cn("flex-1 flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950")}>
                        <div className={cn("w-full max-w-md p-8 rounded-2xl shadow-xl flex flex-col items-center text-center space-y-6 bg-white dark:bg-slate-900 border-0 dark:border dark:border-slate-800")}>
                            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-2">
                                <CheckCircle2 className="h-8 w-8 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold mb-2">Testi Bitiriyor musun?</h3>
                                <p className="text-muted-foreground">İşte son durumu:</p>
                            </div>

                            <div className="grid grid-cols-3 gap-4 w-full">
                                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800">
                                    <div className="text-2xl font-bold">{getStats().total}</div>
                                    <div className="text-xs uppercase tracking-wider opacity-70">Toplam</div>
                                </div>
                                <div className="p-4 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                                    <div className="text-2xl font-bold">{getStats().flagged}</div>
                                    <div className="text-xs uppercase tracking-wider opacity-70">İşaretli</div>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-200 dark:bg-slate-700">
                                    <div className="text-2xl font-bold">{getStats().empty}</div>
                                    <div className="text-xs uppercase tracking-wider opacity-70">Boş</div>
                                </div>
                            </div>

                            <div className="flex gap-4 w-full pt-4">
                                <Button variant="outline" className="flex-1 h-12" onClick={() => setView('practice')}>
                                    Geri Dön
                                </Button>
                                <Button className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => onOpenChange(false)}>
                                    Testi Bitir
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex overflow-hidden relative">
                        {/* Main Question Area */}
                        <div className="flex-1 flex flex-col relative z-0">
                            {isLoading ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                </div>
                            ) : !currentQuestion ? (
                                <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
                                        <AlertTriangle className="h-8 w-8 text-amber-500" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">Soru bulunamadı</h3>
                                    <p className="max-w-xs">Bu konuda henüz soru eklenmemiş veya bir hata oluştu.</p>
                                </div>
                            ) : (
                                <div className="flex-1 relative flex flex-col h-full">
                                    {/* Canvas Layer */}
                                    <div className="absolute inset-0 z-10 pointer-events-none">
                                        <DrawingCanvas
                                            ref={canvasRef}
                                            initialData={drawings[currentQuestion.id]}
                                        />
                                    </div>

                                    {/* Content Layer */}
                                    <ScrollArea className="flex-1 z-0">
                                        <div className="max-w-4xl mx-auto w-full p-4 md:p-8 space-y-8 min-h-full flex flex-col">

                                            {/* Question Card (Premium Book Look) */}
                                            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 sm:p-6 relative overflow-hidden transition-all">
                                                <div className="text-lg sm:text-xl leading-relaxed font-serif text-slate-800 dark:text-slate-100 pb-2">
                                                    {renderContent(currentQuestion.content)}
                                                </div>
                                            </div>

                                            {/* Options Grid (Glass Cards) */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 content-start mt-2">
                                                {getParsedOptions(currentQuestion).map((opt: any, idx: number) => {
                                                    const isSelected = answers[currentQuestion.id] === opt.id;
                                                    const isResult = results[currentQuestion.id] !== undefined;
                                                    const isCorrect = opt.id === currentQuestion.correctAnswer;
                                                    const letter = String.fromCharCode(65 + idx);

                                                    let containerClass = "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-lg transition-all duration-300";
                                                    let indicatorClass = "bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-bold border border-slate-100 dark:border-slate-800";
                                                    let textClass = "text-slate-700 dark:text-slate-300 font-medium";

                                                    if (isResult) {
                                                        if (isCorrect) {
                                                            containerClass = "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-400 ring-1 ring-emerald-400 shadow-md transform scale-[1.01]";
                                                            indicatorClass = "bg-emerald-500 text-white border-emerald-500 shadow-sm";
                                                            textClass = "text-emerald-900 dark:text-emerald-300 font-semibold";
                                                        } else if (isSelected) {
                                                            containerClass = "bg-rose-50 dark:bg-rose-950/20 border-rose-300 ring-1 ring-rose-300";
                                                            indicatorClass = "bg-rose-500 text-white border-rose-500";
                                                            textClass = "text-rose-900 dark:text-rose-300 font-medium line-through opacity-80";
                                                        } else {
                                                            containerClass = "opacity-40 grayscale-[0.5] border-transparent bg-slate-50 dark:bg-slate-900";
                                                        }
                                                    } else if (isSelected) {
                                                        // Fallback just in case auto-check lags
                                                        containerClass = "bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500";
                                                        indicatorClass = "bg-indigo-600 text-white";
                                                    }

                                                    return (
                                                        <button
                                                            key={opt.id}
                                                            onClick={() => !isResult && handleAnswer(opt.id)}
                                                            disabled={isResult}
                                                            className={cn(
                                                                "group relative p-3 sm:p-4 rounded-2xl text-left border-2 w-full flex items-start gap-4 select-none h-full",
                                                                containerClass
                                                            )}
                                                        >
                                                            {/* Option Letter Indicator */}
                                                            <div className={cn(
                                                                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-lg transition-colors shrink-0 mt-0.5 sm:mt-0",
                                                                indicatorClass
                                                            )}>
                                                                {letter}
                                                            </div>

                                                            {/* Option Text & Image */}
                                                            <div className={cn("text-base sm:text-lg flex-1 overflow-hidden flex flex-col min-h-[2.5rem] sm:min-h-[3rem] justify-center", textClass)}>
                                                                {opt.text && (
                                                                    <div 
                                                                        className="prose prose-sm dark:prose-invert max-w-none prose-p:my-0 prose-p:inline-block [&_*]:!bg-transparent break-words whitespace-pre-wrap"
                                                                        dangerouslySetInnerHTML={{ __html: opt.text }} 
                                                                    />
                                                                )}
                                                                {opt.image && (
                                                                    <Image
                                                                        src={normalizeImageUrl(opt.image)}
                                                                        alt={`${letter} seçeneği`}
                                                                        width={400}
                                                                        height={200}
                                                                        className="max-w-full w-auto h-auto max-h-20 sm:max-h-24 object-contain rounded-lg border mt-2 shadow-sm"
                                                                        unoptimized={normalizeImageUrl(opt.image).startsWith('http://localhost')}
                                                                    />
                                                                )}
                                                            </div>

                                                            {/* Status Icons */}
                                                            {isResult && isCorrect && (
                                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-emerald-100 rounded-full text-emerald-600 animate-in zoom-in duration-300 shadow-sm">
                                                                    <CheckCircle2 className="h-6 w-6" />
                                                                </div>
                                                            )}
                                                            {isResult && isSelected && !isCorrect && (
                                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-rose-100 rounded-full text-rose-600 animate-in zoom-in duration-300">
                                                                    <XCircle className="h-6 w-6" />
                                                                </div>
                                                            )}
                                                        </button>
                                                    )
                                                })}
                                            </div>

                                            {/* ÇÖZÜM ALANI (Cevaplandıktan sonra görünür) */}
                                            {results[currentQuestion.id] !== undefined && (currentQuestion.explanation || currentQuestion.videoSolution) && (
                                                <div className="mt-8 select-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                    {!showSolutionMap[currentQuestion.id] ? (
                                                        <div className="flex flex-col sm:flex-row items-center gap-3">
                                                            {currentQuestion.explanation && (
                                                                <Button
                                                                    onClick={() => setShowSolutionMap(prev => ({ ...prev, [currentQuestion.id]: true }))}
                                                                    className="w-full sm:w-auto rounded-xl h-12 px-6 shadow-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-bold"
                                                                >
                                                                    <Lightbulb className="mr-2 h-5 w-5" />
                                                                    Çözümü İncele
                                                                </Button>
                                                            )}
                                                            {currentQuestion.videoSolution && (
                                                                <Button
                                                                    variant="outline"
                                                                    className="w-full sm:w-auto rounded-xl h-12 px-6 shadow-sm border-rose-200 text-rose-700 hover:bg-rose-50 bg-white font-bold"
                                                                    onClick={() => window.open(currentQuestion.videoSolution, '_blank')}
                                                                >
                                                                    <PlayCircle className="mr-2 h-5 w-5" />
                                                                    Video Çözüm
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className={cn(
                                                            "rounded-2xl border-2 p-6 shadow-sm relative animate-in fade-in zoom-in-95 duration-300",
                                                            results[currentQuestion.id] 
                                                                ? "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30" 
                                                                : "bg-indigo-50/50 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/30"
                                                        )}>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setShowSolutionMap(prev => ({ ...prev, [currentQuestion.id]: false }))}
                                                                className="absolute top-4 right-4 h-8 px-3 text-xs rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
                                                            >
                                                                Çözümü Gizle
                                                            </Button>
                                                            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                                                                {results[currentQuestion.id] ? (
                                                                    <span className="text-emerald-600">Tebrikler! İşte Çözüm:</span>
                                                                ) : (
                                                                    <span className="text-indigo-600">Üzülme, Öğrenme Fırsatı! İşte Çözüm:</span>
                                                                )}
                                                            </h3>
                                                            {currentQuestion.explanation && (
                                                                <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                                                                    {renderContent(currentQuestion.explanation)}
                                                                </div>
                                                            )}
                                                            {currentQuestion.videoSolution && (
                                                                <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-800/50 flex justify-end">
                                                                    <Button
                                                                        variant="outline"
                                                                        className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50"
                                                                        onClick={() => window.open(currentQuestion.videoSolution, '_blank')}
                                                                    >
                                                                        <PlayCircle className="mr-2 h-5 w-5" />
                                                                        Video Çözümü İzle
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Space for floating bottom nav */}
                                            <div className="h-32" />
                                        </div>
                                    </ScrollArea>

                                    {/* Floating Next/Prev Navigator (TikTok Style overlay bottom) */}
                                    <div className="absolute bottom-6 left-0 right-0 px-6 sm:px-12 flex items-center justify-between z-20 pointer-events-none">
                                        <div className="pointer-events-auto">
                                            <Button
                                                variant="outline"
                                                size="lg"
                                                onClick={() => handleNavigate(Math.max(0, currentIndex - 1))}
                                                disabled={currentIndex === 0}
                                                className="rounded-2xl h-14 w-14 sm:w-auto sm:px-6 shadow-xl border-slate-200 bg-white/90 backdrop-blur hover:bg-white text-slate-700 disabled:opacity-0 transition-all font-semibold"
                                            >
                                                <ChevronLeft className="h-6 w-6 sm:mr-2" />
                                                <span className="hidden sm:inline">Önceki Soru</span>
                                            </Button>
                                        </div>

                                        <div className="pointer-events-auto">
                                            {currentIndex === questions.length - 1 ? (
                                                <Button
                                                    onClick={() => setView('summary')}
                                                    className="rounded-2xl h-14 px-8 shadow-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg animate-in fade-in slide-in-from-bottom flex items-center gap-2"
                                                >
                                                    <CheckCircle2 className="h-5 w-5" />
                                                    Bölümü Bitir
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="lg"
                                                    onClick={() => handleNavigate(Math.min(questions.length - 1, currentIndex + 1))}
                                                    className="rounded-2xl h-14 w-14 sm:w-auto sm:px-6 shadow-xl bg-slate-900 hover:bg-slate-800 text-white transition-all font-semibold"
                                                >
                                                    <span className="hidden sm:inline">Sıradaki Soru</span>
                                                    <ChevronRight className="h-6 w-6 sm:ml-2" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Optional Right Slide-out Panel (Question Navigator) */}
                        {isNavOpen && (
                            <>
                                {/* Mobile Backdrop */}
                                <div className="absolute inset-0 bg-black/20 z-30 lg:hidden" onClick={() => setIsNavOpen(false)} />
                                
                                {/* Slide Pane */}
                                <div className="absolute lg:relative right-0 top-0 bottom-0 w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl lg:shadow-none z-40 flex flex-col flex-shrink-0 animate-in slide-in-from-right-2 fade-in duration-200">
                                    <div className="p-4 border-b flex justify-between items-center">
                                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Tüm Sorular</h3>
                                        <Button variant="ghost" size="icon" onClick={() => setIsNavOpen(false)} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-100">
                                            <ChevronRight className="h-5 w-5" />
                                        </Button>
                                    </div>
                                    <QuestionNavigator
                                        questions={questions}
                                        currentQuestionIndex={currentIndex}
                                        answers={answers}
                                        flags={flags}
                                        onNavigate={(idx) => {
                                            handleNavigate(idx);
                                            if (window.innerWidth < 1024) {
                                                setIsNavOpen(false);
                                            }
                                        }}
                                        onFinish={() => setView('summary')}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Report Modal */}
                <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                    <DialogContent className="max-w-md rounded-2xl p-6">
                        <div className="flex items-center gap-3 text-rose-600 mb-4 bg-rose-50 p-4 rounded-xl">
                            <AlertOctagon className="h-6 w-6" />
                            <div>
                                <h3 className="font-bold">Soruyu Bildir</h3>
                                <p className="text-xs text-rose-700 font-medium">Bu soruda bir hata mı var?</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Lütfen hatayı açıklayın (Şık yanlış, soru kökü hatalı vb.)</Label>
                                <Textarea 
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                    placeholder="Açıklamanızı buraya yazın..."
                                    className="min-h-[100px] resize-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button variant="ghost" onClick={() => setReportOpen(false)}>İptal</Button>
                                <Button 
                                    className="bg-rose-600 hover:bg-rose-700 text-white" 
                                    onClick={handleReportSubmit} 
                                    disabled={!reportReason.trim() || isReporting}
                                >
                                    {isReporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Bildirimi Gönder
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </DialogContent>
        </Dialog>
    );
}
