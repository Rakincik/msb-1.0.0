'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
    ArrowLeft, Users, FileQuestion, BookOpen, FileText, Loader2,
    Edit, UserPlus, X, Check
} from 'lucide-react';
import Link from 'next/link';
import { API_URL } from '@/lib/api-config';
import { apiClient } from '@/lib/api-client';

interface Group {
    id: string;
    name: string;
    code: string;
    description?: string;
    isActive: boolean;
    startDate?: string;
    endDate?: string;
    students: { id: string; firstName: string; lastName: string; email: string }[];
    exams: { id: string; title: string; type: string; status: string }[];
    questions: { id: string; content: any; difficulty: string }[];
    pdfs: { id: string; title: string; fileName: string }[];
    lessons: { id: string; name: string; code: string }[];
    _count: {
        students: number;
        exams: number;
        questions: number;
        pdfs: number;
    };
}

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
}

export default function GroupDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user , accessToken } = useAuth();
    const { toast } = useToast();

    const [group, setGroup] = useState<Group | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [availableStudents, setAvailableStudents] = useState<User[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [formData, setFormData] = useState({ name: '', code: '', description: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);



    useEffect(() => {
        if (params.id) fetchGroup();
    }, [params.id]);

    const fetchGroup = async () => {
        setIsLoading(true);
        try {
            const data = await apiClient.get(`/groups/${params.id}`);
            setGroup(data);
            setFormData({ name: data.name, code: data.code, description: data.description || '' });
        } catch (error) {
            console.error("Fetch error", error);
            toast({ title: 'Hata', description: 'Grup detayları getirilemedi.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdate = async () => {
        setIsSubmitting(true);
        try {
            await apiClient.patch(`/groups/${params.id}`, formData);

            toast({ title: 'Başarılı', description: 'Grup güncellendi' });
            setIsEditOpen(false);
            fetchGroup();
        } catch (error) {
            toast({ title: 'Hata', description: 'Grup güncellenemedi', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddStudents = async () => {
        if (selectedStudents.length === 0) return;

        setIsSubmitting(true);
        try {
            await apiClient.post(`/groups/${params.id}/students`, { userIds: selectedStudents });

            toast({ title: 'Başarılı', description: `${selectedStudents.length} öğrenci eklendi` });
            setIsAddStudentOpen(false);
            setSelectedStudents([]);
            fetchGroup();
        } catch (error) {
            toast({ title: 'Hata', description: 'Öğrenciler eklenemedi', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveStudent = async (userId: string) => {
        if (!confirm('Bu öğrenciyi gruptan çıkarmak istediğinizden emin misiniz?')) return;

        try {
            await apiClient.delete(`/groups/${params.id}/students`, { userIds: [userId] });

            toast({ title: 'Başarılı', description: 'Öğrenci gruptan çıkarıldı' });
            fetchGroup();
        } catch (error) {
            toast({ title: 'Hata', description: 'Öğrenci çıkarılamadı', variant: 'destructive' });
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!group) {
        return (
            <DashboardLayout>
                <div className="text-center py-12">
                    <p>Grup bulunamadı</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/groups">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-3xl font-bold">{group.name}</h1>
                                <Badge variant={group.isActive ? 'default' : 'secondary'}>
                                    {group.isActive ? 'Aktif' : 'Pasif'}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground font-mono text-sm">{group.code}</p>
                        </div>
                    </div>
                    {user?.role !== 'STUDENT' && (
                        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    <Edit className="mr-2 h-4 w-4" />
                                    Düzenle
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Grup Düzenle</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Grup Adı</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="code">Grup Kodu</Label>
                                        <Input
                                            id="code"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Açıklama</Label>
                                        <Textarea
                                            id="description"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsEditOpen(false)}>İptal</Button>
                                    <Button onClick={handleUpdate} disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Kaydet
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Öğrenciler</CardTitle>
                            <Users className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{group._count.students}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Testler</CardTitle>
                            <FileQuestion className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{group._count.exams}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Sorular</CardTitle>
                            <BookOpen className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{group._count.questions}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">PDF'ler</CardTitle>
                            <FileText className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{group._count.pdfs}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="students" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="students">Öğrenciler</TabsTrigger>
                        <TabsTrigger value="exams">Testler</TabsTrigger>
                        <TabsTrigger value="questions">Sorular</TabsTrigger>
                        <TabsTrigger value="pdfs">PDF'ler</TabsTrigger>
                    </TabsList>

                    {/* Students Tab */}
                    <TabsContent value="students">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Öğrenciler</CardTitle>
                                    <CardDescription>Bu gruba kayıtlı öğrenciler</CardDescription>
                                </div>
                                {user?.role !== 'STUDENT' && (
                                    <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
                                        <DialogTrigger asChild>
                                            <Button size="sm">
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                Öğrenci Ekle
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-md">
                                            <DialogHeader>
                                                <DialogTitle>Öğrenci Ekle</DialogTitle>
                                                <DialogDescription>
                                                    Gruba eklemek istediğiniz öğrencileri seçin
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="max-h-64 overflow-y-auto space-y-2 py-4">
                                                {availableStudents.length === 0 ? (
                                                    <p className="text-center text-muted-foreground py-4">
                                                        Eklenebilecek öğrenci bulunamadı
                                                    </p>
                                                ) : (
                                                    availableStudents.map((student) => (
                                                        <div
                                                            key={student.id}
                                                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedStudents.includes(student.id)
                                                                ? 'bg-primary/10 border-primary'
                                                                : 'hover:bg-muted'
                                                                }`}
                                                            onClick={() => {
                                                                setSelectedStudents(prev =>
                                                                    prev.includes(student.id)
                                                                        ? prev.filter(id => id !== student.id)
                                                                        : [...prev, student.id]
                                                                );
                                                            }}
                                                        >
                                                            <div>
                                                                <p className="font-medium">
                                                                    {student.firstName} {student.lastName}
                                                                </p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {student.email}
                                                                </p>
                                                            </div>
                                                            {selectedStudents.includes(student.id) && (
                                                                <Check className="h-5 w-5 text-primary" />
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setIsAddStudentOpen(false)}>
                                                    İptal
                                                </Button>
                                                <Button
                                                    onClick={handleAddStudents}
                                                    disabled={isSubmitting || selectedStudents.length === 0}
                                                >
                                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    {selectedStudents.length} Öğrenci Ekle
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </CardHeader>
                            <CardContent>
                                {group.students.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">
                                        Henüz öğrenci eklenmemiş
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {group.students.map((student) => (
                                            <div
                                                key={student.id}
                                                className="flex items-center justify-between p-3 rounded-lg border"
                                            >
                                                <div>
                                                    <p className="font-medium">
                                                        {student.firstName} {student.lastName}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {student.email}
                                                    </p>
                                                </div>
                                                {user?.role !== 'STUDENT' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() => handleRemoveStudent(student.id)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Exams Tab */}
                    <TabsContent value="exams">
                        <Card>
                            <CardHeader>
                                <CardTitle>Testler</CardTitle>
                                <CardDescription>Bu gruba atanmış testler</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {group.exams.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">
                                        Henüz test atanmamış
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {group.exams.map((exam) => (
                                            <div
                                                key={exam.id}
                                                className="flex items-center justify-between p-3 rounded-lg border"
                                            >
                                                <div>
                                                    <p className="font-medium">{exam.title}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {exam.type} • {exam.status}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Questions Tab */}
                    <TabsContent value="questions">
                        <Card>
                            <CardHeader>
                                <CardTitle>Sorular</CardTitle>
                                <CardDescription>Bu gruba atanmış sorular</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {group.questions.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">
                                        Henüz soru atanmamış
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {group.questions.map((question) => (
                                            <div
                                                key={question.id}
                                                className="flex items-center justify-between p-3 rounded-lg border"
                                            >
                                                <div>
                                                    <p className="font-medium line-clamp-1">
                                                        {typeof question.content === 'object'
                                                            ? (question.content as any)?.text || 'Soru'
                                                            : question.content}
                                                    </p>
                                                    <Badge variant="outline">{question.difficulty}</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* PDFs Tab */}
                    <TabsContent value="pdfs">
                        <Card>
                            <CardHeader>
                                <CardTitle>PDF Dokümanlar</CardTitle>
                                <CardDescription>Bu gruba atanmış PDF'ler</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {group.pdfs.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">
                                        Henüz PDF atanmamış
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {group.pdfs.map((pdf) => (
                                            <div
                                                key={pdf.id}
                                                className="flex items-center justify-between p-3 rounded-lg border"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <FileText className="h-8 w-8 text-red-500" />
                                                    <div>
                                                        <p className="font-medium">{pdf.title}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {pdf.fileName}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
