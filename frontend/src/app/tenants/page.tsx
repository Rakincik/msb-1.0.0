'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { API_URL } from '@/lib/api-config';
import {
    Plus,
    Building2,
    Search,
    Edit,
    Trash,
    Loader2,
    CheckCircle2,
    XCircle,
    Activity,
    UserPlus,
    ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from '@/components/ui/sheet';

interface Tenant {
    id: string;
    name: string;
    slug: string;
    logo?: string;
    isActive: boolean;
    createdAt: string;
    _count?: {
        users: number;
    };
}

function CreateTenantSheet({
    isOpen,
    onOpenChange,
    onSuccess,
    accessToken,
    editingTenant,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    accessToken?: string;
    editingTenant: Tenant | null;
}) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        isActive: true,
    });

    useEffect(() => {
        if (editingTenant) {
            setFormData({
                name: editingTenant.name,
                slug: editingTenant.slug,
                isActive: editingTenant.isActive,
            });
        } else {
            setFormData({ name: '', slug: '', isActive: true });
        }
    }, [editingTenant, isOpen]);

    const generateSlug = (text: string) => {
        return text
            .toString()
            .toLowerCase()
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        setFormData(prev => ({
            ...prev,
            name,
            slug: editingTenant ? prev.slug : generateSlug(name)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const url = editingTenant
                ? `${API_URL}/tenants/${editingTenant.id}`
                : `${API_URL}/tenants`;
            
            const method = editingTenant ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Bir hata oluştu');
            }

            toast({
                title: 'Başarılı',
                description: `Kurum başarıyla ${editingTenant ? 'güncellendi' : 'oluşturuldu'}.`,
            });
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: 'Hata',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md bg-slate-50 border-l-0 shadow-apple-2xl">
                <SheetHeader className="pb-6 border-b border-slate-200">
                    <SheetTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Building2 className="h-6 w-6 text-indigo-500" />
                        {editingTenant ? 'Kurumu Düzenle' : 'Yeni Kurum Ekle'}
                    </SheetTitle>
                    <SheetDescription className="text-slate-500">
                        Sistemi kullanacak yeni bir kurum (tenant) tanımlayın.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="py-6 space-y-6">
                    <div className="space-y-3">
                        <Label className="text-base font-semibold text-slate-700">Kurum Adı</Label>
                        <Input
                            placeholder="Örn: Limit Akademi"
                            value={formData.name}
                            onChange={handleNameChange}
                            required
                            className="bg-white border-slate-200"
                        />
                    </div>

                    <div className="space-y-3">
                        <Label className="text-base font-semibold text-slate-700">Kurum Kodu (Slug)</Label>
                        <Input
                            placeholder="ornek-kurum"
                            value={formData.slug}
                            onChange={(e) => setFormData(prev => ({ ...prev, slug: generateSlug(e.target.value) }))}
                            required
                            className="bg-white border-slate-200"
                            disabled={!!editingTenant} // Slug genelde sonradan değişmez
                        />
                        <p className="text-xs text-slate-500">Sadece küçük harf, rakam ve tire içerebilir. Kuruma özel linklerde kullanılabilir.</p>
                    </div>

                    <SheetFooter className="mt-8 border-t border-slate-200 pt-6">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            İptal
                        </Button>
                        <Button type="submit" disabled={isLoading || !formData.name || !formData.slug} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingTenant ? 'Güncelle' : 'Oluştur'}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}

function AssignAdminSheet({
    isOpen,
    onOpenChange,
    tenant,
    accessToken,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    tenant: Tenant | null;
    accessToken?: string;
}) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({ firstName: '', lastName: '', email: '', phone: '', password: '' });
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenant) return;
        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    ...formData,
                    role: 'ADMIN',
                    tenantId: tenant.id,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Kullanıcı oluşturulamadı');
            }

            toast({
                title: 'Başarılı',
                description: `${tenant.name} için Admin hesabı oluşturuldu.`,
            });
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: 'Hata',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md bg-slate-50 border-l-0 shadow-apple-2xl">
                <SheetHeader className="pb-6 border-b border-slate-200">
                    <SheetTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <ShieldCheck className="h-6 w-6 text-emerald-500" />
                        Admin Ata
                    </SheetTitle>
                    <SheetDescription className="text-slate-500">
                        <span className="font-semibold text-indigo-600">{tenant?.name}</span> kurumu için tam yetkili bir yönetici (Admin) oluşturun.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="py-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Ad</Label>
                            <Input
                                required
                                value={formData.firstName}
                                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Soyad</Label>
                            <Input
                                required
                                value={formData.lastName}
                                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                            type="email"
                            required
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Telefon</Label>
                        <Input
                            required
                            placeholder="Örn: 05551234567"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Giriş Şifresi</Label>
                        <Input
                            required
                            type="password"
                            placeholder="Admin için şifre belirleyin"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <SheetFooter className="mt-8 border-t border-slate-200 pt-6">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
                        <Button type="submit" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                            Admin Oluştur
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}

export default function TenantsPage() {
    const { accessToken } = useAuth();
    const { toast } = useToast();
    
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

    const [isAdminSheetOpen, setIsAdminSheetOpen] = useState(false);
    const [selectedAdminTenant, setSelectedAdminTenant] = useState<Tenant | null>(null);

    const fetchTenants = useCallback(async () => {
        if (!accessToken) return;
        try {
            setIsLoading(true);
            const res = await fetch(`${API_URL}/tenants`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!res.ok) throw new Error('Kurumlar getirilemedi');
            const data = await res.json();
            setTenants(data.data || []);
        } catch (error: any) {
            toast({ title: 'Hata', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [accessToken, toast]);

    useEffect(() => {
        fetchTenants();
    }, [fetchTenants]);

    const openCreate = () => {
        setEditingTenant(null);
        setIsSheetOpen(true);
    };

    const openEdit = (tenant: Tenant) => {
        setEditingTenant(tenant);
        setIsSheetOpen(true);
    };

    const openAdminSheet = (tenant: Tenant) => {
        setSelectedAdminTenant(tenant);
        setIsAdminSheetOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu kurumu silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) return;
        
        try {
            const res = await fetch(`${API_URL}/tenants/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!res.ok) throw new Error('Silme işlemi başarısız');
            
            toast({ title: 'Başarılı', description: 'Kurum silindi.' });
            fetchTenants();
        } catch (error: any) {
            toast({ title: 'Hata', description: error.message, variant: 'destructive' });
        }
    };

    const toggleStatus = async (tenant: Tenant) => {
        const action = tenant.isActive ? 'deactivate' : 'activate';
        try {
            const res = await fetch(`${API_URL}/tenants/${tenant.id}/${action}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!res.ok) throw new Error('Durum güncellenemedi');
            
            toast({ title: 'Başarılı', description: `Kurum durumu güncellendi.` });
            fetchTenants();
        } catch (error: any) {
            toast({ title: 'Hata', description: error.message, variant: 'destructive' });
        }
    };

    const filteredTenants = tenants.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* ═══ HEADER ═══ */}
                <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Kurum Yönetimi</h1>
                        <p className="text-slate-500 mt-1">
                            Sistemi kullanan alt kurumları (okul, dershane, akademi) yönetin.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-indigo-200 shadow-lg">
                            <Plus className="h-4 w-4" />
                            Yeni Kurum
                        </Button>
                    </div>
                </div>

                {/* ═══ SEARCH BARS ═══ */}
                <div className="flex bg-white p-3 rounded-2xl shadow-sm border border-slate-100 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Kurum adı veya kodu ile ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-transparent border-0 focus-visible:ring-0 shadow-none text-base"
                        />
                    </div>
                </div>

                {/* ═══ TABLE ═══ */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50/80 text-slate-500 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Kurum Adı</th>
                                    <th className="px-6 py-4">Sistem Kodu (Slug)</th>
                                    <th className="px-6 py-4">Kayıt Tarihi</th>
                                    <th className="px-6 py-4">Durum</th>
                                    <th className="px-6 py-4 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
                                            Yükleniyor...
                                        </td>
                                    </tr>
                                ) : filteredTenants.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                            <Building2 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                            Hiç kurum bulunamadı.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTenants.map((tenant) => (
                                        <tr key={tenant.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-slate-800">{tenant.name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-mono">
                                                    {tenant.slug}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {new Date(tenant.createdAt).toLocaleDateString('tr-TR')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button 
                                                    onClick={() => toggleStatus(tenant)}
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                                        tenant.isActive 
                                                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                                                        : 'bg-red-50 text-red-700 hover:bg-red-100'
                                                    }`}
                                                >
                                                    {tenant.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                                    {tenant.isActive ? 'Aktif' : 'Pasif'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="outline" size="sm" onClick={() => openAdminSheet(tenant)} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 gap-2 h-8 hidden sm:flex">
                                                        <ShieldCheck className="h-4 w-4" /> Admin Ata
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => openAdminSheet(tenant)} className="text-emerald-600 sm:hidden">
                                                        <ShieldCheck className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(tenant)} className="text-slate-400 hover:text-indigo-600 h-8 w-8">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(tenant.id)} className="text-slate-400 hover:text-red-600 h-8 w-8">
                                                        <Trash className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <CreateTenantSheet
                    isOpen={isSheetOpen}
                    onOpenChange={setIsSheetOpen}
                    onSuccess={fetchTenants}
                    accessToken={accessToken ?? undefined}
                    editingTenant={editingTenant}
                />

                <AssignAdminSheet
                    isOpen={isAdminSheetOpen}
                    onOpenChange={setIsAdminSheetOpen}
                    tenant={selectedAdminTenant}
                    accessToken={accessToken ?? undefined}
                />
            </div>
        </DashboardLayout>
    );
}
