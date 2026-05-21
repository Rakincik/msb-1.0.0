'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, FilePlus, Activity } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface ActivityItem {
    id: string;
    type: string;
    user: { name: string; initials: string };
    description: string;
    timestamp: string;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Az önce';
    if (minutes < 60) return `${minutes} dakika önce`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} saat önce`;
    const days = Math.floor(hours / 24);
    return `${days} gün önce`;
}

export function RecentActivity() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.get('/analytics/dashboard/activity')
            .then(data => setActivities(data || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case 'solved_test':
                return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'added_question':
                return <FilePlus className="h-4 w-4 text-blue-500" />;
            default:
                return <Activity className="h-4 w-4 text-gray-500" />;
        }
    };

    if (loading) {
        return (
            <Card className="col-span-4 lg:col-span-7">
                <CardHeader>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-56 mt-1" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex items-start gap-4">
                                <Skeleton className="h-9 w-9 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-48" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="col-span-4 lg:col-span-7">
            <CardHeader>
                <CardTitle>Son Aktiviteler</CardTitle>
                <CardDescription>
                    Kullanıcıların ve sistemin son hareketleri
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[350px] pr-4">
                    {activities.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            Henüz aktivite yok
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {activities.map((activity) => (
                                <div key={activity.id} className="flex items-start gap-4">
                                    <Avatar className="h-9 w-9">
                                        <AvatarFallback>{activity.user.initials}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col gap-1 w-full">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium leading-none">{activity.user.name}</p>
                                            <span className="text-xs text-muted-foreground">{timeAgo(activity.timestamp)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            {getIcon(activity.type)}
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {activity.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
