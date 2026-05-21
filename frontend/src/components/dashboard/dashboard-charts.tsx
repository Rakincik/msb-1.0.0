'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Legend, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardChartsProps {
    lessonStats: { name: string; total: number }[];
    difficultyData: { name: string; value: number; color: string }[];
    loading?: boolean;
}

export function DashboardCharts({ lessonStats, difficultyData, loading }: DashboardChartsProps) {
    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-64 mt-1" />
                    </CardHeader>
                    <CardContent><Skeleton className="h-[350px] w-full" /></CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <Skeleton className="h-5 w-36" />
                        <Skeleton className="h-4 w-56 mt-1" />
                    </CardHeader>
                    <CardContent><Skeleton className="h-[350px] w-full" /></CardContent>
                </Card>
            </div>
        );
    }

    const hasLessonData = lessonStats.length > 0;
    const hasDifficultyData = difficultyData.some(d => d.value > 0);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Soru İçerik Dağılımı</CardTitle>
                    <CardDescription>
                        Soru bankasındaki soruların derslere göre dağılımı
                    </CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    {hasLessonData ? (
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={lessonStats}>
                                <XAxis
                                    dataKey="name"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar
                                    dataKey="total"
                                    fill="currentColor"
                                    radius={[4, 4, 0, 0]}
                                    className="fill-indigo-600"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                            Henüz soru eklenmemiş
                        </div>
                    )}
                </CardContent>
            </Card>
            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>Zorluk Dağılımı</CardTitle>
                    <CardDescription>
                        Soru bankasındaki soruların zorluk seviyeleri
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {hasDifficultyData ? (
                        <ResponsiveContainer width="100%" height={350}>
                            <PieChart>
                                <Pie
                                    data={difficultyData.filter(d => d.value > 0)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {difficultyData.filter(d => d.value > 0).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                            Henüz zorluk verisi yok
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
