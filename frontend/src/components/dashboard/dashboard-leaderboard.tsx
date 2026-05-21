'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Crown, Medal, Trophy } from 'lucide-react';

const topStudents = [
    { id: 1, name: 'Zeynep Kaya', points: 1250, solved: 145, avatar: '', initials: 'ZK' },
    { id: 2, name: 'Ali Yılmaz', points: 1100, solved: 132, avatar: '', initials: 'AY' },
    { id: 3, name: 'Ayşe Demir', points: 950, solved: 98, avatar: '', initials: 'AD' },
    { id: 4, name: 'Mehmet Öz', points: 800, solved: 85, avatar: '', initials: 'MÖ' },
    { id: 5, name: 'Canan Kara', points: 750, solved: 72, avatar: '', initials: 'CK' },
];

const topTeachers = [
    { id: 1, name: 'Ahmet Öğretmen', added: 45, role: 'Matematik', avatar: '', initials: 'AÖ' },
    { id: 2, name: 'Fatma Hoca', added: 32, role: 'Fizik', avatar: '', initials: 'FH' },
    { id: 3, name: 'Mustafa Bey', added: 28, role: 'Türkçe', avatar: '', initials: 'MB' },
];

export function DashboardLeaderboard() {
    return (
        <Card className="col-span-4 lg:col-span-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                    <CardTitle>Liderlik Tablosu</CardTitle>
                    <CardDescription>
                        En aktif öğrenci ve eğitmenler
                    </CardDescription>
                </div>
                <Trophy className="h-5 w-5 text-yellow-500" />
            </CardHeader>
            <CardContent className="pt-4">
                <Tabs defaultValue="students" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="students">Öğrenciler</TabsTrigger>
                        <TabsTrigger value="teachers">Eğitmenler</TabsTrigger>
                    </TabsList>
                    <TabsContent value="students" className="space-y-4">
                        {topStudents.map((student, index) => (
                            <div key={student.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center w-6 font-bold text-muted-foreground">
                                        {index === 0 ? <Crown className="h-5 w-5 text-yellow-500" /> :
                                            index === 1 ? <Medal className="h-5 w-5 text-slate-400" /> :
                                                index === 2 ? <Medal className="h-5 w-5 text-amber-600" /> :
                                                    index + 1}
                                    </div>
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={student.avatar} alt={student.name} />
                                        <AvatarFallback>{student.initials}</AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">{student.name}</p>
                                        <p className="text-xs text-muted-foreground">{student.solved} soru çözüldü</p>
                                    </div>
                                </div>
                                <div className="font-bold text-sm text-indigo-600">{student.points} Puan</div>
                            </div>
                        ))}
                    </TabsContent>
                    <TabsContent value="teachers" className="space-y-4">
                        {topTeachers.map((teacher, index) => (
                            <div key={teacher.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center w-6 font-bold text-muted-foreground">
                                        {index + 1}
                                    </div>
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={teacher.avatar} alt={teacher.name} />
                                        <AvatarFallback>{teacher.initials}</AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">{teacher.name}</p>
                                        <p className="text-xs text-muted-foreground">{teacher.role}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                                    <span className="text-lg font-bold">{teacher.added}</span> Soru
                                </div>
                            </div>
                        ))}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
