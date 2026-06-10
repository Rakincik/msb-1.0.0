'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { GripVertical, Save, X } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ReorderQuestionsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    examAreaId: string | null;
    onSuccess?: () => void;
}

// Sortable item component
function SortableQuestionItem({ item, index }: { item: any; index: number }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm mb-2 group hover:border-primary/30"
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab text-muted-foreground hover:text-primary active:cursor-grabbing p-1"
            >
                <GripVertical className="h-5 w-5" />
            </div>
            <div className="font-mono text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded w-8 text-center shrink-0">
                {index + 1}
            </div>
            <div className="flex-1 truncate text-sm">
                {item.content?.text || 'Görsel/Video Soru'}
            </div>
            <div className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-600 shrink-0">
                {item.difficulty === 'VERY_EASY' ? 'Çok Kolay' : item.difficulty === 'EASY' ? 'Kolay' : item.difficulty === 'MEDIUM' ? 'Orta' : item.difficulty === 'HARD' ? 'Zor' : 'Çok Zor'}
            </div>
        </div>
    );
}

export function ReorderQuestionsModal({ open, onOpenChange, examAreaId, onSuccess }: ReorderQuestionsModalProps) {
    const { toast } = useToast();
    const [items, setItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if (open && examAreaId) {
            fetchQuestions();
        } else {
            setItems([]);
        }
    }, [open, examAreaId]);

    const fetchQuestions = async () => {
        setIsLoading(true);
        try {
            // Fetch all questions for this exam area without pagination (or high take)
            const result = await apiClient.get(`/exam-areas/${examAreaId}/questions`);
            // We should ensure they are sorted correctly initially
            setItems(result || []);
        } catch (error) {
            console.error(error);
            toast({ title: 'Hata', description: 'Sorular yüklenemedi', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSave = async () => {
        if (!examAreaId) return;
        setIsSaving(true);
        try {
            const reorderedItems = items.map((item, index) => ({
                id: item.id,
                order: index + 1,
            }));

            await apiClient.post(`/exam-areas/${examAreaId}/reorder-questions`, reorderedItems);
            
            toast({ title: 'Başarılı', description: 'Soru sıralaması kaydedildi' });
            onSuccess?.();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast({ title: 'Hata', description: 'Sıralama kaydedilemedi', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Soruları Sırala</DialogTitle>
                    <DialogDescription>
                        Soruları tutup sürükleyerek Soru Bankası içerisindeki yerlerini değiştirebilirsiniz.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-1 min-h-[300px]">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">Yükleniyor...</div>
                    ) : items.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">Bu soru bankasında soru bulunmuyor.</div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={items.map(i => i.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {items.map((item, index) => (
                                    <SortableQuestionItem key={item.id} item={item} index={index} />
                                ))}
                            </SortableContext>
                        </DndContext>
                    )}
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        <X className="mr-2 h-4 w-4" /> İptal
                    </Button>
                    <Button onClick={handleSave} disabled={isLoading || isSaving || items.length === 0}>
                        <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Kaydediliyor...' : 'Sıralamayı Kaydet'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
