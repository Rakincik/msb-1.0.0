'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    ChevronRight,
    ChevronDown,
    Plus,
    MoreVertical,
    Pencil,
    Trash2,
    BookOpen,
    Folder,
    FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { UnitDialog } from './unit-dialog';
import { TopicDialog } from './topic-dialog';
import { API_URL } from '@/lib/api-config';

interface Topic {
    id: string;
    name: string;
    order: number;
    isActive: boolean;
}

interface Unit {
    id: string;
    name: string;
    order: number;
    isActive: boolean;
    topics: Topic[];
}

interface Lesson {
    id: string;
    name: string;
    code: string;
    order: number;
    isActive: boolean;
    units: Unit[];
}

interface ContentTreeProps {
    lessons: Lesson[];
    onRefresh: () => void;
}

export function ContentTree({ lessons, onRefresh }: ContentTreeProps) {
    return (
        <div className="space-y-2">
            {lessons.map((lesson) => (
                <LessonItem key={lesson.id} lesson={lesson} onRefresh={onRefresh} />
            ))}
            {lessons.length === 0 && (
                <div className="text-center py-10 text-muted-foreground border rounded-lg border-dashed">
                    Henüz ders eklenmemiş.
                </div>
            )}
        </div>
    );
}

function LessonItem({ lesson, onRefresh }: { lesson: Lesson; onRefresh: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [unitDialogOpen, setUnitDialogOpen] = useState(false);

    // We don't implement delete/edit for lesson here as it's done in the parent list, 
    // but we could adding it here for completeness if needed.
    // For now, this tree view focuses on the hierarchy INSIDE a lesson.

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg bg-card">
            <div className="flex items-center p-4">
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-0 w-6 h-6 mr-2">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                </CollapsibleTrigger>

                <div className="flex items-center gap-2 flex-1">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <span className="font-semibold">{lesson.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">({lesson.code})</span>
                </div>

                <Button variant="ghost" size="sm" onClick={() => setUnitDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ünite Ekle
                </Button>
            </div>

            <CollapsibleContent className="px-4 pb-4 pl-12 border-t bg-muted/20">
                <div className="pt-4 space-y-2">
                    {lesson.units && lesson.units.length > 0 ? (
                        lesson.units
                            .sort((a, b) => (a.order || 0) - (b.order || 0))
                            .map(unit => (
                                <UnitItem key={unit.id} unit={unit} lessonId={lesson.id} onRefresh={onRefresh} />
                            ))
                    ) : (
                        <div className="text-sm text-muted-foreground py-2 italic">
                            Bu derse ait ünite bulunmuyor.
                        </div>
                    )}
                </div>
            </CollapsibleContent>

            <UnitDialog
                open={unitDialogOpen}
                onOpenChange={setUnitDialogOpen}
                lessonId={lesson.id}
                onSuccess={onRefresh}
            />
        </Collapsible>
    );
}

function UnitItem({ unit, lessonId, onRefresh }: { unit: Unit; lessonId: string; onRefresh: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [createTopicOpen, setCreateTopicOpen] = useState(false);
    const { toast } = useToast();

    const { accessToken } = useAuth();

    const handleDelete = async () => {
        if (!confirm('Bu üniteyi silmek istediğinize emin misiniz?')) return;


        try {
            const res = await fetch(`${API_URL}/content/units/${unit.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
            if (res.ok) {
                toast({ title: 'Başarılı', description: 'Ünite silindi.' });
                onRefresh();
            } else {
                throw new Error('Silinemedi');
            }
        } catch (e) {
            toast({ title: 'Hata', description: 'Silme işlemi başarısız.', variant: 'destructive' });
        }
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group">
            <div className="flex items-center justify-between p-2 rounded-md hover:bg-background/80 border border-transparent hover:border-border transition-colors">
                <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </Button>
                    </CollapsibleTrigger>
                    <Folder className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">{unit.name}</span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCreateTopicOpen(true)}>
                        <Plus className="h-3 w-3" />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                                <Pencil className="mr-2 h-4 w-4" /> Düzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" /> Sil
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <CollapsibleContent className="pl-9 pt-1">
                <div className="space-y-1 border-l-2 border-border pl-2 ml-2">
                    {unit.topics && unit.topics.length > 0 ? (
                        unit.topics
                            .sort((a, b) => (a.order || 0) - (b.order || 0))
                            .map(topic => (
                                <TopicItem key={topic.id} topic={topic} unitId={unit.id} onRefresh={onRefresh} />
                            ))
                    ) : (
                        <div className="text-xs text-muted-foreground py-1 px-2">Konu eklenmemiş.</div>
                    )}
                </div>
            </CollapsibleContent>

            <UnitDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                lessonId={lessonId}
                unit={unit}
                onSuccess={onRefresh}
            />
            <TopicDialog
                open={createTopicOpen}
                onOpenChange={setCreateTopicOpen}
                unitId={unit.id}
                onSuccess={onRefresh}
            />
        </Collapsible>
    );
}

function TopicItem({ topic, unitId, onRefresh }: { topic: Topic; unitId: string; onRefresh: () => void }) {
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const { toast } = useToast();

    const { accessToken } = useAuth();

    const handleDelete = async () => {
        if (!confirm('Bu konuyu silmek istediğinize emin misiniz?')) return;


        try {
            const res = await fetch(`${API_URL}/content/topics/${topic.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
            if (res.ok) {
                toast({ title: 'Başarılı', description: 'Konu silindi.' });
                onRefresh();
            } else {
                throw new Error('Silinemedi');
            }
        } catch (e) {
            toast({ title: 'Hata', description: 'Silme işlemi başarısız.', variant: 'destructive' });
        }
    };

    return (
        <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 group">
            <div className="flex items-center gap-2">
                <FileText className="h-3 w-3 text-emerald-500" />
                <span className="text-sm">{topic.name}</span>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditDialogOpen(true)}>
                    <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={handleDelete}>
                    <Trash2 className="h-3 w-3" />
                </Button>
            </div>

            <TopicDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                unitId={unitId}
                topic={topic}
                onSuccess={onRefresh}
            />
        </div>
    );
}
