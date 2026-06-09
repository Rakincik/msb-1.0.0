'use client';

import { useState, useEffect } from 'react';
import {
    X,
    ChevronRight,
    Plus,
    MoreVertical,
    Pencil,
    Trash2,
    Search,
    ChevronLeft,
    FolderOpen,
    FileText,
    BookOpen,
    FileSpreadsheet
} from 'lucide-react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { API_URL } from '@/lib/api-config';
import { UnitDialog } from './unit-dialog';
import { useConfirm } from '@/context/confirm-context';
import { TopicDialog } from './topic-dialog';
import { LessonDialog } from './lesson-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BulkImportModal } from './bulk-import-modal';

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

interface ContentManagementModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    examAreaId?: string;
    connectedLessonIds?: string[];
    onUpdate?: () => void;
}

export function ContentManagementModal({ open, onOpenChange, examAreaId, connectedLessonIds = [], onUpdate }: ContentManagementModalProps) {
    const { toast } = useToast();
    const confirm = useConfirm();

    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
    const [loading, setLoading] = useState(false);

    const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set(connectedLessonIds));

    const { accessToken } = useAuth();
    const [editingItem, setEditingItem] = useState<any>(null);
    const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
    const [unitDialogOpen, setUnitDialogOpen] = useState(false);
    const [topicDialogOpen, setTopicDialogOpen] = useState(false);
    
    // Quick add states
    const [newItemName, setNewItemName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [bulkImportOpen, setBulkImportOpen] = useState(false);

    useEffect(() => {
        if (open && accessToken) fetchTree();
    }, [open, accessToken]);

    const fetchTree = async () => {
        try {
            const res = await fetch(`${API_URL}/content/tree`, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (res.ok) setLessons(await res.json());
        } catch (error) {
            console.error("Fetch tree error", error);
        }
    };

    const toggleConnection = async (lessonId: string, currentStatus: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!examAreaId) return;

        const newStatus = !currentStatus;
        try {
            const method = newStatus ? 'POST' : 'DELETE';
            const res = await fetch(`${API_URL}/exam-areas/${examAreaId}/lessons/${lessonId}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` } });

            if (res.ok) {
                toast({ title: 'Başarılı', description: newStatus ? 'Bağlantı kuruldu.' : 'Bağlantı kaldırıldı' });
                setConnectedIds(prev => {
                    const next = new Set(prev);
                    if (newStatus) next.add(lessonId);
                    else next.delete(lessonId);
                    return next;
                });
                if (onUpdate) onUpdate();
            } else {
                throw new Error('Failed to update connection');
            }
        } catch (error) {
            toast({ title: 'Hata', description: 'Bağlantı güncellenirken hata oluştu.', variant: 'destructive' });
        }
    };

    const handleQuickAdd = async () => {
        if (!selectedLesson || !newItemName.trim()) return;
        setIsAdding(true);
        try {
            const body = {
                name: newItemName.trim(),
                lessonId: selectedLesson.id,
                order: Array.isArray(selectedLesson.units) ? selectedLesson.units.length : 0,
                isActive: true
            };
            const res = await fetch(`${API_URL}/content/units`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                toast({ title: 'Başarılı', description: 'Ünite eklendi.' });
                setNewItemName('');
                fetchTree();
            } else {
                throw new Error('Failed to add');
            }
        } catch (error) {
            toast({ title: 'Hata', description: 'Ünite eklenemedi.', variant: 'destructive' });
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (type: 'lesson' | 'unit' | 'topic', id: string) => {
        const confirmed = await confirm({
            title: 'Silme İşlemi',
            description: 'Silmek istediğinize emin misiniz?',
            confirmText: 'Sil',
            isDangerous: true,
        });
        if (!confirmed) return;

        try {
            const res = await fetch(`${API_URL}/content/${type}s/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });

            if (res.ok) {
                toast({ title: 'Başarılı', description: 'Silindi.' });

                // If deleting currently selected items, navigate up
                if (type === 'unit' && selectedUnit?.id === id) {
                    setSelectedUnit(null);
                }
                if (type === 'lesson' && selectedLesson?.id === id) {
                    setSelectedLesson(null);
                    setSelectedUnit(null);
                }

            fetchTree();
            }
        } catch (error) {
            toast({ title: 'Hata', description: 'Silinemedi.', variant: 'destructive' });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[85vw] h-[85vh] p-0 gap-0 overflow-hidden flex flex-col bg-slate-50">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
                    <h2 className="text-lg font-bold">İçerik Yönetimi {examAreaId && '(Soru Bankası Bağlantıları)'}</h2>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* LEFT PANEL: LESSONS (Sidebar) */}
                    <div className="w-1/3 border-r bg-white flex flex-col">
                        <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between sticky top-0">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Hiyerarşi</h3>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingItem(null); setLessonDialogOpen(true); }}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-2 space-y-1">
                                {lessons.map(lesson => {
                                    const isConnected = connectedIds.has(lesson.id);
                                    return (
                                        <div
                                            key={lesson.id}
                                            onClick={() => { setSelectedLesson(lesson); setSelectedUnit(null); }}
                                            className={cn(
                                                "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all group",
                                                selectedLesson?.id === lesson.id
                                                    ? "bg-slate-100 ring-1 ring-slate-200 shadow-sm"
                                                    : "hover:bg-slate-50"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                {examAreaId && (
                                                    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                                        <Checkbox
                                                            checked={isConnected}
                                                            onCheckedChange={(checked) => toggleConnection(lesson.id, isConnected, { stopPropagation: () => { } } as any)}
                                                        />
                                                    </div>
                                                )}
                                                <div className={cn(
                                                    "w-1 h-8 rounded-full transition-colors",
                                                    selectedLesson?.id === lesson.id ? "bg-violet-500" : "bg-transparent group-hover:bg-slate-200"
                                                )} />
                                                <div>
                                                    <div className="font-medium text-slate-900">{lesson.name}</div>
                                                    <div className="text-xs text-muted-foreground">{lesson.units?.length || 0} Ünite</div>
                                                </div>
                                            </div>

                                            {selectedLesson?.id === lesson.id && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onClick={() => { setEditingItem(lesson); setLessonDialogOpen(true); }}>
                                                            <Pencil className="mr-2 h-4 w-4" /> Düzenle
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete('lesson', lesson.id)}>
                                                            <Trash2 className="mr-2 h-4 w-4" /> Sil
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>

                        <div className="p-4 border-t bg-slate-50/50">
                            <Button
                                variant="outline"
                                className="w-full justify-start text-violet-600 border-violet-200 hover:bg-violet-50"
                                onClick={() => { setEditingItem(null); setLessonDialogOpen(true); }}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Yeni Ders Ekle
                            </Button>
                        </div>
                    </div>

                    {/* RIGHT PANEL: CONTENT (Detail / Tree View) */}
                    <div className="flex-1 flex flex-col bg-slate-50/30">
                        {/* Header */}
                        <div className="h-14 border-b bg-white flex items-center px-6 justify-between shrink-0">
                            {selectedLesson ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-900 text-lg">{selectedLesson.name}</span>
                                        <span className="text-muted-foreground">•</span>
                                        <span className="text-sm text-slate-500">İçerik Ağacı</span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 transition-all shadow-sm"
                                        onClick={() => setBulkImportOpen(true)}
                                    >
                                        <FileSpreadsheet className="h-4 w-4" />
                                        Excel ile Yükle
                                    </Button>
                                </>
                            ) : (
                                <div className="text-sm text-muted-foreground">Bir ders seçiniz...</div>
                            )}
                        </div>

                        {/* Tree Content */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {!selectedLesson ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                                    <BookOpen className="h-12 w-12 mb-4 opacity-20" />
                                    <p>İşlem yapmak için soldan bir ders seçin.</p>
                                </div>
                            ) : (
                                <>
                                    <ScrollArea className="flex-1 p-6">
                                        <div className="max-w-3xl mx-auto space-y-4">
                                            {selectedLesson.units?.length === 0 ? (
                                                <div className="text-center py-12 border-2 border-dashed rounded-xl bg-slate-50/50">
                                                    <p className="text-muted-foreground text-sm">Bu derse ait ünite bulunmuyor.</p>
                                                    <Button variant="link" onClick={() => { setSelectedUnit(null); setNewItemName(""); setTimeout(() => document.getElementById("quick-add-input")?.focus(), 100); }}>
                                                        Hemen Ekle
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Accordion type="multiple" className="w-full space-y-4">
                                                    {selectedLesson.units?.sort((a, b) => (a.order || 0) - (b.order || 0)).map((unit) => (
                                                        <AccordionItem key={unit.id} value={unit.id} className="border rounded-xl bg-white px-4 shadow-sm">
                                                            <AccordionTrigger className="hover:no-underline py-4">
                                                                <div className="flex items-center gap-3 flex-1 text-left">
                                                                    <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                                                                        <FolderOpen className="h-4 w-4" />
                                                                    </div>
                                                                    <span className="font-medium text-slate-800">{unit.name}</span>
                                                                    <span className="text-xs text-muted-foreground font-normal ml-2">({unit.topics?.length || 0} Konu)</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 mr-4" onClick={(e) => e.stopPropagation()}>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                        onClick={(e) => { e.stopPropagation(); setEditingItem(unit); setUnitDialogOpen(true); }}>
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600"
                                                                        onClick={(e) => { e.stopPropagation(); handleDelete('unit', unit.id); }}>
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </AccordionTrigger>
                                                            <AccordionContent className="pt-0 pb-4 border-t-0">
                                                                <div className="pl-12 pr-4 space-y-1 mt-2">
                                                                    {unit.topics?.sort((a, b) => (a.order || 0) - (b.order || 0)).map((topic) => (
                                                                        <div key={topic.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 group transition-colors">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-violet-400 transition-colors" />
                                                                                <span className="text-sm text-slate-600 group-hover:text-slate-900">{topic.name}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                                                                    onClick={() => { setEditingItem(topic); setTopicDialogOpen(true); }}>
                                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500"
                                                                                    onClick={() => handleDelete('topic', topic.id)}>
                                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="w-full justify-start text-xs text-muted-foreground hover:text-violet-600 pl-2 mt-2"
                                                                        onClick={() => { setSelectedUnit(unit); setTopicDialogOpen(true); setEditingItem(null); }}
                                                                    >
                                                                        <Plus className="h-3 w-3 mr-2" />
                                                                        Bu üniteye konu ekle
                                                                    </Button>
                                                                </div>
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    ))}
                                                </Accordion>
                                            )}
                                        </div>
                                    </ScrollArea>

                                    {/* Footer Quick Add Unit */}
                                    <div className="p-4 border-t bg-white sticky bottom-0">
                                        <div className="max-w-3xl mx-auto flex gap-2 items-center">
                                            <span className="text-sm font-medium text-slate-500 mr-2 whitespace-nowrap">Hızlı Ünite Ekle:</span>
                                            <div className="flex-1 relative">
                                                <Input
                                                    id="quick-add-input"
                                                    placeholder={`${selectedLesson.name} dersine yeni ünite...`}
                                                    value={!selectedUnit ? newItemName : ''}
                                                    onChange={(e) => { setSelectedUnit(null); setNewItemName(e.target.value); }}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                                                    className="pl-4"
                                                />
                                            </div>
                                            <Button disabled={isAdding || (!!selectedUnit || !newItemName.trim())} onClick={handleQuickAdd}>
                                                {isAdding ? 'Ekleniyor...' : 'Ekle'}
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>

            {/* Sub-Dialogs for full editing (Renaming, etc.) */}
            <LessonDialog
                open={lessonDialogOpen}
                onOpenChange={setLessonDialogOpen}
                lesson={editingItem}
                onSuccess={() => { fetchTree(); setEditingItem(null); }}
            />
            <UnitDialog
                open={unitDialogOpen}
                onOpenChange={setUnitDialogOpen}
                lessonId={selectedLesson?.id || ''}
                unit={editingItem}
                onSuccess={() => { fetchTree(); setEditingItem(null); }}
            />
            <TopicDialog
                open={topicDialogOpen}
                onOpenChange={setTopicDialogOpen}
                unitId={selectedUnit?.id || ''}
                topic={editingItem}
                onSuccess={() => { fetchTree(); setEditingItem(null); }}
            />
            {selectedLesson && (
                <BulkImportModal
                    open={bulkImportOpen}
                    onOpenChange={setBulkImportOpen}
                    lessonId={selectedLesson.id}
                    lessonName={selectedLesson.name}
                    accessToken={accessToken || undefined}
                    onSuccess={() => { fetchTree(); }}
                />
            )}
        </Dialog>
    );
}
