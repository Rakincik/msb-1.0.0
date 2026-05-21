'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface AssignToExamAreaModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    questionIds: string[];
    onSuccess?: () => void;
}

interface ExamArea {
    id: string;
    name: string;
}

export function AssignToExamAreaModal({ open, onOpenChange, questionIds, onSuccess }: AssignToExamAreaModalProps) {
    const { toast } = useToast();

    const [examAreas, setExamAreas] = useState<ExamArea[]>([]);
    const [selectedExamAreas, setSelectedExamAreas] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);



    useEffect(() => {
        async function fetchExamAreas() {
            setIsLoading(true);
            try {
                const data = await apiClient.get('/exam-areas?includeInactive=true');
            setExamAreas(data)
            } catch (error) {
                console.error("Fetch error", error);
            } finally {
                setIsLoading(false);
            }
        }
        if (open) {
            fetchExamAreas();
            setSelectedExamAreas([]); // Reset selection on open
        }
    }, [open]);

    const handleSubmit = async () => {
        if (selectedExamAreas.length === 0) {
            toast({ title: 'Uyarı', description: 'Lütfen en az bir soru bankası seçin.', variant: 'default' });
            return;
        }

        setIsSubmitting(true);
        try {
            await apiClient.post('/questions/bulk-add-to-exam-area', {
                questionIds,
                examAreaIds: selectedExamAreas
            });

            toast({ title: 'Başarılı', description: `${questionIds.length} soru seçilen soru bankalarına eklendi.` });
            onSuccess?.();
            onOpenChange(false);
        } catch (error) {
            toast({ title: 'Hata', description: 'Sorular eklenemedi.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Soru Bankasına Ekle</DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    <p className="text-sm text-muted-foreground mb-4">
                        Seçilen {questionIds.length} soruyu aşağıdaki soru bankalarına ekleyin:
                    </p>

                    {isLoading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2">
                            {examAreas.length === 0 ? (
                                <p className="text-sm text-center text-muted-foreground py-4">Soru bankası bulunamadı.</p>
                            ) : (
                                examAreas.map((area) => (
                                    <label
                                        key={area.id}
                                        className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                                    >
                                        <Checkbox
                                            checked={selectedExamAreas.includes(area.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedExamAreas([...selectedExamAreas, area.id]);
                                                } else {
                                                    setSelectedExamAreas(selectedExamAreas.filter(id => id !== area.id));
                                                }
                                            }}
                                        />
                                        <span className="text-sm font-medium">{area.name}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || selectedExamAreas.length === 0} className="gap-2">
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        <Save className="h-4 w-4" />
                        Kaydet
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
