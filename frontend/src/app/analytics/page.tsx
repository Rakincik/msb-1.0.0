'use client';

import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Layers, ImageIcon, Video, FolderOpen, BookOpen, AlertTriangle,
    Users, TrendingUp, TrendingDown, CheckCircle2, Loader2, Clock,
    UserCheck, ArrowRight, Minus, ExternalLink, ShieldCheck, Zap,
    BarChart3, PieChart as PieChartIcon, Activity, Target, Sparkles
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';

// ─── Constants ───
const DIFFICULTY_COLORS: Record<string, string> = {
    VERY_EASY: '#22c55e', EASY: '#10b981', MEDIUM: '#3b82f6', HARD: '#f97316', VERY_HARD: '#ef4444'
};
const DIFFICULTY_LABELS: Record<string, string> = {
    VERY_EASY: 'Çok Kolay', EASY: 'Kolay', MEDIUM: 'Orta', HARD: 'Zor', VERY_HARD: 'Çok Zor'
};

interface AnalyticsData {
    summary: {
        totalQuestions: number; questionsWithImage: number; questionsWithVideo: number;
        totalExamAreas: number; totalLessons: number; missingTopicsCount: number;
        activeStudents: number; totalAttempts: number; successRate: number;
    };
    difficultyDistribution: Array<{ difficulty: string; count: number }>;
    questionsByLesson: Array<{ id: string; name: string; code: string; questionCount: number }>;
    examAreaStats: Array<{ id: string; name: string; color: string; questionCount: number; studentCount: number; groupCount: number }>;
    contributionsByTeacher: Array<{ teacherId: string; teacherName: string; questionCount: number }>;
    monthlyTrend: Array<{ month: string; count: number }>;
    missingTopics: Array<{ id: string; name: string; unitName: string; lessonName: string; lessonCode: string }>;
    recentActivity: Array<{ id: string; topicName: string; difficulty: string; createdBy: string; createdAt: string }>;
}

// ─── Health Score Calculator ───
function calcHealthScore(data: AnalyticsData): { score: number; grade: string; color: string; factors: Array<{ label: string; score: number; max: number; tip: string }> } {
    const factors = [];

    // 1. Eksik konu oranı (max 25)
    const totalTopicsApprox = data.summary.missingTopicsCount + (data.questionsByLesson.length * 5); // rough estimate
    const coverageRate = totalTopicsApprox > 0 ? 1 - (data.summary.missingTopicsCount / totalTopicsApprox) : 1;
    const coverageScore = Math.round(coverageRate * 25);
    factors.push({ label: 'Konu Kapsamı', score: coverageScore, max: 25, tip: `${data.summary.missingTopicsCount} konu eksik` });

    // 2. Zorluk dengesi (max 25)
    const diffDist = data.difficultyDistribution;
    const total = diffDist.reduce((s, d) => s + d.count, 0);
    const diffBalance = total > 0 ? (
        diffDist.length >= 3 ? Math.min(25, Math.round((diffDist.filter(d => d.count > 0).length / 5) * 25)) : 5
    ) : 0;
    factors.push({ label: 'Zorluk Dengesi', score: diffBalance, max: 25, tip: `${diffDist.filter(d => d.count > 0).length}/5 seviye kullanılıyor` });

    // 3. Medya zenginliği (max 25)
    const imgRate = data.summary.totalQuestions > 0 ? data.summary.questionsWithImage / data.summary.totalQuestions : 0;
    const vidRate = data.summary.totalQuestions > 0 ? data.summary.questionsWithVideo / data.summary.totalQuestions : 0;
    const mediaScore = Math.round((imgRate * 15) + (vidRate * 10));
    factors.push({ label: 'Medya Zenginliği', score: Math.min(25, mediaScore), max: 25, tip: `%${Math.round(imgRate * 100)} görsel, %${Math.round(vidRate * 100)} video` });

    // 4. İçerik hacmi (max 25)
    const volumeScore = Math.min(25, Math.round((data.summary.totalQuestions / 100) * 25));
    factors.push({ label: 'İçerik Hacmi', score: volumeScore, max: 25, tip: `${data.summary.totalQuestions} soru mevcut` });

    const score = factors.reduce((s, f) => s + f.score, 0);

    let grade = 'F', color = 'text-red-500';
    if (score >= 90) { grade = 'A+'; color = 'text-emerald-500'; }
    else if (score >= 80) { grade = 'A'; color = 'text-emerald-500'; }
    else if (score >= 70) { grade = 'B'; color = 'text-blue-500'; }
    else if (score >= 60) { grade = 'C'; color = 'text-amber-500'; }
    else if (score >= 40) { grade = 'D'; color = 'text-orange-500'; }

    return { score, grade, color, factors };
}

export default function AnalyticsPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<AnalyticsData | null>(null);

    useEffect(() => {
        async function fetchAnalytics() {
            try {
                const result = await apiClient.get('/analytics/question-bank');
                setData(result);
            } catch (error) {
                console.error('Analytics fetch error:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchAnalytics();
    }, []);

    const health = useMemo(() => data ? calcHealthScore(data) : null, [data]);

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Analitikler yükleniyor...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!data) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <p className="text-muted-foreground">Veriler yüklenemedi</p>
                </div>
            </DashboardLayout>
        );
    }

    const difficultyData = data.difficultyDistribution.map(d => ({
        name: DIFFICULTY_LABELS[d.difficulty] || d.difficulty,
        value: d.count,
        color: DIFFICULTY_COLORS[d.difficulty] || '#888'
    }));

    // Calculate weekly change (mock based on trend data)
    const trendArr = data.monthlyTrend;
    const latestMonth = trendArr.length > 0 ? trendArr[trendArr.length - 1].count : 0;
    const prevMonth = trendArr.length > 1 ? trendArr[trendArr.length - 2].count : 0;
    const monthChange = prevMonth > 0 ? Math.round(((latestMonth - prevMonth) / prevMonth) * 100) : 0;

    const totalTeacherContrib = data.contributionsByTeacher.reduce((s, t) => s + t.questionCount, 0);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* ═══════════ HEADER ═══════════ */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Raporlar & Analitikler</h1>
                        <p className="text-muted-foreground text-sm">İçerik istatistikleri, sağlık skoru ve etkinlik raporları</p>
                    </div>
                </div>

                {/* ═══════════ HEALTH SCORE + SUMMARY ROW ═══════════ */}
                <div className="grid gap-4 lg:grid-cols-5">
                    {/* Health Score Card */}
                    {health && (
                        <Card className="lg:col-span-2 border-none shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />
                            <CardContent className="p-6 relative">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <p className="text-xs text-white/60 uppercase tracking-wider font-semibold">İçerik Sağlık Skoru</p>
                                        <div className="flex items-baseline gap-2 mt-1">
                                            <span className="text-5xl font-black">{health.score}</span>
                                            <span className="text-lg text-white/40">/100</span>
                                        </div>
                                    </div>
                                    <div className={cn("text-3xl font-black px-3 py-1 rounded-lg", {
                                        'bg-emerald-500/20 text-emerald-400': health.score >= 70,
                                        'bg-amber-500/20 text-amber-400': health.score >= 40 && health.score < 70,
                                        'bg-red-500/20 text-red-400': health.score < 40,
                                    })}>
                                        {health.grade}
                                    </div>
                                </div>

                                {/* Factor bars */}
                                <div className="space-y-2">
                                    {health.factors.map(f => (
                                        <div key={f.label} className="space-y-0.5">
                                            <div className="flex items-center justify-between text-[10px]">
                                                <span className="text-white/70">{f.label}</span>
                                                <span className="text-white/50">{f.score}/{f.max}</span>
                                            </div>
                                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full rounded-full transition-all duration-700", {
                                                        'bg-emerald-400': f.score / f.max >= 0.7,
                                                        'bg-amber-400': f.score / f.max >= 0.4 && f.score / f.max < 0.7,
                                                        'bg-red-400': f.score / f.max < 0.4,
                                                    })}
                                                    style={{ width: `${(f.score / f.max) * 100}%` }}
                                                />
                                            </div>
                                            <p className="text-[9px] text-white/40">{f.tip}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Summary Stats */}
                    <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                        {/* Total Questions */}
                        <Card className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={() => router.push('/questions')}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="p-2 bg-blue-50 rounded-lg"><Layers className="h-4 w-4 text-blue-600" /></div>
                                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <p className="text-2xl font-bold">{data.summary.totalQuestions}</p>
                                <p className="text-xs text-muted-foreground">Toplam Soru</p>
                                {monthChange !== 0 && (
                                    <div className={cn("flex items-center gap-1 mt-1 text-[10px] font-medium",
                                        monthChange > 0 ? "text-emerald-600" : "text-red-500"
                                    )}>
                                        {monthChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                        {monthChange > 0 ? '+' : ''}{monthChange}% bu ay
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* With Image */}
                        <Card className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={() => router.push('/questions')}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="p-2 bg-teal-50 rounded-lg"><ImageIcon className="h-4 w-4 text-teal-600" /></div>
                                    <Badge variant="secondary" className="text-[9px] h-5">
                                        %{data.summary.totalQuestions > 0 ? Math.round((data.summary.questionsWithImage / data.summary.totalQuestions) * 100) : 0}
                                    </Badge>
                                </div>
                                <p className="text-2xl font-bold">{data.summary.questionsWithImage}</p>
                                <p className="text-xs text-muted-foreground">Görselli Soru</p>
                            </CardContent>
                        </Card>

                        {/* With Video */}
                        <Card className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={() => router.push('/questions')}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="p-2 bg-rose-50 rounded-lg"><Video className="h-4 w-4 text-rose-600" /></div>
                                    <Badge variant="secondary" className="text-[9px] h-5">
                                        %{data.summary.totalQuestions > 0 ? Math.round((data.summary.questionsWithVideo / data.summary.totalQuestions) * 100) : 0}
                                    </Badge>
                                </div>
                                <p className="text-2xl font-bold">{data.summary.questionsWithVideo}</p>
                                <p className="text-xs text-muted-foreground">Video Çözümlü</p>
                            </CardContent>
                        </Card>

                        {/* Exam Areas */}
                        <Card className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={() => router.push('/exam-areas')}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="p-2 bg-amber-50 rounded-lg"><FolderOpen className="h-4 w-4 text-amber-600" /></div>
                                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-amber-500 transition-colors" />
                                </div>
                                <p className="text-2xl font-bold">{data.summary.totalExamAreas}</p>
                                <p className="text-xs text-muted-foreground">Soru Bankası</p>
                            </CardContent>
                        </Card>

                        {/* Missing Topics - ACTIONABLE */}
                        <Card className={cn(
                            "border shadow-sm hover:shadow-md transition-shadow cursor-pointer group",
                            data.summary.missingTopicsCount > 0 && "border-amber-200 bg-amber-50/30"
                        )} onClick={() => {
                            const el = document.getElementById('missing-topics');
                            el?.scrollIntoView({ behavior: 'smooth' });
                        }}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className={cn("p-2 rounded-lg", data.summary.missingTopicsCount > 0 ? "bg-amber-100" : "bg-green-50")}>
                                        {data.summary.missingTopicsCount > 0
                                            ? <AlertTriangle className="h-4 w-4 text-amber-600" />
                                            : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                                    </div>
                                </div>
                                <p className="text-2xl font-bold">{data.summary.missingTopicsCount}</p>
                                <p className="text-xs text-muted-foreground">Eksik Konu</p>
                            </CardContent>
                        </Card>

                        {/* Success Rate */}
                        <Card className="border shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="p-2 bg-emerald-50 rounded-lg"><Target className="h-4 w-4 text-emerald-600" /></div>
                                </div>
                                <p className="text-2xl font-bold">%{data.summary.successRate}</p>
                                <p className="text-xs text-muted-foreground">Öğrenci Başarısı</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* ═══════════ ACTIVITY SUMMARY BANNER ═══════════ */}
                <Card className="border bg-gradient-to-r from-blue-50 to-slate-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-6 flex-wrap">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-100 rounded-lg"><Zap className="h-4 w-4 text-blue-600" /></div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Bu Ay Eklenen</p>
                                    <p className="text-lg font-bold">{latestMonth} soru</p>
                                </div>
                            </div>
                            <div className="w-px h-10 bg-slate-200" />
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-emerald-100 rounded-lg"><Users className="h-4 w-4 text-emerald-600" /></div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Katkıda Bulunan</p>
                                    <p className="text-lg font-bold">{data.contributionsByTeacher.length} öğretmen</p>
                                </div>
                            </div>
                            <div className="w-px h-10 bg-slate-200" />
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-purple-100 rounded-lg"><Activity className="h-4 w-4 text-purple-600" /></div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Toplam Katkı (30 gün)</p>
                                    <p className="text-lg font-bold">{totalTeacherContrib} soru</p>
                                </div>
                            </div>
                            {monthChange !== 0 && (
                                <>
                                    <div className="w-px h-10 bg-slate-200" />
                                    <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold",
                                        monthChange > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                    )}>
                                        {monthChange > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                        Geçen aya göre {monthChange > 0 ? '+' : ''}{monthChange}%
                                    </div>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* ═══════════ CHARTS GRID (2x2) ═══════════ */}
                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Chart 1: Derse Göre */}
                    <Card className="border shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-blue-500" />
                                Derse Göre Soru Dağılımı
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.questionsByLesson.slice(0, 8)} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis type="number" className="text-[10px]" />
                                    <YAxis dataKey="code" type="category" width={60} className="text-[10px]" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                                        formatter={(value: any) => [value, 'Soru']}
                                        labelFormatter={(label) => data.questionsByLesson.find(l => l.code === label)?.name || label}
                                    />
                                    <Bar dataKey="questionCount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Chart 2: Zorluk Dağılımı */}
                    <Card className="border shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <PieChartIcon className="h-4 w-4 text-orange-500" />
                                Zorluk Seviyesi Dağılımı
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[280px]">
                            <div className="flex items-center h-full">
                                <div className="w-1/2 h-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={difficultyData} cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                                                paddingAngle={3} dataKey="value">
                                                {difficultyData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-1/2 space-y-2 pl-2">
                                    {difficultyData.map(d => (
                                        <div key={d.name} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                                                <span className="text-muted-foreground">{d.name}</span>
                                            </div>
                                            <span className="font-semibold">{d.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Chart 3: Aylık Trend */}
                    <Card className="border shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-emerald-500" />
                                Aylık Soru Ekleme Trendi
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.monthlyTrend}>
                                    <defs>
                                        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="month" className="text-[10px]" />
                                    <YAxis className="text-[10px]" />
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                                    <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2.5}
                                        fill="url(#trendGrad)" name="Soru Sayısı" dot={{ fill: '#10b981', strokeWidth: 2 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Chart 4: Popüler Soru Bankaları */}
                    <Card className="border shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <FolderOpen className="h-4 w-4 text-amber-500" />
                                    Soru Bankaları
                                </CardTitle>
                                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => router.push('/exam-areas')}>
                                    Tümü <ArrowRight className="h-3 w-3 ml-1" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {data.examAreaStats.slice(0, 6).map((ea, i) => {
                                    const maxQ = data.examAreaStats[0]?.questionCount || 1;
                                    return (
                                        <div key={ea.id} className="group">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-muted-foreground font-mono w-4">#{i + 1}</span>
                                                    <span className="text-sm font-medium truncate">{ea.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>{ea.studentCount} öğrenci</span>
                                                    <Badge variant="secondary" className="text-[10px] h-5">{ea.questionCount}</Badge>
                                                </div>
                                            </div>
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${(ea.questionCount / maxQ) * 100}%`,
                                                        backgroundColor: ea.color || '#3b82f6'
                                                    }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ═══════════ BOTTOM: RECENT + MISSING ═══════════ */}
                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Son Eklenen Sorular */}
                    <Card className="border shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-blue-500" />
                                    Son Eklenen Sorular
                                </CardTitle>
                                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => router.push('/questions')}>
                                    Tümü <ArrowRight className="h-3 w-3 ml-1" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {data.recentActivity.slice(0, 6).map((activity) => (
                                    <div key={activity.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/80 hover:bg-slate-100 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-2 h-2 rounded-full shrink-0"
                                                style={{ backgroundColor: DIFFICULTY_COLORS[activity.difficulty] || '#888' }} />
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{activity.topicName}</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {activity.createdBy} · {new Date(activity.createdAt).toLocaleDateString('tr-TR')}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] shrink-0"
                                            style={{ color: DIFFICULTY_COLORS[activity.difficulty], borderColor: DIFFICULTY_COLORS[activity.difficulty] + '40' }}>
                                            {DIFFICULTY_LABELS[activity.difficulty]}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Eksik Konular — ACTIONABLE */}
                    <Card id="missing-topics" className={cn(
                        "border shadow-sm",
                        data.missingTopics.length > 0 && "border-amber-200"
                    )}>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <AlertTriangle className={cn("h-4 w-4", data.missingTopics.length > 0 ? "text-amber-500" : "text-green-500")} />
                                    {data.missingTopics.length > 0
                                        ? `Eksik Konular (${data.missingTopics.length})`
                                        : 'Tüm Konular Tamamlanmış ✓'}
                                </CardTitle>
                                {data.missingTopics.length > 0 && (
                                    <Button variant="outline" size="sm" className="text-xs h-7 gap-1 border-amber-200 text-amber-700 hover:bg-amber-50"
                                        onClick={() => router.push('/questions')}>
                                        <Sparkles className="h-3 w-3" /> Soru Ekle
                                    </Button>
                                )}
                            </div>
                            {data.missingTopics.length > 0 && (
                                <p className="text-[11px] text-muted-foreground">Bu konularda henüz soru yok — soruya ihtiyaç var</p>
                            )}
                        </CardHeader>
                        <CardContent>
                            {data.missingTopics.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-8 text-center">
                                    <div className="p-3 bg-green-50 rounded-full">
                                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                                    </div>
                                    <p className="text-sm font-medium text-green-700">Harika! Tüm konularda en az 1 soru mevcut.</p>
                                </div>
                            ) : (
                                <div className="grid gap-1.5 md:grid-cols-2">
                                    {data.missingTopics.slice(0, 10).map((topic) => (
                                        <button key={topic.id}
                                            onClick={() => router.push('/questions')}
                                            className="flex items-center gap-2 p-2 rounded-lg bg-amber-50/50 hover:bg-amber-100/60 transition-colors text-left">
                                            <Badge variant="outline" className="text-[9px] shrink-0 border-amber-300 text-amber-700">{topic.lessonCode}</Badge>
                                            <span className="text-xs truncate">{topic.name}</span>
                                        </button>
                                    ))}
                                    {data.missingTopics.length > 10 && (
                                        <p className="text-[10px] text-amber-600 p-2 col-span-2">
                                            ve {data.missingTopics.length - 10} konu daha...
                                        </p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
