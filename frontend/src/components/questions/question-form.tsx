'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ImagePlus, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { API_URL } from '@/lib/api-config';

// Option structure with text and image
const optionSchema = z.object({
    text: z.string().optional(),
    image: z.string().optional(),
});

// Full schema
const questionSchema = z.object({
    contentConfig: z.object({
        text: z.string().min(1, "Soru metni gereklidir"),
        image: z.string().optional(),
    }),
    options: z.object({
        A: optionSchema,
        B: optionSchema,
        C: optionSchema,
        D: optionSchema,
        E: optionSchema,
    }),
    correctAnswer: z.string().min(1, "Doğru cevap seçilmelidir"),
    difficulty: z.enum(['VERY_EASY', 'EASY', 'MEDIUM', 'HARD', 'VERY_HARD']),
    topicIds: z.array(z.string()).min(1, "En az bir konu seçilmelidir"),
    videoSolution: z.string().optional(),
    learningOutcomeId: z.string().optional(),
});

type QuestionFormValues = z.infer<typeof questionSchema>;

interface Topic {
    id: string;
    name: string;
    unit: {
        name: string;
        lesson: {
            name: string;
        }
    }
}

interface LearningOutcome {
    id: string;
    code: string;
    description: string;
    topicId: string;
}

const OPTIONS = ['A', 'B', 'C', 'D', 'E'] as const;

export function QuestionForm({ onSuccess }: { onSuccess?: () => void }) {
    const { toast } = useToast();
    const { accessToken } = useAuth();
    const [topics, setTopics] = useState<Topic[]>([]);
    const [learningOutcomes, setLearningOutcomes] = useState<LearningOutcome[]>([]);
    const [uploadingField, setUploadingField] = useState<string | null>(null);

    const form = useForm<QuestionFormValues>({
        resolver: zodResolver(questionSchema),
        defaultValues: {
            contentConfig: { text: '', image: '' },
            options: {
                A: { text: '', image: '' },
                B: { text: '', image: '' },
                C: { text: '', image: '' },
                D: { text: '', image: '' },
                E: { text: '', image: '' },
            },
            correctAnswer: '',
            difficulty: 'MEDIUM',
            topicIds: [],
            videoSolution: '',
            learningOutcomeId: '',
        },
    });



    useEffect(() => {
        async function fetchData() {
            try {
                const [treeRes, outcomesRes] = await Promise.all([
                    fetch(`${API_URL}/content/tree`, { headers: { Authorization: `Bearer ${accessToken}` } }),
                    fetch(`${API_URL}/content/learning-outcomes`, { headers: { Authorization: `Bearer ${accessToken}` } })
                ]);
                
                if (treeRes.ok) {
                    const treeData = await treeRes.json();
                    const allTopics: Topic[] = [];
                    treeData.forEach((lesson: any) => {
                        lesson.units?.forEach((unit: any) => {
                            unit.topics?.forEach((topic: any) => {
                                allTopics.push({
                                    id: topic.id,
                                    name: topic.name,
                                    unit: {
                                        name: unit.name,
                                        lesson: {
                                            name: lesson.name
                                        }
                                    }
                                });
                            });
                        });
                    });
                    setTopics(allTopics);
                }
                
                if (outcomesRes.ok) setLearningOutcomes(await outcomesRes.json());
            } catch (error) {
                console.error("Fetch data error", error);
            }
        }
        if (accessToken) fetchData();
    }, [accessToken]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldPath: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingField(fieldPath);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`${API_URL}/upload/image`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${accessToken}` },
                body: formData
            });

            if (!res.ok) throw new Error('Yükleme başarısız');
            const data = await res.json();

            // Set the image URL to the appropriate field
            form.setValue(fieldPath as any, data.url);
            toast({ title: 'Başarılı', description: 'Görsel yüklendi.' });
        } catch (error) {
            toast({ title: 'Hata', description: 'Resim yüklenemedi', variant: 'destructive' });
        } finally {
            setUploadingField(null);
        }
    };

    const clearImage = (fieldPath: string) => {
        form.setValue(fieldPath as any, '');
    };

    const onSubmit = async (data: QuestionFormValues) => {
        try {
            // Transform options to expected API format
            const transformedOptions: Record<string, any> = {};
            OPTIONS.forEach(opt => {
                transformedOptions[opt] = {
                    text: data.options[opt].text || '',
                    image: data.options[opt].image || null,
                };
            });

            const payload = {
                content: {
                    text: data.contentConfig.text,
                    image: data.contentConfig.image || null,
                    type: 'text_image'
                },
                options: transformedOptions,
                correctAnswer: data.correctAnswer,
                difficulty: data.difficulty,
                topicIds: data.topicIds,
                videoSolution: data.videoSolution || null,
                learningOutcomeId: data.learningOutcomeId || null,
                type: 'MULTIPLE_CHOICE'
            };

            const res = await fetch(`${API_URL}/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(payload) });

            if (!res.ok) throw new Error('Soru oluşturulamadı');

            toast({ title: 'Başarılı', description: 'Soru oluşturuldu.' });
            form.reset();
            if (onSuccess) onSuccess();
        } catch (error) {
            toast({ title: 'Hata', description: 'Bir sorun oluştu.', variant: 'destructive' });
        };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Yeni Soru Ekle</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Topics Selection */}
                            <FormField
                                control={form.control}
                                name="topicIds"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Konular</FormLabel>
                                        <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-2 bg-muted/20">
                                            {topics.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">Konu bulunamadı veya yükleniyor...</p>
                                            ) : (
                                                topics.map(topic => (
                                                    <div key={topic.id} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            checked={field.value.includes(topic.id)}
                                                            onCheckedChange={(checked) => {
                                                                const current = field.value;
                                                                if (checked) {
                                                                    field.onChange([...current, topic.id]);
                                                                } else {
                                                                    field.onChange(current.filter(v => v !== topic.id));
                                                                }
                                                            }}
                                                        />
                                                        <Label className="text-sm font-normal cursor-pointer">
                                                            {topic.unit?.lesson?.name || 'Ders'} - {topic.name}
                                                        </Label>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Learning Outcome Selection */}
                            <FormField
                                control={form.control}
                                name="learningOutcomeId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Kazanım (Opsiyonel)</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={form.watch('topicIds').length === 0 ? "Önce konu seçiniz" : "Kazanım seçiniz"} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {learningOutcomes.map(outcome => (
                                                    <SelectItem key={outcome.id} value={outcome.id}>
                                                        {outcome.code} - {outcome.description}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Video Solution Link */}
                        <FormField
                            control={form.control}
                            name="videoSolution"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Video Çözüm Linki (YouTube, Vimeo vb.)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://www.youtube.com/watch?v=..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Question Content */}
                        <div className="space-y-4 border p-4 rounded-md bg-muted/30">
                            <h3 className="font-semibold text-sm">Soru İçeriği</h3>
                            <FormField
                                control={form.control}
                                name="contentConfig.text"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Textarea placeholder="Soru metnini buraya yazın..." {...field} rows={4} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex items-center gap-4">
                                <Label htmlFor="question-image" className="cursor-pointer flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted transition-colors">
                                    <ImagePlus className="h-4 w-4" />
                                    <span className="text-sm">Görsel Ekle</span>
                                </Label>
                                <Input
                                    id="question-image"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleImageUpload(e, 'contentConfig.image')}
                                    disabled={uploadingField === 'contentConfig.image'}
                                />
                                {uploadingField === 'contentConfig.image' && <Loader2 className="animate-spin h-4 w-4" />}
                            </div>

                            {form.watch('contentConfig.image') && (
                                <div className="relative inline-block mt-2">
                                    <img src={form.watch('contentConfig.image')} alt="Soru görseli" className="max-h-48 rounded border" />
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="destructive"
                                        className="absolute -top-2 -right-2 h-6 w-6"
                                        onClick={() => clearImage('contentConfig.image')}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Options with Image Support */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm">Şıklar</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                {OPTIONS.map(opt => (
                                    <div key={opt} className="border rounded-lg p-4 space-y-3 bg-card shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-sm">
                                                {opt}
                                            </span>
                                            <span className="font-medium text-sm">Seçenek {opt}</span>
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name={`options.${opt}.text`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Textarea
                                                            {...field}
                                                            placeholder={`${opt} metni...`}
                                                            rows={2}
                                                            className="resize-none text-sm"
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <div className="flex items-center gap-3">
                                            <Label htmlFor={`option-${opt}-image`} className="cursor-pointer flex items-center gap-2 px-2 py-1 border rounded text-[10px] hover:bg-muted transition-colors uppercase tracking-wider font-semibold">
                                                <ImagePlus className="h-3 w-3" />
                                                <span>Görsel</span>
                                            </Label>
                                            <Input
                                                id={`option-${opt}-image`}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleImageUpload(e, `options.${opt}.image`)}
                                                disabled={uploadingField === `options.${opt}.image`}
                                            />
                                            {uploadingField === `options.${opt}.image` && <Loader2 className="animate-spin h-3 w-3" />}
                                        </div>

                                        {form.watch(`options.${opt}.image`) && (
                                            <div className="relative inline-block">
                                                <img
                                                    src={form.watch(`options.${opt}.image`)}
                                                    alt={`${opt} görseli`}
                                                    className="max-h-24 rounded border"
                                                />
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="destructive"
                                                    className="absolute -top-2 -right-2 h-5 w-5"
                                                    onClick={() => clearImage(`options.${opt}.image`)}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Correct Answer & Difficulty */}
                        <div className="flex gap-4">
                            <FormField
                                control={form.control}
                                name="correctAnswer"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>Doğru Cevap</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seçiniz" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {OPTIONS.map(opt => (
                                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="difficulty"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>Zorluk Seviyesi</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seçiniz" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="VERY_EASY">Çok Kolay</SelectItem>
                                                <SelectItem value="EASY">Kolay</SelectItem>
                                                <SelectItem value="MEDIUM">Orta</SelectItem>
                                                <SelectItem value="HARD">Zor</SelectItem>
                                                <SelectItem value="VERY_HARD">Çok Zor</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Button type="submit" className="w-full h-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            Soruyu Havuza Ekle
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
}
