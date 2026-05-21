'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, UserPlus, X } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { API_URL } from '@/lib/api-config';
import { apiClient } from '@/lib/api-client';

interface Group {
    id: string;
    name: string;
    code: string;
}

interface Student {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

interface AccessManagerModalProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
    examAreaId: string;
    onUpdate?: () => void;
}

export function AccessManagerModal({ open, onOpenChange, trigger, examAreaId, onUpdate }: AccessManagerModalProps) {
    const { toast } = useToast();
    const { accessToken } = useAuth();

    // Data
    const [allGroups, setAllGroups] = useState<Group[]>([]);
    const [assignedGroupIds, setAssignedGroupIds] = useState<string[]>([]);
    const [assignedStudents, setAssignedStudents] = useState<Student[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Student[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            fetchInitialData();
        }
    }, [open, examAreaId]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // Get all groups
            const groupsData = await apiClient.get('/groups');
            setAllGroups(Array.isArray(groupsData) ? groupsData : groupsData.data || []);

            // Get current exam area details with assigned groups and students
            const area = await apiClient.get(`/exam-areas/${examAreaId}`);
            setAssignedGroupIds(area.groups?.map((g: Group) => g.id) || []);
            setAssignedStudents(area.students || []);

        } catch (error) {
            console.error(error);
            toast({ title: 'Hata', description: 'Veriler yüklenemedi', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    // Search students
    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (searchTerm.length > 2) searchStudents();
            else setSearchResults([]);
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [searchTerm]);

    const searchStudents = async () => {
        setIsSearching(true);
        try {
                        const data = await apiClient.get(`/users?search=${encodeURIComponent(searchTerm)}&role=STUDENT&take=10`);
            // Filter out already assigned students
            const students = (data.data || []) as Student[];
            const filteredStudents = students.filter(
                (s: Student) => !assignedStudents.some(as => as.id === s.id)
            );
            setSearchResults(filteredStudents);

        } catch (error) {
            console.error(error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleToggleGroup = async (groupId: string, isCurrentlyAssigned: boolean) => {
        setActionLoading(groupId);
        try {
            if (isCurrentlyAssigned) {
                await apiClient.delete(`/exam-areas/${examAreaId}/groups/${groupId}`);
            } else {
                await apiClient.post(`/exam-areas/${examAreaId}/groups/${groupId}`);
            }
            toast({ title: isCurrentlyAssigned ? 'Grup çıkarıldı' : 'Grup eklendi' });
            if (isCurrentlyAssigned) setAssignedGroupIds(prev => prev.filter(id => id !== groupId));
            else setAssignedGroupIds(prev => [...prev, groupId]);
            onUpdate?.();
        } catch (e) {
            toast({ title: 'İşlem hatası', variant: 'destructive' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleAddStudent = async (student: Student) => {
        setActionLoading(student.id);
        try {
            await apiClient.post(`/exam-areas/${examAreaId}/students/${student.id}`);
            toast({ title: 'Öğrenci eklendi' });
            setAssignedStudents(prev => [...prev, student]);
            setSearchResults(prev => prev.filter(s => s.id !== student.id));
            setSearchTerm('');
            onUpdate?.();
        } catch (e) {
            toast({ title: 'İşlem hatası', variant: 'destructive' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemoveStudent = async (studentId: string) => {
        setActionLoading(studentId);
        try {
            await apiClient.delete(`/exam-areas/${examAreaId}/students/${studentId}`);

            toast({ title: 'Öğrenci çıkarıldı' });
            setAssignedStudents(prev => prev.filter(s => s.id !== studentId));
            onUpdate?.();
        } catch (e) {
            toast({ title: 'İşlem hatası', variant: 'destructive' });
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Erişim Yönetimi</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <Tabs defaultValue="groups">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="groups">
                                Gruplar ({assignedGroupIds.length})
                            </TabsTrigger>
                            <TabsTrigger value="students">
                                Öğrenciler ({assignedStudents.length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="groups" className="space-y-4">
                            <div className="text-sm text-muted-foreground mb-4">
                                Bu soru bankasına erişimi olan grupları seçin.
                            </div>
                            <ScrollArea className="h-[300px] border rounded p-2">
                                {allGroups.map(group => {
                                    const isAssigned = assignedGroupIds.includes(group.id);
                                    const isLoading = actionLoading === group.id;
                                    return (
                                        <div key={group.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                                            <Checkbox
                                                id={group.id}
                                                checked={isAssigned}
                                                disabled={isLoading}
                                                onCheckedChange={() => handleToggleGroup(group.id, isAssigned)}
                                            />
                                            <Label htmlFor={group.id} className="flex-1 cursor-pointer">
                                                {group.name}
                                                <Badge variant="outline" className="ml-2 text-xs">{group.code}</Badge>
                                            </Label>
                                            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                        </div>
                                    );
                                })}
                                {allGroups.length === 0 && (
                                    <div className="p-4 text-center text-muted-foreground">
                                        Hiç grup bulunamadı. Önce grup oluşturun.
                                    </div>
                                )}
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="students">
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Öğrenci ara (isim, email)..."
                                        className="pl-8"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                    {isSearching && (
                                        <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin" />
                                    )}
                                </div>

                                {/* Search Results */}
                                {searchResults.length > 0 && (
                                    <div className="border rounded p-2 space-y-1 bg-muted/50">
                                        <div className="text-xs text-muted-foreground px-2 pb-1">
                                            Arama Sonuçları
                                        </div>
                                        {searchResults.map(student => (
                                            <div
                                                key={student.id}
                                                className="flex items-center justify-between p-2 bg-background rounded hover:bg-muted"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {student.firstName} {student.lastName}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">{student.email}</p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    disabled={actionLoading === student.id}
                                                    onClick={() => handleAddStudent(student)}
                                                >
                                                    {actionLoading === student.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <UserPlus className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Assigned Students */}
                                <div className="space-y-2">
                                    <div className="text-sm font-medium">Atanmış Öğrenciler</div>
                                    <ScrollArea className="h-[200px] border rounded p-2">
                                        {assignedStudents.map(student => (
                                            <div
                                                key={student.id}
                                                className="flex items-center justify-between p-2 hover:bg-muted rounded"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {student.firstName} {student.lastName}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">{student.email}</p>
                                                </div>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="text-destructive hover:text-destructive"
                                                    disabled={actionLoading === student.id}
                                                    onClick={() => handleRemoveStudent(student.id)}
                                                >
                                                    {actionLoading === student.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <X className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        ))}
                                        {assignedStudents.length === 0 && (
                                            <div className="p-4 text-center text-muted-foreground text-sm">
                                                Henüz öğrenci atanmadı. Yukarıdan arayarak ekleyebilirsiniz.
                                            </div>
                                        )}
                                    </ScrollArea>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
}
