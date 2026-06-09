'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AddQuestionModal } from '@/components/questions/add-question-modal';
import { ManualQuestionModal } from '@/components/questions/manual-question-modal';
import dynamic from 'next/dynamic';
import { AssignToExamAreaModal } from '@/components/questions/assign-to-exam-area-modal';

const PDFCropperModal = dynamic(() => import('@/components/questions/pdf-cropper-modal').then((mod) => mod.PDFCropperModal), { ssr: false });
import { Button } from '@/components/ui/button';
import {
    Plus, Search, FilterX, BookOpen, Layers, Grid3X3, List, Table2,
    SlidersHorizontal, ChevronDown, Trash2, FolderPlus, Download,
    Calendar, TrendingUp, Image as ImageIcon, Video, CheckSquare,
    ArrowUpDown, X, ChevronLeft, ChevronRight, MoreHorizontal,
    Eye, Edit, Copy, Star, Tag, FolderKanban, ExternalLink,
    Play, Clock, BarChart3, Keyboard, Link2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/context/confirm-context';
import { Card, CardContent } from '@/components/ui/card';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    
} from '@/components/ui/dropdown-menu';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { normalizeImageUrl } from '@/lib/image-utils';
import { apiClient } from '@/lib/api-client';

interface Question {
    id: string;
    content: any;
    options: any;
    correctAnswer: string;
    difficulty: string;
    videoSolution?: string;
    isPastQuestion?: boolean;
    pastExamName?: string;
    pastExamYear?: number;
    usageCount?: number;
    learningOutcome?: {
        code: string;
        description: string;
    };
    topics: { id: string; name: string }[];
    examAreas?: { id: string; name: string }[];
    createdAt: string;
    createdBy?: { firstName: string; lastName: string };
}

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    VERY_EASY: { label: 'Çok Kolay', color: 'text-green-700', bg: 'bg-green-100' },
    EASY: { label: 'Kolay', color: 'text-emerald-700', bg: 'bg-emerald-100' },
    MEDIUM: { label: 'Orta', color: 'text-blue-700', bg: 'bg-blue-100' },
    HARD: { label: 'Zor', color: 'text-orange-700', bg: 'bg-orange-100' },
    VERY_HARD: { label: 'Çok Zor', color: 'text-red-700', bg: 'bg-red-100' },
};

type ViewMode = 'list' | 'grid' | 'table';
type SortOption = 'newest' | 'oldest' | 'difficulty_asc' | 'difficulty_desc' | 'most_used';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export default function QuestionsPage() {
    const { toast } = useToast();
    const confirm = useConfirm();

    // UI State
    const [isMethodSelectOpen, setIsMethodSelectOpen] = useState(false);
    const [isManualFormOpen, setIsManualFormOpen] = useState(false);
    const [isPDFCropperOpen, setIsPDFCropperOpen] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [isAssignExamAreaOpen, setIsAssignExamAreaOpen] = useState(false);
    const [detailQuestion, setDetailQuestion] = useState<Question | null>(null);

    // Data State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [lessons, setLessons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);
    const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
    const [hasImageFilter, setHasImageFilter] = useState<boolean | null>(null);
    const [hasVideoFilter, setHasVideoFilter] = useState<boolean | null>(null);
    const [isPastQuestionFilter, setIsPastQuestionFilter] = useState<boolean | null>(null);
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [selectedExamAreaFilter, setSelectedExamAreaFilter] = useState<string | null>(null);
    const [examAreas, setExamAreas] = useState<{ id: string; name: string; color?: string }[]>([]);
    const [selectedLessonFilter, setSelectedLessonFilter] = useState<string | null>(null);
    const [selectedUnitFilter, setSelectedUnitFilter] = useState<string | null>(null);
    const [selectedTopicFilter, setSelectedTopicFilter] = useState<string | null>(null);
    const [selectedOutcomeFilter, setSelectedOutcomeFilter] = useState<string | null>(null);

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selection, setSelection] = useState<{
        type: 'lesson' | 'unit' | 'topic' | null;
        id: string | null;
    }>({ type: null, id: null });

    // Pagination State — server-side
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(24);

    const searchRef = useRef<HTMLInputElement>(null);

    // Sort mapping
    const sortMapping: Record<SortOption, { sortBy: string; sortOrder: 'asc' | 'desc' }> = {
        newest: { sortBy: 'createdAt', sortOrder: 'desc' },
        oldest: { sortBy: 'createdAt', sortOrder: 'asc' },
        difficulty_asc: { sortBy: 'difficulty', sortOrder: 'asc' },
        difficulty_desc: { sortBy: 'difficulty', sortOrder: 'desc' },
        most_used: { sortBy: 'usageCount', sortOrder: 'desc' },
    };

    // Fetch tree structure
    const fetchTree = async () => {
        try {
            const data = await apiClient.get('/content/tree');
            setLessons(data);
        } catch (error) {
            console.error("Tree fetch error", error);
        }
    };
    
    // Fetch outcomes
    const [learningOutcomes, setLearningOutcomes] = useState<any[]>([]);
    const fetchOutcomes = async () => {
        try {
            const data = await apiClient.get('/content/learning-outcomes');
            setLearningOutcomes(data);
        } catch (error) {
            console.error("Outcomes fetch error", error);
        }
    };

    // Fetch exam areas for filter
    const fetchExamAreas = async () => {
        try {
            const data = await apiClient.get('/exam-areas');
            setExamAreas(data.map((ea: any) => ({ id: ea.id, name: ea.name, color: ea.color })));
        } catch (error) {
            console.error("ExamAreas fetch error", error);
        }
    };

    // Fetch questions — server-side pagination
    const fetchQuestions = useCallback(async () => {
        setIsLoading(true);
        try {
            const sort = sortMapping[sortBy];
            const params: Record<string, any> = {
                skip: (currentPage - 1) * itemsPerPage,
                take: itemsPerPage,
                sortBy: sort.sortBy,
                sortOrder: sort.sortOrder,
            };
            if (selection.type === 'lesson') params.lessonId = selection.id;
            if (selection.type === 'unit') params.unitId = selection.id;
            if (selection.type === 'topic') params.topicId = selection.id;
            if (selectedExamAreaFilter) params.examAreaId = selectedExamAreaFilter;
            if (debouncedSearch && debouncedSearch.length >= 2) params.search = debouncedSearch;
            if (difficultyFilter) params.difficulty = difficultyFilter;
            if (hasImageFilter !== null) params.hasImage = hasImageFilter;
            if (hasVideoFilter !== null) params.hasVideo = hasVideoFilter;
            if (isPastQuestionFilter !== null) params.isPastQuestion = isPastQuestionFilter;
            if (selectedLessonFilter) params.lessonId = selectedLessonFilter;
            if (selectedUnitFilter) params.unitId = selectedUnitFilter;
            if (selectedTopicFilter) params.topicId = selectedTopicFilter;
            if (selectedOutcomeFilter) params.learningOutcomeId = selectedOutcomeFilter;

            const result = await apiClient.get('/questions', params);
            setQuestions(result.data || []);
            setTotalCount(result.meta?.total || 0);
        } catch (error) {
            console.error("Questions fetch error", error);
            toast({ title: 'Hata', description: 'Sorular yüklenemedi.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, itemsPerPage, sortBy, selection, selectedExamAreaFilter, debouncedSearch, difficultyFilter, hasImageFilter, hasVideoFilter, isPastQuestionFilter, selectedLessonFilter, selectedUnitFilter, selectedTopicFilter, selectedOutcomeFilter]);

    useEffect(() => {
        fetchTree();
        fetchExamAreas();
        fetchOutcomes();
    }, []);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    // Stats (from total, approximate from current data)
    const stats = useMemo(() => ({
        total: totalCount,
        withImage: questions.filter(q => q.content?.image).length,
        withVideo: questions.filter(q => q.videoSolution).length,
    }), [questions, totalCount]);

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    // Extract units from lessons tree for filter dropdown
    const unitsForFilter = useMemo(() => {
        const unitsList: { id: string; name: string; lessonId: string; lessonName: string }[] = [];
        (lessons as any[])?.forEach((lesson: any) => {
            lesson.units?.forEach((unit: any) => {
                unitsList.push({
                    id: unit.id,
                    name: unit.name,
                    lessonId: lesson.id,
                    lessonName: lesson.name
                });
            });
        });
        return unitsList;
    }, [lessons]);

    const filteredUnitsForDropdown = useMemo(() => {
        if (!selectedLessonFilter) return unitsForFilter;
        return unitsForFilter.filter(u => u.lessonId === selectedLessonFilter);
    }, [unitsForFilter, selectedLessonFilter]);

    // Extract topics from lessons tree for filter dropdown
    const topicsForFilter = useMemo(() => {
        const topicsList: { id: string; name: string; lessonId: string; lessonName: string; unitId: string }[] = [];
        (lessons as any[])?.forEach((lesson: any) => {
            lesson.units?.forEach((unit: any) => {
                unit.topics?.forEach((topic: any) => {
                    topicsList.push({
                        id: topic.id,
                        name: topic.name,
                        lessonId: lesson.id,
                        lessonName: lesson.name,
                        unitId: unit.id
                    });
                });
            });
        });
        return topicsList;
    }, [lessons]);

    const filteredTopicsForDropdown = useMemo(() => {
        let filtered = topicsForFilter;
        if (selectedLessonFilter) filtered = filtered.filter(t => t.lessonId === selectedLessonFilter);
        if (selectedUnitFilter) filtered = filtered.filter(t => t.unitId === selectedUnitFilter);
        return filtered;
    }, [topicsForFilter, selectedLessonFilter, selectedUnitFilter]);

    // Outcomes
    const filteredOutcomesForDropdown = useMemo(() => {
        let filtered = learningOutcomes;
        // The outcomes might have topicId or subjectId. Usually topicId.
        if (selectedTopicFilter) {
            filtered = filtered.filter((o: any) => o.topicId === selectedTopicFilter);
        } else if (selectedUnitFilter) {
            // Need to get topic ids of this unit to filter outcomes
            const topicIds = topicsForFilter.filter(t => t.unitId === selectedUnitFilter).map(t => t.id);
            filtered = filtered.filter((o: any) => topicIds.includes(o.topicId));
        } else if (selectedLessonFilter) {
            const topicIds = topicsForFilter.filter(t => t.lessonId === selectedLessonFilter).map(t => t.id);
            filtered = filtered.filter((o: any) => topicIds.includes(o.topicId));
        }
        return filtered;
    }, [learningOutcomes, selectedTopicFilter, selectedUnitFilter, selectedLessonFilter, topicsForFilter]);

    // Selection handlers
    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const selectAll = () => {
        if (selectedIds.size === questions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(questions.map(q => q.id)));
        }
    };

    const clearFilters = () => {
        setSelection({ type: null, id: null });
        setSearchQuery('');
        setDifficultyFilter(null);
        setHasImageFilter(null);
        setHasVideoFilter(null);
        setIsPastQuestionFilter(null);
        setSelectedExamAreaFilter(null);
        setSelectedLessonFilter(null);
        setSelectedUnitFilter(null);
        setSelectedTopicFilter(null);
        setSelectedOutcomeFilter(null);
        setCurrentPage(1);
    };

    const hasActiveFilters = difficultyFilter || hasImageFilter !== null || hasVideoFilter !== null || isPastQuestionFilter !== null || selection.id || selectedExamAreaFilter || selectedLessonFilter || selectedUnitFilter || selectedTopicFilter || selectedOutcomeFilter;

    // Bulk delete — soft delete (geri alınabilir)
    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;

        // 10+ soru silinecekse güçlü onay iste
        if (selectedIds.size >= 10) {
            const typed = prompt(`⚠️ ${selectedIds.size} soru silinecek!\n\nBu işlemi onaylamak için "SİL" yazın:`);
            if (typed !== 'SİL') {
                toast({ title: 'İptal edildi', description: 'Silme işlemi iptal edildi.' });
                return;
            }
        } else {
            const confirmed = await confirm({
                title: 'Çoklu Soru Silme',
                description: `${selectedIds.size} soru silinecek. Emin misiniz?\n(Silinen sorular geri alınabilir)`,
                confirmText: 'Sil',
                isDangerous: true,
            });
            if (!confirmed) return;
        }

        try {
            for (const id of Array.from(selectedIds)) {
                await apiClient.delete(`/questions/${id}`);
            }
            toast({ title: 'Başarılı', description: `${selectedIds.size} soru silindi. (Geri alınabilir)` });
            setSelectedIds(new Set());
            fetchQuestions();
        } catch (error) {
            toast({ title: 'Hata', description: 'Silme işlemi başarısız.', variant: 'destructive' });
        }
    };

    // Single Delete — soft delete (geri alınabilir)
    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: 'Soru Silme',
            description: 'Soru silinecek. Emin misiniz?\n(Silinen sorular geri alınabilir)',
            confirmText: 'Sil',
            isDangerous: true,
        });
        if (!confirmed) return;
        try {
            await apiClient.delete(`/questions/${id}`);
            toast({ title: 'Başarılı', description: 'Soru silindi. (Geri alınabilir)' });
            fetchQuestions();
            if (detailQuestion?.id === id) setDetailQuestion(null);
        } catch (error) {
            toast({ title: 'Hata', description: 'Silinemedi.', variant: 'destructive' });
        }
    };

    // Edit Handler
    const handleEdit = (q: Question) => {
        setEditingQuestion(q);
        setIsManualFormOpen(true);
    };

    // Duplicate Handler
    const handleDuplicate = async (q: Question) => {
        try {
            const payload = {
                content: q.content,
                options: q.options,
                correctAnswer: q.correctAnswer,
                difficulty: q.difficulty,
                topicIds: q.topics.map(t => t.id),
                examAreaIds: q.examAreas?.map(e => e.id) || [],
                type: 'MULTIPLE_CHOICE',
                videoSolution: q.videoSolution,
            };
            await apiClient.post('/questions', payload);
            toast({ title: 'Kopyalandı ✓', description: 'Soru başarıyla kopyalandı.' });
            fetchQuestions();
        } catch (error) {
            toast({ title: 'Hata', description: 'Kopyalama başarısız.', variant: 'destructive' });
        }
    };

    // Export PDF
    const handleExportPDF = () => {
        const selectedQs = questions.filter(q => selectedIds.has(q.id));
        if (selectedQs.length === 0) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast({ title: 'Hata', description: 'Pop-up engelleyiciyi kontrol edin.', variant: 'destructive' });
            return;
        }

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Soru Çıktısı</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    .question { margin-bottom: 30px; page-break-inside: avoid; border-bottom: 1px solid #eee; padding-bottom: 20px; }
                    .question img { max-width: 100%; max-height: 300px; display: block; margin: 10px 0; }
                    .options { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
                    .option { display: flex; align-items: flex-start; gap: 5px; }
                    .answer-key { margin-top: 50px; page-break-before: always; }
                    .answer-key table { width: 100%; border-collapse: collapse; }
                    .answer-key th, .answer-key td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <h1>Sorular</h1>
                ${selectedQs.map((q, i) => `
                    <div class="question">
                        <strong>Soru ${i + 1})</strong>
                        <p>${q.content.text || ''}</p>
                        ${q.content.image ? `<img src="${normalizeImageUrl(q.content.image)}" />` : ''}
                        <div class="options">
                            ${Object.entries(q.options).map(([key, opt]: [string, any]) => `
                                <div class="option">
                                    <b>${key})</b>
                                    <span>${opt.text || ''}</span>
                                    ${opt.image ? `<img src="${opt.image}" style="max-height: 50px; margin: 0;" />` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
                <div class="answer-key">
                    <h1>Cevap Anahtarı</h1>
                    <table>
                        <thead><tr><th>Soru</th><th>Cevap</th></tr></thead>
                        <tbody>
                            ${selectedQs.map((q, i) => `
                                <tr><td>${i + 1}</td><td>${q.correctAnswer}</td></tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <script>
                    window.onload = () => { setTimeout(() => { window.print(); }, 500); };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };



    return (
        <DashboardLayout>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Soru Havuzu
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {totalCount} soru • Sayfa {currentPage}/{totalPages || 1}
                    </p>
                </div>
                <div className="flex items-center gap-2">

                    <Button className="shadow-lg hover:shadow-xl transition-all" onClick={() => setIsMethodSelectOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Yeni Soru Ekle
                    </Button>
                </div>

                {/* Modals */}
                <AddQuestionModal
                    open={isMethodSelectOpen}
                    onOpenChange={setIsMethodSelectOpen}
                    onSelectMethod={(method) => {
                        if (method === 'manual') setIsManualFormOpen(true);
                        else setIsPDFCropperOpen(true);
                    }}
                />
                <ManualQuestionModal
                    open={isManualFormOpen}
                    onOpenChange={(open) => {
                        setIsManualFormOpen(open);
                        if (!open) setTimeout(() => setEditingQuestion(null), 300);
                    }}
                    onSuccess={fetchQuestions}
                    onBack={() => {
                        if (editingQuestion) {
                            setIsManualFormOpen(false);
                            setEditingQuestion(null);
                        } else {
                            setIsMethodSelectOpen(true);
                        }
                    }}
                    questionToEdit={editingQuestion}
                />
                <AssignToExamAreaModal
                    open={isAssignExamAreaOpen}
                    onOpenChange={setIsAssignExamAreaOpen}
                    questionIds={Array.from(selectedIds)}
                    onSuccess={() => {
                        setSelectedIds(new Set());
                        fetchQuestions();
                    }}
                />
                <PDFCropperModal
                    open={isPDFCropperOpen}
                    onOpenChange={setIsPDFCropperOpen}
                    onSuccess={fetchQuestions}
                    onBack={() => setIsMethodSelectOpen(true)}
                />
            </div>

            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
                {/* Left Sidebar */}
                <div className="lg:col-span-3 space-y-4">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-3 gap-3">
                        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-blue-100/50">
                            <CardContent className="p-3 text-center">
                                <p className="text-2xl font-bold text-blue-700">{totalCount}</p>
                                <p className="text-[10px] text-blue-600/70 uppercase font-medium">Toplam</p>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-md bg-gradient-to-br from-teal-50 to-teal-100/50">
                            <CardContent className="p-3 text-center">
                                <p className="text-2xl font-bold text-teal-700">{stats.withImage}</p>
                                <p className="text-[10px] text-teal-600/70 uppercase font-medium">Görselli</p>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-md bg-gradient-to-br from-rose-50 to-rose-100/50">
                            <CardContent className="p-3 text-center">
                                <p className="text-2xl font-bold text-rose-700">{stats.withVideo}</p>
                                <p className="text-[10px] text-rose-600/70 uppercase font-medium">Videolu</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Soru Bankaları */}
                    <div className="pt-2">
                        <div className="flex items-center justify-between px-2 mb-3">
                            <h3 className="text-xs font-bold text-slate-500 flex items-center gap-2">
                                <FolderKanban className="h-4 w-4" />
                                KATEGORİLER
                            </h3>
                            <Badge variant="secondary" className="text-[10px] bg-slate-200 text-slate-600 border-none">{examAreas.length}</Badge>
                        </div>
                        <div className="space-y-0.5 max-h-[300px] overflow-y-auto pr-1">
                            {examAreas.length === 0 ? (
                                <p className="text-xs text-muted-foreground px-2 py-2">Henüz soru bankası yok</p>
                            ) : (
                                examAreas.map(area => {
                                    const isSelected = selectedExamAreaFilter === area.id;
                                    return (
                                        <button
                                            key={area.id}
                                            onClick={() => {
                                                setSelectedExamAreaFilter(isSelected ? null : area.id);
                                                setCurrentPage(1);
                                            }}
                                            className={cn(
                                                "group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all border w-full text-left text-sm",
                                                isSelected 
                                                    ? "bg-primary/5 border-primary/20 shadow-sm" 
                                                    : "border-transparent hover:bg-muted"
                                            )}
                                        >
                                            <div
                                                className="w-2 h-2 rounded-full shrink-0"
                                                style={{ backgroundColor: area.color || '#3b82f6' }}
                                            />
                                            <span className={cn("flex-1 truncate font-medium", isSelected ? "text-primary" : "text-slate-700")}>
                                                {area.name}
                                            </span>
                                            {isSelected && (
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X className="h-3.5 w-3.5 text-primary hover:text-red-500 transition-colors" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-9 space-y-4">
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl shadow-sm border">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                ref={searchRef}
                                placeholder="Soru ara... (min 2 karakter)"
                                className="pl-10 border-none shadow-none focus-visible:ring-0 bg-muted/50"
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)}>
                                <ToggleGroupItem value="grid" className="h-9 w-9 p-0" title="Grid (1)">
                                    <Grid3X3 className="h-4 w-4" />
                                </ToggleGroupItem>
                                <ToggleGroupItem value="list" className="h-9 w-9 p-0" title="Liste (2)">
                                    <List className="h-4 w-4" />
                                </ToggleGroupItem>
                                <ToggleGroupItem value="table" className="h-9 w-9 p-0" title="Tablo (3)">
                                    <Table2 className="h-4 w-4" />
                                </ToggleGroupItem>
                            </ToggleGroup>

                            <Select value={sortBy} onValueChange={(v) => { setSortBy(v as SortOption); setCurrentPage(1); }}>
                                <SelectTrigger className="w-[140px] h-9">
                                    <ArrowUpDown className="h-3.5 w-3.5 mr-2" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">En Yeni</SelectItem>
                                    <SelectItem value="oldest">En Eski</SelectItem>
                                    <SelectItem value="difficulty_asc">Kolay → Zor</SelectItem>
                                    <SelectItem value="difficulty_desc">Zor → Kolay</SelectItem>
                                    <SelectItem value="most_used">Çok Kullanılan</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Filter Popover */}
                            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant={hasActiveFilters ? "default" : "outline"} size="sm" className="h-9 gap-2">
                                        <SlidersHorizontal className="h-4 w-4" />
                                        Filtrele
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80" align="end">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-semibold text-sm">Filtreler</h4>
                                            {hasActiveFilters && (
                                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
                                                    Temizle
                                                </Button>
                                            )}
                                        </div>

                                        {/* Lesson Filter */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground uppercase">Ders</label>
                                            <Select
                                                value={selectedLessonFilter || 'all'}
                                                onValueChange={(v) => {
                                                    setSelectedLessonFilter(v === 'all' ? null : v);
                                                    setSelectedTopicFilter(null);
                                                    setCurrentPage(1);
                                                }}
                                            >
                                                <SelectTrigger className="h-9 text-xs">
                                                    <SelectValue placeholder="Tüm Dersler" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Tümü</SelectItem>
                                                    {(lessons as any[])?.map((lesson: any) => (
                                                        <SelectItem key={lesson.id} value={lesson.id}>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="text-[9px]">{lesson.code}</Badge>
                                                                {lesson.name}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {/* Unit Filter */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground uppercase">Ünite</label>
                                            <Select
                                                value={selectedUnitFilter || 'all'}
                                                onValueChange={(v) => {
                                                    setSelectedUnitFilter(v === 'all' ? null : v);
                                                    setSelectedTopicFilter(null);
                                                    setSelectedOutcomeFilter(null);
                                                    setCurrentPage(1);
                                                }}
                                                disabled={filteredUnitsForDropdown.length === 0}
                                            >
                                                <SelectTrigger className="h-9 text-xs">
                                                    <SelectValue placeholder={filteredUnitsForDropdown.length === 0 ? "Önce ders seçin" : "Tüm Üniteler"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Tümü</SelectItem>
                                                    {filteredUnitsForDropdown.map((unit) => (
                                                        <SelectItem key={unit.id} value={unit.id}>
                                                            {unit.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {/* Topic Filter */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground uppercase">Konu</label>
                                            <Select
                                                value={selectedTopicFilter || 'all'}
                                                onValueChange={(v) => {
                                                    setSelectedTopicFilter(v === 'all' ? null : v);
                                                    setCurrentPage(1);
                                                }}
                                                disabled={filteredTopicsForDropdown.length === 0}
                                            >
                                                <SelectTrigger className="h-9 text-xs">
                                                    <SelectValue placeholder={filteredTopicsForDropdown.length === 0 ? "Önce ders seçin" : "Tüm Konular"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Tümü</SelectItem>
                                                    {filteredTopicsForDropdown.map((topic) => (
                                                        <SelectItem key={topic.id} value={topic.id}>
                                                            {topic.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Outcome Filter */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground uppercase">Kazanım</label>
                                            <Select
                                                value={selectedOutcomeFilter || 'all'}
                                                onValueChange={(v) => {
                                                    setSelectedOutcomeFilter(v === 'all' ? null : v);
                                                    setCurrentPage(1);
                                                }}
                                                disabled={filteredOutcomesForDropdown.length === 0}
                                            >
                                                <SelectTrigger className="h-9 text-xs">
                                                    <SelectValue placeholder={filteredOutcomesForDropdown.length === 0 ? "Önce ders/konu seçin" : "Tüm Kazanımlar"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Tümü</SelectItem>
                                                    {filteredOutcomesForDropdown.map((outcome) => (
                                                        <SelectItem key={outcome.id} value={outcome.id}>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="text-[9px]">{outcome.code}</Badge>
                                                                <span className="truncate max-w-[200px]">{outcome.name || outcome.description}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Difficulty Filter */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground uppercase">Zorluk</label>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(DIFFICULTY_CONFIG).map(([key, { label, bg, color }]) => (
                                                    <button
                                                        key={key}
                                                        onClick={() => {
                                                            setDifficultyFilter(difficultyFilter === key ? null : key);
                                                            setCurrentPage(1);
                                                        }}
                                                        className={cn(
                                                            "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                                                            difficultyFilter === key
                                                                ? `${bg} ${color} ring-2 ring-offset-1 ring-current`
                                                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                        )}
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Content Type Filter */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground uppercase">İçerik Türü</label>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => { setHasImageFilter(hasImageFilter === true ? null : true); setCurrentPage(1); }}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                                        hasImageFilter === true
                                                            ? "bg-teal-100 text-teal-700 ring-2 ring-teal-500/30"
                                                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                    )}
                                                >
                                                    <ImageIcon className="h-3.5 w-3.5" />
                                                    Görselli
                                                </button>
                                                <button
                                                    onClick={() => { setHasVideoFilter(hasVideoFilter === true ? null : true); setCurrentPage(1); }}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                                        hasVideoFilter === true
                                                            ? "bg-rose-100 text-rose-700 ring-2 ring-rose-500/30"
                                                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                    )}
                                                >
                                                    <Video className="h-3.5 w-3.5" />
                                                    Videolu
                                                </button>
                                                <button
                                                    onClick={() => { setIsPastQuestionFilter(isPastQuestionFilter === true ? null : true); setCurrentPage(1); }}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                                        isPastQuestionFilter === true
                                                            ? "bg-amber-100 text-amber-700 ring-2 ring-amber-500/30"
                                                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                    )}
                                                >
                                                    <Star className="h-3.5 w-3.5" />
                                                    Çıkmış Soru
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {hasActiveFilters && (
                                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs gap-1">
                                    <FilterX className="h-3.5 w-3.5" />
                                    Temizle
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Bulk Actions Bar */}
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 p-3 rounded-xl animate-in fade-in slide-in-from-top-2">
                            <CheckSquare className="h-5 w-5 text-primary" />
                            <span className="text-sm font-medium">{selectedIds.size} soru seçildi</span>
                            <div className="flex-1" />
                            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setIsAssignExamAreaOpen(true)}>
                                <FolderPlus className="h-3.5 w-3.5" />
                                Bankaya Ekle
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleExportPDF}>
                                <Download className="h-3.5 w-3.5" />
                                Dışa Aktar
                            </Button>
                            <Button variant="destructive" size="sm" className="h-8 gap-1.5" onClick={handleBulkDelete}>
                                <Trash2 className="h-3.5 w-3.5" />
                                Sil
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8" onClick={() => setSelectedIds(new Set())}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                <Card key={i} className="animate-pulse">
                                    <div className="h-48 bg-muted rounded-lg" />
                                </Card>
                            ))}
                        </div>
                    ) : questions.length === 0 ? (
                        <div className="text-center py-16 border-2 border-dashed rounded-xl bg-muted/20">
                            <Layers className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                            <p className="text-muted-foreground font-medium">Bu kriterlere uygun soru bulunamadı.</p>
                            <p className="text-sm text-muted-foreground mb-4">Filtreleri değiştirin veya yeni soru ekleyin.</p>
                            <div className="flex gap-3 justify-center">
                                {hasActiveFilters && (
                                    <Button variant="outline" onClick={clearFilters}>
                                        <FilterX className="h-4 w-4 mr-2" />
                                        Filtreleri Temizle
                                    </Button>
                                )}
                                <Button onClick={() => setIsMethodSelectOpen(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    İlk Soruyu Ekle
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Grid View */}
                            {viewMode === 'grid' && (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {questions.map((q) => (
                                        <QuestionGridCard
                                            key={q.id}
                                            question={q}
                                            isSelected={selectedIds.has(q.id)}
                                            onToggleSelect={() => toggleSelect(q.id)}
                                            onPreview={() => setDetailQuestion(q)}
                                            onEdit={() => handleEdit(q)}
                                            onDelete={() => handleDelete(q.id)}
                                            onDuplicate={() => handleDuplicate(q)}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* List View */}
                            {viewMode === 'list' && (
                                <div className="space-y-3">
                                    {questions.map((q) => (
                                        <QuestionListCard
                                            key={q.id}
                                            question={q}
                                            isSelected={selectedIds.has(q.id)}
                                            onToggleSelect={() => toggleSelect(q.id)}
                                            onPreview={() => setDetailQuestion(q)}
                                            onEdit={() => handleEdit(q)}
                                            onDelete={() => handleDelete(q.id)}
                                            onDuplicate={() => handleDuplicate(q)}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Table View */}
                            {viewMode === 'table' && (
                                <Card className="border shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-muted/50 border-b">
                                                <tr>
                                                    <th className="p-3 w-10">
                                                        <Checkbox
                                                            checked={selectedIds.size === questions.length && questions.length > 0}
                                                            onCheckedChange={selectAll}
                                                        />
                                                    </th>
                                                    <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Soru</th>
                                                    <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase w-24">Zorluk</th>
                                                    <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase w-32">Konu</th>
                                                    <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase w-16">Cevap</th>
                                                    <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase w-20">Medya</th>
                                                    <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase w-28">Tarih</th>
                                                    <th className="p-3 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {questions.map((q) => (
                                                    <QuestionTableRow
                                                        key={q.id}
                                                        question={q}
                                                        isSelected={selectedIds.has(q.id)}
                                                        onToggleSelect={() => toggleSelect(q.id)}
                                                        onPreview={() => setDetailQuestion(q)}
                                                        onEdit={() => handleEdit(q)}
                                                        onDelete={() => handleDelete(q.id)}
                                                        onDuplicate={() => handleDuplicate(q)}
                                                    />
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            )}

                            {/* Pagination */}
                            <div className="flex items-center justify-between pt-4 border-t">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>Sayfa başına:</span>
                                    <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                                        <SelectTrigger className="w-16 h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="12">12</SelectItem>
                                            <SelectItem value="24">24</SelectItem>
                                            <SelectItem value="48">48</SelectItem>
                                            <SelectItem value="96">96</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <span className="text-xs">{totalCount} soru</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm font-medium px-3">
                                        {currentPage} / {totalPages || 1}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage >= totalPages}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Question Detail Dialog */}
            <Dialog open={!!detailQuestion} onOpenChange={(open) => !open && setDetailQuestion(null)}>
                <DialogContent className="max-w-[95vw] lg:max-w-4xl p-0 overflow-y-auto max-h-[90vh] bg-transparent border-none shadow-none">
                    {detailQuestion && (
                        <div className="bg-white rounded-xl shadow-xl overflow-hidden flex flex-col h-full border">
                            <QuestionDetailDrawer
                                question={detailQuestion}
                                onEdit={() => { setDetailQuestion(null); handleEdit(detailQuestion); }}
                                onDelete={() => { handleDelete(detailQuestion.id); setDetailQuestion(null); }}
                                onDuplicate={() => handleDuplicate(detailQuestion)}
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}

// ============================================================
// Question Detail Drawer Component
// ============================================================
function QuestionDetailDrawer({ question, onEdit, onDelete, onDuplicate }: {
    question: Question;
    onEdit: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
}) {
    const config = DIFFICULTY_CONFIG[question.difficulty] || DIFFICULTY_CONFIG.MEDIUM;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 border-b">
                <div className="flex items-center justify-between mb-4">
                    <Badge className={cn("text-xs", config.bg, config.color, "border-0")}>{config.label}</Badge>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-bold">
                            Doğru: {question.correctAnswer}
                        </Badge>
                        {question.usageCount !== undefined && question.usageCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                                <BarChart3 className="h-3 w-3 mr-1" />
                                {question.usageCount}x kullanıldı
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <Button size="sm" onClick={onEdit} className="gap-1.5">
                        <Edit className="h-3.5 w-3.5" />
                        Düzenle
                    </Button>
                    <Button size="sm" variant="outline" onClick={onDuplicate} className="gap-1.5">
                        <Copy className="h-3.5 w-3.5" />
                        Kopyala
                    </Button>
                    <div className="flex-1" />
                    <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50 gap-1.5" onClick={onDelete}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Sil
                    </Button>
                </div>
            </div>

            {/* Question Content */}
            <div className="p-6 space-y-6">
                {/* Question Text & Image */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Soru Kökü</h4>
                    {question.content?.image && (
                        <img src={normalizeImageUrl(question.content.image)} alt="" className="w-full rounded-xl border shadow-sm" />
                    )}
                    {question.content?.text && (
                        <div className="text-sm leading-relaxed bg-white p-4 rounded-xl border" dangerouslySetInnerHTML={{ __html: question.content.text }} />
                    )}
                </div>

                {/* Options */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Şıklar</h4>
                    <div className="space-y-2">
                        {Object.entries(question.options || {}).map(([key, opt]: [string, any]) => {
                            const isCorrect = question.correctAnswer === key;
                            return (
                                <div
                                    key={key}
                                    className={cn(
                                        "flex items-start gap-3 p-3 rounded-xl border transition-all",
                                        isCorrect
                                            ? "bg-green-50 border-green-200 ring-1 ring-green-300"
                                            : "bg-white hover:bg-slate-50"
                                    )}
                                >
                                    <span className={cn(
                                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                                        isCorrect
                                            ? "bg-green-500 text-white"
                                            : "bg-slate-100 text-slate-600"
                                    )}>
                                        {key}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        {opt?.image && (
                                            <img src={normalizeImageUrl(opt.image)} alt="" className="max-h-20 rounded border mb-1" />
                                        )}
                                        {opt?.text && (
                                            <span className="text-sm" dangerouslySetInnerHTML={{ __html: opt.text }} />
                                        )}
                                        {!opt?.text && !opt?.image && (
                                            <span className="text-sm text-muted-foreground/50">—</span>
                                        )}
                                    </div>
                                    {isCorrect && (
                                        <Badge className="bg-green-500 text-white text-[9px] shrink-0">Doğru</Badge>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Video Solution */}
                {question.videoSolution && (
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Video Çözüm</h4>
                        <a
                            href={question.videoSolution}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 rounded-xl border bg-gradient-to-r from-rose-50 to-orange-50 hover:shadow-md transition-all group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                                <Play className="h-5 w-5 text-white ml-0.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">Video Çözümü İzle</p>
                                <p className="text-xs text-muted-foreground truncate">{question.videoSolution}</p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                        </a>
                    </div>
                )}

                {/* Meta Info */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bilgiler</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/30 p-3 rounded-xl">
                            <p className="text-[10px] text-muted-foreground uppercase">Konular</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {question.topics.map(t => (
                                    <Badge key={t.id} variant="outline" className="text-[10px]">{t.name}</Badge>
                                ))}
                                {question.topics.length === 0 && (
                                    <span className="text-xs text-muted-foreground/50">—</span>
                                )}
                            </div>
                        </div>
                        <div className="bg-muted/30 p-3 rounded-xl">
                            <p className="text-[10px] text-muted-foreground uppercase">Oluşturan</p>
                            <p className="text-sm font-medium mt-1">
                                {question.createdBy ? `${question.createdBy.firstName} ${question.createdBy.lastName}` : '—'}
                            </p>
                        </div>
                        <div className="bg-muted/30 p-3 rounded-xl">
                            <p className="text-[10px] text-muted-foreground uppercase">Tarih</p>
                            <p className="text-sm font-medium mt-1">
                                {new Date(question.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                        <div className="bg-muted/30 p-3 rounded-xl">
                            <p className="text-[10px] text-muted-foreground uppercase">Kullanım</p>
                            <p className="text-sm font-medium mt-1">{question.usageCount || 0} sınavda</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// Grid Card Component — Premium Design
// ============================================================
function QuestionGridCard({ question, isSelected, onToggleSelect, onPreview, onEdit, onDelete, onDuplicate }: {
    question: Question;
    isSelected: boolean;
    onToggleSelect: () => void;
    onPreview: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
}) {
    const config = DIFFICULTY_CONFIG[question.difficulty] || DIFFICULTY_CONFIG.MEDIUM;
    const hasImage = question.content?.image;
    const options = question.options || {};

    return (
        <Card
            onClick={onPreview}
            className={cn(
                "group overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1",
                isSelected && "ring-2 ring-primary"
            )}>
            {/* Image or Text Preview */}
            <div className="relative h-28 bg-gradient-to-br from-slate-100 to-slate-50 overflow-hidden">
                {hasImage ? (
                    <img src={normalizeImageUrl(question.content.image)} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="p-3 h-full flex items-center">
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                            {question.content?.text?.replace(/<[^>]*>/g, '') || 'Soru metni yok'}
                        </p>
                    </div>
                )}

                {/* Checkbox */}
                <div className={cn(
                    "absolute top-2 left-2 transition-opacity",
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={onToggleSelect}
                        className="bg-white shadow-sm"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>

                {/* Media & Answer Badge */}
                <div className="absolute top-2 right-2 flex gap-1">
                    <div className="px-1.5 py-0.5 bg-white/90 backdrop-blur-sm rounded-md shadow-sm text-xs font-bold text-green-600">
                        {question.correctAnswer}
                    </div>
                    {hasImage && (
                        <div className="p-1 bg-white/90 rounded-md shadow-sm">
                            <ImageIcon className="h-3 w-3 text-teal-600" />
                        </div>
                    )}
                    {question.videoSolution && (
                        <div className="p-1 bg-white/90 rounded-md shadow-sm">
                            <Link2 className="h-3 w-3 text-rose-600" />
                        </div>
                    )}
                </div>
            </div>

            {/* Mini Options Preview */}
            <div className="px-3 py-2 border-t bg-slate-50/50">
                <div className="grid grid-cols-5 gap-1">
                    {['A', 'B', 'C', 'D', 'E'].map(key => {
                        const isCorrect = question.correctAnswer === key;
                        const hasOpt = options[key]?.text || options[key]?.image;
                        return (
                            <div
                                key={key}
                                className={cn(
                                    "text-center py-0.5 rounded text-[9px] font-bold",
                                    isCorrect
                                        ? "bg-green-500 text-white"
                                        : hasOpt
                                            ? "bg-slate-200 text-slate-600"
                                            : "bg-slate-100 text-slate-300"
                                )}
                            >
                                {key}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Info */}
            <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                    <Badge className={cn("text-[10px] font-medium", config.bg, config.color, "border-0")}>
                        {config.label}
                    </Badge>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Düzenle">
                            <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:bg-slate-100" onClick={(e) => { e.stopPropagation(); onDuplicate(); }} title="Kopyala">
                            <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Sil">
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>

                {question.topics.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Tag className="h-3 w-3" />
                        <span className="truncate">{question.topics[0].name}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ============================================================
// List Card Component
// ============================================================
function QuestionListCard({ question, isSelected, onToggleSelect, onPreview, onEdit, onDelete, onDuplicate }: {
    question: Question;
    isSelected: boolean;
    onToggleSelect: () => void;
    onPreview: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
}) {
    const config = DIFFICULTY_CONFIG[question.difficulty] || DIFFICULTY_CONFIG.MEDIUM;

    return (
        <Card
            onClick={onPreview}
            className={cn(
                "group transition-all duration-200 hover:shadow-md cursor-pointer",
                isSelected && "ring-2 ring-primary"
            )}>
            <CardContent className="p-4 flex gap-4">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={onToggleSelect}
                    className="mt-1"
                    onClick={(e) => e.stopPropagation()}
                />

                {question.content?.image && (
                    <div className="w-24 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                        <img src={normalizeImageUrl(question.content.image)} alt="" className="w-full h-full object-cover" />
                    </div>
                )}

                <div className="flex-1 min-w-0 space-y-2">
                    <p className="text-sm line-clamp-2">{question.content?.text?.replace(/<[^>]*>/g, '') || 'Soru metni yok'}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn("text-[10px]", config.bg, config.color, "border-0")}>
                            {config.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-bold text-green-600 border-green-200">
                            {question.correctAnswer}
                        </Badge>
                        {question.topics.map(t => (
                            <Badge key={t.id} variant="outline" className="text-[10px]">
                                {t.name}
                            </Badge>
                        ))}
                        {question.videoSolution && (
                            <Badge className="text-[10px] bg-rose-100 text-rose-700 border-0">
                                <Link2 className="h-3 w-3 mr-1" />
                                Video
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={onDuplicate}><Copy className="h-4 w-4 mr-2" /> Kopyala</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={onDelete}><Trash2 className="h-4 w-4 mr-2" /> Sil</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardContent>
        </Card>
    );
}

// ============================================================
// Table Row Component
// ============================================================
function QuestionTableRow({ question, isSelected, onToggleSelect, onPreview, onEdit, onDelete, onDuplicate }: {
    question: Question;
    isSelected: boolean;
    onToggleSelect: () => void;
    onPreview: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
}) {
    const config = DIFFICULTY_CONFIG[question.difficulty] || DIFFICULTY_CONFIG.MEDIUM;

    return (
        <tr
            onClick={onPreview}
            className={cn("group hover:bg-muted/50 transition-colors cursor-pointer", isSelected && "bg-primary/5")}
        >
            <td className="p-3">
                <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} onClick={(e) => e.stopPropagation()} />
            </td>
            <td className="p-3">
                <div className="flex items-center gap-3">
                    {question.content?.image && (
                        <img src={normalizeImageUrl(question.content.image)} alt="" className="w-10 h-10 rounded object-cover" />
                    )}
                    <span className="text-sm line-clamp-1">{question.content?.text?.replace(/<[^>]*>/g, '') || '-'}</span>
                </div>
            </td>
            <td className="p-3">
                <Badge className={cn("text-[10px]", config.bg, config.color, "border-0")}>
                    {config.label}
                </Badge>
            </td>
            <td className="p-3">
                <span className="text-xs text-muted-foreground truncate block">
                    {question.topics[0]?.name || '-'}
                </span>
            </td>
            <td className="p-3">
                <Badge variant="outline" className="text-xs font-bold text-green-600 border-green-200">
                    {question.correctAnswer}
                </Badge>
            </td>
            <td className="p-3">
                <div className="flex gap-1">
                    {question.content?.image && <ImageIcon className="h-4 w-4 text-teal-500" />}
                    {question.videoSolution && <Link2 className="h-4 w-4 text-rose-500" />}
                </div>
            </td>
            <td className="p-3 text-xs text-muted-foreground">
                {new Date(question.createdAt).toLocaleDateString('tr-TR')}
            </td>
            <td className="p-3">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Düzenle">
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:bg-slate-100" onClick={(e) => { e.stopPropagation(); onDuplicate(); }} title="Kopyala">
                        <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Sil">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </td>
        </tr>
    );
}
