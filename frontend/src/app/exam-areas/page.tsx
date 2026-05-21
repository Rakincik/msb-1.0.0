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
import { Plus, Trash2, Edit, Save, Loader2, Sparkles, Upload, X, MapPin } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { cn, getFileUrl } from '@/lib/utils';
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
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingBank, setEditingBank] = useState<QuestionBank | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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
        if (!confirm('Bu soru bankasını silmek istediğinize emin misiniz?')) return;
        try {
            await apiClient.delete(`/exam-areas/${id}`);
            toast({ title: 'Başarılı', description: 'Soru bankası silindi.' });
            fetchQuestionBanks();
        } catch (error) {
            toast({ title: 'Hata', description: 'Silme başarısız.', variant: 'destructive' });
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Soru Bankalarım
                    </h1>
                    <p className="text-muted-foreground">
                        HAKİMLİK, KPSS, KAYMAKAMLIK gibi soru bankalarını yönetin.
                    </p>
                </div>
                <div className="flex gap-2">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {questionBanks.map((bank) => (
                        <Card key={bank.id} className={cn("overflow-hidden hover:shadow-lg transition-all group", !bank.isActive && "opacity-60 grayscale")}>
                            <div className="h-32 relative bg-muted" style={{ backgroundColor: bank.color || PRESET_COLORS[0] }}>
                                {bank.coverImage && <img src={getFileUrl(bank.coverImage)} alt={bank.name} className="absolute inset-0 w-full h-full object-cover" />}
                                <div className="absolute top-4 right-4 flex gap-2">
                                    {bank.isNew && <Badge variant="secondary" className="bg-white/90 text-black hover:bg-white border-0 shadow-sm font-semibold">YENİ</Badge>}
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-6">
                                    <h3 className="text-xl font-bold text-white mb-1 group-hover:scale-105 transition-transform origin-left">{bank.name}</h3>
                                </div>
                            </div>
                            <CardContent className="p-6">
                                <p className="text-sm text-muted-foreground line-clamp-2 h-10 mb-4">{bank.description || 'Açıklama girilmemiş.'}</p>
                                <div className="grid grid-cols-3 gap-4 py-4 border-y mb-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{bank._count?.lessons || 0}</div>
                                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Ders</div>
                                    </div>
                                    <div className="text-center border-l border-r">
                                        <div className="text-2xl font-bold">{bank._count?.exams || 0}</div>
                                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Alt Sınav</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{bank._count?.students || 0}</div>
                                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Öğrenci</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Link href={`/exam-areas/${bank.id}`} className="flex-1">
                                        <Button className="w-full bg-slate-900 border-none shadow-md hover:bg-slate-800">
                                            İçeriğe Git
                                        </Button>
                                    </Link>
                                    <Button variant="outline" size="icon" onClick={() => openEdit(bank)} className="border-slate-200">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="destructive" size="icon" onClick={(e) => handleDelete(bank.id, e)} className="shadow-sm">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}
