'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
    ArrowLeft, User, Mail, Phone, Building, Calendar, Clock,
    Edit, Save, X, Loader2, Shield, BookOpen, Award, Activity,
    Target, TrendingUp, CheckCircle2, XCircle, BarChart3,
    GraduationCap, Users, FolderKanban, Minus, Hash, Key
} from 'lucide-react';
import Link from 'next/link';
import { API_URL } from '@/lib/api-config';
import { cn } from '@/lib/utils';

interface UserDetail {
    id: string;
    email: string;
    password?: string; // Hobi projesi: Şifre açık gösterilecek
    firstName: string;
    lastName: string;
    tcNo?: string;
    phone?: string;
    avatar?: string;
    role: string;
    tenantId?: string;
    classId?: string;
    isActive: boolean;
    lastLoginAt?: string;
    createdAt: string;
    updatedAt: string;
    tenant?: { id: string; name: string; slug: string };
    class?: { id: string; name: string; grade: string };
}

interface UserStats {
    totalQuestions: number;
    correctQuestions: number;
    totalExams: number;
    averageNet: number;
    examSuccessRate: number;
    questionSuccessRate: number;
    totalGroups: number;
}

interface ExamResult {
    id: string;
    correctCount: number;
    wrongCount: number;
    emptyCount: number;
    netScore: number;
    rawScore: number;
    scaledScore?: number;
    rank?: number;
    totalParticipants?: number;
    percentile?: number;
    startedAt: string;
    finishedAt?: string;
    duration?: number;
    createdAt: string;
    exam: { id: string; title: string; type: string; totalQuestions: number };
    topicAnalysis: {
        correctCount: number;
        wrongCount: number;
        emptyCount: number;
        successRate: number;
        topic: { id: string; name: string };
    }[];
}

interface UserActivity {
    recentExams: any[];
    recentSelfTests: any[];
    recentQuestions: any[];
    groups: { id: string; name: string; code: string; isActive: boolean }[];
    examAreas: { id: string; name: string; slug: string; icon?: string; color?: string }[];
}

const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: 'Süper Admin',
    ADMIN: 'Admin',
    TEACHER: 'Öğretmen',
    STUDENT: 'Öğrenci',
};

const ROLE_GRADIENTS: Record<string, string> = {
    SUPER_ADMIN: 'from-slate-800 to-gray-900',
    ADMIN: 'from-indigo-950 to-slate-900',
    TEACHER: 'from-blue-950 to-slate-900',
    STUDENT: 'from-slate-800 to-slate-900',
};

const ROLE_COLORS: Record<string, string> = {
    SUPER_ADMIN: 'bg-red-500',
    ADMIN: 'bg-purple-500',
    TEACHER: 'bg-blue-500',
    STUDENT: 'bg-green-500',
};

export default function UserDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user: currentUser, accessToken } = useAuth();
    const { toast } = useToast();

    const [user, setUser] = useState<UserDetail | null>(null);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [examResults, setExamResults] = useState<ExamResult[]>([]);
    const [activity, setActivity] = useState<UserActivity | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [availableGroups, setAvailableGroups] = useState<{id: string, name: string}[]>([]);
    const [selectedGroupToAssign, setSelectedGroupToAssign] = useState('');

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        password: '',
        role: '',
    });

    const fetchAllGroups = async () => {
        try {
            const res = await fetch(`${API_URL}/groups`, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (res.ok) {
                const data = await res.json();
                setAvailableGroups(Array.isArray(data) ? data : data.data || []);
            }
        } catch (error) {
            console.error('Groups fetch failed:', error);
        }
    };

    const handleAssignToGroup = async () => {
        if (!selectedGroupToAssign || !user) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/groups/${selectedGroupToAssign}/students`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({ studentIds: [user.id] })
            });
            if (!res.ok) throw new Error('Öğrenci gruba eklenemedi');
            toast({ title: 'Başarılı', description: 'Öğrenci gruba eklendi' });
            setSelectedGroupToAssign('');
            fetchActivity();
        } catch (error: any) {
            toast({ title: 'Hata', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveFromGroup = async (groupId: string) => {
        if (!user || !confirm('Öğrenciyi bu gruptan çıkarmak istediğinize emin misiniz?')) return;
        try {
            const res = await fetch(`${API_URL}/groups/${groupId}/students`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({ studentIds: [user.id] })
            });
            if (!res.ok) throw new Error('Öğrenci gruptan çıkarılamadı');
            toast({ title: 'Başarılı', description: 'Öğrenci gruptan çıkarıldı' });
            fetchActivity();
        } catch (error: any) {
            toast({ title: 'Hata', description: error.message, variant: 'destructive' });
        }
    };

    const fetchUser = async () => {
        try {
            const res = await fetch(`${API_URL}/users/${params.id}`, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (!res.ok) throw new Error('Kullanıcı bulunamadı');
            const data = await res.json();
            setUser(data);
            setFormData({
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                phone: data.phone || '',
                password: '',
                role: data.role || 'STUDENT',
            });
        } catch (error) {
            console.error(error);
            toast({ title: 'Hata', description: 'Kullanıcı bulunamadı', variant: 'destructive' });
            router.push('/users');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_URL}/users/${params.id}/stats`, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Stats fetch failed:', error);
        }
    };

    const fetchExamResults = async () => {
        try {
            const res = await fetch(`${API_URL}/users/${params.id}/exam-results`, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (res.ok) {
                const data = await res.json();
                setExamResults(data);
            }
        } catch (error) {
            console.error('Exam results fetch failed:', error);
        }
    };

    const fetchActivity = async () => {
        try {
            const res = await fetch(`${API_URL}/users/${params.id}/activity`, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (res.ok) {
                const data = await res.json();
                setActivity(data);
            }
        } catch (error) {
            console.error('Activity fetch failed:', error);
        }
    };

    useEffect(() => {
        if (accessToken) {
            fetchUser();
            fetchStats();
            fetchExamResults();
            fetchActivity();
        }
    }, [accessToken, params.id]);

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            const payload: any = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                role: formData.role,
            };
            if (formData.password) payload.password = formData.password;

            const res = await fetch(`${API_URL}/users/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Güncellenemedi');

            toast({ title: 'Başarılı', description: 'Kullanıcı güncellendi' });
            setIsEditing(false);
            fetchUser();
        } catch (error) {
            toast({ title: 'Hata', description: 'Kullanıcı güncellenemedi', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!user) return;
        try {
            const endpoint = user.isActive ? 'deactivate' : 'activate';
            const res = await fetch(`${API_URL}/users/${user.id}/${endpoint}`, { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` } });

            if (!res.ok) throw new Error('Durum değiştirilemedi');

            toast({
                title: 'Başarılı',
                description: user.isActive ? 'Kullanıcı devre dışı bırakıldı' : 'Kullanıcı aktifleştirildi'
            });
            fetchUser();
        } catch (error) {
            toast({ title: 'Hata', description: 'Durum değiştirilemedi', variant: 'destructive' });
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="space-y-6">
                    {/* Skeleton Hero */}
                    <div className="rounded-2xl bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700 p-8 animate-pulse">
                        <div className="flex items-center gap-6">
                            <Skeleton className="h-20 w-20 rounded-full" />
                            <div className="space-y-3">
                                <Skeleton className="h-8 w-64" />
                                <Skeleton className="h-4 w-48" />
                            </div>
                        </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                            <Skeleton key={i} className="h-28 rounded-xl" />
                        ))}
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!user) {
        return (
            <DashboardLayout>
                <div className="text-center py-12">
                    <p>Kullanıcı bulunamadı</p>
                </div>
            </DashboardLayout>
        );
    }

    const gradient = ROLE_GRADIENTS[user.role] || 'from-gray-500 to-gray-600';

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Back Button */}
                <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground hover:text-foreground">
                    <Link href="/users">
                        <ArrowLeft className="h-4 w-4" />
                        Kullanıcılara Dön
                    </Link>
                </Button>

                {/* ═══════════ HERO PROFILE CARD ═══════════ */}
                <div className={cn("relative rounded-2xl bg-gradient-to-r p-8 text-white overflow-hidden", gradient)}>
                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />

                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            {/* Avatar */}
                            <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-lg">
                                <span className="text-3xl font-bold">
                                    {user.firstName[0]}{user.lastName[0]}
                                </span>
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h1 className="text-3xl font-bold tracking-tight">
                                        {user.firstName} {user.lastName}
                                    </h1>
                                    <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                                        {ROLE_LABELS[user.role]}
                                    </Badge>
                                </div>
                                <p className="text-white/80 flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    {user.email}
                                </p>
                                {user.phone && (
                                    <p className="text-white/70 flex items-center gap-2 mt-0.5">
                                        <Phone className="h-3.5 w-3.5" />
                                        {user.phone}
                                    </p>
                                )}
                                <div className="flex items-center gap-3 mt-2">
                                    <Badge
                                        className={cn(
                                            "text-xs",
                                            user.isActive
                                                ? "bg-emerald-400/20 text-emerald-100 border-emerald-300/30"
                                                : "bg-red-400/20 text-red-100 border-red-300/30"
                                        )}
                                    >
                                        <div className={cn("w-1.5 h-1.5 rounded-full mr-1.5", user.isActive ? "bg-emerald-300" : "bg-red-300")} />
                                        {user.isActive ? 'Aktif' : 'Pasif'}
                                    </Badge>
                                    {user.tenant && (
                                        <span className="text-white/60 text-sm flex items-center gap-1">
                                            <Building className="h-3.5 w-3.5" />
                                            {user.tenant.name}
                                        </span>
                                    )}
                                    {user.class && (
                                        <span className="text-white/60 text-sm flex items-center gap-1">
                                            <GraduationCap className="h-3.5 w-3.5" />
                                            {user.class.name}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 self-start">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleToggleStatus}
                                className={cn(
                                    "border-white/30 text-white backdrop-blur-sm transition-all group",
                                    user.isActive 
                                        ? "bg-emerald-500/20 hover:bg-emerald-500/40" 
                                        : "bg-red-500/20 hover:bg-red-500/40"
                                )}
                            >
                                <div className={cn("w-2 h-2 rounded-full mr-2 shadow-[0_0_8px_rgba(0,0,0,0.5)]", user.isActive ? "bg-emerald-400 shadow-emerald-400/50" : "bg-red-400 shadow-red-400/50")} />
                                <span>{user.isActive ? 'Aktif' : 'Pasif'}</span>
                                <span className="ml-2 pl-2 border-l border-white/30 text-white/70 group-hover:text-white transition-colors text-xs font-medium">Değiştir</span>
                            </Button>
                            {!isEditing ? (
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        setIsEditing(true);
                                        setActiveTab('profile');
                                    }}
                                    className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                                >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Düzenle
                                </Button>
                            ) : (
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white">
                                        <X className="mr-1 h-4 w-4" /> İptal
                                    </Button>
                                    <Button size="sm" onClick={handleSave} disabled={isSubmitting} className="bg-white text-gray-900 hover:bg-white/90">
                                        {isSubmitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                                        Kaydet
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ═══════════ STATS CARDS ═══════════ */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card className="relative overflow-hidden border-0 shadow-apple-md hover:shadow-apple-lg transition-all duration-300">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground font-medium">Çözülen Soru</p>
                                    <p className="text-3xl font-bold mt-1">{stats?.totalQuestions ?? 0}</p>
                                    {stats && stats.totalQuestions > 0 && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {stats.correctQuestions} doğru
                                        </p>
                                    )}
                                </div>
                                <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                                    <Target className="h-6 w-6 text-blue-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden border-0 shadow-apple-md hover:shadow-apple-lg transition-all duration-300">
                        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground font-medium">Sınav Sayısı</p>
                                    <p className="text-3xl font-bold mt-1">{stats?.totalExams ?? 0}</p>
                                    {stats && stats.averageNet > 0 && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Ort. {stats.averageNet} net
                                        </p>
                                    )}
                                </div>
                                <div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                                    <BarChart3 className="h-6 w-6 text-purple-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden border-0 shadow-apple-md hover:shadow-apple-lg transition-all duration-300">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground font-medium">Başarı Oranı</p>
                                    <p className="text-3xl font-bold mt-1">
                                        %{stats?.questionSuccessRate ?? 0}
                                    </p>
                                    <div className="mt-2 w-full">
                                        <Progress value={stats?.questionSuccessRate ?? 0} className="h-1.5" />
                                    </div>
                                </div>
                                <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                                    <TrendingUp className="h-6 w-6 text-emerald-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden border-0 shadow-apple-md hover:shadow-apple-lg transition-all duration-300">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground font-medium">Grup Sayısı</p>
                                    <p className="text-3xl font-bold mt-1">{stats?.totalGroups ?? 0}</p>
                                    {activity && activity.examAreas.length > 0 && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {activity.examAreas.length} sınav alanı
                                        </p>
                                    )}
                                </div>
                                <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                                    <Users className="h-6 w-6 text-amber-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ═══════════ TABS ═══════════ */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-muted/30 p-1.5 h-auto flex-wrap justify-start rounded-2xl border">
                        <TabsTrigger value="profile" className="rounded-xl px-6 py-3 text-base gap-2.5 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:font-semibold transition-all">
                            <User className="h-5 w-5" />
                            Profil
                        </TabsTrigger>
                        <TabsTrigger value="performance" className="rounded-xl px-6 py-3 text-base gap-2.5 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:font-semibold transition-all">
                            <Award className="h-5 w-5" />
                            Performans
                        </TabsTrigger>
                        <TabsTrigger value="activity" className="rounded-xl px-6 py-3 text-base gap-2.5 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:font-semibold transition-all">
                            <Activity className="h-5 w-5" />
                            Aktivite
                        </TabsTrigger>
                        <TabsTrigger value="groups" className="rounded-xl px-6 py-3 text-base gap-2.5 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:font-semibold transition-all">
                            <FolderKanban className="h-5 w-5" />
                            Gruplar
                        </TabsTrigger>
                    </TabsList>

                    {/* ═══ PROFILE TAB ═══ */}
                    <TabsContent value="profile">
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Personal Info */}
                            <Card className="border-0 shadow-apple-md">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                                            <User className="h-4 w-4 text-blue-500" />
                                        </div>
                                        Kişisel Bilgiler
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Ad</Label>
                                            {isEditing ? (
                                                <Input
                                                    value={formData.firstName}
                                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                                />
                                            ) : (
                                                <p className="text-base font-medium">{user.firstName}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Soyad</Label>
                                            {isEditing ? (
                                                <Input
                                                    value={formData.lastName}
                                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                                />
                                            ) : (
                                                <p className="text-base font-medium">{user.lastName}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                <Mail className="h-3 w-3" /> Email
                                            </Label>
                                            <p className="text-base break-all">{user.email}</p>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                <Key className="h-3 w-3" /> Şifre
                                            </Label>
                                            {isEditing ? (
                                                <Input
                                                    type="password"
                                                    value={formData.password}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                    placeholder="Değiştirmek için girin"
                                                />
                                            ) : (
                                                <p className="text-base font-mono mt-1">
                                                    {user.password || <span className="text-muted-foreground italic">Eski Hashli Şifre</span>}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                <Phone className="h-3 w-3" /> Telefon
                                            </Label>
                                            {isEditing ? (
                                                <Input
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    placeholder="05XX XXX XX XX"
                                                />
                                            ) : (
                                                <p className="text-base">{user.phone || <span className="text-muted-foreground italic">Belirtilmemiş</span>}</p>
                                            )}
                                        </div>

                                        {user.tcNo && (
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                    <Hash className="h-3 w-3" /> TC No
                                                </Label>
                                                <p className="text-base font-mono">{user.tcNo}</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* System Info */}
                            <Card className="border-0 shadow-apple-md">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                                            <Shield className="h-4 w-4 text-purple-500" />
                                        </div>
                                        Sistem Bilgileri
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Rol</Label>
                                        {isEditing ? (
                                            <Select
                                                value={formData.role}
                                                onValueChange={(value) => setFormData({ ...formData, role: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="STUDENT">Öğrenci</SelectItem>
                                                    <SelectItem value="TEACHER">Öğretmen</SelectItem>
                                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                                    {currentUser?.role === 'SUPER_ADMIN' && (
                                                        <SelectItem value="SUPER_ADMIN">Süper Admin</SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Badge className={ROLE_COLORS[user.role]}>
                                                {ROLE_LABELS[user.role]}
                                            </Badge>
                                        )}
                                    </div>

                                    {user.tenant && (
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                <Building className="h-3 w-3" /> Kurum
                                            </Label>
                                            <p className="text-base font-medium">{user.tenant.name}</p>
                                        </div>
                                    )}

                                    {user.class && (
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                <BookOpen className="h-3 w-3" /> Sınıf
                                            </Label>
                                            <p className="text-base font-medium">{user.class.name}</p>
                                        </div>
                                    )}

                                    <div className="rounded-xl bg-muted/50 p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground flex items-center gap-2">
                                                <Clock className="h-3.5 w-3.5" /> Son Giriş
                                            </span>
                                            <span className="text-sm font-medium">
                                                {user.lastLoginAt
                                                    ? new Date(user.lastLoginAt).toLocaleString('tr-TR')
                                                    : 'Henüz giriş yapılmadı'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground flex items-center gap-2">
                                                <Calendar className="h-3.5 w-3.5" /> Kayıt Tarihi
                                            </span>
                                            <span className="text-sm font-medium">
                                                {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground flex items-center gap-2">
                                                <Calendar className="h-3.5 w-3.5" /> Son Güncelleme
                                            </span>
                                            <span className="text-sm font-medium">
                                                {new Date(user.updatedAt).toLocaleDateString('tr-TR')}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* ═══ PERFORMANCE TAB ═══ */}
                    <TabsContent value="performance">
                        <div className="space-y-6">
                            {/* Exam Results Table */}
                            <Card className="border-0 shadow-apple-md">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                                            <Award className="h-4 w-4 text-purple-500" />
                                        </div>
                                        Sınav Sonuçları
                                    </CardTitle>
                                    <CardDescription>
                                        Öğrencinin girdiği tüm sınavların sonuçları
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {examResults.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                                                <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
                                            </div>
                                            <p className="text-muted-foreground font-medium">Henüz sınav sonucu yok</p>
                                            <p className="text-sm text-muted-foreground/60 mt-1">Öğrenci sınava girdiğinde sonuçları burada görünecek</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b bg-muted/30">
                                                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sınav</th>
                                                        <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                            <span className="text-emerald-600">D</span>
                                                        </th>
                                                        <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                            <span className="text-red-500">Y</span>
                                                        </th>
                                                        <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                            <span className="text-gray-400">B</span>
                                                        </th>
                                                        <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net</th>
                                                        <th className="text-center p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sıralama</th>
                                                        <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tarih</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {examResults.map((result) => (
                                                        <tr key={result.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                                            <td className="p-3">
                                                                <p className="font-medium text-sm">{result.exam.title}</p>
                                                                <p className="text-xs text-muted-foreground">{result.exam.totalQuestions} soru</p>
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 text-sm font-bold">
                                                                    {result.correctCount}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 text-sm font-bold">
                                                                    {result.wrongCount}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-gray-50 dark:bg-gray-500/10 text-gray-400 text-sm font-bold">
                                                                    {result.emptyCount}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <span className="font-bold text-lg">{result.netScore}</span>
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                {result.rank ? (
                                                                    <span className="text-sm">
                                                                        <span className="font-bold">{result.rank}</span>
                                                                        <span className="text-muted-foreground">/{result.totalParticipants}</span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-muted-foreground text-sm">-</span>
                                                                )}
                                                            </td>
                                                            <td className="p-3 text-right text-sm text-muted-foreground">
                                                                {new Date(result.createdAt).toLocaleDateString('tr-TR')}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Topic Analysis (from latest exam) */}
                            {examResults.length > 0 && examResults[0].topicAnalysis.length > 0 && (
                                <Card className="border-0 shadow-apple-md">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                                                <BookOpen className="h-4 w-4 text-emerald-500" />
                                            </div>
                                            Konu Bazlı Analiz
                                        </CardTitle>
                                        <CardDescription>
                                            Son sınavdaki konu bazlı performans ({examResults[0].exam.title})
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {examResults[0].topicAnalysis.map((ta, idx) => {
                                                const total = ta.correctCount + ta.wrongCount + ta.emptyCount;
                                                return (
                                                    <div key={idx} className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-medium">{ta.topic.name}</span>
                                                            <div className="flex items-center gap-3 text-xs">
                                                                <span className="text-emerald-600 font-medium">{ta.correctCount}D</span>
                                                                <span className="text-red-500 font-medium">{ta.wrongCount}Y</span>
                                                                <span className="text-gray-400">{ta.emptyCount}B</span>
                                                                <Badge variant="outline" className={cn(
                                                                    "text-xs",
                                                                    ta.successRate >= 70 ? "border-emerald-200 text-emerald-600" :
                                                                        ta.successRate >= 40 ? "border-amber-200 text-amber-600" :
                                                                            "border-red-200 text-red-500"
                                                                )}>
                                                                    %{Math.round(ta.successRate)}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        <Progress
                                                            value={ta.successRate}
                                                            className={cn("h-2",
                                                                ta.successRate >= 70 ? "[&>div]:bg-emerald-500" :
                                                                    ta.successRate >= 40 ? "[&>div]:bg-amber-500" :
                                                                        "[&>div]:bg-red-500"
                                                            )}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </TabsContent>

                    {/* ═══ ACTIVITY TAB ═══ */}
                    <TabsContent value="activity">
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Recent Exams */}
                            <Card className="border-0 shadow-apple-md">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                                            <BarChart3 className="h-4 w-4 text-blue-500" />
                                        </div>
                                        Son Sınavlar
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {(!activity?.recentExams || activity.recentExams.length === 0) ? (
                                        <div className="text-center py-8">
                                            <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                                            <p className="text-sm text-muted-foreground">Henüz sınav kaydı yok</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {activity.recentExams.map((exam: any) => (
                                                <div key={exam.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                                    <div>
                                                        <p className="text-sm font-medium">{exam.exam.title}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(exam.createdAt).toLocaleDateString('tr-TR')}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-1.5">
                                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                                            <span className="text-sm font-medium text-emerald-600">{exam.correctCount}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <XCircle className="h-3.5 w-3.5 text-red-400" />
                                                            <span className="text-sm font-medium text-red-500">{exam.wrongCount}</span>
                                                        </div>
                                                        <Badge variant="outline" className="font-bold">{exam.netScore} net</Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Recent Self Tests */}
                            <Card className="border-0 shadow-apple-md">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                                            <Target className="h-4 w-4 text-amber-500" />
                                        </div>
                                        Kendi Kendine Testler
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {(!activity?.recentSelfTests || activity.recentSelfTests.length === 0) ? (
                                        <div className="text-center py-8">
                                            <Target className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                                            <p className="text-sm text-muted-foreground">Henüz test kaydı yok</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {activity.recentSelfTests.map((test: any) => {
                                                const total = test.correctCount + test.wrongCount + test.emptyCount;
                                                const rate = total > 0 ? Math.round((test.correctCount / total) * 100) : 0;
                                                return (
                                                    <div key={test.id} className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs text-muted-foreground">
                                                                {new Date(test.createdAt).toLocaleString('tr-TR')}
                                                            </span>
                                                            <Badge variant="outline" className={cn(
                                                                rate >= 70 ? "border-emerald-200 text-emerald-600" :
                                                                    rate >= 40 ? "border-amber-200 text-amber-600" :
                                                                        "border-red-200 text-red-500"
                                                            )}>
                                                                %{rate}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-sm">
                                                            <span className="text-emerald-600">{test.correctCount} D</span>
                                                            <span className="text-red-500">{test.wrongCount} Y</span>
                                                            <span className="text-gray-400">{test.emptyCount} B</span>
                                                        </div>
                                                        <Progress value={rate} className="h-1.5 mt-2" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* ═══ GROUPS TAB ═══ */}
                    <TabsContent value="groups">
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Groups */}
                            <Card className="border-0 shadow-apple-md">
                                <CardHeader>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <CardTitle className="flex items-center gap-2 text-lg">
                                                <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                                                    <Users className="h-4 w-4 text-indigo-500" />
                                                </div>
                                                Gruplar
                                            </CardTitle>
                                            <CardDescription className="mt-1.5">Öğrencinin dahil olduğu gruplar</CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Select value={selectedGroupToAssign} onValueChange={setSelectedGroupToAssign} onOpenChange={(open) => { if(open && availableGroups.length === 0) fetchAllGroups(); }}>
                                                <SelectTrigger className="w-[160px] h-9">
                                                    <SelectValue placeholder="Gruba Ekle..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableGroups.length === 0 ? (
                                                        <div className="p-2 text-sm text-muted-foreground text-center">Grup bulunamadı</div>
                                                    ) : (
                                                        availableGroups.map(g => (
                                                            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <Button size="sm" onClick={handleAssignToGroup} disabled={!selectedGroupToAssign || isSubmitting} className="h-9">
                                                Ekle
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {(!activity?.groups || activity.groups.length === 0) ? (
                                        <div className="text-center py-8">
                                            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                                            <p className="text-sm text-muted-foreground">Herhangi bir gruba dahil değil</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {activity.groups.map((group) => (
                                                <div key={group.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                                                            <Users className="h-5 w-5 text-indigo-500" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm">{group.name}</p>
                                                            <p className="text-xs text-muted-foreground font-mono">{group.code}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={group.isActive ? 'default' : 'secondary'}>
                                                            {group.isActive ? 'Aktif' : 'Pasif'}
                                                        </Badge>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => handleRemoveFromGroup(group.id)}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Exam Areas */}
                            <Card className="border-0 shadow-apple-md">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <div className="h-8 w-8 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                                            <FolderKanban className="h-4 w-4 text-violet-500" />
                                        </div>
                                        Sınav Alanları
                                    </CardTitle>
                                    <CardDescription>Öğrencinin atanmış olduğu sınav alanları</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {(!activity?.examAreas || activity.examAreas.length === 0) ? (
                                        <div className="text-center py-8">
                                            <FolderKanban className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                                            <p className="text-sm text-muted-foreground">Sınav alanı ataması yok</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {activity.examAreas.map((area) => (
                                                <div key={area.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                                    <div
                                                        className="h-10 w-10 rounded-lg flex items-center justify-center"
                                                        style={{ backgroundColor: area.color ? `${area.color}20` : '#8b5cf620' }}
                                                    >
                                                        <GraduationCap className="h-5 w-5" style={{ color: area.color || '#8b5cf6' }} />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{area.name}</p>
                                                        <p className="text-xs text-muted-foreground font-mono">{area.slug}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
