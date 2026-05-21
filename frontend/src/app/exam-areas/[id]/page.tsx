import { API_URL } from '@/lib/api-config';
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AddQuestionModal } from '@/components/questions/add-question-modal';
import { ManualQuestionModal } from '@/components/questions/manual-question-modal';
import { ContentManagementModal } from '@/components/content/content-management-modal';
import { AccessManagerModal } from '@/components/exam-areas/access-manager-modal';
import { PDFCropperModal } from '@/components/questions/pdf-cropper-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    ArrowLeft, BookOpen, FileQuestion, Users, Loader2, Edit, Trash2, Plus, Calendar, Layers, Search, Grid3X3, List, MoreHorizontal, Image as ImageIcon, Video, Tag, CheckSquare, Download, X, HelpCircle, Library, UserCircle, Clock
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { cn, getFileUrl } from '@/lib/utils';
import { normalizeImageUrl } from '@/lib/image-utils';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

interface QuestionBankDetail {
    id: string;
    name: string;
    slug: string;
    description?: string;
    coverImage?: string;
    color?: string;
    isActive: boolean;
    isNew: boolean;
    createdAt: string;
    lessons: {
        id: string;
        name: string;
        code: string;
    }[];
    groups?: {
        id: string;
        name: string;
        code?: string;
    }[];
    students?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    }[];
    _count: {
        lessons: number;
        exams: number;
        students: number;
        questions: number;
    };
}

interface Question {
    id: string;
    content: any;
    options: any;
    correctAnswer: string;
    difficulty: string;
    videoSolution?: string;
    topics: { id: string; name: string }[];
    createdAt: string;
}

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    VERY_EASY: { label: 'Çok Kolay', color: 'text-green-700', bg: 'bg-green-100' },
    EASY: { label: 'Kolay', color: 'text-emerald-700', bg: 'bg-emerald-100' },
    MEDIUM: { label: 'Orta', color: 'text-blue-700', bg: 'bg-blue-100' },
    HARD: { label: 'Zor', color: 'text-orange-700', bg: 'bg-orange-100' },
    VERY_HARD: { label: 'Çok Zor', color: 'text-red-700', bg: 'bg-red-100' },
};

type ViewMode = 'grid' | 'list';

export default function ExamAreaDetailPage() {
    const { accessToken } = useAuth();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const [bank, setBank] = useState<QuestionBankDetail | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isQuestionsLoading, setIsQuestionsLoading] = useState(true);

    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [isMethodSelectOpen, setIsMethodSelectOpen] = useState(false);
    const [isManualFormOpen, setIsManualFormOpen] = useState(false);
    const [isPDFCropperOpen, setIsPDFCropperOpen] = useState(false);
    const [isLessonManagerOpen, setIsLessonManagerOpen] = useState(false);
    const [isAccessManagerOpen, setIsAccessManagerOpen] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

    const bankId = params.id as string;

    const fetchBankDetail = async () => {
        setIsLoading(true);
        try {
            const data = await apiClient.get(`/exam-areas/${bankId}`);
            setBank(data);
        } catch (error) {
            toast({ title: 'Hata', description: 'Veri yüklenemedi.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchQuestions = async () => {
        setIsQuestionsLoading(true);
        try {
            const data = await apiClient.get(`/questions?examAreaId=${bankId}&take=200`);
            setQuestions(data.data || []);
        } catch (error) {
            console.error('Questions fetch error', error);
        } finally {
            setIsQuestionsLoading(false);
        }
    };

    useEffect(() => {
        if (accessToken && bankId) {
            fetchBankDetail();
            fetchQuestions();
        }
    }, [bankId, accessToken]);

    const filteredQuestions = useMemo(() => {
        if (!searchQuery) return questions;
        const query = searchQuery.toLowerCase();
        return questions.filter(q =>
            q.content?.text?.toLowerCase().includes(query) ||
            q.topics.some(t => t.name.toLowerCase().includes(query))
        );
    }, [questions, searchQuery]);

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleDelete = async () => {
        if (!confirm('Bu soru bankasını silmek istediğinize emin misiniz?')) return;
        try {
            await apiClient.delete(`/exam-areas/${bankId}`);
            toast({ title: 'Başarılı', description: 'Soru bankası silindi.' });
            router.push('/exam-areas');
        } catch (error) {
            toast({ title: 'Hata', description: 'Silme başarısız.', variant: 'destructive' });
        }
    };

    const handleDeleteQuestion = async (id: string) => {
        if (!confirm('Soru silinecek. Emin misiniz?')) return;
        try {
            await apiClient.delete(`/questions/${id}`);
            toast({ title: 'Başarılı', description: 'Soru silindi.' });
            fetchQuestions();
        } catch (error) {
            toast({ title: 'Hata', description: 'Silinemedi.', variant: 'destructive' });
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`${selectedIds.size} soru silinecek. Emin misiniz?`)) return;
        try {
            for (const id of Array.from(selectedIds)) {
                await apiClient.delete(`/questions/${id}`);
            }
            toast({ title: 'Başarılı', description: `${selectedIds.size} soru silindi.` });
            setSelectedIds(new Set());
            fetchQuestions();
        } catch (error) {
            toast({ title: 'Hata', description: 'Silme işlemi başarısız.', variant: 'destructive' });
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!bank) {
        return (
            <DashboardLayout>
                <div className="text-center py-20">
                    <p className="text-muted-foreground">Soru bankası bulunamadı.</p>
                    <Button variant="link" asChild>
                        <Link href="/exam-areas">Geri Dön</Link>
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            {/* Hero Section */}
            <div className="relative rounded-2xl overflow-hidden mb-8">
                <div
                    className="absolute inset-0"
                    style={{
                        background: bank.coverImage
                            ? `linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0.4)), url(${getFileUrl(bank.coverImage)}) center/cover`
                            : `linear-gradient(135deg, ${bank.color || '#8B5CF6'}, ${bank.color || '#8B5CF6'}88)`
                    }}
                />

                <div className="relative z-10 p-8 md:p-12">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/80 hover:text-white hover:bg-white/10 mb-6"
                        onClick={() => router.push('/exam-areas')}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" /> Soru Bankalarına Dön
                    </Button>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                {bank.isNew && <Badge className="bg-amber-500 text-white border-0">Yeni</Badge>}
                                {!bank.isActive && <Badge variant="secondary">Pasif</Badge>}
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                                {bank.name}
                            </h1>
                            {bank.description && (
                                <p className="text-white/70 text-lg max-w-2xl">
                                    {bank.description}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => setIsAccessManagerOpen(true)}>
                                <Users className="h-4 w-4" /> Erişim Yönetimi
                            </Button>
                            <Button variant="secondary" className="gap-2">
                                <Edit className="h-4 w-4" /> Düzenle
                            </Button>
                            <Button variant="destructive" className="gap-2" onClick={handleDelete}>
                                <Trash2 className="h-4 w-4" /> Sil
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Left Column - Main Content (Questions) */}
                <div className="lg:col-span-2 space-y-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2"><FileQuestion className="h-5 w-5" /> Bu Bankadaki Sorular ({filteredQuestions.length})</CardTitle>
                            <Button className="gap-2" onClick={() => setIsMethodSelectOpen(true)}><Plus className="h-4 w-4" /> Soru Ekle</Button>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Soru ara..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                </div>
                                <div className="flex bg-muted/50 p-1 rounded-lg gap-1">
                                    <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" className="h-8 w-8 p-0" onClick={() => setViewMode('grid')}><Grid3X3 className="h-4 w-4" /></Button>
                                    <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-8 w-8 p-0" onClick={() => setViewMode('list')}><List className="h-4 w-4" /></Button>
                                </div>
                            </div>

                            {selectedIds.size > 0 && (
                                <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 p-3 rounded-xl mb-4">
                                    <CheckSquare className="h-5 w-5 text-primary" />
                                    <span className="text-sm font-medium">{selectedIds.size} soru seçildi</span>
                                    <div className="flex-1" />
                                    <Button variant="outline" size="sm" className="h-8 gap-1.5"><Download className="h-3.5 w-3.5" /> Dışa Aktar</Button>
                                    <Button variant="destructive" size="sm" className="h-8 gap-1.5" onClick={handleBulkDelete}><Trash2 className="h-3.5 w-3.5" /> Sil</Button>
                                    <Button variant="ghost" size="sm" className="h-8" onClick={() => setSelectedIds(new Set())}><X className="h-4 w-4" /></Button>
                                </div>
                            )}

                            {isQuestionsLoading ? (
                                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                            ) : filteredQuestions.length === 0 ? (
                                <div className="text-center py-16 border-2 border-dashed rounded-xl">
                                    <Layers className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                                    <p className="text-muted-foreground font-medium">Bu bankada henüz soru yok</p>
                                    <Button onClick={() => setIsMethodSelectOpen(true)} className="mt-4"><Plus className="h-4 w-4 mr-2" /> Soru Ekle</Button>
                                </div>
                            ) : viewMode === 'grid' ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {filteredQuestions.map((q) => (
                                        <QuestionGridCard
                                            key={q.id}
                                            question={q}
                                            isSelected={selectedIds.has(q.id)}
                                            onToggleSelect={() => toggleSelect(q.id)}
                                            onDelete={() => handleDeleteQuestion(q.id)}
                                            onEdit={(q: Question) => { setSelectedQuestion(q); setIsManualFormOpen(true); }}
                                            bankColor={bank.color}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredQuestions.map((q) => (
                                        <QuestionListCard
                                            key={q.id}
                                            question={q}
                                            isSelected={selectedIds.has(q.id)}
                                            onToggleSelect={() => toggleSelect(q.id)}
                                            onDelete={() => handleDeleteQuestion(q.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Sidebar (Stats, Groups, Lessons) */}
                <div className="space-y-6">
                    {/* Stats Grid 2x2 */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="border border-border/50 shadow-sm bg-card">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <div className="p-2 bg-muted rounded-full mb-2"><HelpCircle className="h-4 w-4 text-muted-foreground" /></div>
                                <p className="text-2xl font-bold text-foreground">{questions.length}</p>
                                <p className="text-xs font-medium text-muted-foreground mt-0.5">Soru</p>
                            </CardContent>
                        </Card>
                        <Card className="border border-border/50 shadow-sm bg-card">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <div className="p-2 bg-muted rounded-full mb-2"><Library className="h-4 w-4 text-muted-foreground" /></div>
                                <p className="text-2xl font-bold text-foreground">{bank._count.lessons}</p>
                                <p className="text-xs font-medium text-muted-foreground mt-0.5">Ders</p>
                            </CardContent>
                        </Card>
                        <Card className="border border-border/50 shadow-sm bg-card">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <div className="p-2 bg-muted rounded-full mb-2"><UserCircle className="h-4 w-4 text-muted-foreground" /></div>
                                <p className="text-2xl font-bold text-foreground">{bank._count.students}</p>
                                <p className="text-xs font-medium text-muted-foreground mt-0.5">Öğrenci</p>
                            </CardContent>
                        </Card>
                        <Card className="border border-border/50 shadow-sm bg-card">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <div className="p-2 bg-muted rounded-full mb-2"><Clock className="h-4 w-4 text-muted-foreground" /></div>
                                <p className="text-sm font-bold text-foreground mt-1">{new Date(bank.createdAt).toLocaleDateString('tr-TR')}</p>
                                <p className="text-xs font-medium text-muted-foreground mt-0.5">Oluşturulma</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Connected Groups */}
                    <Card className="shadow-sm">
                        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /> Bağlı Gruplar</CardTitle>
                            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setIsAccessManagerOpen(true)}>Yönet</Button>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            {!bank.groups || bank.groups.length === 0 ? (
                                <div className="text-center py-4 border border-dashed rounded-lg bg-muted/30">
                                    <p className="text-xs text-muted-foreground">Henüz grup yetkisi yok</p>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {bank.groups.map((g) => (
                                        <Badge key={g.id} variant="secondary" className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border-0">{g.name}</Badge>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Connected Lessons */}
                    <Card className="shadow-sm">
                        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4 text-muted-foreground" /> Bağlı Dersler</CardTitle>
                            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setIsLessonManagerOpen(true)}>Yönet</Button>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            {!bank.lessons || bank.lessons.length === 0 ? (
                                <div className="text-center py-4 border border-dashed rounded-lg bg-muted/30">
                                    <p className="text-xs text-muted-foreground">Ders bağlantısı yok</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 mt-2">
                                    {bank.lessons.map((lesson) => (
                                        <div key={lesson.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border/50">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: bank.color || '#8B5CF6' }}></div>
                                            <span className="text-sm font-medium line-clamp-1 flex-1">{lesson.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AddQuestionModal open={isMethodSelectOpen} onOpenChange={setIsMethodSelectOpen} onSelectMethod={(method) => {
                if (method === 'manual') { setSelectedQuestion(null); setIsManualFormOpen(true); } else if (method === 'pdf') { setIsPDFCropperOpen(true); }
                setIsMethodSelectOpen(false);
            }} />
            <ManualQuestionModal open={isManualFormOpen} onOpenChange={setIsManualFormOpen} questionToEdit={selectedQuestion} onSuccess={() => { fetchQuestions(); fetchBankDetail(); setIsManualFormOpen(false); setSelectedQuestion(null); }} onBack={() => { setIsManualFormOpen(false); if (!selectedQuestion) setIsMethodSelectOpen(true); }} preSelectedBankId={bank.id} />
            <ContentManagementModal open={isLessonManagerOpen} onOpenChange={setIsLessonManagerOpen} examAreaId={bank.id} connectedLessonIds={bank.lessons?.map(l => l.id) || []} onUpdate={fetchBankDetail} />
            <AccessManagerModal open={isAccessManagerOpen} onOpenChange={setIsAccessManagerOpen} examAreaId={bank.id} onUpdate={fetchBankDetail} />
            <PDFCropperModal open={isPDFCropperOpen} onOpenChange={setIsPDFCropperOpen} onSuccess={() => { fetchQuestions(); fetchBankDetail(); }} onBack={() => setIsMethodSelectOpen(true)} preSelectedBankId={bankId} />
        </DashboardLayout>
    );
}

const stripHtml = (html: string) => { const tmp = document.createElement("DIV"); tmp.innerHTML = html; return tmp.textContent || tmp.innerText || ""; }

function QuestionGridCard({ question, isSelected, onToggleSelect, onDelete, onEdit, bankColor }: any) {
    const config = DIFFICULTY_CONFIG[question.difficulty] || DIFFICULTY_CONFIG.MEDIUM;
    const hasImage = question.content?.image;
    const rawText = question.content?.text ? stripHtml(question.content.text) : 'Soru metni yok';
    return (
        <Card className={cn("group overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1", isSelected && "ring-2 ring-primary")} onClick={() => onEdit(question)}>
            <div className="relative h-28 bg-gradient-to-br from-slate-100 to-slate-50 overflow-hidden">
                {hasImage ? <img src={normalizeImageUrl(question.content.image)} alt="" className="w-full h-full object-cover" /> : <div className="p-3 h-full flex items-center"><p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{rawText}</p></div>}
                <div className={cn("absolute top-2 left-2 transition-opacity", isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}><Checkbox checked={isSelected} onCheckedChange={onToggleSelect} className="bg-white shadow-sm" onClick={(e) => e.stopPropagation()} /></div>
                <div className="absolute top-2 right-2 flex gap-1">
                    {hasImage && <div className="p-1 bg-white/90 rounded-md shadow-sm"><ImageIcon className="h-3 w-3 text-purple-600" /></div>}
                    {question.videoSolution && <div className="p-1 bg-white/90 rounded-md shadow-sm"><Video className="h-3 w-3 text-rose-600" /></div>}
                </div>
            </div>
            <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                    <Badge className={cn("text-[10px] font-medium", config.bg, config.color, "border-0")}>{config.label}</Badge>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 -mr-2"><MoreHorizontal className="h-3 w-3" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Sil</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                {question.topics.length > 0 && <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Tag className="h-3 w-3" /><span className="truncate">{question.topics[0].name}</span></div>}
            </CardContent>
        </Card>
    );
}

function QuestionListCard({ question, isSelected, onToggleSelect, onDelete }: any) {
    const config = DIFFICULTY_CONFIG[question.difficulty] || DIFFICULTY_CONFIG.MEDIUM;
    return (
        <Card className={cn("group transition-all duration-200 hover:shadow-md", isSelected && "ring-2 ring-primary")}>
            <CardContent className="p-3 flex items-center gap-3">
                <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />
                {question.content?.image && <div className="w-16 h-12 rounded-lg overflow-hidden bg-muted shrink-0"><img src={normalizeImageUrl(question.content.image)} alt="" className="w-full h-full object-cover" /></div>}
                <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-1">{question.content?.text || 'Soru metni yok'}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge className={cn("text-[10px]", config.bg, config.color, "border-0")}>{config.label}</Badge>
                        {question.topics[0] && <span className="text-[10px] text-muted-foreground">{question.topics[0].name}</span>}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {question.content?.image && <ImageIcon className="h-4 w-4 text-purple-500" />}
                    {question.videoSolution && <Video className="h-4 w-4 text-rose-500" />}
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onDelete} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Sil</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardContent>
        </Card>
    );
}
