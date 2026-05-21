import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import { Search, Loader2, UserPlus, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AddMemberModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    groupId: string;
    onSuccess: () => void;
}

export function AddMemberModal({ open, onOpenChange, groupId, onSuccess }: AddMemberModalProps) {
    const [students, setStudents] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (open) {
            fetchStudents();
            setSelectedIds(new Set());
            setSearch('');
        }
    }, [open]);

    const fetchStudents = async () => {
        setIsLoading(true);
        try {
            // Get all students
            const response = await apiClient.get('/users?role=STUDENT&take=100');
            // Assuming the API returns { data: [...] } or just an array
            const studentData = Array.isArray(response) ? response : response.data || [];
            
            // Also we could filter out students already in the group if we wanted to
            setStudents(studentData);
        } catch (error) {
            console.error('Öğrenciler getirilirken hata oluştu', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleStudent = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSave = async () => {
        if (selectedIds.size === 0) return;
        
        setIsSaving(true);
        try {
            await apiClient.post(`/groups/${groupId}/students`, {
                userIds: Array.from(selectedIds)
            });
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Öğrenciler eklenirken hata oluştu', error);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredStudents = students.filter(s => 
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-primary" />
                        Üye Ekle
                    </DialogTitle>
                    <DialogDescription>
                        Gruba eklemek istediğiniz öğrencileri seçin.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="İsim veya e-posta ile ara..." 
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <ScrollArea className="h-[300px] rounded-md border p-2">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                                Öğrenci bulunamadı.
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {filteredStudents.map((student) => {
                                    const isSelected = selectedIds.has(student.id);
                                    return (
                                        <div 
                                            key={student.id}
                                            onClick={() => toggleStudent(student.id)}
                                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border-primary/20' : 'hover:bg-slate-100 border-transparent'} border`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-slate-200 text-slate-700'}`}>
                                                    {student.firstName[0]}{student.lastName[0]}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium">{student.firstName} {student.lastName}</div>
                                                    <div className="text-xs text-muted-foreground">{student.email}</div>
                                                </div>
                                            </div>
                                            {isSelected && <Check className="w-4 h-4 text-primary" />}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>
                    <div className="text-sm text-muted-foreground">
                        {selectedIds.size} öğrenci seçildi
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
                    <Button onClick={handleSave} disabled={isSaving || selectedIds.size === 0}>
                        {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Gruba Ekle
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
