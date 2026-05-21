'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
    Search, Plus, Download, Loader2, Users, UserCheck, UserX,
    Edit, Trash, Eye, X, RefreshCw, ChevronLeft, ChevronRight,
    ArrowUpDown, GraduationCap, Building, SlidersHorizontal,
    CheckCircle2, Hash, Mail, Phone, Shield, User, Lock, Upload, FileSpreadsheet
} from 'lucide-react';
import Link from 'next/link';
import { API_URL } from '@/lib/api-config';
import { cn } from '@/lib/utils';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT';
    tenantId?: string;
    classId?: string;
    isActive: boolean;
    lastLoginAt?: string;
    createdAt: string;
    tenant?: { id: string; name: string };
    class?: { id: string; name: string };
    groups?: { id: string; name: string }[];
    _count?: { examResults: number; questionProgress: number };
}

interface UsersResponse {
    data: User[];
    meta: {
        total: number;
        skip: number;
        take: number;
        hasMore: boolean;
    };
}

interface ClassItem {
    id: string;
    name: string;
}

interface TenantItem {
    id: string;
    name: string;
}

const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: 'Süper Admin',
    ADMIN: 'Admin',
    TEACHER: 'Öğretmen',
    STUDENT: 'Öğrenci',
};

const ROLE_COLORS: Record<string, string> = {
    SUPER_ADMIN: 'bg-red-500',
    ADMIN: 'bg-purple-500',
    TEACHER: 'bg-blue-500',
    STUDENT: 'bg-emerald-500',
};

const ROLE_DOT_COLORS: Record<string, string> = {
    SUPER_ADMIN: 'bg-red-400',
    ADMIN: 'bg-purple-400',
    TEACHER: 'bg-blue-400',
    STUDENT: 'bg-emerald-400',
};

// ═══════════ CREATE USER WIZARD ═══════════
function CreateUserSheet({
    isOpen,
    onOpenChange,
    onSuccess,
    editingUser,
    currentUserRole,
    accessToken,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    editingUser: User | null;
    currentUserRole?: string;
    accessToken?: string;
}) {
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [tenants, setTenants] = useState<TenantItem[]>([]);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        tcNo: '',
        password: '',
        role: 'STUDENT',
        classId: '',
        tenantId: '',
    });

    const totalSteps = currentUserRole === 'SUPER_ADMIN' ? 4 : 3;

    useEffect(() => {
        if (isOpen) {
            if (editingUser) {
                setFormData({
                    firstName: editingUser.firstName,
                    lastName: editingUser.lastName,
                    email: editingUser.email,
                    phone: editingUser.phone || '',
                    tcNo: '',
                    password: '',
                    role: editingUser.role,
                    classId: editingUser.classId || '',
                    tenantId: editingUser.tenantId || '',
                });
            } else {
                setFormData({
                    firstName: '', lastName: '', email: '', phone: '',
                    tcNo: '', password: '', role: 'STUDENT', classId: '', tenantId: ''
                });
            }
            setStep(1);
            fetchClasses();
            if (currentUserRole === 'SUPER_ADMIN') fetchTenants();
        }
    }, [isOpen, editingUser]);

    const fetchClasses = async () => {
        try {
            const res = await fetch(`${API_URL}/classes`, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (res.ok) { const data = await res.json(); setClasses(Array.isArray(data) ? data : data.data || []); }
        } catch { /* ignore */ }
    };

    const fetchTenants = async () => {
        try {
            const res = await fetch(`${API_URL}/tenants`, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (res.ok) { const data = await res.json(); setTenants(Array.isArray(data) ? data : data.data || []); }
        } catch { /* ignore */ }
    };

    const passwordStrength = (pwd: string) => {
        if (!pwd) return { score: 0, label: '', color: '' };
        let score = 0;
        if (pwd.length >= 6) score++;
        if (pwd.length >= 8) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;
        if (score <= 1) return { score: 20, label: 'Çok Zayıf', color: 'bg-red-500' };
        if (score === 2) return { score: 40, label: 'Zayıf', color: 'bg-orange-500' };
        if (score === 3) return { score: 60, label: 'Orta', color: 'bg-amber-500' };
        if (score === 4) return { score: 80, label: 'Güçlü', color: 'bg-emerald-500' };
        return { score: 100, label: 'Çok Güçlü', color: 'bg-green-500' };
    };

    const canProceed = () => {
        switch (step) {
            case 1: return formData.firstName.trim() && formData.lastName.trim() && formData.email.trim();
            case 2: return editingUser || formData.password.length >= 6;
            case 3:
                if (currentUserRole === 'SUPER_ADMIN') return true; // tenant step
                return true; // summary step for non-super_admin
            case 4: return true; // summary step for super_admin
            default: return false;
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const method = editingUser ? 'PATCH' : 'POST';
            const url = editingUser ? `${API_URL}/users/${editingUser.id}` : `${API_URL}/users`;

            const payload: any = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone || undefined,
                role: formData.role,
            };

            if (!editingUser) {
                payload.password = formData.password;
                if (formData.tcNo) payload.tcNo = formData.tcNo;
            }
            if (editingUser && formData.password) payload.password = formData.password;
            if (formData.classId) payload.classId = formData.classId;
            if (formData.tenantId && currentUserRole === 'SUPER_ADMIN') payload.tenantId = formData.tenantId;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'İşlem başarısız');
            }

            toast({ title: '✅ Başarılı', description: editingUser ? 'Kullanıcı güncellendi' : 'Kullanıcı oluşturuldu' });
            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            toast({ title: 'Hata', description: error.message || 'İşlem başarısız', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const pwdInfo = passwordStrength(formData.password);

    const getStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-5">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                                <User className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold">Kişisel Bilgiler</h3>
                                <p className="text-sm text-muted-foreground">Temel kullanıcı bilgilerini girin</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-firstName">Ad <span className="text-red-500">*</span></Label>
                                <Input id="create-firstName" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="Ahmet" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-lastName">Soyad <span className="text-red-500">*</span></Label>
                                <Input id="create-lastName" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="Yılmaz" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="create-email" className="flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5" /> Email <span className="text-red-500">*</span>
                            </Label>
                            <Input id="create-email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="ornek@email.com" disabled={!!editingUser} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="create-phone" className="flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5" /> Telefon
                            </Label>
                            <Input id="create-phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="05XX XXX XX XX" />
                        </div>

                        {!editingUser && (
                            <div className="space-y-2">
                                <Label htmlFor="create-tc" className="flex items-center gap-1.5">
                                    <Hash className="h-3.5 w-3.5" /> TC Kimlik No
                                </Label>
                                <Input id="create-tc" value={formData.tcNo} onChange={(e) => setFormData({ ...formData, tcNo: e.target.value.replace(/\D/g, '').slice(0, 11) })} placeholder="12345678901" maxLength={11} />
                                {formData.tcNo && formData.tcNo.length !== 11 && (
                                    <p className="text-xs text-amber-500">TC Kimlik No 11 haneli olmalıdır</p>
                                )}
                            </div>
                        )}
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-5">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                                <Shield className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold">Hesap Ayarları</h3>
                                <p className="text-sm text-muted-foreground">Şifre ve rol bilgilerini belirleyin</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="create-password" className="flex items-center gap-1.5">
                                <Lock className="h-3.5 w-3.5" />
                                {editingUser ? 'Yeni Şifre (boş bırakın değişmesin)' : 'Şifre'}
                                {!editingUser && <span className="text-red-500">*</span>}
                            </Label>
                            <Input id="create-password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" />
                            {formData.password && (
                                <div className="space-y-1.5 mt-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Şifre Gücü</span>
                                        <span className={cn("font-medium", pwdInfo.score >= 60 ? "text-emerald-600" : pwdInfo.score >= 40 ? "text-amber-500" : "text-red-500")}>
                                            {pwdInfo.label}
                                        </span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                        <div className={cn("h-full rounded-full transition-all duration-500", pwdInfo.color)} style={{ width: `${pwdInfo.score}%` }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Rol <span className="text-red-500">*</span></Label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { value: 'STUDENT', label: 'Öğrenci', icon: GraduationCap, color: 'emerald' },
                                    { value: 'TEACHER', label: 'Öğretmen', icon: Users, color: 'blue' },
                                    { value: 'ADMIN', label: 'Admin', icon: Shield, color: 'purple' },
                                    ...(currentUserRole === 'SUPER_ADMIN' ? [{ value: 'SUPER_ADMIN', label: 'Süper Admin', icon: Shield, color: 'red' }] : []),
                                ].map((role) => (
                                    <button
                                        key={role.value}
                                        type="button"
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                                            formData.role === role.value
                                                ? "border-primary bg-primary/5 shadow-sm"
                                                : "border-transparent bg-muted/30 hover:bg-muted/60"
                                        )}
                                        onClick={() => setFormData({ ...formData, role: role.value })}
                                    >
                                        <role.icon className={cn("h-5 w-5", `text-${role.color}-500`)} />
                                        <span className="font-medium text-sm">{role.label}</span>
                                        {formData.role === role.value && (
                                            <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 3:
                if (currentUserRole === 'SUPER_ADMIN') {
                    // Tenant & Class selection for SUPER_ADMIN
                    return (
                        <div className="space-y-5">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                                    <Building className="h-5 w-5 text-amber-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Kurum & Sınıf</h3>
                                    <p className="text-sm text-muted-foreground">Kullanıcıyı kuruma ve sınıfa atayın</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Kurum</Label>
                                <Select value={formData.tenantId} onValueChange={(v) => setFormData({ ...formData, tenantId: v })}>
                                    <SelectTrigger><SelectValue placeholder="Kurum seçin (opsiyonel)" /></SelectTrigger>
                                    <SelectContent>
                                        {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.role === 'STUDENT' && (
                                <div className="space-y-2">
                                    <Label>Sınıf</Label>
                                    <Select value={formData.classId} onValueChange={(v) => setFormData({ ...formData, classId: v })}>
                                        <SelectTrigger><SelectValue placeholder="Sınıf seçin (opsiyonel)" /></SelectTrigger>
                                        <SelectContent>
                                            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    );
                }
                // Summary step for non-SUPER_ADMIN (step 3 of 3)
                return renderSummary();

            case 4:
                // Summary step for SUPER_ADMIN (step 4 of 4)
                return renderSummary();

            default: return null;
        }
    };

    const renderSummary = () => (
        <div className="space-y-5">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                    <h3 className="font-semibold">Özet & Onay</h3>
                    <p className="text-sm text-muted-foreground">Bilgileri kontrol edip onaylayın</p>
                </div>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center gap-4 pb-3 border-b">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">
                            {formData.firstName[0]}{formData.lastName[0]}
                        </span>
                    </div>
                    <div>
                        <p className="font-bold">{formData.firstName} {formData.lastName}</p>
                        <p className="text-sm text-muted-foreground">{formData.email}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <span className="text-muted-foreground">Telefon:</span>
                        <p className="font-medium">{formData.phone || '-'}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Rol:</span>
                        <p className="font-medium">{ROLE_LABELS[formData.role]}</p>
                    </div>
                    {formData.tcNo && (
                        <div>
                            <span className="text-muted-foreground">TC No:</span>
                            <p className="font-medium font-mono">{formData.tcNo}</p>
                        </div>
                    )}
                    {formData.tenantId && currentUserRole === 'SUPER_ADMIN' && (
                        <div>
                            <span className="text-muted-foreground">Kurum:</span>
                            <p className="font-medium">{tenants.find(t => t.id === formData.tenantId)?.name || '-'}</p>
                        </div>
                    )}
                    {formData.classId && (
                        <div>
                            <span className="text-muted-foreground">Sınıf:</span>
                            <p className="font-medium">{classes.find(c => c.id === formData.classId)?.name || '-'}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const isSummaryStep = step === totalSteps;

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-lg overflow-y-auto">
                <SheetHeader className="pb-6">
                    <SheetTitle className="text-xl">
                        {editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
                    </SheetTitle>
                    <SheetDescription>
                        {editingUser ? 'Kullanıcı bilgilerini güncelleyin' : 'Adım adım yeni kullanıcı oluşturun'}
                    </SheetDescription>

                    {/* Step Indicator */}
                    <div className="flex items-center gap-2 mt-4">
                        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
                            <div key={s} className="flex items-center flex-1">
                                <div className={cn(
                                    "h-2 flex-1 rounded-full transition-all duration-300",
                                    s <= step ? "bg-primary" : "bg-muted"
                                )} />
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Adım {step} / {totalSteps}</p>
                </SheetHeader>

                <div className="py-2">
                    {getStepContent()}
                </div>

                <SheetFooter className="pt-6 flex gap-2">
                    {step > 1 && (
                        <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                            <ChevronLeft className="mr-1 h-4 w-4" /> Geri
                        </Button>
                    )}
                    {!isSummaryStep ? (
                        <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="flex-1">
                            İleri <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingUser ? 'Güncelle' : 'Kullanıcı Oluştur'}
                        </Button>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}


// ═══════════ BULK UPLOAD WIZARD ═══════════
function BulkUploadSheet({
    isOpen,
    onOpenChange,
    onSuccess,
    accessToken,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    accessToken?: string;
}) {
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [results, setResults] = useState<{ success: number; failed: number; errors: any[] } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResults(null);
        }
    };

    const handleDownloadTemplate = () => {
        const headers = ['Ad', 'Soyad', 'Email', 'Telefon', 'Rol'];
        const sampleRow = ['Ahmet', 'Yılmaz', 'ahmet@ornek.com', '5551234567', 'Öğrenci'];
        
        const csvContent = [headers.join(';'), sampleRow.map(cell => `"${cell}"`).join(';')].join('\n');
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ornek_kullanici_sablonu.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        setResults(null);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API_URL}/users/bulk-upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${accessToken}` },
                body: formData,
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.message || 'Yükleme başarısız');

            setResults(data);
            if (data.success > 0) {
                toast({ title: 'Başarılı', description: `${data.success} kullanıcı eklendi.` });
                onSuccess();
            } else {
                toast({ title: 'Hata', description: 'Hiç kullanıcı eklenemedi.', variant: 'destructive' });
            }
        } catch (error: any) {
            toast({ title: 'Hata', description: error.message, variant: 'destructive' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-slate-50 border-l-0 shadow-apple-2xl">
                <SheetHeader className="pb-6 border-b border-slate-200">
                    <SheetTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <FileSpreadsheet className="h-6 w-6 text-emerald-500" />
                        Excel ile Toplu Yükle
                    </SheetTitle>
                    <SheetDescription className="text-slate-500 text-base">
                        Öğrencileri veya öğretmenleri Excel listesinden tek seferde sisteme aktarın.
                    </SheetDescription>
                </SheetHeader>

                <div className="py-6 space-y-6">
                    <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-5 space-y-3">
                        <h4 className="font-semibold text-blue-800 flex items-center gap-2">
                            <Shield className="h-4 w-4" /> Önemli Bilgi
                        </h4>
                        <ul className="text-sm text-blue-700 space-y-2 list-disc list-inside">
                            <li>Sütun başlıkları: <strong>Ad, Soyad, Email, Telefon, Rol</strong> olmalıdır.</li>
                            <li>Şifreler <strong>telefonun son 6 hanesi</strong> olacaktır. Lütfen numarayı tam girin.</li>
                            <li>Kayıtlı e-postalar atlanacaktır.</li>
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold text-slate-700">Excel Dosyası Seç (.xlsx)</Label>
                            <Button type="button" variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50">
                                <Download className="h-4 w-4" /> Örnek Şablonu İndir
                            </Button>
                        </div>
                        <Input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} className="bg-white border-slate-200" />
                    </div>

                    {results && (
                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                            <h4 className="font-bold text-slate-800 border-b pb-2">Yükleme Sonuçları</h4>
                            <div className="flex gap-6">
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500">Başarılı</p>
                                    <p className="text-2xl font-bold text-emerald-600">{results.success}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500">Hatalı</p>
                                    <p className="text-2xl font-bold text-red-600">{results.failed}</p>
                                </div>
                            </div>
                            
                            {results.errors?.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <p className="text-sm font-semibold text-red-600 mb-2">Hatalar Detayı:</p>
                                    <div className="max-h-40 overflow-y-auto space-y-1 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        {results.errors.map((e, i) => (
                                            <div key={i}>
                                                <span className="font-semibold">Satır {e.row}:</span> {e.error}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <SheetFooter className="mt-8 border-t border-slate-200 pt-6">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Kapat</Button>
                    <Button onClick={handleUpload} disabled={!file || isUploading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yükleniyor...</> : <><Upload className="mr-2 h-4 w-4" /> Yüklemeyi Başlat</>}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

// ═══════════════════════════════════════
//  USERS PAGE
// ═══════════════════════════════════════
export default function UsersPage() {
    const { user: currentUser, accessToken } = useAuth();
    const { toast } = useToast();

    const [users, setUsers] = useState<User[]>([]);
    const [meta, setMeta] = useState({ total: 0, skip: 0, take: 25, hasMore: false });
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [sortBy, setSortBy] = useState<string>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    // Create/Edit Sheet
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            if (roleFilter && roleFilter !== 'all') params.append('role', roleFilter);
            if (statusFilter === 'active') params.append('isActive', 'true');
            if (statusFilter === 'inactive') params.append('isActive', 'false');
            params.append('skip', String((currentPage - 1) * pageSize));
            params.append('take', String(pageSize));
            params.append('sortBy', sortBy);
            params.append('sortOrder', sortOrder);

            const res = await fetch(`${API_URL}/users?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (!res.ok) throw new Error('Kullanıcılar alınamadı');
            const data = await res.json();
            setUsers(data.data || []);
            setMeta(data.meta || { total: 0, skip: 0, take: pageSize, hasMore: false });
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, roleFilter, statusFilter, sortBy, sortOrder, currentPage, pageSize, accessToken]);

    useEffect(() => {
        if (accessToken) fetchUsers();
    }, [fetchUsers, accessToken]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, roleFilter, statusFilter, sortBy, sortOrder, pageSize]);

    const openCreateSheet = () => {
        setEditingUser(null);
        setIsSheetOpen(true);
    };

    const openEditSheet = (user: User) => {
        setEditingUser(user);
        setIsSheetOpen(true);
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('Kullanıcı silinecek. Emin misiniz?')) return;
        try {
            const res = await fetch(`${API_URL}/users/${userId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
            if (!res.ok) throw new Error('Silinemedi');
            toast({ title: 'Başarılı', description: 'Kullanıcı silindi' });
            fetchUsers();
        } catch (error) {
            toast({ title: 'Hata', description: 'Kullanıcı silinemedi', variant: 'destructive' });
        }
    };

    const handleToggleStatus = async (userId: string, isActive: boolean) => {
        try {
            const endpoint = isActive ? 'deactivate' : 'activate';
            const res = await fetch(`${API_URL}/users/${userId}/${endpoint}`, { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` } });

            if (!res.ok) throw new Error('Durum değiştirilemedi');

            toast({
                title: 'Başarılı',
                description: isActive ? 'Kullanıcı devre dışı bırakıldı' : 'Kullanıcı aktifleştirildi'
            });
            fetchUsers();
        } catch (error) {
            toast({ title: 'Hata', description: 'Durum değiştirilemedi', variant: 'destructive' });
        }
    };

    const handleExportExcel = async () => {
        try {
            const headers = ['Ad', 'Soyad', 'Email', 'Telefon', 'Rol', 'Sınıf', 'Durum', 'Son Giriş', 'Kayıt Tarihi'];
            const rows = users.map(u => [
                u.firstName, u.lastName, u.email, u.phone || '',
                ROLE_LABELS[u.role], u.class?.name || '', u.isActive ? 'Aktif' : 'Pasif',
                u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('tr-TR') : '-',
                new Date(u.createdAt).toLocaleDateString('tr-TR'),
            ]);

            // Türkçe Excel uyarlaması: Ayırıcı olarak virgül yerine noktalı virgül (;) kullanılır
            const csvContent = [headers.join(';'), ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))].join('\n');
            const bom = '\uFEFF';
            const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kullanicilar_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            toast({ title: 'Başarılı', description: 'Excel dosyası indirildi' });
        } catch (error) {
            toast({ title: 'Hata', description: 'Dışa aktarılamadı', variant: 'destructive' });
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setRoleFilter('');
        setStatusFilter('');
        setSortBy('createdAt');
        setSortOrder('desc');
    };

    const toggleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    // Pagination
    const totalPages = Math.ceil(meta.total / pageSize);
    const hasFilters = searchQuery || (roleFilter && roleFilter !== 'all') || (statusFilter && statusFilter !== 'all');

    // Local stats from all loaded users — note: these only reflect current page in paginated view
    // For total counts we use meta.total from backend
    const roleCountFromPage = (r: string) => users.filter(u => u.role === r).length;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* ═══ HEADER ═══ */}
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Kullanıcılar</h1>
                        <p className="text-muted-foreground">
                            Toplam {meta.total} kullanıcıyı yönetin
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Excel'e Aktar</span>
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setIsBulkUploadOpen(true)} className="gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border-0">
                            <Upload className="h-4 w-4" />
                            <span className="hidden sm:inline">Toplu Yükle</span>
                        </Button>
                        <Button size="sm" onClick={openCreateSheet} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Yeni Kullanıcı
                        </Button>
                    </div>
                </div>

                {/* ═══ STAT CARDS ═══ */}
                <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
                    {[
                        { label: 'Toplam', icon: Users, value: meta.total, active: !roleFilter && !statusFilter, onClick: clearFilters, color: 'text-foreground' },
                        { label: 'Aktif', icon: UserCheck, value: '-', active: statusFilter === 'active', onClick: () => { setStatusFilter('active'); setRoleFilter(''); }, color: 'text-emerald-500', ring: 'ring-emerald-500', bg: 'bg-emerald-50/50' },
                        { label: 'Pasif', icon: UserX, value: '-', active: statusFilter === 'inactive', onClick: () => { setStatusFilter('inactive'); setRoleFilter(''); }, color: 'text-red-500', ring: 'ring-red-500', bg: 'bg-red-50/50' },
                        { label: 'Öğrenci', icon: GraduationCap, value: '-', active: roleFilter === 'STUDENT', onClick: () => { setRoleFilter('STUDENT'); setStatusFilter(''); }, color: 'text-blue-500', ring: 'ring-blue-500', bg: 'bg-blue-50/50' },
                        { label: 'Öğretmen', icon: Users, value: '-', active: roleFilter === 'TEACHER', onClick: () => { setRoleFilter('TEACHER'); setStatusFilter(''); }, color: 'text-purple-500', ring: 'ring-purple-500', bg: 'bg-purple-50/50' },
                    ].map((item, i) => (
                        <Card
                            key={i}
                            className={cn(
                                "cursor-pointer transition-all duration-200 hover:shadow-apple-md border-0 shadow-apple-sm",
                                item.active ? `ring-2 ${item.ring || 'ring-primary'} ${item.bg || 'bg-muted/30'}` : "hover:scale-[1.02]"
                            )}
                            onClick={item.onClick}
                        >
                            <CardContent className="pt-4 pb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.label}</p>
                                        <p className={cn("text-2xl font-bold mt-0.5", item.color)}>{item.value}</p>
                                    </div>
                                    <item.icon className={cn("h-5 w-5", item.color)} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* ═══ FILTERS ═══ */}
                <Card className="border-0 shadow-apple-sm">
                    <CardContent className="pt-4 pb-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="İsim, email veya telefon ara..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 bg-muted/30 border-0"
                                />
                            </div>
                            <Select value={roleFilter || 'all'} onValueChange={(v) => setRoleFilter(v === 'all' ? '' : v)}>
                                <SelectTrigger className="w-[150px] bg-muted/30 border-0">
                                    <SelectValue placeholder="Tüm Roller" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tüm Roller</SelectItem>
                                    <SelectItem value="STUDENT">Öğrenci</SelectItem>
                                    <SelectItem value="TEACHER">Öğretmen</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                    <SelectItem value="SUPER_ADMIN">Süper Admin</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
                                <SelectTrigger className="w-[140px] bg-muted/30 border-0">
                                    <SelectValue placeholder="Durum" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tüm Durumlar</SelectItem>
                                    <SelectItem value="active">Aktif</SelectItem>
                                    <SelectItem value="inactive">Pasif</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(v) => { const [field, order] = v.split('-'); setSortBy(field); setSortOrder(order as 'asc' | 'desc'); }}>
                                <SelectTrigger className="w-[170px] bg-muted/30 border-0">
                                    <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
                                    <SelectValue placeholder="Sıralama" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="createdAt-desc">En Yeni</SelectItem>
                                    <SelectItem value="createdAt-asc">En Eski</SelectItem>
                                    <SelectItem value="name-asc">İsim (A-Z)</SelectItem>
                                    <SelectItem value="name-desc">İsim (Z-A)</SelectItem>
                                    <SelectItem value="lastLogin-desc">Son Giriş</SelectItem>
                                </SelectContent>
                            </Select>
                            {hasFilters && (
                                <Button variant="ghost" size="icon" onClick={clearFilters} className="shrink-0">
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={fetchUsers} className="shrink-0">
                                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* ═══ TABLE ═══ */}
                <Card className="border-0 shadow-apple-md overflow-hidden">
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="p-6 space-y-4">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-1/3" />
                                            <Skeleton className="h-3 w-1/4" />
                                        </div>
                                        <Skeleton className="h-6 w-16 rounded-full" />
                                    </div>
                                ))}
                            </div>
                        ) : users.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                                    <Users className="h-8 w-8 opacity-50" />
                                </div>
                                <p className="font-medium">Kullanıcı bulunamadı</p>
                                <p className="text-sm text-muted-foreground/60 mt-1">Filtrelerinizi değiştirmeyi deneyin</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b bg-muted/30">
                                            <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                                                    Kullanıcı
                                                    {sortBy === 'name' && <ArrowUpDown className="h-3 w-3" />}
                                                </button>
                                            </th>
                                            <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                <button onClick={() => toggleSort('email')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                                                    Email
                                                    {sortBy === 'email' && <ArrowUpDown className="h-3 w-3" />}
                                                </button>
                                            </th>
                                            <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rol</th>
                                            <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grup</th>
                                            <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Durum</th>
                                            <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                <button onClick={() => toggleSort('lastLogin')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                                                    Son Giriş
                                                    {sortBy === 'lastLogin' && <ArrowUpDown className="h-3 w-3" />}
                                                </button>
                                            </th>
                                            <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user) => (
                                            <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors group">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-2 ring-white dark:ring-gray-900 shadow-sm">
                                                            <span className="text-sm font-semibold text-primary">
                                                                {user.firstName[0]}{user.lastName[0]}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <Link href={`/users/${user.id}`} className="font-medium hover:text-primary transition-colors">
                                                                {user.firstName} {user.lastName}
                                                            </Link>
                                                            {user.phone && (
                                                                <p className="text-xs text-muted-foreground">{user.phone}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm text-muted-foreground">{user.email}</td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("w-2 h-2 rounded-full", ROLE_DOT_COLORS[user.role])} />
                                                        <span className="text-sm font-medium">{ROLE_LABELS[user.role]}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {user.groups && user.groups.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {user.groups.slice(0, 2).map((g) => (
                                                                <Badge key={g.id} variant="outline" className="text-xs font-normal">{g.name}</Badge>
                                                            ))}
                                                            {user.groups.length > 2 && (
                                                                <Badge variant="outline" className="text-xs font-normal text-muted-foreground">+{user.groups.length - 2}</Badge>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground/50">—</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-xs",
                                                            user.isActive
                                                                ? "border-emerald-200 text-emerald-600 bg-emerald-50/50"
                                                                : "border-red-200 text-red-500 bg-red-50/50"
                                                        )}
                                                    >
                                                        <div className={cn("w-1.5 h-1.5 rounded-full mr-1.5", user.isActive ? "bg-emerald-500" : "bg-red-400")} />
                                                        {user.isActive ? 'Aktif' : 'Pasif'}
                                                    </Badge>
                                                </td>
                                                <td className="p-4 text-sm text-muted-foreground">
                                                    {user.lastLoginAt
                                                        ? new Date(user.lastLoginAt).toLocaleDateString('tr-TR')
                                                        : <span className="text-muted-foreground/40">—</span>}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                            <Link href={`/users/${user.id}`}>
                                                                <Eye className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditSheet(user)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => handleToggleStatus(user.id, user.isActive)}
                                                        >
                                                            {user.isActive ? (
                                                                <UserX className="h-4 w-4 text-orange-500" />
                                                            ) : (
                                                                <UserCheck className="h-4 w-4 text-green-500" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                                            onClick={() => handleDelete(user.id)}
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ═══ PAGINATION ═══ */}
                {!isLoading && meta.total > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Sayfa başı:</span>
                            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                                <SelectTrigger className="w-[70px] h-8 bg-muted/30 border-0 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                            <span className="ml-2">
                                {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, meta.total)} / {meta.total}
                            </span>
                        </div>

                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                <ChevronLeft className="h-4 w-4 -ml-2" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            {/* Page Numbers */}
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let page;
                                if (totalPages <= 5) {
                                    page = i + 1;
                                } else if (currentPage <= 3) {
                                    page = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    page = totalPages - 4 + i;
                                } else {
                                    page = currentPage - 2 + i;
                                }
                                return (
                                    <Button
                                        key={page}
                                        variant={currentPage === page ? 'default' : 'outline'}
                                        size="icon"
                                        className="h-8 w-8 text-xs"
                                        onClick={() => setCurrentPage(page)}
                                    >
                                        {page}
                                    </Button>
                                );
                            })}

                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                                <ChevronRight className="h-4 w-4 -ml-2" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Create/Edit Sheet */}
                <CreateUserSheet
                    isOpen={isSheetOpen}
                    onOpenChange={setIsSheetOpen}
                    onSuccess={fetchUsers}
                    editingUser={editingUser}
                    currentUserRole={currentUser?.role}
                    accessToken={accessToken ?? undefined}
                />

                <BulkUploadSheet
                    isOpen={isBulkUploadOpen}
                    onOpenChange={setIsBulkUploadOpen}
                    onSuccess={fetchUsers}
                    accessToken={accessToken ?? undefined}
                />
            </div>
        </DashboardLayout>
    );
}
