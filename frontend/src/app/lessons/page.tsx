'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, ChevronRight, Loader2, Save, BookOpen, Layers, Target, AlertTriangle, Edit2, Search, X, CheckSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiClient } from '@/lib/api-client';

export default function LessonsPage() {
    const { toast } = useToast();
    
    // Data
    const [lessons, setLessons] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [topics, setTopics] = useState<any[]>([]);
    const [learningOutcomes, setLearningOutcomes] = useState<any[]>([]);

    // Selection
    const [selectedLesson, setSelectedLesson] = useState<any>(null);
    const [selectedUnit, setSelectedUnit] = useState<any>(null);
    const [selectedTopic, setSelectedTopic] = useState<any>(null);

    // Loading
    const [loading, setLoading] = useState(true);
    const [isOutcomesLoading, setIsOutcomesLoading] = useState(false);

    // Search
    const [searchLesson, setSearchLesson] = useState('');
    const [searchUnit, setSearchUnit] = useState('');
    const [searchTopic, setSearchTopic] = useState('');
    const [searchOutcome, setSearchOutcome] = useState('');

    // Modals
    const [isCreateLessonOpen, setIsCreateLessonOpen] = useState(false);
    const [isCreateUnitOpen, setIsCreateUnitOpen] = useState(false);
    const [isCreateTopicOpen, setIsCreateTopicOpen] = useState(false);
    const [isCreateOutcomeOpen, setIsCreateOutcomeOpen] = useState(false);

    // Forms
    const [newLessonName, setNewLessonName] = useState('');
    const [newLessonCode, setNewLessonCode] = useState('');
    const [newUnitName, setNewUnitName] = useState('');
    const [newTopicName, setNewTopicName] = useState('');
    const [newOutcomeName, setNewOutcomeName] = useState('');

    // Edit States
    const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
    const [editLessonName, setEditLessonName] = useState('');
    const [editLessonCode, setEditLessonCode] = useState('');

    const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
    const [editUnitName, setEditUnitName] = useState('');

    const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
    const [editTopicName, setEditTopicName] = useState('');

    const [editingOutcomeId, setEditingOutcomeId] = useState<string | null>(null);
    const [editOutcomeName, setEditOutcomeName] = useState('');

    // Delete Modals
    const [lessonToDelete, setLessonToDelete] = useState<any>(null);
    const [unitToDelete, setUnitToDelete] = useState<any>(null);
    const [topicToDelete, setTopicToDelete] = useState<any>(null);
    const [outcomeToDelete, setOutcomeToDelete] = useState<any>(null);

    useEffect(() => {
        fetchLessons();
    }, []);

    useEffect(() => {
        if (selectedLesson) {
            fetchUnits(selectedLesson.id);
            setSearchUnit('');
            setSearchTopic('');
            setSearchOutcome('');
            setSelectedUnit(null);
            setSelectedTopic(null);
        } else {
            setUnits([]);
            setSelectedUnit(null);
            setSelectedTopic(null);
        }
    }, [selectedLesson]);

    useEffect(() => {
        if (selectedUnit) {
            fetchTopics(selectedUnit.id);
            setSearchTopic('');
            setSearchOutcome('');
            setSelectedTopic(null);
        } else {
            setTopics([]);
            setSelectedTopic(null);
        }
    }, [selectedUnit]);

    useEffect(() => {
        if (selectedTopic) {
            fetchLearningOutcomes(selectedTopic.id);
            setSearchOutcome('');
        } else {
            setLearningOutcomes([]);
        }
    }, [selectedTopic]);

    // FETCH FUNCTIONS
    const fetchLessons = async () => {
        setLoading(true);
        try {
            const data = await apiClient.get('/content/lessons');
            setLessons(Array.isArray(data) ? data : data.data || []);
        } catch (error) { 
            toast({ title: 'Hata', description: 'Dersler getirilemedi.', variant: 'destructive' });
        } finally { 
            setLoading(false); 
        }
    };

    const fetchUnits = async (lessonId: string) => {
        try {
            const data = await apiClient.get(`/content/units?lessonId=${lessonId}`);
            setUnits(Array.isArray(data) ? data : data.data || []);
        } catch (error) { console.error(error); }
    };

    const fetchTopics = async (unitId: string) => {
        try {
            const data = await apiClient.get(`/content/topics?unitId=${unitId}`);
            setTopics(Array.isArray(data) ? data : data.data || []);
        } catch (error) { console.error(error); }
    };

    const fetchLearningOutcomes = async (topicId: string) => {
        setIsOutcomesLoading(true);
        try {
            const data = await apiClient.get(`/content/learning-outcomes?topicId=${topicId}`);
            setLearningOutcomes(Array.isArray(data) ? data : data.data || []);
        } catch (error) { 
            toast({ title: 'Hata', description: 'Kazanımlar getirilemedi.', variant: 'destructive' });
        } finally {
            setIsOutcomesLoading(false);
        }
    };

    // CREATE FUNCTIONS
    const handleCreateLesson = async () => {
        if (!newLessonName || !newLessonCode) return;
        try {
            await apiClient.post(`/content/lessons`, { name: newLessonName, code: newLessonCode, order: lessons.length + 1 });
            toast({ title: 'Başarılı', description: 'Ders oluşturuldu.' });
            setNewLessonName('');
            setNewLessonCode('');
            setIsCreateLessonOpen(false);
            fetchLessons();
        } catch (e: any) { 
            toast({ title: 'Hata', description: e.message || 'Ders oluşturulamadı', variant: 'destructive' });
        }
    };

    const handleCreateUnit = async () => {
        if (!newUnitName || !selectedLesson) return;
        try {
            await apiClient.post(`/content/units`, { name: newUnitName, lessonId: selectedLesson.id, order: units.length + 1 });
            toast({ title: 'Başarılı', description: 'Ünite oluşturuldu.' });
            setNewUnitName('');
            setIsCreateUnitOpen(false);
            fetchUnits(selectedLesson.id);
        } catch (e: any) { 
            toast({ title: 'Hata', description: e.message || 'Ünite oluşturulamadı', variant: 'destructive' });
        }
    };

    const handleCreateTopic = async () => {
        if (!newTopicName || !selectedUnit) return;
        try {
            await apiClient.post(`/content/topics`, { name: newTopicName, unitId: selectedUnit.id, order: topics.length + 1 });
            toast({ title: 'Başarılı', description: 'Konu oluşturuldu.' });
            setNewTopicName('');
            setIsCreateTopicOpen(false);
            fetchTopics(selectedUnit.id);
        } catch (e: any) { 
            toast({ title: 'Hata', description: e.message || 'Konu oluşturulamadı', variant: 'destructive' });
        }
    };

    const handleCreateLearningOutcome = async () => {
        if (!newOutcomeName.trim() || !selectedTopic) return;
        try {
            await apiClient.post('/content/learning-outcomes', {
                name: newOutcomeName,
                topicId: selectedTopic.id,
                order: learningOutcomes.length + 1
            });
            toast({ title: 'Başarılı', description: 'Kazanım eklendi.' });
            setNewOutcomeName('');
            setIsCreateOutcomeOpen(false);
            fetchLearningOutcomes(selectedTopic.id);
        } catch (e: any) {
            toast({ title: 'Hata', description: e.message || 'Eklenemedi.', variant: 'destructive' });
        }
    };

    // UPDATE FUNCTIONS
    const handleUpdateLesson = async (id: string) => {
        try {
            await apiClient.patch(`/content/lessons/${id}`, { name: editLessonName, code: editLessonCode });
            toast({ title: 'Başarılı', description: 'Ders güncellendi.' });
            setEditingLessonId(null);
            fetchLessons();
            if (selectedLesson?.id === id) setSelectedLesson({ ...selectedLesson, name: editLessonName, code: editLessonCode });
        } catch (error: any) {
            toast({ title: 'Hata', description: error.message || 'Güncellenemedi.', variant: 'destructive' });
        }
    };

    const handleUpdateUnit = async (id: string) => {
        try {
            await apiClient.patch(`/content/units/${id}`, { name: editUnitName });
            toast({ title: 'Başarılı', description: 'Ünite güncellendi.' });
            setEditingUnitId(null);
            fetchUnits(selectedLesson.id);
            if (selectedUnit?.id === id) setSelectedUnit({ ...selectedUnit, name: editUnitName });
        } catch (error: any) {
            toast({ title: 'Hata', description: error.message || 'Güncellenemedi.', variant: 'destructive' });
        }
    };

    const handleUpdateTopic = async (id: string) => {
        try {
            await apiClient.patch(`/content/topics/${id}`, { name: editTopicName });
            toast({ title: 'Başarılı', description: 'Konu güncellendi.' });
            setEditingTopicId(null);
            fetchTopics(selectedUnit.id);
            if (selectedTopic?.id === id) setSelectedTopic({ ...selectedTopic, name: editTopicName });
        } catch (error: any) {
            toast({ title: 'Hata', description: error.message || 'Güncellenemedi.', variant: 'destructive' });
        }
    };

    const handleUpdateOutcome = async (id: string) => {
        try {
            await apiClient.patch(`/content/learning-outcomes/${id}`, { name: editOutcomeName });
            toast({ title: 'Başarılı', description: 'Kazanım güncellendi.' });
            setEditingOutcomeId(null);
            fetchLearningOutcomes(selectedTopic.id);
        } catch (error: any) {
            toast({ title: 'Hata', description: error.message || 'Güncellenemedi.', variant: 'destructive' });
        }
    };

    // DELETE FUNCTIONS
    const confirmDeleteLesson = async () => {
        if (!lessonToDelete) return;
        try {
            await apiClient.delete(`/content/lessons/${lessonToDelete.id}`);
            toast({ title: 'Silindi', description: 'Ders başarıyla silindi.' });
            if (selectedLesson?.id === lessonToDelete.id) {
                setSelectedLesson(null);
                setSelectedUnit(null);
                setSelectedTopic(null);
            }
            fetchLessons();
        } catch (error: any) { 
            toast({ title: 'Hata', description: error.message || 'Silinemedi.', variant: 'destructive' }); 
        } finally { setLessonToDelete(null); }
    };

    const confirmDeleteUnit = async () => {
        if (!unitToDelete) return;
        try {
            await apiClient.delete(`/content/units/${unitToDelete.id}`);
            toast({ title: 'Silindi', description: 'Ünite silindi.' });
            if (selectedUnit?.id === unitToDelete.id) {
                setSelectedUnit(null);
                setSelectedTopic(null);
            }
            fetchUnits(selectedLesson.id);
        } catch (error: any) { 
            toast({ title: 'Hata', description: error.message || 'Silinemedi.', variant: 'destructive' }); 
        } finally { setUnitToDelete(null); }
    };

    const confirmDeleteTopic = async () => {
        if (!topicToDelete) return;
        try {
            await apiClient.delete(`/content/topics/${topicToDelete.id}`);
            toast({ title: 'Silindi', description: 'Konu silindi.' });
            if (selectedTopic?.id === topicToDelete.id) setSelectedTopic(null);
            fetchTopics(selectedUnit.id);
        } catch (error: any) { 
            toast({ title: 'Hata', description: error.message || 'Silinemedi.', variant: 'destructive' }); 
        } finally { setTopicToDelete(null); }
    };

    const confirmDeleteOutcome = async () => {
        if (!outcomeToDelete) return;
        try {
            await apiClient.delete(`/content/learning-outcomes/${outcomeToDelete.id}`);
            toast({ title: 'Silindi', description: 'Kazanım silindi.' });
            fetchLearningOutcomes(selectedTopic.id);
        } catch (error: any) {
            toast({ title: 'Hata', description: error.message || 'Silinemedi.', variant: 'destructive' });
        } finally { setOutcomeToDelete(null); }
    };

    // Filtered Data
    const filteredLessons = lessons.filter(l => l.name.toLowerCase().includes(searchLesson.toLowerCase()) || l.code.toLowerCase().includes(searchLesson.toLowerCase()));
    const filteredUnits = units.filter(u => u.name.toLowerCase().includes(searchUnit.toLowerCase()));
    const filteredTopics = topics.filter(t => t.name.toLowerCase().includes(searchTopic.toLowerCase()));
    const filteredOutcomes = learningOutcomes.filter(o => o.name.toLowerCase().includes(searchOutcome.toLowerCase()));

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                            <BookOpen className="h-8 w-8" />
                            Dersler ve İçerik Ağacı
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-2 font-medium">
                            <span className={selectedLesson ? 'text-blue-600' : ''}>{selectedLesson ? selectedLesson.name : 'Ders Seçin'}</span>
                            {selectedLesson && <ChevronRight className="h-4 w-4 text-slate-300" />}
                            {selectedLesson && <span className={selectedUnit ? 'text-indigo-600' : ''}>{selectedUnit ? selectedUnit.name : 'Ünite Seçin'}</span>}
                            {selectedUnit && <ChevronRight className="h-4 w-4 text-slate-300" />}
                            {selectedUnit && <span className={selectedTopic ? 'text-purple-600' : ''}>{selectedTopic ? selectedTopic.name : 'Konu Seçin'}</span>}
                        </div>
                    </div>
                </div>

                {/* Container width adjustments to support 4 columns comfortably */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-[75vh]">
                    
                    {/* 1. DERSLER SÜTUNU */}
                    <Card className="flex flex-col h-full shadow-md border-t-4 border-t-blue-500 overflow-hidden">
                        <CardHeader className="py-3 px-4 border-b bg-slate-50 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700">
                                <BookOpen className="h-4 w-4 text-blue-500" /> 1. Dersler
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">{filteredLessons.length}</Badge>
                                <Button size="sm" variant="outline" className="h-6 px-2 text-blue-600 border-blue-200 hover:bg-blue-50 text-xs" onClick={() => setIsCreateLessonOpen(true)}>
                                    <Plus className="h-3 w-3 mr-1" /> Yeni
                                </Button>
                            </div>
                        </CardHeader>
                        <div className="p-2 border-b bg-white">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2 h-3 w-3 text-muted-foreground" />
                                <Input placeholder="Ders ara..." value={searchLesson} onChange={e => setSearchLesson(e.target.value)} className="pl-7 h-7 text-xs bg-slate-50" />
                            </div>
                        </div>
                        <CardContent className="flex-1 p-2 overflow-hidden flex flex-col">
                            <ScrollArea className="flex-1 pr-2">
                                <div className="space-y-1.5">
                                    {filteredLessons.map(lesson => (
                                        <div
                                            key={lesson.id}
                                            onClick={() => { if(editingLessonId !== lesson.id) { setSelectedLesson(lesson); } }}
                                            className={`group p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                                                selectedLesson?.id === lesson.id 
                                                ? 'border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500' 
                                                : 'hover:border-blue-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            {editingLessonId === lesson.id ? (
                                                <div className="flex-1 flex gap-1 items-center" onClick={e => e.stopPropagation()}>
                                                    <Input className="h-6 text-[10px] font-mono w-12 px-1" value={editLessonCode} onChange={e => setEditLessonCode(e.target.value)} placeholder="KOD" />
                                                    <Input className="h-6 text-xs flex-1 px-1.5" value={editLessonName} onChange={e => setEditLessonName(e.target.value)} />
                                                    <Button size="icon" className="h-6 w-6 bg-blue-600 hover:bg-blue-700 shrink-0" onClick={() => handleUpdateLesson(lesson.id)}><Save className="h-3 w-3" /></Button>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-slate-500" onClick={() => setEditingLessonId(null)}><X className="h-3 w-3" /></Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="overflow-hidden">
                                                        <div className="font-medium text-xs text-slate-800 truncate">{lesson.name}</div>
                                                        <div className="text-[9px] text-muted-foreground font-mono bg-white px-1 py-0.5 rounded border inline-block mt-0.5">{lesson.code}</div>
                                                    </div>
                                                    <div className="flex items-center gap-0.5">
                                                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-6 w-6 text-blue-500 hover:bg-blue-100" onClick={(e) => { e.stopPropagation(); setEditLessonName(lesson.name); setEditLessonCode(lesson.code); setEditingLessonId(lesson.id); }}>
                                                            <Edit2 className="h-3 w-3" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-6 w-6 text-red-500 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); setLessonToDelete(lesson); }}>
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                        <ChevronRight className={`h-3 w-3 ml-0.5 ${selectedLesson?.id === lesson.id ? 'text-blue-500' : 'text-slate-300'}`} />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                    {filteredLessons.length === 0 && <div className="text-center py-6 text-slate-400 text-xs">Sonuç bulunamadı.</div>}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* 2. ÜNİTELER SÜTUNU */}
                    <Card className={`flex flex-col h-full shadow-md border-t-4 overflow-hidden transition-all duration-300 ${selectedLesson ? 'border-t-indigo-500 opacity-100' : 'border-t-slate-200 opacity-50 bg-slate-50 pointer-events-none'}`}>
                        <CardHeader className="py-3 px-4 border-b bg-slate-50 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700">
                                <Layers className="h-4 w-4 text-indigo-500" /> 2. Üniteler
                            </CardTitle>
                            {selectedLesson && (
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">{filteredUnits.length}</Badge>
                                    <Button size="sm" variant="outline" className="h-6 px-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs" onClick={() => setIsCreateUnitOpen(true)}>
                                        <Plus className="h-3 w-3 mr-1" /> Yeni
                                    </Button>
                                </div>
                            )}
                        </CardHeader>
                        {selectedLesson && (
                            <div className="p-2 border-b bg-white">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2 h-3 w-3 text-muted-foreground" />
                                    <Input placeholder="Ünite ara..." value={searchUnit} onChange={e => setSearchUnit(e.target.value)} className="pl-7 h-7 text-xs bg-slate-50" />
                                </div>
                            </div>
                        )}
                        <CardContent className="flex-1 p-2 overflow-hidden flex flex-col">
                            {!selectedLesson ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 opacity-50">
                                    <BookOpen className="h-10 w-10 text-slate-300 mb-2" />
                                    <p className="text-slate-500 text-xs">Ders seçin.</p>
                                </div>
                            ) : (
                                <ScrollArea className="flex-1 pr-2">
                                    <div className="space-y-1.5">
                                        {filteredUnits.map(unit => (
                                            <div
                                                key={unit.id}
                                                onClick={() => { if(editingUnitId !== unit.id) setSelectedUnit(unit); }}
                                                className={`group p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                                                    selectedUnit?.id === unit.id 
                                                    ? 'border-indigo-500 bg-indigo-50 shadow-sm ring-1 ring-indigo-500' 
                                                    : 'hover:border-indigo-300 hover:bg-slate-50'
                                                }`}
                                            >
                                                {editingUnitId === unit.id ? (
                                                    <div className="flex-1 flex gap-1 items-center" onClick={e => e.stopPropagation()}>
                                                        <Input className="h-6 text-xs flex-1 px-1.5" value={editUnitName} onChange={e => setEditUnitName(e.target.value)} autoFocus />
                                                        <Button size="icon" className="h-6 w-6 bg-indigo-600 hover:bg-indigo-700 shrink-0" onClick={() => handleUpdateUnit(unit.id)}><Save className="h-3 w-3" /></Button>
                                                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-slate-500" onClick={() => setEditingUnitId(null)}><X className="h-3 w-3" /></Button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="font-medium text-xs text-slate-800 truncate pr-2">{unit.name}</div>
                                                        <div className="flex items-center gap-0.5 shrink-0">
                                                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-6 w-6 text-indigo-500 hover:bg-indigo-100" onClick={(e) => { e.stopPropagation(); setEditUnitName(unit.name); setEditingUnitId(unit.id); }}>
                                                                <Edit2 className="h-3 w-3" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-6 w-6 text-red-500 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); setUnitToDelete(unit); }}>
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                            <ChevronRight className={`h-3 w-3 ml-0.5 ${selectedUnit?.id === unit.id ? 'text-indigo-500' : 'text-slate-300'}`} />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                        {filteredUnits.length === 0 && <div className="text-center py-6 text-slate-400 text-xs">Sonuç bulunamadı.</div>}
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>

                    {/* 3. KONULAR SÜTUNU */}
                    <Card className={`flex flex-col h-full shadow-md border-t-4 overflow-hidden transition-all duration-300 ${selectedUnit ? 'border-t-purple-500 opacity-100' : 'border-t-slate-200 opacity-50 bg-slate-50 pointer-events-none'}`}>
                        <CardHeader className="py-3 px-4 border-b bg-slate-50 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700">
                                <Target className="h-4 w-4 text-purple-500" /> 3. Konular
                            </CardTitle>
                            {selectedUnit && (
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">{filteredTopics.length}</Badge>
                                    <Button size="sm" variant="outline" className="h-6 px-2 text-purple-600 border-purple-200 hover:bg-purple-50 text-xs" onClick={() => setIsCreateTopicOpen(true)}>
                                        <Plus className="h-3 w-3 mr-1" /> Yeni
                                    </Button>
                                </div>
                            )}
                        </CardHeader>
                        {selectedUnit && (
                            <div className="p-2 border-b bg-white">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2 h-3 w-3 text-muted-foreground" />
                                    <Input placeholder="Konu ara..." value={searchTopic} onChange={e => setSearchTopic(e.target.value)} className="pl-7 h-7 text-xs bg-slate-50" />
                                </div>
                            </div>
                        )}
                        <CardContent className="flex-1 p-2 overflow-hidden flex flex-col">
                            {!selectedUnit ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 opacity-50">
                                    <Layers className="h-10 w-10 text-slate-300 mb-2" />
                                    <p className="text-slate-500 text-xs">Ünite seçin.</p>
                                </div>
                            ) : (
                                <ScrollArea className="flex-1 pr-2">
                                    <div className="space-y-1.5">
                                        {filteredTopics.map(topic => (
                                            <div
                                                key={topic.id}
                                                onClick={() => { if(editingTopicId !== topic.id) setSelectedTopic(topic); }}
                                                className={`group p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                                                    selectedTopic?.id === topic.id 
                                                    ? 'border-purple-500 bg-purple-50 shadow-sm ring-1 ring-purple-500' 
                                                    : 'hover:border-purple-300 hover:bg-slate-50'
                                                } bg-white`}
                                            >
                                                {editingTopicId === topic.id ? (
                                                    <div className="flex-1 flex gap-1 items-center" onClick={e => e.stopPropagation()}>
                                                        <Input className="h-6 text-xs flex-1 px-1.5" value={editTopicName} onChange={e => setEditTopicName(e.target.value)} autoFocus />
                                                        <Button size="icon" className="h-6 w-6 bg-purple-600 hover:bg-purple-700 shrink-0" onClick={() => handleUpdateTopic(topic.id)}><Save className="h-3 w-3" /></Button>
                                                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-slate-500" onClick={() => setEditingTopicId(null)}><X className="h-3 w-3" /></Button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="text-xs font-medium text-slate-800 truncate pr-2">{topic.name}</div>
                                                        <div className="flex items-center gap-0.5 shrink-0">
                                                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-6 w-6 text-purple-500 hover:bg-purple-100" onClick={(e) => { e.stopPropagation(); setEditTopicName(topic.name); setEditingTopicId(topic.id); }}>
                                                                <Edit2 className="h-3 w-3" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-6 w-6 text-red-500 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); setTopicToDelete(topic); }}>
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                            <ChevronRight className={`h-3 w-3 ml-0.5 ${selectedTopic?.id === topic.id ? 'text-purple-500' : 'text-slate-300'}`} />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                        {filteredTopics.length === 0 && <div className="text-center py-6 text-slate-400 text-xs">Sonuç bulunamadı.</div>}
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>

                    {/* 4. KAZANIMLAR SÜTUNU */}
                    <Card className={`flex flex-col h-full shadow-md border-t-4 overflow-hidden transition-all duration-300 ${selectedTopic ? 'border-t-emerald-500 opacity-100' : 'border-t-slate-200 opacity-50 bg-slate-50 pointer-events-none'}`}>
                        <CardHeader className="py-3 px-4 border-b bg-slate-50 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700">
                                <CheckSquare className="h-4 w-4 text-emerald-500" /> 4. Kazanımlar
                            </CardTitle>
                            {selectedTopic && (
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">{filteredOutcomes.length}</Badge>
                                    <Button size="sm" variant="outline" className="h-6 px-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs" onClick={() => setIsCreateOutcomeOpen(true)}>
                                        <Plus className="h-3 w-3 mr-1" /> Yeni
                                    </Button>
                                </div>
                            )}
                        </CardHeader>
                        {selectedTopic && (
                            <div className="p-2 border-b bg-white">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2 h-3 w-3 text-muted-foreground" />
                                    <Input placeholder="Kazanım ara..." value={searchOutcome} onChange={e => setSearchOutcome(e.target.value)} className="pl-7 h-7 text-xs bg-slate-50" />
                                </div>
                            </div>
                        )}
                        <CardContent className="flex-1 p-2 overflow-hidden flex flex-col">
                            {!selectedTopic ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 opacity-50">
                                    <Target className="h-10 w-10 text-slate-300 mb-2" />
                                    <p className="text-slate-500 text-xs">Konu seçin.</p>
                                </div>
                            ) : isOutcomesLoading ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                                </div>
                            ) : (
                                <ScrollArea className="flex-1 pr-2">
                                    <div className="space-y-1.5">
                                        {filteredOutcomes.map((outcome, idx) => (
                                            <div
                                                key={outcome.id}
                                                className="group p-2 rounded-lg border flex items-center justify-between hover:border-emerald-300 hover:bg-slate-50 transition-all bg-white"
                                            >
                                                {editingOutcomeId === outcome.id ? (
                                                    <div className="flex-1 flex gap-1 items-center" onClick={e => e.stopPropagation()}>
                                                        <Input className="h-6 text-xs flex-1 px-1.5" value={editOutcomeName} onChange={e => setEditOutcomeName(e.target.value)} autoFocus />
                                                        <Button size="icon" className="h-6 w-6 bg-emerald-600 hover:bg-emerald-700 shrink-0" onClick={() => handleUpdateOutcome(outcome.id)}><Save className="h-3 w-3" /></Button>
                                                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-slate-500" onClick={() => setEditingOutcomeId(null)}><X className="h-3 w-3" /></Button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex items-start gap-1.5 overflow-hidden">
                                                            <div className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1 py-0.5 rounded leading-none mt-0.5 shrink-0">{idx + 1}</div>
                                                            <div className="text-xs text-slate-700 truncate" title={outcome.name}>{outcome.name}</div>
                                                        </div>
                                                        <div className="flex items-center gap-0.5 shrink-0">
                                                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-6 w-6 text-emerald-600 hover:bg-emerald-100" onClick={() => { setEditOutcomeName(outcome.name); setEditingOutcomeId(outcome.id); }}>
                                                                <Edit2 className="h-3 w-3" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-6 w-6 text-red-500 hover:bg-red-100" onClick={() => setOutcomeToDelete(outcome)}>
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                        {filteredOutcomes.length === 0 && <div className="text-center py-6 text-slate-400 text-xs">Bu konuya henüz kazanım eklenmemiş.</div>}
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>

            {/* CREATE MODALS */}
            <Dialog open={isCreateLessonOpen} onOpenChange={setIsCreateLessonOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-blue-700"><BookOpen className="h-5 w-5" /> Yeni Ders Oluştur</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Ders Kodu</Label>
                            <Input placeholder="Örn: MAT" value={newLessonCode} onChange={e => setNewLessonCode(e.target.value.toUpperCase())} className="uppercase font-mono" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Ders Adı</Label>
                            <Input placeholder="Örn: Matematik" value={newLessonName} onChange={e => setNewLessonName(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateLessonOpen(false)}>İptal</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCreateLesson} disabled={!newLessonName || !newLessonCode}>Oluştur</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCreateUnitOpen} onOpenChange={setIsCreateUnitOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-indigo-700"><Layers className="h-5 w-5" /> Yeni Ünite Oluştur</DialogTitle>
                        <DialogDescription>{selectedLesson?.name} dersi altına eklenecek.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Ünite Adı</Label>
                            <Input placeholder="Örn: Sayılar" value={newUnitName} onChange={e => setNewUnitName(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateUnitOpen(false)}>İptal</Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleCreateUnit} disabled={!newUnitName}>Oluştur</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCreateTopicOpen} onOpenChange={setIsCreateTopicOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-purple-700"><Target className="h-5 w-5" /> Yeni Konu Oluştur</DialogTitle>
                        <DialogDescription>{selectedUnit?.name} ünitesi altına eklenecek.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Konu Adı</Label>
                            <Input placeholder="Örn: Üslü Sayılar" value={newTopicName} onChange={e => setNewTopicName(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateTopicOpen(false)}>İptal</Button>
                        <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleCreateTopic} disabled={!newTopicName}>Oluştur</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCreateOutcomeOpen} onOpenChange={setIsCreateOutcomeOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-emerald-700"><CheckSquare className="h-5 w-5" /> Yeni Kazanım Oluştur</DialogTitle>
                        <DialogDescription>{selectedTopic?.name} konusu altına eklenecek.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Kazanım Metni</Label>
                            <Input placeholder="Örn: Logaritma fonksiyonunun tanım kümesini bulur." value={newOutcomeName} onChange={e => setNewOutcomeName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateLearningOutcome()} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOutcomeOpen(false)}>İptal</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreateLearningOutcome} disabled={!newOutcomeName.trim()}>Oluştur</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DELETE CONFIRMATION DIALOGS */}
            <Dialog open={!!lessonToDelete} onOpenChange={(open) => !open && setLessonToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Dersi Sil</DialogTitle>
                        <DialogDescription className="pt-3">
                            <strong className="text-foreground">{lessonToDelete?.name}</strong> isimli dersi silmek istediğinize emin misiniz? <br/><br/>
                            Bu işlem, dersin altındaki <strong>tüm ünitelere ve konulara</strong> ait bağımlılıkları etkileyebilir. Bu işlem geri alınamaz.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setLessonToDelete(null)}>İptal</Button>
                        <Button variant="destructive" onClick={confirmDeleteLesson}>Evet, Dersi Sil</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!unitToDelete} onOpenChange={(open) => !open && setUnitToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Üniteyi Sil</DialogTitle>
                        <DialogDescription className="pt-3">
                            <strong className="text-foreground">{unitToDelete?.name}</strong> ünitesini silmek istediğiniz emin misiniz? Altındaki tüm konular silinebilir.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setUnitToDelete(null)}>İptal</Button>
                        <Button variant="destructive" onClick={confirmDeleteUnit}>Evet, Sil</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!topicToDelete} onOpenChange={(open) => !open && setTopicToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Konuyu Sil</DialogTitle>
                        <DialogDescription className="pt-3">
                            <strong className="text-foreground">{topicToDelete?.name}</strong> konusunu silmek istediğinize emin misiniz? Bu konuya bağlı sorular varsa işlem reddedilebilir.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setTopicToDelete(null)}>İptal</Button>
                        <Button variant="destructive" onClick={confirmDeleteTopic}>Evet, Sil</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!outcomeToDelete} onOpenChange={(open) => !open && setOutcomeToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Kazanımı Sil</DialogTitle>
                        <DialogDescription className="pt-3">
                            Kazanımı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setOutcomeToDelete(null)}>İptal</Button>
                        <Button variant="destructive" onClick={confirmDeleteOutcome}>Evet, Sil</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </DashboardLayout>
    );
}
