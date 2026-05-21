'use client';

import { useState } from 'react';
import {
    ChevronRight,
    ChevronDown,
    BookOpen,
    Folder,
    FileText,
    Library
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface Topic {
    id: string;
    name: string;
}

interface Unit {
    id: string;
    name: string;
    topics: Topic[];
}

interface Lesson {
    id: string;
    name: string;
    code: string;
    units: Unit[];
}

interface BookNavigatorProps {
    lessons: Lesson[];
    selectedId: string | null;
    onSelect: (type: 'lesson' | 'unit' | 'topic', id: string) => void;
    onClear: () => void;
}

export function BookNavigator({ lessons, selectedId, onSelect, onClear }: BookNavigatorProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Library className="h-4 w-4" />
                    Kitap Gezgini
                </h3>
                {selectedId && (
                    <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={onClear}>
                        Temizle
                    </Button>
                )}
            </div>

            <div className="space-y-1">
                {lessons.map((lesson) => (
                    <LessonNode
                        key={lesson.id}
                        lesson={lesson}
                        selectedId={selectedId}
                        onSelect={onSelect}
                    />
                ))}
                {lessons.length === 0 && (
                    <div className="text-xs text-muted-foreground px-4 py-8 text-center italic">
                        Ders bulunamadı.
                    </div>
                )}
            </div>
        </div>
    );
}

function LessonNode({ lesson, selectedId, onSelect }: { lesson: Lesson; selectedId: string | null; onSelect: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const isSelected = selectedId === lesson.id;

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className={cn(
                "flex items-center group rounded-md transition-colors",
                isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
            )}>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </Button>
                </CollapsibleTrigger>
                <div
                    className="flex items-center gap-2 flex-1 py-1 cursor-pointer overflow-hidden"
                    onClick={() => onSelect('lesson', lesson.id)}
                >
                    <BookOpen className={cn("h-4 w-4 shrink-0", isSelected ? "text-primary" : "text-blue-500")} />
                    <span className="text-sm font-medium truncate">{lesson.name}</span>
                </div>
            </div>

            <CollapsibleContent className="pl-4 pt-1 space-y-1">
                {lesson.units?.map(unit => (
                    <UnitNode
                        key={unit.id}
                        unit={unit}
                        selectedId={selectedId}
                        onSelect={onSelect}
                    />
                ))}
            </CollapsibleContent>
        </Collapsible>
    );
}

function UnitNode({ unit, selectedId, onSelect }: { unit: Unit; selectedId: string | null; onSelect: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const isSelected = selectedId === unit.id;

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className={cn(
                "flex items-center group rounded-md transition-colors",
                isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
            )}>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 ml-1">
                        {isOpen ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
                    </Button>
                </CollapsibleTrigger>
                <div
                    className="flex items-center gap-2 flex-1 py-1 cursor-pointer overflow-hidden"
                    onClick={() => onSelect('unit', unit.id)}
                >
                    <Folder className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "text-primary" : "text-amber-500")} />
                    <span className="text-xs font-medium truncate">{unit.name}</span>
                </div>
            </div>

            <CollapsibleContent className="pl-5 pt-1 space-y-0.5 border-l ml-3.5 border-muted">
                {unit.topics?.map(topic => (
                    <div
                        key={topic.id}
                        className={cn(
                            "flex items-center gap-2 px-2 py-1 cursor-pointer rounded-md transition-colors overflow-hidden",
                            selectedId === topic.id ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-muted-foreground"
                        )}
                        onClick={() => onSelect('topic', topic.id)}
                    >
                        <FileText className={cn("h-3 w-3 shrink-0", selectedId === topic.id ? "text-primary" : "text-emerald-500")} />
                        <span className="text-[11px] truncate">{topic.name}</span>
                    </div>
                ))}
            </CollapsibleContent>
        </Collapsible>
    );
}
