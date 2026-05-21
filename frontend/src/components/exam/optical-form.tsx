'use client';


import { cn } from '@/lib/utils';

interface OpticalFormProps {
    questionCount: number;
    optionCount?: number;
    answers: Record<string, string>;
    onAnswerChange: (questionNumber: string, answer: string) => void;
    correctAnswers?: Record<string, string>;
    showResults?: boolean;
    disabled?: boolean;
}

export function OpticalForm({
    questionCount,
    optionCount = 5,
    answers,
    onAnswerChange,
    correctAnswers,
    showResults = false,
    disabled = false,
}: OpticalFormProps) {
    const options = ['A', 'B', 'C', 'D', 'E'].slice(0, optionCount);

    const getOptionClassName = (questionNum: string, option: string) => {
        const isSelected = answers[questionNum] === option;
        const isCorrect = correctAnswers?.[questionNum] === option;
        const isWrong = showResults && isSelected && !isCorrect;

        if (showResults && isCorrect) {
            return 'bg-green-500 text-white border-green-500';
        }
        if (showResults && isWrong) {
            return 'bg-red-500 text-white border-red-500';
        }
        if (isSelected) {
            return 'bg-primary text-primary-foreground border-primary';
        }
        return 'bg-white hover:bg-muted border-gray-300';
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="font-semibold mb-4 text-center">Optik Form</h3>

            <div className="grid grid-cols-2 gap-1 text-xs">
                {/* Header */}
                <div className="col-span-2 grid grid-cols-[40px_repeat(5,1fr)] gap-1 mb-2 font-medium text-center text-muted-foreground">
                    <div></div>
                    {options.map((opt) => (
                        <div key={opt}>{opt}</div>
                    ))}
                </div>

                {/* Questions */}
                {Array.from({ length: questionCount }, (_, i) => {
                    const questionNum = (i + 1).toString();
                    return (
                        <div
                            key={questionNum}
                            className="col-span-2 grid grid-cols-[40px_repeat(5,1fr)] gap-1 items-center"
                        >
                            <div className="font-medium text-center text-muted-foreground">
                                {questionNum}
                            </div>
                            {options.map((option) => (
                                <button
                                    key={option}
                                    onClick={() => !disabled && onAnswerChange(questionNum, option)}
                                    disabled={disabled}
                                    className={cn(
                                        'w-6 h-6 mx-auto rounded-full border-2 flex items-center justify-center text-xs font-medium transition-colors',
                                        getOptionClassName(questionNum, option),
                                        disabled && 'cursor-not-allowed opacity-75'
                                    )}
                                >
                                    {answers[questionNum] === option && '●'}
                                </button>
                            ))}
                        </div>
                    );
                })}
            </div>

            {/* Özet */}
            {!showResults && (
                <div className="mt-4 pt-4 border-t text-center text-sm text-muted-foreground">
                    <p>Cevaplanan: {Object.keys(answers).length} / {questionCount}</p>
                    <p className="mt-1">Boş: {questionCount - Object.keys(answers).length}</p>
                </div>
            )}

            {showResults && correctAnswers && (
                <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center text-sm">
                    <div>
                        <div className="font-bold text-green-600">
                            {Object.entries(answers).filter(([q, a]) => correctAnswers[q] === a).length}
                        </div>
                        <div className="text-muted-foreground">Doğru</div>
                    </div>
                    <div>
                        <div className="font-bold text-red-600">
                            {Object.entries(answers).filter(([q, a]) => correctAnswers[q] && correctAnswers[q] !== a).length}
                        </div>
                        <div className="text-muted-foreground">Yanlış</div>
                    </div>
                    <div>
                        <div className="font-bold text-gray-600">
                            {questionCount - Object.keys(answers).length}
                        </div>
                        <div className="text-muted-foreground">Boş</div>
                    </div>
                </div>
            )}
        </div>
    );
}
