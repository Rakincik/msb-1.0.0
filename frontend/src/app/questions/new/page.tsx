'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { API_URL } from '@/lib/api-config';

interface Lesson {
    id: string;
    name: string;
}

interface Unit {
    id: string;
    name: string;
}

interface Topic {
    id: string;
    name: string;
}

export default function NewQuestionPage() {
    const { accessToken } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);

    const [selectedLesson, setSelectedLesson] = useState('');
    const [selectedUnit, setSelectedUnit] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true);

    const [formData, setFormData] = useState({
        content: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        optionE: '',
        correctAnswer: '',
        difficulty: 'MEDIUM',
        explanation: '',
    });



    // Dersleri yükle
    useEffect(() => {
        const fetchLessons = async () => {
            try {
                const res = await fetch(`${API_URL}/content/lessons`, { headers: { Authorization: `Bearer ${accessToken}` } });
                if (res.ok) {
                    const data = await res.json();
                    setLessons(data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsDataLoading(false);
            }
        };
        if (accessToken) fetchLessons();
    }, [accessToken]);

    const fetchTopics = async (unitId: string) => {
        setSelectedUnit(unitId);
        try {
            const res = await fetch(`${API_URL}/content/topics?unitId=${unitId}`, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (res.ok) {
                const data = await res.json();
                setTopics(data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const payload = {
            type: "MULTIPLE_CHOICE",
            content: { text: formData.content, type: 'text' },
            options: {
                A: { text: formData.optionA, type: 'text' },
                B: { text: formData.optionB, type: 'text' },
                C: { text: formData.optionC, type: 'text' },
                D: { text: formData.optionD, type: 'text' },
                E: { text: formData.optionE, type: 'text' }
            },
            correctAnswer: formData.correctAnswer,
            difficulty: formData.difficulty,
            topicIds: [selectedTopic].filter(Boolean)
        };
        
        try {
            const res = await fetch(`${API_URL}/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(payload) });

            if (!res.ok) {
                throw new Error('Soru kaydedilemedi');
            }

            toast({ title: 'Başarılı', description: 'Soru başarıyla eklendi' });
            router.push('/questions');
        } catch (error) {
            toast({ title: 'Hata', description: error instanceof Error ? error.message : 'Soru kaydedilemedi', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Yeni Soru Ekle</h1>
                    <p className="text-muted-foreground">Soru bankasına yeni çoktan seçmeli soru ekleyin.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Soru Detayları</CardTitle>
                        <CardDescription>Soru içeriğini ve sınıflandırmasını girin.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-6">
                            {/* Sınıflandırma */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                                <div className="space-y-2">
                                    <Label>Ders</Label>
                                    <Select value={selectedLesson} onValueChange={setSelectedLesson} disabled={isDataLoading}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Ders Seçin" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {lessons.map(l => (
                                                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Ünite</Label>
                                    <Select value={selectedUnit} onValueChange={fetchTopics} disabled={!selectedLesson}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Ünite Seçin" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {units.map(u => (
                                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Konu</Label>
                                    <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={!selectedUnit}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Konu Seçin" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {topics.map(t => (
                                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Soru Metni */}
                            <div className="space-y-2">
                                <Label htmlFor="content">Soru Metni</Label>
                                <Textarea
                                    id="content"
                                    placeholder="Soru metnini buraya girin..."
                                    className="min-h-[100px]"
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Seçenekler */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                                    <div key={opt} className="space-y-2">
                                        <Label htmlFor={`option${opt}`}>Seçenek {opt}</Label>
                                        <div className="flex gap-2">
                                            <div className="flex items-center justify-center w-8 h-10 font-bold bg-muted rounded">
                                                {opt}
                                            </div>
                                            <Input
                                                id={`option${opt}`}
                                                placeholder={`${opt} şıkkı metni`}
                                                value={(formData as Record<string, string>)[`option${opt}`]}
                                                onChange={(e) => setFormData({ ...formData, [`option${opt}`]: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Doğru Cevap & Zorluk */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Doğru Cevap</Label>
                                    <Select
                                        value={formData.correctAnswer}
                                        onValueChange={(val) => setFormData({ ...formData, correctAnswer: val })}
                                        required
                                    >
                                        <SelectTrigger className="border-green-200 bg-green-50">
                                            <SelectValue placeholder="Doğru Cevabı Seçin" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                                                <SelectItem key={opt} value={opt}>Seçenek {opt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Zorluk Seviyesi</Label>
                                    <Select
                                        value={formData.difficulty}
                                        onValueChange={(val) => setFormData({ ...formData, difficulty: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Zorluk Seçin" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="VERY_EASY">Çok Kolay</SelectItem>
                                            <SelectItem value="EASY">Kolay</SelectItem>
                                            <SelectItem value="MEDIUM">Orta</SelectItem>
                                            <SelectItem value="HARD">Zor</SelectItem>
                                            <SelectItem value="VERY_HARD">Çok Zor</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Açıklama */}
                            <div className="space-y-2">
                                <Label htmlFor="explanation">Çözüm Açıklaması</Label>
                                <Textarea
                                    id="explanation"
                                    placeholder="Sorunun çözümünü ve açıklamasını buraya girin..."
                                    value={formData.explanation}
                                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                                />
                            </div>

                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Kaydediliyor...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Soruyu Kaydet
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </DashboardLayout>
    );
}
