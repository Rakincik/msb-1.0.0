'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { API_URL } from '@/lib/api-config';

const formSchema = z.object({
    title: z.string().min(3, 'Sınav adı en az 3 karakter olmalıdır'),
    type: z.enum(['TYT', 'AYT', 'LGS', 'KPSS', 'ALES', 'DGS', 'YDS', 'YOKDIL', 'EHLIYET', 'CUSTOM']),
    duration: z.coerce.number().min(1, 'Süre en az 1 dakika olmalıdır'),
    pdfDocumentId: z.string().min(1, 'Bir PDF seçmelisiniz'), // Enforce PDF selection for now as we are focusing on PDF exams
    shuffleQuestions: z.boolean().default(false),
    showResults: z.boolean().default(true),
});

interface ExamFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface PdfDocument {
    id: string;
    title: string;
}

export function ExamFormDialog({ open, onOpenChange, onSuccess }: ExamFormDialogProps) {
    const { toast } = useToast();
    const { accessToken } = useAuth();
    const [pdfs, setPdfs] = useState<PdfDocument[]>([]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            title: '',
            type: 'TYT',
            duration: 120,
            shuffleQuestions: false,
            showResults: true,
        },
    });



    useEffect(() => {
        if (open) {
            const fetchPdfs = async () => {
                try {
                    const res = await fetch(`${API_URL}/pdf`, { headers: { Authorization: `Bearer ${accessToken}` } });
                    if (res.ok) {
                        const data = await res.json();
                        setPdfs(Array.isArray(data) ? data : (data.data || []));
                    }
                } catch (error) {
                    console.error('Failed to load PDFs', error);
                }
            };
            fetchPdfs();
        }
    }, [open, accessToken]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const res = await fetch(`${API_URL}/exams`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, 
                body: JSON.stringify(values) 
            });

            if (!res.ok) throw new Error('Sınav oluşturulamadı');

            toast({ title: 'Başarılı', description: 'Sınav oluşturuldu.' });
            onSuccess();
            onOpenChange(false);
            form.reset();
        } catch (error) {
            toast({ title: 'Hata', description: 'Sınav oluşturulurken hata oluştu.', variant: 'destructive' });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Yeni Test Oluştur</DialogTitle>
                    <DialogDescription>
                        PDF tabanlı bir test oluşturmak için detayları doldurun.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Test Adı</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Örn: Limit Türev Tarama" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sınav Türü</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seçiniz" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="TYT">TYT</SelectItem>
                                                <SelectItem value="AYT">AYT</SelectItem>
                                                <SelectItem value="LGS">LGS</SelectItem>
                                                <SelectItem value="KPSS">KPSS</SelectItem>
                                                <SelectItem value="CUSTOM">Özel / Diğer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="pdfDocumentId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>PDF Dokümanı</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="PDF Seçin" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {pdfs.length > 0 ? (
                                                    pdfs.map(pdf => (
                                                        <SelectItem key={pdf.id} value={pdf.id}>{pdf.title}</SelectItem>
                                                    ))
                                                ) : (
                                                    <div className="p-2 text-xs text-muted-foreground text-center">PDF bulunamadı</div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Listede doküman yoksa önce PDF yükleyiniz.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="duration"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Süre (Dakika)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex gap-6 pt-2">
                            <FormField
                                control={form.control}
                                name="shuffleQuestions"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm flex-1">
                                        <div className="space-y-0.5">
                                            <FormLabel>Soruları Karıştır</FormLabel>
                                            <FormDescription className="text-xs">
                                                Her öğrenciye farklı sıra
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="showResults"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm flex-1">
                                        <div className="space-y-0.5">
                                            <FormLabel>Sonuçları Göster</FormLabel>
                                            <FormDescription className="text-xs">
                                                Sınav bitince
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
                            <Button type="submit">Oluştur</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
