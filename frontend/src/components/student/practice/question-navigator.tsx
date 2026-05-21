'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Circle, HelpCircle, XCircle, Flag } from 'lucide-react';

interface QuestionNavigatorProps {
    questions: { id: string }[];
    currentQuestionIndex: number;
    answers: Record<string, string>; // questionId -> answer
    flags: Record<string, boolean>;
    onNavigate: (index: number) => void;
    onFinish: () => void;
}

export function QuestionNavigator({
    questions,
    currentQuestionIndex,
    answers,
    flags,
    onNavigate,
    onFinish
}: QuestionNavigatorProps) {

    // Stats
    const total = questions.length;
    const answeredCount = Object.keys(answers).length;
    const flaggedCount = Object.values(flags).filter(Boolean).length;
    const emptyCount = total - answeredCount;

    return (
        <div className="flex flex-col h-full bg-transparent">
            {/* Minimal Stats */}
            <div className="p-4 pt-2 flex justify-between gap-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col items-center flex-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl py-2 px-1">
                    <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{answeredCount}</span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Çözülen</span>
                </div>
                <div className="flex flex-col items-center flex-1 bg-orange-50 dark:bg-orange-900/20 rounded-xl py-2 px-1">
                    <span className="text-lg font-bold text-orange-600 dark:text-orange-500">{flaggedCount}</span>
                    <span className="text-[10px] font-semibold text-orange-500 dark:text-orange-600 uppercase tracking-wider">İşaretli</span>
                </div>
                <div className="flex flex-col items-center flex-1 bg-slate-50 dark:bg-slate-900 rounded-xl py-2 px-1 border border-slate-100 dark:border-slate-800">
                    <span className="text-lg font-bold text-slate-400">{emptyCount}</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Boş</span>
                </div>
            </div>

            {/* Grid */}
            <ScrollArea className="flex-1">
                <div className="grid grid-cols-5 gap-3 p-4">
                    {questions.map((q, index) => {
                        const isAnswered = !!answers[q.id];
                        const isFlagged = !!flags[q.id];
                        const isCurrent = currentQuestionIndex === index;

                        let baseClass = "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700";
                        if (isAnswered) {
                            baseClass = "bg-indigo-500 text-white font-bold shadow-md shadow-indigo-500/20";
                        } else if (isFlagged) {
                            baseClass = "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 ring-1 ring-orange-400";
                        }

                        return (
                            <button
                                key={q.id}
                                onClick={() => onNavigate(index)}
                                className={cn(
                                    "aspect-square rounded-2xl flex items-center justify-center text-sm transition-all relative font-medium w-full",
                                    baseClass,
                                    isCurrent && "ring-4 ring-indigo-300 dark:ring-indigo-900 ring-offset-2 dark:ring-offset-slate-950 scale-110 z-50 font-bold"
                                )}
                            >
                                {index + 1}
                                
                                {/* Flag Indicator overlap */}
                                {isFlagged && isAnswered && (
                                    <div className="absolute -top-1.5 -right-1.5 z-20 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-sm">
                                        <Flag className="w-3 h-3 text-orange-500 fill-orange-500" />
                                    </div>
                                )}
                                {isFlagged && !isAnswered && (
                                    <div className="absolute top-1 right-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </ScrollArea>

            {/* Footer Actions */}
            <div className="p-4 pt-2 mt-auto">
                <Button
                    className="w-full rounded-2xl h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-xl shadow-indigo-500/20 transition-transform active:scale-95"
                    onClick={onFinish}
                >
                    Testi Bitir <CheckCircle2 className="ml-2 h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}
