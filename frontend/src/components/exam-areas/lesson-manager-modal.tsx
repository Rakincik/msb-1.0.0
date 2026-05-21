import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, ChevronRight, Loader2, Save } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { API_URL } from '@/lib/api-config';
import { apiClient } from '@/lib/api-client';

interface LessonManagerModalProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
    examAreaId?: string;
    examAreaName?: string;
    onUpdate?: () => void;
}

export function LessonManagerModal({ open, onOpenChange, trigger, examAreaId, examAreaName, onUpdate }: LessonManagerModalProps) {
    const { toast } = useToast();
    const { accessToken } = useAuth();
    const [activeTab, setActiveTab] = useState('lessons');

    // Data
    const [lessons, setLessons] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [topics, setTopics] = useState<any[]>([]);

    // Selection
    const [selectedLesson, setSelectedLesson] = useState<any>(null);
    const [selectedUnit, setSelectedUnit] = useState<any>(null);

    // Loading
    const [loading, setLoading] = useState(false);

    // Forms
    const [newLessonName, setNewLessonName] = useState('');
    const [newLessonCode, setNewLessonCode] = useState('');
    const [newUnitName, setNewUnitName] = useState('');
    const [newTopicName, setNewTopicName] = useState('');



    useEffect(() => {
        if (open || trigger) {
            fetchLessons();
        }
    }, [open]);

    useEffect(() => {
        if (selectedLesson) fetchUnits(selectedLesson.id);
        else setUnits([]);
    }, [selectedLesson]);

    useEffect(() => {
        if (selectedUnit) fetchTopics(selectedUnit.id);
        else setTopics([]);
    }, [selectedUnit]);

    const fetchLessons = async () => {
        setLoading(true);
        try {
                        const data = await apiClient.get('/content/lessons');
            setLessons(Array.isArray(data) ? data : data.data || []);

        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const fetchUnits = async (lessonId: string) => {
        try {
        } catch (error) { console.error(error); }
    };

    const fetchTopics = async (unitId: string) => {
        try {
        } catch (error) { console.error(error); }
    };

    const handleCreateLesson = async () => {
        if (!newLessonName || !newLessonCode) return;
        try {
            const res = await fetch(`${API_URL}/content/lessons`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ name: newLessonName, code: newLessonCode, order: lessons.length + 1 }) });
            if (res.ok) {
                toast({ title: 'Ders oluşturuldu' });
                setNewLessonName('');
                setNewLessonCode('');
                fetchLessons();
                onUpdate?.();
            }
        } catch (e) { toast({ title: 'Hata', variant: 'destructive' });
        }
    };

    const handleCreateUnit = async () => {
        if (!newUnitName || !selectedLesson) return;
        try {
            const res = await fetch(`${API_URL}/content/units`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ name: newUnitName, lessonId: selectedLesson.id, order: units.length + 1 }) });
            if (res.ok) {
                toast({ title: 'Ünite oluşturuldu' });
                setNewUnitName('');
                fetchUnits(selectedLesson.id);
            }
        } catch (e) { toast({ title: 'Hata', variant: 'destructive' });
        }
    };

    const handleCreateTopic = async () => {
        if (!newTopicName || !selectedUnit) return;
        try {
            const res = await fetch(`${API_URL}/content/topics`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ name: newTopicName, unitId: selectedUnit.id, order: topics.length + 1 }) });
            if (res.ok) {
                toast({ title: 'Konu oluşturuldu' });
                setNewTopicName('');
                fetchTopics(selectedUnit.id);
            }
        } catch (e) { toast({ title: 'Hata', variant: 'destructive' });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>İçerik Yönetimi</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex gap-4 mt-4">
                    {/* Left Column: Navigation/Hierarchy */}
                    <div className="w-1/3 border-r pr-4 flex flex-col gap-2">
                        <Label>Hiyerarşi</Label>
                        <ScrollArea className="flex-1 h-[400px]">
                            <div className="space-y-1">
                                {lessons.map(lesson => (
                                    <div
                                        key={lesson.id}
                                        onClick={() => { setSelectedLesson(lesson); setSelectedUnit(null); }}
                                        className={`p-2 rounded cursor-pointer text-sm flex items-center justify-between ${selectedLesson?.id === lesson.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
                                    >
                                        <span>{lesson.name}</span>
                                        {selectedLesson?.id === lesson.id && <ChevronRight className="h-4 w-4" />}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Right Column: Content */}
                    <div className="flex-1 flex flex-col gap-4">
                        {!selectedLesson ? (
                            <div className="flex flex-col gap-4 h-full">
                                <h3 className="font-semibold">Yeni Ders Ekle</h3>
                                <div className="grid gap-2">
                                    <Label>Ders Adı</Label>
                                    <Input value={newLessonName} onChange={e => setNewLessonName(e.target.value)} placeholder="Matematik" />
                                    <Label>Ders Kodu</Label>
                                    <Input value={newLessonCode} onChange={e => setNewLessonCode(e.target.value)} placeholder="MAT" />
                                    <Button onClick={handleCreateLesson} disabled={!newLessonName || !newLessonCode}>
                                        <Plus className="h-4 w-4 mr-2" /> Ekle
                                    </Button>
                                </div>
                                <div className="mt-8 text-sm text-muted-foreground text-center">
                                    Derslerin içine ünite ve konu eklemek için sol taraftan bir ders seçin.
                                </div>
                            </div>
                        ) : !selectedUnit ? (
                            <div className="flex flex-col gap-4 h-full">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-primary">{selectedLesson.name} &gt; Üniteler</h3>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedLesson(null)}>Geri</Button>
                                </div>

                                <ScrollArea className="h-[200px] border rounded p-2">
                                    {units.length === 0 && <div className="text-muted-foreground text-sm p-2">Henüz ünite yok.</div>}
                                    {units.map(unit => (
                                        <div
                                            key={unit.id}
                                            onClick={() => setSelectedUnit(unit)}
                                            className="p-2 hover:bg-muted rounded cursor-pointer flex justify-between items-center"
                                        >
                                            <span className="text-sm">{unit.name}</span>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    ))}
                                </ScrollArea>

                                <div className="border-t pt-4 grid gap-2">
                                    <Label>Yeni Ünite Ekle</Label>
                                    <div className="flex gap-2">
                                        <Input value={newUnitName} onChange={e => setNewUnitName(e.target.value)} placeholder="Sayılar" />
                                        <Button onClick={handleCreateUnit} disabled={!newUnitName}>Ekle</Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4 h-full">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-primary">{selectedLesson.name} &gt; {selectedUnit.name} &gt; Konular</h3>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedUnit(null)}>Geri</Button>
                                </div>

                                <ScrollArea className="h-[200px] border rounded p-2">
                                    {topics.length === 0 && <div className="text-muted-foreground text-sm p-2">Henüz konu yok.</div>}
                                    {topics.map(topic => (
                                        <div key={topic.id} className="p-2 border-b last:border-0 text-sm">
                                            {topic.name}
                                        </div>
                                    ))}
                                </ScrollArea>

                                <div className="border-t pt-4 grid gap-2">
                                    <Label>Yeni Konu Ekle</Label>
                                    <div className="flex gap-2">
                                        <Input value={newTopicName} onChange={e => setNewTopicName(e.target.value)} placeholder="Doğal Sayılar" />
                                        <Button onClick={handleCreateTopic} disabled={!newTopicName}>Ekle</Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
