'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Users, FileQuestion, BarChart3, TrendingUp, TrendingDown,
    Activity, ClipboardList, Plus, BookOpen, FolderOpen,
    Zap, ArrowRight, CheckCircle2, FilePlus, Clock,
    Layers, Target, Sparkles, PenTool, FileText, Sun, Moon, CloudSun
} from 'lucide-react';
import { StudentExamAreaList } from '@/components/student/student-exam-area-list';
import { apiClient } from '@/lib/api-client';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

// ─── Greeting based on time ───
function getGreeting(): { text: string; icon: React.ReactNode } {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Günaydın', icon: <Sun className="h-5 w-5 text-amber-400" /> };
    if (hour < 18) return { text: 'İyi günler', icon: <CloudSun className="h-5 w-5 text-blue-400" /> };
    return { text: 'İyi akşamlar', icon: <Moon className="h-5 w-5 text-indigo-400" /> };
}

// ─── Time Ago ───
function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Az önce';
    if (minutes < 60) return `${minutes}dk önce`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}sa önce`;
    const days = Math.floor(hours / 24);
    return `${days}g önce`;
}

// ═══════════════════════════════════════
//  ADMIN DASHBOARD
// ═══════════════════════════════════════
function AdminDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const greeting = getGreeting();

    useEffect(() => {
        Promise.all([
            apiClient.get('/analytics/dashboard'),
            apiClient.get('/analytics/dashboard/activity').catch(() => [])
        ]).then(([dashData, actData]) => {
            setStats(dashData);
            setActivities(actData || []);
        }).catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-32 w-full rounded-2xl" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                    <Skeleton className="h-80 rounded-xl" />
                    <Skeleton className="h-80 rounded-xl" />
                </div>
            </div>
        );
    }

    const s = stats?.stats || {};
    const lessonStats = stats?.lessonStats || [];
    const difficultyData = stats?.difficultyData || [];

    return (
        <div className="space-y-6">
            {/* ═══════════ WELCOME BANNER ═══════════ */}
            <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm p-8">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-full -mr-20 -mt-20 blur-3xl opacity-70 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-emerald-50 to-teal-50/50 rounded-full -ml-20 -mb-20 blur-3xl opacity-70 pointer-events-none" />

                <div className="relative flex items-center justify-between flex-wrap gap-6">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                                {user?.firstName} {user?.lastName}
                            </span>
                        </h1>
                        <p className="text-slate-500 text-sm">Yönetim paneliniz ve bugünün özeti</p>
                    </div>

                    {/* Today's summary chips */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-3 bg-slate-50/80 border border-slate-100 rounded-xl px-4 py-3 shadow-sm transition-all hover:shadow hover:-translate-y-0.5">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Layers className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-medium">Toplam Soru</p>
                                <p className="text-lg font-bold text-slate-800">{s.questionCount?.toLocaleString('tr-TR') ?? '0'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50/80 border border-slate-100 rounded-xl px-4 py-3 shadow-sm transition-all hover:shadow hover:-translate-y-0.5">
                            <div className="p-2 bg-emerald-100 rounded-lg">
                                <Zap className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-medium">Bugün Çözülen</p>
                                <p className="text-lg font-bold text-slate-800">{s.todayProgressCount?.toLocaleString('tr-TR') ?? '0'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50/80 border border-slate-100 rounded-xl px-4 py-3 shadow-sm transition-all hover:shadow hover:-translate-y-0.5">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Users className="h-4 w-4 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-medium">Aktif / Toplam</p>
                                <p className="text-lg font-bold text-slate-800">{s.activeUserCount ?? '0'} <span className="text-xs font-medium text-slate-400">/ {s.totalUserCount ?? 0}</span></p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="relative flex items-center gap-3 mt-6 pt-6 border-t border-slate-100">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-2 h-10 px-5"
                        onClick={() => router.push('/questions')}>
                        <Plus className="h-4 w-4" /> Soru Ekle
                    </Button>
                    <Button size="sm" variant="outline"
                        className="border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm gap-2 h-10 px-5"
                        onClick={() => router.push('/exam-areas')}>
                        <FolderOpen className="h-4 w-4 text-slate-500" /> Soru Bankaları
                    </Button>
                    <Button size="sm" variant="outline"
                        className="border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm gap-2 h-10 px-5"
                        onClick={() => router.push('/analytics')}>
                        <BarChart3 className="h-4 w-4 text-slate-500" /> Raporlar
                    </Button>
                </div>
            </div>

            {/* ═══════════ KPI CARDS ═══════════ */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Soru Bankası */}
                <Card className="border shadow-sm hover:shadow-md transition-all cursor-pointer group bg-gradient-to-br from-amber-50/50 to-white"
                    onClick={() => router.push('/exam-areas')}>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-amber-100 rounded-xl">
                                <FolderOpen className="h-5 w-5 text-amber-600" />
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{s.examAreaCount ?? '-'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Aktif Soru Bankası</p>
                    </CardContent>
                </Card>

                {/* Toplam Soru */}
                <Card className="border shadow-sm hover:shadow-md transition-all cursor-pointer group bg-gradient-to-br from-blue-50/50 to-white"
                    onClick={() => router.push('/questions')}>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-blue-100 rounded-xl">
                                <FileQuestion className="h-5 w-5 text-blue-600" />
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{s.questionCount?.toLocaleString('tr-TR') ?? '-'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Toplam Soru</p>
                    </CardContent>
                </Card>

                {/* Bugün Çözülen */}
                <Card className="border shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-emerald-100 rounded-xl">
                                <Activity className="h-5 w-5 text-emerald-600" />
                            </div>
                            <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-100 text-emerald-700">
                                Bugün
                            </Badge>
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{s.todayProgressCount?.toLocaleString('tr-TR') ?? '-'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Çözülen Soru</p>
                        {s.weekProgressCount > 0 && (
                            <p className="text-[10px] text-emerald-600 mt-1">Bu hafta: {s.weekProgressCount} soru</p>
                        )}
                    </CardContent>
                </Card>

                {/* Sınav */}
                <Card className="border shadow-sm hover:shadow-md transition-all cursor-pointer group bg-gradient-to-br from-rose-50/50 to-white">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-rose-100 rounded-xl">
                                <ClipboardList className="h-5 w-5 text-rose-600" />
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{s.examCount ?? '-'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Toplam Sınav</p>
                        {s.completedExamCount > 0 && (
                            <p className="text-[10px] text-rose-600 mt-1">{s.completedExamCount} tamamlanmış</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ═══════════ CHARTS (2x2 Grid) ═══════════ */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Ders Dağılımı */}
                <Card className="border shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-blue-500" />
                            Soru İçerik Dağılımı
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[260px]">
                        {lessonStats.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={lessonStats}>
                                    <XAxis dataKey="code" className="text-[10px]" tickLine={false} axisLine={false} />
                                    <YAxis className="text-[10px]" tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                                        formatter={(value: any) => [value, 'Soru']}
                                        labelFormatter={(label) => lessonStats.find((l: any) => l.code === label)?.name || label}
                                    />
                                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Henüz veri yok</div>
                        )}
                    </CardContent>
                </Card>

                {/* Zorluk Dağılımı */}
                <Card className="border shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Target className="h-4 w-4 text-orange-500" />
                            Zorluk Dağılımı
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[260px]">
                        {difficultyData.some((d: any) => d.value > 0) ? (
                            <div className="flex items-center h-full">
                                <div className="w-1/2 h-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={difficultyData.filter((d: any) => d.value > 0)}
                                                cx="50%" cy="50%" innerRadius={45} outerRadius={80}
                                                paddingAngle={3} dataKey="value">
                                                {difficultyData.filter((d: any) => d.value > 0).map((entry: any, i: number) => (
                                                    <Cell key={i} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-1/2 space-y-2.5 pl-2">
                                    {difficultyData.map((d: any) => (
                                        <div key={d.name} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                                                <span className="text-muted-foreground">{d.name}</span>
                                            </div>
                                            <span className="font-semibold">{d.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Henüz veri yok</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ═══════════ RECENT ACTIVITY (Compact Timeline) ═══════════ */}
            <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-500" />
                            Son Aktiviteler
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    {activities.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="p-3 bg-slate-100 rounded-full mb-3">
                                <Activity className="h-6 w-6 text-slate-400" />
                            </div>
                            <p className="text-sm text-muted-foreground">Henüz aktivite yok</p>
                            <p className="text-xs text-muted-foreground mt-1">Sorular çözüldükçe ve ekledikçe burada görünecek</p>
                        </div>
                    ) : (
                        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                            {activities.slice(0, 9).map((activity: any) => (
                                <div key={activity.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50/80 hover:bg-slate-100 transition-colors">
                                    <Avatar className="h-8 w-8 shrink-0">
                                        <AvatarFallback className="text-[10px] bg-white">{activity.user?.initials || '?'}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            {activity.type === 'solved_test'
                                                ? <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                                                : <FilePlus className="h-3 w-3 text-blue-500 shrink-0" />}
                                            <p className="text-xs font-medium truncate">{activity.user?.name}</p>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground truncate">{activity.description}</p>
                                    </div>
                                    <span className="text-[9px] text-muted-foreground shrink-0">{timeAgo(activity.timestamp)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// ═══════════════════════════════════════
//  STUDENT DASHBOARD
// ═══════════════════════════════════════
function StudentDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const greeting = getGreeting();

    useEffect(() => {
        apiClient.get('/analytics/my-practice-stats')
            .then(data => setStats(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="space-y-6">
            {/* Student Welcome */}
            <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm p-8">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-full -mr-20 -mt-20 blur-3xl opacity-70 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-emerald-50 to-teal-50/50 rounded-full -ml-20 -mb-20 blur-3xl opacity-70 pointer-events-none" />

                <div className="relative">
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                            {user?.firstName}
                        </span>
                        , bugün hangi konuyu çalışalım?
                    </h1>
                </div>
                {stats && (
                    <div className="relative flex items-center gap-4 mt-6 pt-6 border-t border-slate-100 flex-wrap">
                        <div className="flex items-center gap-2.5 bg-slate-50/80 border border-slate-100 rounded-xl px-4 py-2.5 shadow-sm transition-all hover:shadow hover:-translate-y-0.5">
                            <div className="p-1.5 bg-orange-100 rounded-lg">
                                <Zap className="h-4 w-4 text-orange-600" />
                            </div>
                            <span className="text-sm font-medium text-slate-600">{stats.summary?.streak || 0} gün seri <span className="text-slate-400 ml-1">🔥</span></span>
                        </div>
                        <div className="flex items-center gap-2.5 bg-slate-50/80 border border-slate-100 rounded-xl px-4 py-2.5 shadow-sm transition-all hover:shadow hover:-translate-y-0.5">
                            <div className="p-1.5 bg-emerald-100 rounded-lg">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </div>
                            <span className="text-sm font-medium text-slate-600">{stats.summary?.totalSolved || 0} <span className="text-slate-400 ml-1">soru çözüldü</span></span>
                        </div>
                        <div className="flex items-center gap-2.5 bg-slate-50/80 border border-slate-100 rounded-xl px-4 py-2.5 shadow-sm transition-all hover:shadow hover:-translate-y-0.5">
                            <div className="p-1.5 bg-blue-100 rounded-lg">
                                <Target className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="text-sm font-medium text-slate-600">%{stats.summary?.successRate || 0} <span className="text-slate-400 ml-1">başarı</span></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Student Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-blue-100 rounded-xl"><FileQuestion className="h-5 w-5 text-blue-600" /></div>
                        </div>
                        <p className="text-3xl font-bold">{loading ? '-' : stats?.summary?.totalSolved ?? '0'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Çözülen Soru</p>
                    </CardContent>
                </Card>
                <Card className="border shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-emerald-100 rounded-xl"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
                        </div>
                        <p className="text-3xl font-bold">{loading ? '-' : stats?.summary?.correctCount ?? '0'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Doğru Cevap</p>
                    </CardContent>
                </Card>
                <Card className="border shadow-sm bg-gradient-to-br from-amber-50/50 to-white">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-amber-100 rounded-xl"><BarChart3 className="h-5 w-5 text-amber-600" /></div>
                        </div>
                        <p className="text-3xl font-bold">%{loading ? '-' : stats?.summary?.successRate ?? '0'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Başarı Oranı</p>
                    </CardContent>
                </Card>
                <Card className="border shadow-sm bg-gradient-to-br from-rose-50/50 to-white">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-rose-100 rounded-xl"><Sparkles className="h-5 w-5 text-rose-600" /></div>
                        </div>
                        <p className="text-3xl font-bold">{loading ? '-' : stats?.summary?.streak ?? '0'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Günlük Seri 🔥</p>
                    </CardContent>
                </Card>
            </div>

            {/* Exam Areas */}
            <div className="space-y-3">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">Soru Bankaların</h2>
                    <p className="text-muted-foreground text-sm">Çalışmak istediğin alanı seç ve hemen başla.</p>
                </div>
                <StudentExamAreaList />
            </div>
        </div>
    );
}

// ═══════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════
export default function DashboardPage() {
    const { user } = useAuth();

    return (
        <DashboardLayout>
            {user?.role === 'STUDENT' ? <StudentDashboard /> : <AdminDashboard />}
        </DashboardLayout>
    );
}
