'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { UploadCloud, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { API_URL } from '@/lib/api-config';

const formSchema = z.object({
    title: z.string().min(2, 'Başlık en az 2 karakter olmalıdır'),
});

interface PdfUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function PdfUploadDialog({ open, onOpenChange, onSuccess }: PdfUploadDialogProps) {
    const { toast } = useToast();
    const { accessToken } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [uploadStep, setUploadStep] = useState<'idle' | 'uploading' | 'details' | 'saving'>('idle');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
        },
    });

    const handleClose = () => {
        onOpenChange(false);
        setTimeout(() => {
            setUploadStep('idle');
            setSelectedFile(null);
            setUploadedFileUrl(null);
            form.reset();
        }, 300);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type !== 'application/pdf') {
                toast({ title: 'Hata', description: 'Lütfen geçerli bir PDF dosyası seçin.', variant: 'destructive' });
                return;
            }
            setSelectedFile(file);
            form.setValue('title', file.name.replace('.pdf', ''));
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setUploadStep('uploading');


        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const res = await fetch(`${API_URL}/upload/pdf`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: formData  });

            if (!res.ok) throw new Error('Dosya yüklenemedi');

            const data = await res.json();
            // Assuming the backend returns { url: 'string', ... } or similar
            // If the upload controller returns object with `url` or `path` we use it. 
            // We need to verify what upload service returns.
            // For now assuming it returns the full URL string or object with url.
            const fileUrl = data.url || data.path || data;

            setUploadedFileUrl(fileUrl);
            setUploadStep('details');
        } catch (error) {
            console.error(error);
            toast({ title: 'Hata', description: 'Dosya yüklenirken hata oluştu.', variant: 'destructive' });
            setUploadStep('idle');
        }
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!uploadedFileUrl || !selectedFile) return;

        setUploadStep('saving');


        try {
            const payload = {
                title: values.title,
                fileName: selectedFile.name,
                fileUrl: uploadedFileUrl,
                fileSize: selectedFile.size,
                isActive: true,
            };

            const res = await fetch(`${API_URL}/pdf`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(payload) });

            if (!res.ok) throw new Error('PDF kaydedilemedi');

            toast({ title: 'Başarılı', description: 'PDF dokümanı sisteme eklendi.' });
            onSuccess();
            handleClose();
        } catch (error) {
            toast({ title: 'Hata', description: 'Kaydetme işlemi başarısız.', variant: 'destructive' });
            setUploadStep('details');
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>PDF Doküman Yükle</DialogTitle>
                    <DialogDescription>
                        Föyler, deneme sınavları veya konu anlatımı yükleyin.
                    </DialogDescription>
                </DialogHeader>

                {uploadStep === 'idle' || uploadStep === 'uploading' ? (
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg space-y-4">
                        <div className="p-4 bg-muted rounded-full">
                            <UploadCloud className="h-8 w-8 text-primary" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="font-semibold text-lg">PDF Dosyası Seçin</h3>
                            <p className="text-sm text-muted-foreground">Maksimum 20MB</p>
                        </div>
                        <Input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            id="pdf-upload"
                            onChange={handleFileSelect}
                            disabled={uploadStep === 'uploading'}
                        />
                        {selectedFile ? (
                            <div className="w-full space-y-4">
                                <div className="flex items-center gap-2 p-2 border rounded bg-muted/20">
                                    <FileText className="h-5 w-5 text-red-500" />
                                    <span className="text-sm font-medium truncate flex-1">{selectedFile.name}</span>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>Çıkar</Button>
                                </div>
                                <Button className="w-full" onClick={handleUpload} disabled={uploadStep === 'uploading'}>
                                    {uploadStep === 'uploading' ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yükleniyor...
                                        </>
                                    ) : (
                                        'Yüklemeyi Başlat'
                                    )}
                                </Button>
                            </div>
                        ) : (
                            <Button asChild variant="outline">
                                <label htmlFor="pdf-upload" className="cursor-pointer">
                                    Bilgisayardan Seç
                                </label>
                            </Button>
                        )}
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded text-sm font-medium">
                                <CheckCircle2 className="h-5 w-5" />
                                Dosya başarıyla yüklendi. Şimdi başlık belirleyin.
                            </div>

                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Doküman Başlığı</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Örn: 9. Sınıf Matematik 1. Dönem" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={handleClose}>İptal</Button>
                                <Button type="submit" disabled={uploadStep === 'saving'}>
                                    {uploadStep === 'saving' ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor...
                                        </>
                                    ) : (
                                        'Kaydet ve Bitir'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}
