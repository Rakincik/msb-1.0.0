'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Folder, FileText, PlayCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { PracticeModal } from '@/components/student/practice-modal';
import { cn, getFileUrl } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

interface Topic {
    id: string;
    name: string;
    order: number;
}

interface Unit {
    id: string;
    name: string;
    order: number;
    topics: Topic[];
}

interface Lesson {
    id: string;
    name: string;
    code: string;
    units: Unit[];
}

interface ExamAreaDetail {
    id: string;
    name: string;
    description?: string;
    coverImage?: string;
    icon?: string;
    color?: string;
    lessons: Lesson[];
}

export default function StudentExamAreaDetailPage() {
    const { slug } = useParams();
    const router = useRouter();
        const [examArea, setExamArea] = useState<ExamAreaDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Practice Modal State
    const [practiceOpen, setPracticeOpen] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState<{ id: string; name: string } | null>(null);
    const [selectedLesson, setSelectedLesson] = useState<{ id: string; name: string } | null>(null);
    const [practiceMode, setPracticeMode] = useState<'topic' | 'mixed' | 'lesson'>('topic');



    useEffect(() => {
        const fetchDetail = async () => {
            if (!slug) return;
            try {
                const data = await apiClient.get(`/exam-areas/slug/${slug}`);
                setExamArea(data);
            } catch (error) {
                console.error('Error', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDetail();
    }, [slug]);

    const handleStartTopic = (topic: Topic) => {
        setPracticeMode('topic');
        setSelectedTopic({ id: topic.id, name: topic.name });
        setSelectedLesson(null);
        setPracticeOpen(true);
    };

    const handleStartMixed = () => {
        setPracticeMode('mixed');
        setSelectedTopic(null); // No specific topic
        setSelectedLesson(null);
        setPracticeOpen(true);
    };

    const handleStartLesson = (lesson: Lesson) => {
        setPracticeMode('lesson');
        setSelectedLesson({ id: lesson.id, name: lesson.name });
        setSelectedTopic(null);
        setPracticeOpen(true);
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="space-y-6">
                    <Skeleton className="h-48 w-full rounded-xl" />
                    <Skeleton className="h-12 w-3/4" />
                    <Skeleton className="h-96 w-full" />
                </div>
            </DashboardLayout>
        );
    }

    if (!examArea) {
        return (
            <DashboardLayout>
                <div className="text-center py-20">
                    <h2 className="text-xl font-bold">Soru Bankası Bulunamadı</h2>
                    <Button onClick={() => router.back()} className="mt-4">Geri Dön</Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto py-6">
                {/* Back Link */}
                <div className="mb-8 flex items-center gap-2 text-slate-500 hover:text-indigo-600 cursor-pointer transition-colors w-fit" onClick={() => router.back()}>
                    <ChevronLeft className="h-5 w-5" />
                    <span className="font-medium">Kütüphaneye Dön</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* LEFT COLUMN: Book Cover & Main CTA (Sticky) */}
                    <div className="lg:col-span-4 relative">
                        <div className="sticky top-24 flex flex-col items-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                            {/* Ambient Light Behind Book */}
                            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none" />
                            
                            {/* 3D Book Container */}
                            <div className="relative aspect-[2/3] w-full max-w-[220px] mb-8 perspective-1000 group">
                                <div 
                                    className="w-full h-full relative transition-all duration-700 transform-style-3d 
                                              rotate-y-[-5deg] group-hover:rotate-y-[-15deg] group-hover:scale-105
                                              shadow-2xl rounded-r-xl rounded-l-[3px] overflow-hidden 
                                              border-y border-r border-slate-900/10"
                                    style={{
                                        backgroundColor: examArea.color || '#1e293b'
                                    }}
                                >
                                    <div className="absolute top-0 bottom-0 left-0 w-6 bg-gradient-to-r from-black/40 via-black/10 to-transparent z-10 pointer-events-none" />
                                    <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-white/30 z-20 pointer-events-none" />
                                    <div className="absolute top-0 bottom-0 left-6 w-[1px] bg-black/10 z-20 pointer-events-none" />
                                    
                                    {examArea.coverImage ? (
                                        <div 
                                            className="w-full h-full bg-cover bg-center absolute inset-0"
                                            style={{ backgroundImage: `url(${getFileUrl(examArea.coverImage)})` }}
                                        />
                                    ) : (
                                        <div className="w-full h-full absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                                            <BookOpen className="w-16 h-16 text-white/50 mb-4" />
                                            <h3 className="text-white font-bold text-2xl drop-shadow-md leading-tight">
                                                {examArea.name}
                                            </h3>
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-6 left-6 right-6 h-4 bg-black/30 blur-xl rounded-[100%]" />
                            </div>

                            <div className="text-center w-full relative z-10">
                                <Badge variant="secondary" className="mb-4 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">Dijital Soru Bankası</Badge>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight mb-2">{examArea.name}</h1>
                                {examArea.description && <p className="text-slate-500 text-sm mb-6">{examArea.description}</p>}
                                
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 mb-6">
                                    <div className="flex justify-between items-center text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                                        <span>Genel İlerleme</span>
                                        <span>%15</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full w-[15%]" />
                                    </div>
                                </div>

                                <Button
                                    onClick={handleStartMixed}
                                    className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-indigo-500/25 transition-all"
                                >
                                    <PlayCircle className="mr-2 h-6 w-6" />
                                    Karışık Çözüme Başla
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Table of Contents */}
                    <div className="lg:col-span-8">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 lg:p-10 shadow-sm">
                            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
                                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                                    <BookOpen className="h-6 w-6 text-slate-700 dark:text-slate-300" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">İçindekiler</h2>
                                    <p className="text-sm text-slate-500">Kitabın tüm bölümleri ve testleri</p>
                                </div>
                            </div>

                            {examArea.lessons.length === 0 ? (
                                <div className="text-center py-16 text-slate-500">
                                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                    <p>Bu kitaba ait içerik bulunmuyor.</p>
                                </div>
                            ) : (
                                <Accordion type="single" collapsible className="space-y-4">
                                    {examArea.lessons.map((lesson) => (
                                        <AccordionItem key={lesson.id} value={lesson.id} className="border-none bg-slate-50 dark:bg-slate-800/50 rounded-2xl px-6 py-2">
                                            <AccordionTrigger className="hover:no-underline group py-4">
                                                <div className="flex items-center gap-4 text-left w-full justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg shadow-sm">
                                                            {lesson.code.substring(0, 2)}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{lesson.name}</h3>
                                                            <p className="text-sm text-slate-500">{lesson.units?.length || 0} Ünite (Bölüm)</p>
                                                        </div>
                                                    </div>
                                                    <div className="hidden sm:block text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Detayları Gör
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            
                                            <AccordionContent className="pt-4 pb-6">
                                                <div className="pl-7 space-y-8 mt-2 relative">
                                                    {/* Vertical Timeline Line */}
                                                    <div className="absolute left-[33px] top-4 bottom-4 w-px bg-slate-200 dark:bg-slate-700 z-0" />
                                                    
                                                    {lesson.units && lesson.units.length > 0 ? (
                                                        lesson.units.map((unit, index) => (
                                                            <div key={unit.id} className="relative z-10">
                                                                <div className="flex items-center gap-3 font-semibold text-slate-800 dark:text-slate-200 mb-4">
                                                                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 border-4 border-slate-50 dark:border-slate-800 flex items-center justify-center text-[10px] text-slate-600">
                                                                        {index + 1}
                                                                    </div>
                                                                    {unit.name}
                                                                </div>
                                                                
                                                                <div className="grid gap-3 pl-9">
                                                                    {unit.topics && unit.topics.length > 0 ? (
                                                                        unit.topics.map((topic) => (
                                                                            <div
                                                                                key={topic.id}
                                                                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all group cursor-pointer"
                                                                                onClick={() => handleStartTopic(topic)}
                                                                            >
                                                                                <div className="flex items-center gap-3 mb-3 sm:mb-0">
                                                                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                                                                                        <FileText className="h-5 w-5" />
                                                                                    </div>
                                                                                    <span className="font-medium text-slate-700 dark:text-slate-300">{topic.name}</span>
                                                                                </div>
                                                                                
                                                                                <div className="flex items-center gap-4 pl-12 sm:pl-0">
                                                                                    {/* Mini Mock Progress Component for the test */}
                                                                                    <div className="flex -space-x-1">
                                                                                        {[...Array(5)].map((_, i) => (
                                                                                            <div key={i} className={cn("w-2 h-4 rounded-sm border border-white", i < 2 ? "bg-emerald-500" : "bg-slate-200")} />
                                                                                        ))}
                                                                                    </div>
                                                                                    
                                                                                    <Button 
                                                                                        size="sm" 
                                                                                        className="bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors px-4"
                                                                                        onClick={(e) => { e.stopPropagation(); handleStartTopic(topic); }}
                                                                                    >
                                                                                        Çöz <ChevronRight className="ml-1 h-3 w-3" />
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="text-sm text-slate-400 pl-4 py-2 italic border-l-2 border-dashed border-slate-200">Bu bölümde test bulunamadı.</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-sm text-slate-400 pl-4">Bölüm bulunamadı.</div>
                                                    )}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {(selectedTopic || selectedLesson || practiceMode === 'mixed') && (
                <PracticeModal
                    open={practiceOpen}
                    onOpenChange={setPracticeOpen}
                    topicId={selectedTopic?.id}
                    lessonId={selectedLesson?.id}
                    topicName={selectedTopic?.name || selectedLesson?.name || examArea.name + ' - Karışık Test'}
                    mode={practiceMode}
                    examAreaId={examArea.id}
                />
            )}
        </DashboardLayout>
    );
}
