'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/auth-context';
import { API_URL } from '@/lib/api-config';
import {
    CheckCircle2, XCircle, Target, Flame, BookOpen,
    TrendingUp, Calendar, Award, Loader2
} from 'lucide-react';

const DIFFICULTY_LABELS: Record<string, string> = {
    VERY_EASY: 'Çok Kolay',
    EASY: 'Kolay',
    MEDIUM: 'Orta',
    HARD: 'Zor',
    VERY_HARD: 'Çok Zor'
};

const DIFFICULTY_COLORS: Record<string, string> = {
    VERY_EASY: 'bg-green-100 text-green-700',
    EASY: 'bg-emerald-100 text-emerald-700',
    MEDIUM: 'bg-blue-100 text-blue-700',
    HARD: 'bg-orange-100 text-orange-700',
    VERY_HARD: 'bg-red-100 text-red-700'
};

interface Stats {
    summary: {
        totalSolved: number;
        correctCount: number;
        wrongCount: number;
        successRate: number;
        streak: number;
    };
    difficultyStats: {
        difficulty: string;
        correct: number;
        wrong: number;
        total: number;
        successRate: number;
    }[];
    lessonStats: {
        lessonId: string;
        lessonName: string;
        correct: number;
        wrong: number;
        total: number;
        successRate: number;
    }[];
    dailyActivity: {
        date: string;
        count: number;
    }[];
    recentProgress: {
        questionId: string;
        topicName: string;
        isCorrect: boolean;
        date: string;
    }[];
}

export default function MyReportPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<Stats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch(`${API_URL}/analytics/my-practice-stats`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
                });
                if (res.ok) {
                    setStats(await res.json());
                }
            } catch (error) {
                console.error('Failed to fetch stats', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchStats();
    }, []);

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[50vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    const emptyCount = 0; // No empty tracking yet

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Karnem</h1>
                        <p className="text-muted-foreground">Merhaba {user?.firstName}, işte senin istatistiklerin!</p>
                    </div>
                    {stats && stats.summary.streak > 0 && (
                        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-4 py-2">
                            <Flame className="h-5 w-5 text-orange-500" />
                            <span className="font-bold text-orange-600">{stats.summary.streak} gün</span>
                            <span className="text-sm text-orange-600">seri!</span>
                        </div>
                    )}
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500 mb-1">Toplam Çözülen</p>
                                    <p className="text-3xl font-bold text-slate-900">{stats?.summary.totalSolved || 0}</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <Target className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500 mb-1">Doğru</p>
                                    <p className="text-3xl font-bold text-emerald-600">{stats?.summary.correctCount || 0}</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500 mb-1">Yanlış</p>
                                    <p className="text-3xl font-bold text-rose-600">{stats?.summary.wrongCount || 0}</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
                                    <XCircle className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500 mb-1">Başarı Oranı</p>
                                    <p className="text-3xl font-bold text-slate-900">%{stats?.summary.successRate || 0}</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                    <TrendingUp className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Row */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Difficulty Stats */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Award className="h-5 w-5 text-violet-600" />
                                Zorluk Seviyesine Göre
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {stats?.difficultyStats && stats.difficultyStats.length > 0 ? (
                                stats.difficultyStats.map((d) => (
                                    <div key={d.difficulty} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <Badge className={DIFFICULTY_COLORS[d.difficulty] || 'bg-slate-100'}>
                                                {DIFFICULTY_LABELS[d.difficulty] || d.difficulty}
                                            </Badge>
                                            <span className="text-muted-foreground">
                                                {d.correct}/{d.total} doğru (%{d.successRate})
                                            </span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 rounded-full transition-all"
                                                style={{ width: `${d.successRate}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-muted-foreground py-8">
                                    Henüz soru çözmediniz
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Lesson Stats */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-blue-600" />
                                Derse Göre Performans
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 max-h-[300px] overflow-y-auto">
                            {stats?.lessonStats && stats.lessonStats.length > 0 ? (
                                stats.lessonStats.map((l) => (
                                    <div key={l.lessonId} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium truncate max-w-[60%]">{l.lessonName}</span>
                                            <span className="text-muted-foreground">
                                                {l.correct}/{l.total} (%{l.successRate})
                                            </span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full transition-all"
                                                style={{ width: `${l.successRate}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-muted-foreground py-8">
                                    Henüz soru çözmediniz
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Activity Calendar & Recent */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Activity Heatmap */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-green-600" />
                                Son 30 Günlük Aktivite
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {stats?.dailyActivity && stats.dailyActivity.length > 0 ? (
                                <div className="grid grid-cols-7 gap-1">
                                    {/* Generate last 30 days */}
                                    {Array.from({ length: 30 }, (_, i) => {
                                        const date = new Date();
                                        date.setDate(date.getDate() - (29 - i));
                                        const dateKey = date.toISOString().split('T')[0];
                                        const activity = stats.dailyActivity.find(a => a.date === dateKey);
                                        const count = activity?.count || 0;

                                        let colorClass = 'bg-slate-100';
                                        if (count > 0) colorClass = 'bg-green-200';
                                        if (count > 5) colorClass = 'bg-green-400';
                                        if (count > 10) colorClass = 'bg-green-600';
                                        if (count > 20) colorClass = 'bg-green-800';

                                        return (
                                            <div
                                                key={dateKey}
                                                className={`aspect-square rounded-sm ${colorClass} transition-colors`}
                                                title={`${dateKey}: ${count} soru`}
                                            />
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">
                                    Henüz aktivite yok
                                </p>
                            )}
                            <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
                                <span>Az</span>
                                <div className="flex gap-0.5">
                                    <div className="w-3 h-3 bg-slate-100 rounded-sm" />
                                    <div className="w-3 h-3 bg-green-200 rounded-sm" />
                                    <div className="w-3 h-3 bg-green-400 rounded-sm" />
                                    <div className="w-3 h-3 bg-green-600 rounded-sm" />
                                    <div className="w-3 h-3 bg-green-800 rounded-sm" />
                                </div>
                                <span>Çok</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Progress */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Son Çözülen Sorular</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {stats?.recentProgress && stats.recentProgress.length > 0 ? (
                                <div className="space-y-3">
                                    {stats.recentProgress.map((p, i) => (
                                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
                                            {p.isCorrect ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{p.topicName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(p.date).toLocaleDateString('tr-TR')}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">
                                    Henüz soru çözmediniz
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
