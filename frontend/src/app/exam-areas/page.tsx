'use client';

import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, Save, Loader2, Sparkles, Upload, X, MapPin, LayoutGrid, List as ListIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { cn, getFileUrl } from '@/lib/utils';
import { useConfirm } from '@/context/confirm-context';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

interface QuestionBank {
    id: string;
    name: string;
    slug: string;
    description?: string;
    coverImage?: string;
    icon?: string;
    color?: string;
    order: number;
    isActive: boolean;
    isNew: boolean;
    _count: {
        lessons: number;
        exams: number;
        students: number;
    };
    lessons?: { id: string }[];
    groups?: { id: string }[];
}

interface Lesson {
    id: string;
    name: string;
    code: string;
}

interface Group {
    id: string;
    name: string;
    code: string;
}

const PRESET_COLORS = [
    '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B',
    '#EF4444', '#EC4899', '#6366F1', '#14B8A6',
];

export default function QuestionBanksPage() {
    const { toast } = useToast();
    const confirm = useConfirm();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingBank, setEditingBank] = useState<QuestionBank | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // View & Pagination State
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);

    // Active Tab in the Modal
    const [activeTab, setActiveTab] = useState<'content' | 'access'>('content');

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        coverImage: '',
        color: PRESET_COLORS[0],
        isActive: true,
        isNew: false,
        lessonIds: [] as string[],
        groupIds: [] as string[],
    });

    useEffect(() => {
        fetchQuestionBanks();
        fetchLessons();
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            const data = await apiClient.get('/groups?includeInactive=true');
            setGroups(Array.isArray(data) ? data : data.data || []);
        } catch (error) {
            console.error('Groups fetch error', error);
        }
    };

    const fetchLessons = async () => {
        try {
            const data = await apiClient.get('/content/lessons');
            setLessons(Array.isArray(data) ? data : data.data || []);
        } catch (error) {
            console.error('Lessons fetch error', error);
        }
    };

    const fetchQuestionBanks = async () => {
        setIsLoading(true);
        try {
            const data = await apiClient.get('/exam-areas?includeInactive=true');
            setQuestionBanks(data);
        } catch (error) {
            toast({ title: 'Hata', description: 'Soru bankaları yüklenemedi.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            coverImage: '',
            color: PRESET_COLORS[0],
            isActive: true,
            isNew: false,
            lessonIds: [],
            groupIds: [],
        });
        setEditingBank(null);
        setActiveTab('content');
    };

    const openEdit = (bank: QuestionBank) => {
        setEditingBank(bank);
        setFormData({
            name: bank.name,
            description: bank.description || '',
            coverImage: bank.coverImage || '',
            color: bank.color || PRESET_COLORS[0],
            isActive: bank.isActive,
            isNew: bank.isNew,
            lessonIds: bank.lessons?.map(l => l.id) || [],
            groupIds: bank.groups?.map(g => g.id) || [],
        });
        setIsCreateOpen(true);
        setActiveTab('content');
    };

    const handleImageSelect = async (file: File) => {
        if (!file) return;
        setUploadingImage(true);
        try {
            const uploadFormData = new FormData();
            uploadFormData.append('file', file);
            // Since this file upload uses fetch logic due to formData
            const data = await apiClient.post('/upload/image', uploadFormData);
            setFormData(prev => ({ ...prev, coverImage: data.url }));
            toast({ title: 'Kapak görseli yüklendi', duration: 1500 });
        } catch (error: any) {
            console.error(error);
            const errMsg = error.message?.includes('413') ? 'Görsel boyutu çok yüksek (Maksimum 10MB).' : (error.message || 'Görsel yüklenemedi');
            toast({ title: 'Hata', description: errMsg, variant: 'destructive' });
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            toast({ title: 'Hata', description: 'Soru bankası adı gerekli.', variant: 'destructive' });
            return;
        }

        setIsSaving(true);
        try {
            if (editingBank) {
                await apiClient.patch(`/exam-areas/${editingBank.id}`, formData);
                toast({ title: 'Başarılı', description: 'Güncellendi.' });
            } else {
                await apiClient.post(`/exam-areas`, formData);
                toast({ title: 'Başarılı', description: 'Oluşturuldu.' });
            }
            setIsCreateOpen(false);
            resetForm();
            fetchQuestionBanks();
        } catch (error) {
            toast({ title: 'Hata', description: 'İşlem başarısız.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const confirmed = await confirm({
            title: 'Soru Bankası Silme',
            description: 'Bu soru bankasını silmek istediğinize emin misiniz?',
            confirmText: 'Sil',
            isDangerous: true,
        });
        if (!confirmed) return;
        try {
            await apiClient.delete(`/exam-areas/${id}`);
            toast({ title: 'Başarılı', description: 'Soru bankası silindi.' });
            fetchQuestionBanks();
        } catch (error) {
            toast({ title: 'Hata', description: 'Silme başarısız.', variant: 'destructive' });
        }
    };

    const totalPages = Math.ceil(questionBanks.length / pageSize);
    const paginatedBanks = questionBanks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setCurrentPage(1);
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Soru Bankalarım
                    </h1>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                    <div className="flex items-center bg-white border rounded-lg p-1 mr-1 shadow-sm">
                        <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2 rounded-md" onClick={() => setViewMode('grid')}>
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2 rounded-md" onClick={() => setViewMode('list')}>
                            <ListIcon className="h-4 w-4" />
                        </Button>
                    </div>
                    <Link href="/lessons">
                        <Button variant="outline" className="shadow-lg hover:shadow-xl transition-all border-blue-500 text-blue-600 hover:bg-blue-50">
                            <MapPin className="mr-2 h-4 w-4" /> İçerik Ağacı / Dersler
                        </Button>
                    </Link>
                    <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
                        <DialogTrigger asChild>
                            <Button className="shadow-lg hover:shadow-xl transition-all">
                                <Plus className="mr-2 h-4 w-4" />
                                Yeni Soru Bankası
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                            <DialogHeader>
                                <DialogTitle>{editingBank ? 'Soru Bankasını Düzenle' : 'Yeni Soru Bankası'}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4 overflow-y-auto flex-1 pr-2">
                                <div className="flex border-b mb-4">
                                    <button 
                                        className={cn("flex-1 py-2 text-sm font-semibold border-b-2 transition-colors", activeTab === 'content' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
                                        onClick={() => setActiveTab('content')}
                                    >
                                        İçerik Geliştirme
                                    </button>
                                    <button 
                                        className={cn("flex-1 py-2 text-sm font-semibold border-b-2 transition-colors", activeTab === 'access' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
                                        onClick={() => setActiveTab('access')}
                                    >
                                        Erişim (Gruplar)
                                    </button>
                                </div>

                                {activeTab === 'content' ? (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                        <div className="space-y-2">
                                            <Label>Kapak Görseli</Label>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    if (e.target.files?.[0]) handleImageSelect(e.target.files[0]);
                                                }}
                                            />
                                            {formData.coverImage ? (
                                                <div className="relative">
                                                    <img src={getFileUrl(formData.coverImage)} alt="Kapak" className="w-full h-40 object-cover rounded-xl border" />
                                                    <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8 rounded-full" onClick={() => setFormData({ ...formData, coverImage: '' })}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="w-full h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors">
                                                    {uploadingImage ? (
                                                        <Loader2 className="h-8 w-8 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Upload className="h-8 w-8 text-muted-foreground" />
                                                            <span className="text-sm font-medium">Kapak görseli yükle</span>
                                                            <span className="text-xs text-muted-foreground/80 mt-1">Önerilen: 800x400px (Maks 10MB)</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Soru Bankası Adı *</Label>
                                            <Input placeholder="örn: HAKİMLİK" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Açıklama</Label>
                                            <Textarea placeholder="Kısa açıklama..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-end">
                                                <Label>Bağlı Dersler <span className="text-xs font-normal text-muted-foreground ml-2">(Sadece buraya kayıtlı dersleri içerir)</span></Label>
                                                <Link href="/lessons">
                                                    <Button variant="link" size="sm" className="text-blue-600 px-0 h-auto py-0">Ders Tanımla</Button>
                                                </Link>
                                            </div>
                                            <div className="border rounded-md p-2 h-32 overflow-y-auto space-y-2 bg-slate-50">
                                                {lessons.length === 0 ? (
                                                    <div className="text-center py-4 text-muted-foreground text-xs">
                                                        Ders bulunamadı. Önce "Dersler" sekmesinden ders oluşturun.
                                                    </div>
                                                ) : (
                                                    lessons.map(lesson => (
                                                        <label key={lesson.id} className="flex items-center space-x-2 p-2 rounded hover:bg-white cursor-pointer transition-colors border shadow-sm mb-1 bg-white">
                                                            <Checkbox checked={formData.lessonIds.includes(lesson.id)} onCheckedChange={(checked) => {
                                                                const updated = checked ? [...formData.lessonIds, lesson.id] : formData.lessonIds.filter(id => id !== lesson.id);
                                                                setFormData({ ...formData, lessonIds: updated });
                                                            }} />
                                                            <div className="flex-1">
                                                                <span className="text-sm font-medium">{lesson.name}</span>
                                                                <span className="text-xs font-mono bg-slate-100 text-slate-500 ml-2 px-1 rounded">{lesson.code}</span>
                                                            </div>
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300 min-h-[300px]">
                                        <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-100">
                                            <p className="font-semibold mb-1">Kimler erişebilir?</p>
                                            <p>Aşağıda seçeceğiniz gruplara kayıtlı tüm öğrenciler, telefonlarından veya bilgisayarlarından bu kitaba anında erişip soru çözebilirler.</p>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-end">
                                                <Label>Yetkilendirilen Gruplar / Sınıflar</Label>
                                                <Link href="/groups">
                                                    <Button variant="link" size="sm" className="text-indigo-600 px-0 h-auto py-0">Grup Yönetimi</Button>
                                                </Link>
                                            </div>
                                            <div className="border rounded-md p-2 h-64 overflow-y-auto space-y-2 bg-slate-50">
                                                {groups.length === 0 ? (
                                                    <div className="text-center py-10 text-muted-foreground text-sm">
                                                        Henüz oluşturulmuş bir grubunuz yok.
                                                    </div>
                                                ) : (
                                                    groups.map(group => (
                                                        <label key={group.id} className={cn("flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all border shadow-sm mb-2", formData.groupIds.includes(group.id) ? "bg-indigo-50 border-indigo-200" : "bg-white hover:border-indigo-300")}>
                                                            <Checkbox 
                                                                className={formData.groupIds.includes(group.id) ? "data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" : ""}
                                                                checked={formData.groupIds.includes(group.id)} 
                                                                onCheckedChange={(checked) => {
                                                                    const updated = checked ? [...formData.groupIds, group.id] : formData.groupIds.filter(id => id !== group.id);
                                                                    setFormData({ ...formData, groupIds: updated });
                                                                }} 
                                                            />
                                                            <div className="flex flex-col flex-1">
                                                                <span className={cn("text-sm font-bold", formData.groupIds.includes(group.id) ? "text-indigo-900" : "text-slate-800")}>{group.name}</span>
                                                                <span className="text-xs text-slate-500 font-mono mt-0.5">{group.code}</span>
                                                            </div>
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label>Tema Rengi</Label>
                                    <div className="flex gap-2 flex-wrap">
                                        {PRESET_COLORS.map(color => (
                                            <button key={color} onClick={() => setFormData({ ...formData, color })} className={cn("w-8 h-8 rounded-full transition-all", formData.color === color && "ring-2 ring-offset-2 ring-primary scale-110")} style={{ backgroundColor: color }} />
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3 pb-4">
                                    <Label>Durum</Label>
                                    <div className="flex items-center gap-3">
                                        <Switch 
                                            checked={formData.isActive} 
                                            onCheckedChange={(c) => setFormData({ ...formData, isActive: c })} 
                                        />
                                        <span className="text-sm font-medium">
                                            {formData.isActive ? 'Aktif (Öğrenciler Görebilir)' : 'Pasif (Öğrencilerden Gizli)'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 border-t mt-auto">
                                <Button onClick={handleSubmit} disabled={isSaving} className="w-full">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    {editingBank ? 'Güncelle' : 'Oluştur'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <Card key={i} className="animate-pulse h-64 bg-muted" />)}
                </div>
            ) : questionBanks.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-gradient-to-b from-muted/20 to-muted/5">
                    <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="h-10 w-10 text-primary" />
                    </div>
                    <p className="text-xl font-bold mb-2">Henüz soru bankası yok</p>
                    <p className="text-muted-foreground mb-6">İlk soru bankanızı oluşturun!</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                            {paginatedBanks.map((bank) => (
                                <Card key={bank.id} className={cn("overflow-hidden hover:shadow-lg transition-all group flex flex-col h-full", !bank.isActive && "opacity-60 grayscale")}>
                                    <div className="h-24 relative bg-muted shrink-0" style={{ backgroundColor: bank.color || PRESET_COLORS[0] }}>
                                        {bank.coverImage && <img src={getFileUrl(bank.coverImage)} alt={bank.name} className="absolute inset-0 w-full h-full object-cover" />}
                                        <div className="absolute top-2 right-2 flex gap-1">
                                            {bank.isNew && <Badge variant="secondary" className="bg-white/90 text-black text-[10px] px-1.5 py-0 h-4 border-0 shadow-sm font-bold">YENİ</Badge>}
                                        </div>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-3">
                                            <h3 className="text-sm font-bold text-white mb-0.5 group-hover:scale-[1.02] transition-transform origin-left line-clamp-2 leading-tight">{bank.name}</h3>
                                        </div>
                                    </div>
                                    <CardContent className="p-4 flex-1 flex flex-col">
                                        <div className="grid grid-cols-3 gap-2 py-3 border-y mb-4 mt-auto">
                                            <div className="text-center">
                                                <div className="text-lg font-bold">{bank._count?.lessons || 0}</div>
                                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Ders</div>
                                            </div>
                                            <div className="text-center border-l border-r">
                                                <div className="text-lg font-bold">{bank._count?.exams || 0}</div>
                                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Sınav</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold">{bank._count?.students || 0}</div>
                                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Öğrenci</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <Link href={`/exam-areas/${bank.id}`} className="flex-1">
                                                <Button size="sm" className="w-full bg-slate-900 border-none shadow-md hover:bg-slate-800 text-xs h-8">
                                                    İçeriğe Git
                                                </Button>
                                            </Link>
                                            <Button variant="outline" size="icon" onClick={() => openEdit(bank)} className="h-8 w-8 border-slate-200">
                                                <Edit className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="destructive" size="icon" onClick={(e) => handleDelete(bank.id, e)} className="h-8 w-8 shadow-sm">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {paginatedBanks.map((bank) => (
                                <div key={bank.id} className={cn("bg-white border rounded-xl p-3 flex flex-col sm:flex-row items-center gap-4 hover:shadow-md transition-shadow group", !bank.isActive && "opacity-60 grayscale")}>
                                    <div className="w-full sm:w-32 h-20 relative rounded-lg overflow-hidden bg-muted shrink-0 shadow-inner" style={{ backgroundColor: bank.color || PRESET_COLORS[0] }}>
                                        {bank.coverImage && <img src={getFileUrl(bank.coverImage)} alt={bank.name} className="absolute inset-0 w-full h-full object-cover" />}
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-base font-bold text-slate-800 truncate">{bank.name}</h3>
                                            {bank.isNew && <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-0 h-5 px-2 text-[10px] font-bold shadow-sm">YENİ</Badge>}
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">{bank.description || 'Açıklama girilmemiş.'}</p>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-start gap-6 sm:px-6 w-full sm:w-auto sm:border-l border-slate-100 my-2 sm:my-0">
                                        <div className="text-center">
                                            <div className="text-sm font-bold text-slate-700">{bank._count?.lessons || 0}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Ders</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-sm font-bold text-slate-700">{bank._count?.exams || 0}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Sınav</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-sm font-bold text-slate-700">{bank._count?.students || 0}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Öğr</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 sm:border-l sm:pl-4 border-slate-100 w-full sm:w-auto justify-end">
                                        <Link href={`/exam-areas/${bank.id}`}>
                                            <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-xs h-8 shadow-sm">
                                                İçeriğe Git
                                            </Button>
                                        </Link>
                                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(bank)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="destructive" size="sm" className="h-8 w-8 p-0" onClick={(e) => handleDelete(bank.id, e)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {totalPages > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t mt-8 gap-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>Sayfa başına:</span>
                                <select 
                                    className="border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                                    value={pageSize}
                                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                                >
                                    <option value={12}>12</option>
                                    <option value={24}>24</option>
                                    <option value={48}>48</option>
                                </select>
                                <span>kayıt</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border p-1">
                                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="text-sm font-medium px-3 text-slate-600 border-x h-8 flex items-center">
                                    {currentPage} / {totalPages}
                                </div>
                                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </DashboardLayout>
    );
}
