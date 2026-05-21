'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OpticFormProps {
    questionCount: number;
    answers: Record<string, string>; // e.g. { "1": "A", "2": "C" }
    onAnswerChange: (questionNumber: number, option: string) => void;
}

const OPTIONS = ['A', 'B', 'C', 'D', 'E'];

export function OpticForm({ questionCount, answers, onAnswerChange }: OpticFormProps) {
    // Generate questions array [1, 2, ..., questionCount]
    // If questionCount is 0 or undefined, default to a reasonable number or handle empty
    const questions = Array.from({ length: questionCount || 20 }, (_, i) => i + 1);

    return (
        <ScrollArea className="h-full pr-4">
            <div className="space-y-1">
                {questions.map((qNum) => (
                    <div
                        key={qNum}
                        className={cn(
                            "flex items-center justify-between p-2 rounded-md transition-colors hover:bg-muted/50",
                            answers[qNum] ? "bg-muted/30" : ""
                        )}
                    >
                        <span className="text-sm font-semibold w-8 text-center bg-slate-100 rounded py-0.5 border">
                            {qNum}
                        </span>

                        <div className="flex gap-2 flex-1 justify-end">
                            {OPTIONS.map((opt) => {
                                const isSelected = answers[qNum] === opt;
                                return (
                                    <button
                                        key={opt}
                                        onClick={() => onAnswerChange(qNum, opt)}
                                        className={cn(
                                            "w-8 h-8 rounded-full text-sm font-medium border border-slate-200 transition-all text-slate-500 hover:border-primary hover:text-primary",
                                            isSelected && "bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground shadow-sm ring-2 ring-offset-2 ring-primary/20",
                                        )}
                                    >
                                        {opt}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}
