'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    PlayCircle,
    ChevronDown,
    ChevronUp,
    Award,
    Tag,
    Edit,
    Trash2,
    Calendar,
    Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizeImageUrl } from '@/lib/image-utils';

interface Question {
    id: string;
    content: any;
    options: any;
    correctAnswer: string;
    difficulty: string;
    videoSolution?: string;
    isPastQuestion?: boolean;
    pastExamName?: string;
    pastExamYear?: number;
    learningOutcome?: {
        code: string;
        description: string;
    };
    topics: { id: string; name: string }[];
    createdAt: string;
}

const DIFFICULTY_LABELS: Record<string, string> = {
    VERY_EASY: 'Çok Kolay',
    EASY: 'Kolay',
    MEDIUM: 'Orta',
    HARD: 'Zor',
    VERY_HARD: 'Çok Zor',
};

const DIFFICULTY_COLORS: Record<string, string> = {
    VERY_EASY: 'bg-green-100 text-green-700 border-green-200',
    EASY: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
    HARD: 'bg-orange-100 text-orange-700 border-orange-200',
    VERY_HARD: 'bg-red-100 text-red-700 border-red-200',
};

export function QuestionList({ questions, isLoading }: { questions: Question[]; isLoading: boolean }) {
    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <Card key={i} className="animate-pulse">
                        <div className="h-32 bg-muted rounded-md" />
                    </Card>
                ))}
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/20">
                <p className="text-muted-foreground font-medium">Bu kriterlere uygun soru bulunamadı.</p>
                <p className="text-sm text-muted-foreground">Lütfen filtreleri değiştirin veya yeni soru ekleyin.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {questions.map((q) => (
                <QuestionItem key={q.id} question={q} />
            ))}
        </div>
    );
}

function QuestionItem({ question }: { question: Question }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <Card className="group overflow-hidden border border-border/60 hover:border-primary/20 transition-all duration-300 shadow-apple-sm hover:shadow-apple-lg hover:-translate-y-0.5">
            <CardContent className="p-0">
                {/* Header Info */}
                <div className="flex items-center justify-between p-4 bg-muted/30 border-b border-border/40 group-hover:bg-muted/40 transition-colors">
                    <div className="flex flex-wrap gap-2 items-center">
                        <Badge variant="outline" className={cn("font-medium border shadow-none", DIFFICULTY_COLORS[question.difficulty])}>
                            {DIFFICULTY_LABELS[question.difficulty]}
                        </Badge>
                        {question.learningOutcome && (
                            <Badge variant="secondary" className="flex items-center gap-1.5 bg-indigo-50/80 text-indigo-700 border-indigo-100/50 hover:bg-indigo-100/80 transition-colors">
                                <Award className="h-3.5 w-3.5" />
                                {question.learningOutcome?.code}
                            </Badge>
                        )}
                        {question.videoSolution && (
                            <a
                                href={question.videoSolution}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-rose-50/80 text-rose-700 border-rose-100/50 gap-1.5 cursor-pointer hover:bg-rose-100/80 hover:scale-105 active:scale-95"
                            >
                                <PlayCircle className="h-3.5 w-3.5" />
                                Video Çözüm
                            </a>
                        )}
                        {question.isPastQuestion && (
                            <Badge variant="secondary" className="flex items-center gap-1.5 bg-amber-50/80 text-amber-700 border-amber-200/60 shadow-sm">
                                📌 {question.pastExamName} {question.pastExamYear}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground/80 flex items-center gap-1.5 mr-3 font-medium">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(question.createdAt).toLocaleDateString('tr-TR')}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary/70 hover:text-primary hover:bg-primary/10 rounded-full">
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500/70 hover:text-red-600 hover:bg-red-50 rounded-full">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 bg-card">
                    <div className="prose prose-sm max-w-none prose-p:text-base prose-p:leading-7 prose-p:text-foreground/90">
                        <p>{question.content.text}</p>
                        {question.content.image && (
                            <div className="mt-5 rounded-xl overflow-hidden border border-border/50 bg-muted/5 inline-block shadow-sm">
                                <img src={normalizeImageUrl(question.content.image)} alt="Soru görseli" className="max-h-[300px] object-contain" />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <div className="flex flex-wrap gap-2">
                            {question.topics.map(t => (
                                <span key={t.id} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-100 flex items-center gap-1.5 hover:bg-slate-100 transition-colors cursor-default">
                                    <Tag className="h-3 w-3 text-slate-400" />
                                    {t.name}
                                </span>
                            ))}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground font-medium"
                            onClick={() => setExpanded(!expanded)}
                        >
                            {expanded ? (
                                <>Seçenekleri Gizle <ChevronUp className="h-3.5 w-3.5" /></>
                            ) : (
                                <>Seçenekleri Göster <ChevronDown className="h-3.5 w-3.5" /></>
                            )}
                        </Button>
                    </div>

                    {expanded && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 animate-in fade-in slide-in-from-top-3 duration-300 ease-out">
                            {['A', 'B', 'C', 'D', 'E'].map(opt => {
                                const isCorrect = question.correctAnswer === opt;
                                const optContent = question.options[opt];
                                return (
                                    <div
                                        key={opt}
                                        className={cn(
                                            "relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 group-option",
                                            isCorrect
                                                ? "bg-emerald-50/50 border-emerald-200/60 ring-1 ring-emerald-500/20 shadow-sm"
                                                : "bg-background border-border/60 hover:border-primary/20 hover:bg-muted/20"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-sm shadow-sm transition-transform group-option-hover:scale-105",
                                            isCorrect ? "bg-emerald-500 text-white shadow-emerald-200" : "bg-muted text-muted-foreground"
                                        )}>
                                            {opt}
                                        </div>
                                        <div className="flex-1 space-y-2 min-w-0">
                                            <p className={cn("text-sm leading-relaxed break-words", isCorrect ? "font-semibold text-emerald-950" : "text-foreground/80")}>
                                                {optContent?.text || '-'}
                                            </p>
                                            {optContent?.image && (
                                                <img src={normalizeImageUrl(optContent.image)} className="max-h-24 rounded-lg border shadow-sm bg-white" alt={`Seçenek ${opt}`} />
                                            )}
                                        </div>
                                        {isCorrect && (
                                            <div className="absolute top-3 right-3">
                                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
