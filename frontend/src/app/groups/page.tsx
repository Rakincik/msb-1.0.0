'use client';

import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { 
    Plus, Search, ChevronRight, ChevronDown, Users, BookOpen, 
    Settings, Trash2, Edit2, Copy, Video, Tent, Loader2, Check 
} from 'lucide-react';
import { CreateGroupModal } from '@/components/groups/create-group-modal';
import { AddMemberModal } from '@/components/groups/add-member-modal';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

export interface Group {
    id: string;
    name: string;
    code: string;
    description?: string;
    isActive: boolean;
    type: 'OFFLINE' | 'ONLINE' | 'CAMP';
    parentId?: string | null;
    _count: {
        students: number;
        examAreas: number;
        exams: number;
        questions: number;
        pdfs: number;
    };
    color?: string;
    icon?: string;
}

export default function GroupsPage() {
    const { user, accessToken } = useAuth();
    const { toast } = useToast();
    const [groups, setGroups] = useState<Group[]>([]);
    const [groupStudents, setGroupStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createParentId, setCreateParentId] = useState<string | undefined>();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [isAddContentOpen, setIsAddContentOpen] = useState(false);
    
    // Exam Area states
    const [allExamAreas, setAllExamAreas] = useState<any[]>([]);
    const [examAreaActionLoading, setExamAreaActionLoading] = useState<string | null>(null);
    const [settingsFormData, setSettingsFormData] = useState({ name: '', code: '', description: '', type: 'OFFLINE', isActive: true, endDate: '' });
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    useEffect(() => {
        if (accessToken) {
            fetchGroups();
            fetchAllExamAreas();
        }
    }, [accessToken]);

    const rootGroups = useMemo(() => groups.filter(g => !g.parentId), [groups]);
    const getChildren = (parentId: string) => groups.filter(g => g.parentId === parentId);
    const selectedGroup = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);

    useEffect(() => {
        if (selectedGroupId) {
            fetchGroupStudents(selectedGroupId);
            if (selectedGroup) {
                setSettingsFormData({ 
                    name: selectedGroup.name, 
                    code: selectedGroup.code, 
                    description: selectedGroup.description || '', 
                    type: selectedGroup.type,
                    isActive: selectedGroup.isActive !== false,
                    endDate: (selectedGroup as any).endDate ? new Date((selectedGroup as any).endDate).toISOString().split('T')[0] : ''
                });
            }
        } else {
            setGroupStudents([]);
        }
    }, [selectedGroupId, selectedGroup]);

    const fetchAllExamAreas = async () => {
        try {
            const data = await apiClient.get('/exam-areas');
            setAllExamAreas(data);
        } catch (error) {
            console.error("Fetch exam areas error", error);
        }
    };

    const fetchGroupStudents = async (id: string) => {
        try {
            const data = await apiClient.get(`/groups/${id}/students`);
            setGroupStudents(data);
        } catch (error) {
            console.error("Fetch group students error", error);
        }
    };

    const fetchGroups = async () => {
        setIsLoading(true);
        try {
            const data = await apiClient.get('/groups');
            setGroups(data);
            if (data.length > 0 && !selectedGroupId) {
                // Select first root group
                const rootGroup = data.find((g: Group) => !g.parentId);
                if (rootGroup) setSelectedGroupId(rootGroup.id);
            }
        } catch (error) {
            console.error("Fetch groups error", error);
            toast({ title: 'Hata', description: 'Gruplar getirilemedi.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (payload: any) => {
        try {
            await apiClient.post('/groups', { ...payload, parentId: createParentId });
            toast({ title: 'Başarılı', description: 'Grup oluşturuldu' });
            setIsCreateOpen(false);
            setCreateParentId(undefined);
            fetchGroups();
        } catch (error: any) {
            toast({ title: 'Hata', description: error.message || 'Grup oluşturulamadı', variant: 'destructive' });
            throw error;
        }
    };

    const handleEdit = async (payload: any) => {
        if (!selectedGroupId) return;
        try {
            await apiClient.patch(`/groups/${selectedGroupId}`, payload);
            toast({ title: 'Başarılı', description: 'Grup güncellendi' });
            setIsEditOpen(false);
            fetchGroups();
        } catch (error: any) {
            toast({ title: 'Hata', description: error.message || 'Grup güncellenemedi', variant: 'destructive' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Bu grubu silmek istediğinizden emin misiniz?')) return;
        try {
            await apiClient.delete(`/groups/${id}`);
            toast({ title: 'Başarılı', description: 'Grup silindi' });
            if (selectedGroupId === id) setSelectedGroupId(null);
            fetchGroups();
        } catch (error) {
            toast({ title: 'Hata', description: 'Grup silinemedi', variant: 'destructive' });
        }
    };

    const handleToggleExamArea = async (examAreaId: string, isCurrentlyAssigned: boolean) => {
        if (!selectedGroupId) return;
        setExamAreaActionLoading(examAreaId);
        try {
            if (isCurrentlyAssigned) {
                await apiClient.delete(`/exam-areas/${examAreaId}/groups/${selectedGroupId}`);
                toast({ title: 'Soru bankası gruptan çıkarıldı' });
            } else {
                await apiClient.post(`/exam-areas/${examAreaId}/groups/${selectedGroupId}`);
                toast({ title: 'Soru bankası gruba atandı' });
            }
            await fetchGroups(); // Refresh groups to get updated exams
            await fetchAllExamAreas(); // Update exam areas list so checkboxes reflect the change
        } catch (error) {
            toast({ title: 'İşlem başarısız', variant: 'destructive' });
        } finally {
            setExamAreaActionLoading(null);
        }
    };

    const handleSettingsSave = async () => {
        if (!selectedGroupId) return;
        setIsSavingSettings(true);
        try {
            const payload = { ...settingsFormData };
            if (!payload.endDate) delete (payload as any).endDate;
            
            await apiClient.patch(`/groups/${selectedGroupId}`, payload);
            toast({ title: 'Başarılı', description: 'Grup ayarları güncellendi' });
            fetchGroups();
        } catch (error: any) {
            toast({ title: 'Hata', description: error.message || 'Grup güncellenemedi', variant: 'destructive' });
        } finally {
            setIsSavingSettings(false);
        }
    };

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'ONLINE': return <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-200"><Video className="w-3 h-3 mr-1"/> Canlı</Badge>;
            case 'CAMP': return <Badge variant="secondary" className="bg-orange-50 text-orange-600 border-orange-200"><Tent className="w-3 h-3 mr-1"/> Kamp</Badge>;
            case 'OFFLINE': 
            default: return <Badge variant="secondary" className="bg-slate-50 text-slate-600 border-slate-200"><Users className="w-3 h-3 mr-1"/> Offline</Badge>;
        }
    };

    // Recursive Tree Node Renderer
    const renderTree = (group: Group, depth = 0) => {
        const children = getChildren(group.id);
        const hasChildren = children.length > 0;
        const isExpanded = expandedIds.has(group.id);
        const isSelected = selectedGroupId === group.id;

        // Apply search filter (if search query exists, expand automatically or filter)
        if (searchQuery && !group.name.toLowerCase().includes(searchQuery.toLowerCase()) && !children.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))) {
            return null;
        }

        return (
            <div key={group.id} className="w-full">
                <div 
                    onClick={() => setSelectedGroupId(group.id)}
                    className={cn(
                        "group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all border border-transparent",
                        isSelected ? "bg-primary/5 border-primary/20 shadow-sm" : "hover:bg-muted"
                    )}
                    style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
                >
                    <div className="w-5 flex justify-center">
                        {hasChildren ? (
                            <button onClick={(e) => toggleExpand(group.id, e)} className="p-1 hover:bg-slate-200 rounded text-slate-500">
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                        ) : (
                            <span className="w-2 h-2 rounded-full bg-slate-300" />
                        )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <span className={cn("font-medium truncate", isSelected ? "text-primary" : "text-slate-700")}>
                                {group.name}
                            </span>
                            
                            {/* Quick Actions (Show on hover) */}
                            {user?.role !== 'STUDENT' && (
                                <div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity ml-2 shrink-0">
                                    <button 
                                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
                                        onClick={(e) => { e.stopPropagation(); setCreateParentId(group.id); setIsCreateOpen(true); }}
                                        title="Alt Grup Ekle"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                        onClick={(e) => { e.stopPropagation(); setSelectedGroupId(group.id); setIsEditOpen(true); }}
                                        title="Düzenle"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                        onClick={(e) => { e.stopPropagation(); handleDelete(group.id); }}
                                        title="Sil"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                            <span>{group._count.students} üye</span>
                            <span>•</span>
                            <span>{group._count.examAreas || 0} soru bankası</span>
                            <span>•</span>
                            {getTypeBadge(group.type)}
                        </div>
                    </div>
                </div>

                {hasChildren && isExpanded && (
                    <div className="mt-1">
                        {children.map(child => renderTree(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col md:flex-row h-[calc(100vh-6rem)] gap-6">
                
                {/* Left Sidebar (Tree View) */}
                <Card className="w-full md:w-80 flex flex-col shadow-sm border-slate-200 overflow-hidden bg-white shrink-0">
                    <div className="p-4 border-b space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-lg text-slate-800">Gruplar</h2>
                            {user?.role !== 'STUDENT' && (
                                <Button size="sm" onClick={() => { setCreateParentId(undefined); setIsCreateOpen(true); }} className="h-8">
                                    <Plus className="h-4 w-4 mr-1" /> Yeni Grup
                                </Button>
                            )}
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Grup ara..." 
                                className="pl-9 bg-slate-50 border-slate-200"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {rootGroups.map(group => renderTree(group, 0))}
                        
                        {groups.length === 0 && !isLoading && (
                            <div className="text-center p-8 text-muted-foreground text-sm">
                                Hiç grup bulunamadı.
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t bg-slate-50 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{rootGroups.length} grup • {groups.length - rootGroups.length} alt grup</span>
                    </div>
                </Card>

                {/* Right Content Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {selectedGroup ? (
                        <Card className="flex-1 flex flex-col shadow-sm border-slate-200 overflow-hidden bg-white">
                            {/* Header */}
                            <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-xl font-bold text-slate-800">{selectedGroup.name}</h2>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1.5 text-sm">
                                            <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 font-normal">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                                                {selectedGroup._count.students} üye
                                            </Badge>
                                            <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200 font-normal">
                                                {selectedGroup._count.examAreas || 0} soru bankası
                                            </Badge>
                                            {getTypeBadge(selectedGroup.type)}
                                        </div>
                                    </div>
                                </div>

                                {user?.role !== 'STUDENT' && (
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={() => { setCreateParentId(selectedGroup.id); setIsCreateOpen(true); }} className="text-slate-600">
                                            <Plus className="w-4 h-4 mr-2" /> Alt Grup Ekle
                                        </Button>
                                        <Button variant="outline" size="sm" className="text-slate-600" onClick={() => setIsEditOpen(true)}>
                                            <Edit2 className="w-4 h-4 mr-2" /> Düzenle
                                        </Button>
                                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(selectedGroup.id)}>
                                            <Trash2 className="w-4 h-4 mr-2" /> Sil
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Tabs Area */}
                            <div className="flex-1 p-6 bg-slate-50/50 overflow-y-auto">
                                <Tabs defaultValue="members" className="w-full">
                                    <div className="flex justify-center sm:justify-start">
                                        <TabsList className="grid w-full max-w-md grid-cols-3 mb-6 bg-slate-200/50 p-1 rounded-lg">
                                            <TabsTrigger value="members" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"><Users className="w-4 h-4 mr-2"/> Üyeler</TabsTrigger>
                                            <TabsTrigger value="lessons" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"><BookOpen className="w-4 h-4 mr-2"/> Soru Bankaları</TabsTrigger>
                                            <TabsTrigger value="settings" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"><Settings className="w-4 h-4 mr-2"/> Ayarlar</TabsTrigger>
                                        </TabsList>
                                    </div>
                                    
                                    <TabsContent value="members" className="space-y-4">
                                        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                            <div className="relative w-64 sm:w-80">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input placeholder="Üyelerde ara..." className="pl-9 h-9 border-slate-200 bg-slate-50" />
                                            </div>
                                            {user?.role !== 'STUDENT' && (
                                                <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg" onClick={() => setIsAddMemberOpen(true)}>
                                                    <Plus className="w-4 h-4 mr-2"/> Üye Ekle
                                                </Button>
                                            )}
                                        </div>
                                        
                                        <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden">
                                            <div className="divide-y divide-slate-100">
                                                {groupStudents.map((student: any) => (
                                                    <div key={student.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-semibold text-xs border border-slate-200 uppercase">
                                                                {student.firstName[0]}{student.lastName[0]}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-sm text-slate-700">{student.firstName} {student.lastName}</div>
                                                                <div className="text-xs text-muted-foreground">{student.email}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                            <Badge variant="outline" className="font-normal text-slate-500">Öğrenci</Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                                
                                                {groupStudents.length === 0 && (
                                                    <div className="p-8 text-center text-sm text-muted-foreground">
                                                        Bu grupta henüz üye bulunmuyor.
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3 border-t bg-slate-50 text-xs text-muted-foreground flex justify-between items-center">
                                                <span>Göster: {groupStudents.length}</span>
                                                <span>Toplam {selectedGroup._count.students} kayıt</span>
                                            </div>
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="lessons" className="space-y-4">
                                        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                            <div className="relative w-64 sm:w-80">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input placeholder="Soru bankası ara..." className="pl-9 h-9 border-slate-200 bg-slate-50" />
                                            </div>
                                            {user?.role !== 'STUDENT' && (
                                                <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg" onClick={() => setIsAddContentOpen(true)}>
                                                    <Plus className="w-4 h-4 mr-2"/> Soru Bankası Ekle / Çıkar
                                                </Button>
                                            )}
                                        </div>
                                        
                                        <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden">
                                            <div className="divide-y divide-slate-100">
                                                {allExamAreas.filter((area: any) => area.groups?.some((g: any) => g.id === selectedGroupId)).map((area: any) => (
                                                    <div key={area.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-xs border border-blue-100">
                                                                <BookOpen className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-sm text-slate-700">{area.name}</div>
                                                                <div className="text-xs text-muted-foreground line-clamp-1">{area.description || 'Açıklama yok'}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                            <Badge variant="outline" className="font-normal text-slate-500">{area._count?.questions || 0} Soru</Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                                
                                                {allExamAreas.filter((area: any) => area.groups?.some((g: any) => g.id === selectedGroupId)).length === 0 && (
                                                    <div className="p-8 text-center text-sm text-muted-foreground">
                                                        Bu gruba atanmış herhangi bir soru bankası bulunmuyor.
                                                    </div>
                                                )}
                                            </div>
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="settings">
                                        <Card className="p-6 shadow-sm border-slate-200 rounded-xl">
                                            <div className="space-y-6">
                                                <div>
                                                    <h3 className="text-lg font-medium">Grup Ayarları</h3>
                                                    <p className="text-sm text-muted-foreground">Grubun temel bilgilerini güncelleyin.</p>
                                                </div>
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="name">Grup Adı</Label>
                                                        <Input 
                                                            id="name" 
                                                            value={settingsFormData.name} 
                                                            onChange={(e) => setSettingsFormData({...settingsFormData, name: e.target.value})} 
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="code">Grup Kodu</Label>
                                                        <Input 
                                                            id="code" 
                                                            value={settingsFormData.code} 
                                                            onChange={(e) => setSettingsFormData({...settingsFormData, code: e.target.value})} 
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="description">Açıklama</Label>
                                                    <Textarea 
                                                        id="description" 
                                                        value={settingsFormData.description} 
                                                        onChange={(e) => setSettingsFormData({...settingsFormData, description: e.target.value})} 
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="endDate">Son Kullanma Tarihi (Opsiyonel)</Label>
                                                    <Input 
                                                        id="endDate" 
                                                        type="date"
                                                        value={settingsFormData.endDate} 
                                                        onChange={(e) => setSettingsFormData({...settingsFormData, endDate: e.target.value})} 
                                                    />
                                                    <p className="text-xs text-muted-foreground">Bu tarih geçtiğinde grup (ve sadece bu gruba kayıtlı öğrenciler) otomatik olarak pasife alınır.</p>
                                                </div>
                                                <div className="flex items-center justify-between rounded-lg border p-4">
                                                    <div className="space-y-0.5">
                                                        <Label className="text-base">Grup Durumu (Aktif/Pasif)</Label>
                                                        <p className="text-sm text-muted-foreground">
                                                            Grubu pasife alırsanız, öğrenciler gruba erişemez.
                                                        </p>
                                                    </div>
                                                    <div className="flex bg-slate-100 p-1 rounded-lg w-full max-w-[200px]">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSettingsFormData({...settingsFormData, isActive: true})}
                                                            className={cn(
                                                                "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                                                                settingsFormData.isActive 
                                                                    ? "bg-white text-slate-900 shadow-sm" 
                                                                    : "text-slate-500 hover:text-slate-900"
                                                            )}
                                                        >
                                                            Aktif
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSettingsFormData({...settingsFormData, isActive: false})}
                                                            className={cn(
                                                                "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                                                                !settingsFormData.isActive 
                                                                    ? "bg-white text-slate-900 shadow-sm" 
                                                                    : "text-slate-500 hover:text-slate-900"
                                                            )}
                                                        >
                                                            Pasif
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end pt-4 border-t">
                                                    <Button onClick={handleSettingsSave} disabled={isSavingSettings}>
                                                        {isSavingSettings && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                        Değişiklikleri Kaydet
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                        
                                        {/* Danger Zone */}
                                        <Card className="mt-6 p-6 border-red-200 bg-red-50/50 rounded-xl">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                <div>
                                                    <h3 className="text-lg font-medium text-red-800">Tehlikeli Bölge</h3>
                                                    <p className="text-sm text-red-600/80">Grubu sildiğinizde, içindeki tüm atamalar ve veriler kalıcı olarak silinir. Bu işlem geri alınamaz.</p>
                                                </div>
                                                <Button variant="destructive" onClick={() => handleDelete(selectedGroup.id)} className="shrink-0">
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Grubu Kalıcı Olarak Sil
                                                </Button>
                                            </div>
                                        </Card>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </Card>
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                            <div className="text-center max-w-sm">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                                    <Users className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-700 mb-2">Grup Seçimi Yapın</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    Grup detaylarını görüntülemek ve yönetmek için sol menüdeki listeden bir grup seçin veya sağ üstten yeni grup ekleyin.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <CreateGroupModal
                    open={isCreateOpen}
                    onOpenChange={setIsCreateOpen}
                    onSubmit={handleCreate}
                />
                
                {selectedGroup && (
                    <CreateGroupModal
                        open={isEditOpen}
                        onOpenChange={setIsEditOpen}
                        onSubmit={handleEdit}
                        initialData={selectedGroup}
                    />
                )}

                {selectedGroup && (
                    <AddMemberModal
                        open={isAddMemberOpen}
                        onOpenChange={setIsAddMemberOpen}
                        groupId={selectedGroup.id}
                        onSuccess={() => {
                            fetchGroupStudents(selectedGroup.id);
                            fetchGroups(); // refresh counts
                        }}
                    />
                )}

                <Dialog open={isAddContentOpen} onOpenChange={setIsAddContentOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Soru Bankası Ekle / Çıkar</DialogTitle>
                            <DialogDescription>
                                Bu gruba erişimi olacak soru bankalarını seçin. Seçtiğiniz soru bankaları anında gruba atanır veya gruptan çıkarılır.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="py-4">
                            <ScrollArea className="h-64 rounded-md border p-4">
                                {allExamAreas.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-8">
                                        Henüz sistemde soru bankası bulunmuyor.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {allExamAreas.map((area) => {
                                            const isAssigned = area.groups?.some((g: any) => g.id === selectedGroupId);
                                            const isActionLoading = examAreaActionLoading === area.id;

                                            return (
                                                <div key={area.id} className="flex flex-row items-start space-x-3 space-y-0">
                                                    <Checkbox
                                                        id={`area-${area.id}`}
                                                        checked={isAssigned}
                                                        disabled={isActionLoading}
                                                        onCheckedChange={() => handleToggleExamArea(area.id, isAssigned)}
                                                    />
                                                    <div className="space-y-1 leading-none">
                                                        <Label
                                                            htmlFor={`area-${area.id}`}
                                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                        >
                                                            {area.name}
                                                            {isActionLoading && <Loader2 className="inline ml-2 h-3 w-3 animate-spin" />}
                                                        </Label>
                                                        <p className="text-xs text-muted-foreground">
                                                            {area.description || 'Açıklama yok'}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                        
                        <DialogFooter>
                            <Button onClick={() => setIsAddContentOpen(false)}>Kapat</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
