'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { API_URL } from '@/lib/api-config';

const formSchema = z.object({
    name: z.string().min(2, 'Ders adı en az 2 karakter olmalıdır'),
    code: z.string().min(2, 'Ders kodu en az 2 karakter olmalıdır'),
    order: z.coerce.number().min(0).optional(),
    isActive: z.boolean().default(true),
});

interface LessonDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lesson?: any;
    onSuccess: () => void;
}

export function LessonDialog({ open, onOpenChange, lesson, onSuccess }: LessonDialogProps) {
    const { accessToken } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: '',
            code: '',
            order: 0,
            isActive: true,
        },
    });

    useEffect(() => {
        if (lesson) {
            form.reset({
                name: lesson.name,
                code: lesson.code,
                order: lesson.order,
                isActive: lesson.isActive,
            });
        } else {
            form.reset({
                name: '',
                code: '',
                order: 0,
                isActive: true,
            });
        }
    }, [lesson, form]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true);
        try {
            const url = lesson
                ? `${API_URL}/content/lessons/${lesson.id}`
                : `${API_URL}/content/lessons`;
            const method = lesson ? 'PATCH' : 'POST';
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(values),
            });
            if (!res.ok) throw new Error('İşlem başarısız');
            toast({
                title: 'Başarılı',
                description: `Ders başarıyla ${lesson ? 'güncellendi' : 'oluşturuldu'}.`,
            });
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            toast({
                title: 'Hata',
                description: 'Bir sorun oluştu.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{lesson ? 'Dersi Düzenle' : 'Yeni Ders Ekle'}</DialogTitle>
                    <DialogDescription>
                        Ders bilgilerini aşağıdan yönetebilirsiniz.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Ders Adı</FormLabel>
                                <FormControl><Input placeholder="Örn: Matematik" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="code" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Ders Kodu</FormLabel>
                                <FormControl><Input placeholder="Örn: MAT" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <div className="flex gap-4">
                            <FormField control={form.control} name="order" render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormLabel>Sıra</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="isActive" render={({ field }) => (
                                <FormItem className="flex flex-col justify-end pb-2">
                                    <div className="flex items-center gap-2">
                                        <FormLabel className="cursor-pointer" htmlFor="active-switch">Aktif</FormLabel>
                                        <FormControl>
                                            <Switch id="active-switch" checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </div>
                                </FormItem>
                            )} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
                            <Button type="submit" disabled={isLoading}>{isLoading ? 'Kaydediliyor...' : 'Kaydet'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
