'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    ArrowLeft, Save, Image as ImageIcon, X, Check, Loader2,
    Upload, Trash2, Plus, Link2, CheckCircle2, ChevronDown, FolderKanban, Tag
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { API_URL } from '@/lib/api-config';
import { normalizeImageUrl } from '@/lib/image-utils';
import { RichTextEditor, CompactRichTextEditor } from '@/components/ui/rich-text-editor';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ManualQuestionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    onBack?: () => void;
    questionToEdit?: any;
    preSelectedBankId?: string;
}

interface ExamArea { id: string; name: string; }
interface TopicItem { id: string; name: string; }
interface LearningOutcome { id: string; code: string; name: string; }

const OPTIONS = ['A', 'B', 'C', 'D', 'E'] as const;

const DIFFICULTY_OPTIONS = [
    { value: 'VERY_EASY', label: 'Çok Kolay', dot: 'bg-green-400' },
    { value: 'EASY', label: 'Kolay', dot: 'bg-emerald-400' },
    { value: 'MEDIUM', label: 'Orta', dot: 'bg-blue-400' },
    { value: 'HARD', label: 'Zor', dot: 'bg-orange-400' },
    { value: 'VERY_HARD', label: 'Çok Zor', dot: 'bg-red-400' },
];

export function ManualQuestionModal({ open, onOpenChange, onSuccess, onBack, questionToEdit, preSelectedBankId }: ManualQuestionModalProps) {
    const { toast } = useToast();
    const { accessToken } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const optionFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // Form State
    const [questionText, setQuestionText] = useState('');
    const [questionImage, setQuestionImage] = useState<string | null>(null);
    const [options, setOptions] = useState<Record<string, { text: string; image: string | null }>>({
        A: { text: '', image: null }, B: { text: '', image: null }, C: { text: '', image: null },
        D: { text: '', image: null }, E: { text: '', image: null },
    });
    const [correctAnswer, setCorrectAnswer] = useState<string>('A');
    const [difficulty, setDifficulty] = useState('MEDIUM');
    const [videoSolution, setVideoSolution] = useState('');

    // Past Exam Logic
    const [isPastQuestion, setIsPastQuestion] = useState(false);
    const [pastExamName, setPastExamName] = useState('');
    const [pastExamYear, setPastExamYear] = useState<number | ''>('');

    // Selection State
    const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [selectedLearningOutcome, setSelectedLearningOutcome] = useState<string | null>(null);
    const [selectedExamAreas, setSelectedExamAreas] = useState<string[]>([]);

    // Data State
    const [lessons, setLessons] = useState<any[]>([]);
    const [flatTopics, setFlatTopics] = useState<TopicItem[]>([]);
    const [learningOutcomes, setLearningOutcomes] = useState<LearningOutcome[]>([]);
    const [examAreas, setExamAreas] = useState<ExamArea[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadingField, setUploadingField] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Popover states
    const [bankPopoverOpen, setBankPopoverOpen] = useState(false);
    const [topicPopoverOpen, setTopicPopoverOpen] = useState(false);

    // Progress
    const formProgress = (() => {
        let filled = 0;
        if (questionText.trim() || questionImage) filled++;
        if (Object.values(options).some(o => o.text || o.image)) filled++;
        if (selectedTopics.length > 0) filled++;
        if (correctAnswer) filled++;
        return { filled, total: 4 };
    })();

    // Fetch Data
    useEffect(() => {
        async function fetchData() {
            try {
                const [treeRes, examAreasRes, topicsRes] = await Promise.all([
                    fetch(`${API_URL}/content/tree`, { headers: { Authorization: `Bearer ${accessToken}` } }),
                    fetch(`${API_URL}/exam-areas`, { headers: { Authorization: `Bearer ${accessToken}` } }),
                    fetch(`${API_URL}/content/topics`, { headers: { Authorization: `Bearer ${accessToken}` } })
                ]);
                if (treeRes.ok) setLessons(await treeRes.json());
                if (examAreasRes.ok) setExamAreas(await examAreasRes.json());
                if (topicsRes.ok) setFlatTopics(await topicsRes.json());
            } catch (error) {
                console.error("Fetch error", error);
                toast({ title: 'Hata', description: 'Veriler yüklenirken hata oluştu.', variant: 'destructive' });
            }
        }
        if (accessToken && open) fetchData();
    }, [open]);

    // Fetch Learning Outcomes based on selectedLesson
    useEffect(() => {
        async function fetchOutcomes() {
            if (!selectedLesson) {
                setLearningOutcomes([]);
                return;
            }
            try {
                const res = await fetch(`${API_URL}/content/learning-outcomes?lessonId=${selectedLesson}`, { headers: { Authorization: `Bearer ${accessToken}` } });
                if (res.ok) setLearningOutcomes(await res.json());
            } catch (error) {
                console.error("Fetch outcomes error", error);
            }
        }
        if (accessToken && open) fetchOutcomes();
    }, [selectedLesson, accessToken, open]);

    const availableTopics = selectedLesson
        ? lessons.find(l => l.id === selectedLesson)?.units.flatMap((u: any) => u.topics) || []
        : flatTopics;

    // Load edit data
    useEffect(() => {
        if (questionToEdit && open) {
            setQuestionText(questionToEdit.content.text || '');
            setQuestionImage(questionToEdit.content.image || null);
            setOptions({
                A: { text: '', image: null }, B: { text: '', image: null }, C: { text: '', image: null },
                D: { text: '', image: null }, E: { text: '', image: null },
                ...(questionToEdit.options || {})
            });
            setCorrectAnswer(questionToEdit.correctAnswer);
            setDifficulty(questionToEdit.difficulty);
            setVideoSolution(questionToEdit.videoSolution || '');
            setIsPastQuestion(questionToEdit.isPastQuestion || false);
            setPastExamName(questionToEdit.pastExamName || '');
            setPastExamYear(questionToEdit.pastExamYear || '');
            
            const topicIds = questionToEdit.topics?.map((t: any) => t.id) || [];
            setSelectedTopics(topicIds);
            setSelectedLearningOutcome(questionToEdit.learningOutcomeId || null);
            if (questionToEdit.examAreas) setSelectedExamAreas(questionToEdit.examAreas.map((ea: any) => ea.id));
            if (topicIds.length > 0 && lessons.length > 0) {
                const foundLesson = lessons.find(l => l.units.some((u: any) => u.topics.some((t: any) => topicIds.includes(t.id))));
                if (foundLesson) setSelectedLesson(foundLesson.id);
            }
        } else if (!questionToEdit && open) {
            resetForm();
            if (preSelectedBankId) setSelectedExamAreas([preSelectedBankId]);
        }
    }, [questionToEdit, open, preSelectedBankId, lessons]);

    // Image upload
    const handleImageUpload = async (file: File, target: 'question' | typeof OPTIONS[number]) => {
        setUploadingField(target);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`${API_URL}/upload/image`, {
                method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: formData
            });
            if (!res.ok) throw new Error('Yüklenemedi');
            const data = await res.json();
            if (target === 'question') setQuestionImage(data.url);
            else setOptions(prev => ({ ...prev, [target]: { ...(prev[target] || {}), image: data.url } }));
            toast({ title: 'Görsel yüklendi ✓', duration: 1500 });
        } catch (error) {
            toast({ title: 'Hata', description: 'Görsel yüklenemedi.', variant: 'destructive' });
        } finally {
            setUploadingField(null);
        }
    };

    // Drag & Drop
    const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
    const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) handleImageUpload(file, 'question');
    }, []);

    // Toggle multi-select helpers
    const toggleExamArea = (id: string) => {
        setSelectedExamAreas(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };
    const toggleTopic = (id: string) => {
        setSelectedTopics(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // Submit
    const handleSubmit = async (andNew = false) => {
        if (!questionText.trim() && !questionImage) {
            toast({ title: 'Eksik', description: 'Soru içeriği gerekli.', variant: 'destructive' }); return;
        }
        if (selectedTopics.length === 0) {
            toast({ title: 'Eksik', description: 'En az bir konu seçiniz.', variant: 'destructive' }); return;
        }
        // Soru bankası artık opsiyonel — havuza da doğrudan eklenebilir

        setIsLoading(true);
        try {
            const url = questionToEdit ? `${API_URL}/questions/${questionToEdit.id}` : `${API_URL}/questions`;
            const method = questionToEdit ? 'PATCH' : 'POST';
            const payload: any = {
                content: { text: questionText, image: questionImage, type: 'text_image' },
                options: Object.fromEntries(OPTIONS.map(opt => [opt, { text: options[opt].text, image: options[opt].image }])),
                correctAnswer, difficulty, topicIds: selectedTopics,
                videoSolution: videoSolution || null, learningOutcomeId: selectedLearningOutcome,
                type: 'MULTIPLE_CHOICE',
                examAreaIds: selectedExamAreas.length > 0 ? selectedExamAreas : undefined,
                isPastQuestion,
                pastExamName: isPastQuestion && pastExamName ? pastExamName : null,
                pastExamYear: isPastQuestion && pastExamYear ? Number(pastExamYear) : null,
            };
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(questionToEdit ? 'Güncellenemedi' : 'Oluşturulamadı');

            toast({ title: 'Başarılı ✓', description: questionToEdit ? 'Soru güncellendi.' : 'Soru havuza eklendi.' });
            onSuccess?.();
            if (andNew) {
                const keepExamAreas = [...selectedExamAreas];
                const keepLesson = selectedLesson;
                resetForm();
                setSelectedExamAreas(keepExamAreas);
                setSelectedLesson(keepLesson);
            } else {
                if (!questionToEdit) resetForm();
                onOpenChange(false);
            }
        } catch (error) {
            toast({ title: 'Hata', description: 'Bir sorun oluştu.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setQuestionText(''); setQuestionImage(null);
        setOptions({ A: { text: '', image: null }, B: { text: '', image: null }, C: { text: '', image: null }, D: { text: '', image: null }, E: { text: '', image: null } });
        setCorrectAnswer('A'); setDifficulty('MEDIUM'); setVideoSolution('');
        setIsPastQuestion(false); setPastExamName(''); setPastExamYear('');
        setSelectedTopics([]); setSelectedLearningOutcome(null); setSelectedLesson(null);
    };

    const handleBack = () => { onOpenChange(false); onBack?.(); };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[92vh] p-0 gap-0 overflow-hidden flex flex-col bg-slate-50">
                {/* ═══════════ HEADER ═══════════ */}
                <div className="flex items-center justify-between px-5 py-2.5 border-b bg-white z-20 shadow-sm shrink-0">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full hover:bg-slate-100 h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h2 className="text-base font-bold text-slate-800">{questionToEdit ? 'Soruyu Düzenle' : 'Yeni Soru'}</h2>
                        <div className="hidden md:flex items-center gap-1 ml-3">
                            {[...Array(formProgress.total)].map((_, i) => (
                                <div key={i} className={cn("w-2 h-2 rounded-full transition-all", i < formProgress.filled ? "bg-green-500 scale-110" : "bg-slate-200")} />
                            ))}
                            <span className="text-[10px] text-muted-foreground ml-1">{formProgress.filled}/{formProgress.total}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs h-8">İptal</Button>
                        {!questionToEdit && (
                            <Button variant="outline" size="sm" onClick={() => handleSubmit(true)} disabled={isLoading}
                                className="gap-1 text-xs h-8 border-green-200 text-green-700 hover:bg-green-50">
                                <Plus className="h-3 w-3" /> Kaydet & Yeni
                            </Button>
                        )}
                        <Button size="sm" onClick={() => handleSubmit(false)} disabled={isLoading} className="gap-1.5 h-8 min-w-[100px]">
                            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            Kaydet
                        </Button>
                    </div>
                </div>

                {/* ═══════════ CONFIG BAR ═══════════ */}
                <div className="px-5 py-2.5 bg-white border-b shrink-0 z-10">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Difficulty */}
                        <Select value={difficulty} onValueChange={setDifficulty}>
                            <SelectTrigger className="h-8 w-[120px] bg-slate-50 border-slate-200 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DIFFICULTY_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-2 h-2 rounded-full", opt.dot)} />
                                            {opt.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="w-px h-6 bg-slate-200" />

                        {/* Lesson (normal Select — single value) */}
                        <Select value={selectedLesson || 'none'} onValueChange={(val) => { setSelectedLesson(val === 'none' ? null : val); setSelectedTopics([]); }}>
                            <SelectTrigger className="h-8 w-[140px] bg-slate-50 border-slate-200 text-xs">
                                <SelectValue placeholder="Ders Seçin" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Ders Seçin</SelectItem>
                                {lessons.map(l => (<SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>))}
                            </SelectContent>
                        </Select>

                        {/* Topics (Multi-select via Popover) */}
                        <Popover open={topicPopoverOpen} onOpenChange={setTopicPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm"
                                    className={cn("h-8 text-xs gap-1.5 font-normal", selectedTopics.length === 0 && "border-red-200 text-red-400")}>
                                    <Tag className="h-3 w-3" />
                                    {selectedTopics.length > 0 ? `${selectedTopics.length} Konu` : "Konu Seç *"}
                                    <ChevronDown className="h-3 w-3 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-0" align="start">
                                <div className="p-2 border-b">
                                    <p className="text-xs font-semibold text-muted-foreground">Konu Seçin</p>
                                </div>
                                <ScrollArea className="max-h-[250px]">
                                    {!selectedLesson && <div className="p-4 text-xs text-muted-foreground text-center">Önce ders seçiniz</div>}
                                    {selectedLesson && availableTopics.length === 0 && <div className="p-4 text-xs text-muted-foreground text-center">Konu bulunamadı</div>}
                                    <div className="p-1">
                                        {availableTopics.map((t: any) => (
                                            <button key={t.id} onClick={() => toggleTopic(t.id)}
                                                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-slate-100 text-sm text-left">
                                                <Checkbox checked={selectedTopics.includes(t.id)} className="pointer-events-none" />
                                                <span className="truncate">{t.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </PopoverContent>
                        </Popover>

                        <div className="w-px h-6 bg-slate-200" />

                        {/* Exam Area (Multi-select via Popover — OPTIONAL) */}
                        <Popover open={bankPopoverOpen} onOpenChange={setBankPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className={cn(
                                    "h-8 text-xs gap-1.5 font-normal",
                                    selectedExamAreas.length > 0
                                        ? "border-blue-200 bg-blue-50 text-blue-700"
                                        : "border-dashed border-slate-300 text-slate-500"
                                )}>
                                    <FolderKanban className="h-3 w-3" />
                                    {selectedExamAreas.length > 0 ? `${selectedExamAreas.length} Banka Seçili` : "Havuza Ekle"}
                                    <ChevronDown className="h-3 w-3 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-0" align="start">
                                <div className="p-3 border-b bg-slate-50">
                                    <p className="text-xs font-semibold">Soru Bankasına Ekle</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Seçmezseniz soru sadece havuzda kalır</p>
                                </div>
                                {selectedExamAreas.length === 0 && (
                                    <div className="px-3 py-2 bg-blue-50 border-b border-blue-100">
                                        <p className="text-[10px] text-blue-600 flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Soru bankası seçmeden de havuza ekleyebilirsiniz
                                        </p>
                                    </div>
                                )}
                                <ScrollArea className="max-h-[250px]">
                                    {examAreas.length === 0 && <div className="p-4 text-xs text-muted-foreground text-center">Henüz banka yok</div>}
                                    <div className="p-1">
                                        {examAreas.map(ea => (
                                            <button key={ea.id} onClick={() => toggleExamArea(ea.id)}
                                                className={cn(
                                                    "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-left transition-colors",
                                                    selectedExamAreas.includes(ea.id) ? "bg-blue-50 text-blue-700" : "hover:bg-slate-100"
                                                )}>
                                                <Checkbox checked={selectedExamAreas.includes(ea.id)} className="pointer-events-none" />
                                                <span className="truncate">{ea.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </ScrollArea>
                                {selectedExamAreas.length > 0 && (
                                    <div className="p-2 border-t">
                                        <Button variant="ghost" size="sm" className="h-6 text-[10px] w-full text-red-500 hover:bg-red-50" onClick={() => setSelectedExamAreas([])}>
                                            Seçimi Temizle — Sadece Havuza Ekle
                                        </Button>
                                    </div>
                                )}
                            </PopoverContent>
                        </Popover>

                        <div className="w-px h-6 bg-slate-200" />

                        {/* Learning Outcome */}
                        <Select value={selectedLearningOutcome || 'none'} onValueChange={(val) => setSelectedLearningOutcome(val === 'none' ? null : val)}>
                            <SelectTrigger className="h-8 w-[170px] bg-slate-50 border-slate-200 text-xs">
                                <SelectValue placeholder="Kazanım" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Kazanım (Opsiyonel)</SelectItem>
                                {learningOutcomes.map(lo => (
                                    <SelectItem key={lo.id} value={lo.id}>
                                        {lo.code && <span className="font-mono font-bold mr-1 text-blue-600 text-[10px]">{lo.code}</span>}
                                        {lo.name?.length > 30 ? lo.name.slice(0, 30) + '...' : lo.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* ═══════════ SPLIT PANEL CONTENT ═══════════ */}
                <div className="flex-1 flex overflow-hidden">
                    {/* ── LEFT PANEL: Question Content ── */}
                    <div className="w-1/2 border-r flex flex-col overflow-hidden">
                        <div className="px-4 py-2 bg-white border-b shrink-0">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider">
                                    <div className="w-1 h-3.5 bg-blue-600 rounded-full" />
                                    Soru İçeriği
                                </h3>
                                {questionImage && (
                                    <Button variant="ghost" size="sm" onClick={() => setQuestionImage(null)} className="h-6 text-[10px] text-red-600 hover:bg-red-50 px-2">
                                        <Trash2 className="h-3 w-3 mr-1" /> Sil
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <RichTextEditor
                                className="min-h-[180px] text-base bg-white border rounded-xl"
                                value={questionText}
                                onChange={setQuestionText}
                                placeholder="Sorunuzu buraya yazın..."
                            />

                            {questionImage ? (
                                <div className="relative group rounded-xl border border-slate-200 bg-white p-2">
                                    <img src={normalizeImageUrl(questionImage)} alt="Soru" className="w-full max-h-[280px] object-contain rounded-lg" />
                                </div>
                            ) : (
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={cn(
                                        "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer",
                                        isDragging ? "border-blue-400 bg-blue-50 scale-[1.01]" : "border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300"
                                    )}
                                >
                                    {uploadingField === 'question' ? (
                                        <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                                    ) : (
                                        <>
                                            <div className={cn("p-2.5 rounded-full", isDragging ? "bg-blue-100" : "bg-slate-100")}>
                                                <Upload className={cn("h-5 w-5", isDragging ? "text-blue-500" : "text-slate-400")} />
                                            </div>
                                            <p className="text-xs font-medium text-slate-500">{isDragging ? 'Bırakın!' : 'Görsel eklemek için tıklayın veya sürükleyin'}</p>
                                        </>
                                    )}
                                </div>
                            )}
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'question')} />

                            {/* Video Solution */}
                            <div className="bg-white border rounded-xl p-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-rose-50 rounded-lg border border-rose-100 shrink-0">
                                        <Link2 className="h-4 w-4 text-rose-500" />
                                    </div>
                                    <Input value={videoSolution} onChange={(e) => setVideoSolution(e.target.value)}
                                        placeholder="Video çözüm linki (opsiyonel)"
                                        className="bg-transparent border-none shadow-none focus-visible:ring-0 text-sm h-8 px-0" />
                                    {videoSolution && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-slate-400 hover:text-red-500" onClick={() => setVideoSolution('')}>
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </div>
                                {videoSolution && (
                                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                                        <CheckCircle2 className="h-3 w-3" /> Video çözüm eklenecek
                                    </div>
                                )}
                            </div>

                            {/* Çıkmış Soru Config */}
                            <div className={cn("bg-white border rounded-xl p-3 transition-all duration-300", isPastQuestion ? "border-amber-200 bg-amber-50/10 shadow-sm" : "")}>
                                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsPastQuestion(!isPastQuestion)}>
                                    <Checkbox checked={isPastQuestion} onCheckedChange={(val) => setIsPastQuestion(val === true)} />
                                    <Label className="cursor-pointer text-sm font-medium">Bu bir çıkmış sorudur</Label>
                                </div>
                                {isPastQuestion && (
                                    <div className="mt-4 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">Sınav Adı</Label>
                                            <Input
                                                placeholder="Örn: Kaymakamlık"
                                                value={pastExamName}
                                                onChange={(e) => setPastExamName(e.target.value)}
                                                className="h-8 text-xs bg-white"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">Yıl</Label>
                                            <Input
                                                type="number"
                                                placeholder="Örn: 2024"
                                                value={pastExamYear}
                                                onChange={(e) => setPastExamYear(e.target.value ? Number(e.target.value) : '')}
                                                className="h-8 text-xs bg-white"
                                                min={1990}
                                                max={2030}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT PANEL: Options ── */}
                    <div className="w-1/2 flex flex-col overflow-hidden">
                        <div className="px-4 py-2 bg-white border-b shrink-0">
                            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider">
                                <div className="w-1 h-3.5 bg-emerald-600 rounded-full" />
                                Şıklar
                                <span className="text-[10px] font-normal text-muted-foreground normal-case ml-1">
                                    — Doğru cevap: harfe tıklayın
                                </span>
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                            {OPTIONS.map(opt => {
                                const isCorrect = correctAnswer === opt;
                                return (
                                    <div key={opt} className={cn(
                                        "border rounded-xl p-3 transition-all duration-300 relative group",
                                        isCorrect
                                            ? "ring-2 ring-emerald-500 border-emerald-400 bg-gradient-to-r from-emerald-50/80 to-emerald-50/30 shadow-lg shadow-emerald-100"
                                            : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm"
                                    )}>
                                        {isCorrect && (
                                            <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white rounded-full p-0.5 shadow-md animate-in zoom-in duration-200">
                                                <Check className="h-2.5 w-2.5" />
                                            </div>
                                        )}

                                        <div className="flex items-start gap-2.5">
                                            <button
                                                onClick={() => setCorrectAnswer(opt)}
                                                className={cn(
                                                    "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all",
                                                    isCorrect
                                                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-110"
                                                        : "bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600 hover:scale-105"
                                                )}
                                                tabIndex={-1}
                                                title={`${opt} şıkkını doğru cevap olarak işaretle`}
                                            >
                                                {opt}
                                            </button>

                                            <div className="flex-1 min-w-0">
                                                <CompactRichTextEditor
                                                    value={options[opt]?.text || ''}
                                                    onChange={(val) => setOptions(prev => ({ ...prev, [opt]: { ...(prev[opt] || { text: '', image: null }), text: val } }))}
                                                    placeholder={`${opt} seçeneği...`}
                                                    className="min-h-[36px] bg-transparent border-none text-sm focus-within:ring-0 px-0 shadow-none"
                                                />
                                            </div>

                                            <div className="shrink-0">
                                                <input ref={(el) => { optionFileRefs.current[opt] = el; }} type="file" accept="image/*" className="hidden"
                                                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], opt)} />
                                                <button
                                                    onClick={() => optionFileRefs.current[opt]?.click()}
                                                    tabIndex={-1}
                                                    className={cn(
                                                        "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all border",
                                                        options[opt]?.image
                                                            ? "bg-teal-50 text-teal-600 border-teal-200"
                                                            : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                                                    )}
                                                >
                                                    {uploadingField === opt
                                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                                        : <ImageIcon className="h-3 w-3" />}
                                                    {options[opt]?.image ? 'Değiştir' : 'Görsel'}
                                                </button>
                                            </div>
                                        </div>

                                        {options[opt]?.image && (
                                            <div className="relative group/img mt-2 ml-11">
                                                <img src={normalizeImageUrl(options[opt]?.image)} className="max-h-20 rounded border bg-white p-1 shadow-sm object-contain" alt="" />
                                                <button
                                                    onClick={() => setOptions(prev => ({ ...prev, [opt]: { ...(prev[opt] || {}), image: null } }))}
                                                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:scale-110 transition-transform opacity-0 group-hover/img:opacity-100"
                                                    tabIndex={-1}>
                                                    <X className="h-2.5 w-2.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
