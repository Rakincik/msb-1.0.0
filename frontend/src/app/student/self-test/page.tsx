'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Loader2, BookOpen, ChevronRight, Layers, Target, CheckSquare, Clock, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { cn, getFileUrl } from '@/lib/utils';
import Image from 'next/image';

export default function SelfTestPage() {
    const { toast } = useToast();
    const [mainStep, setMainStep] = useState<'wizard' | 'solve' | 'result'>('wizard');
    
    // Wizard States
    const [wizardStep, setWizardStep] = useState(1);
    const [examAreas, setExamAreas] = useState<any[]>([]);
    const [selectedArea, setSelectedArea] = useState<any>(null);
    const [hierarchy, setHierarchy] = useState<any>(null);
    const [isHierarchyLoading, setIsHierarchyLoading] = useState(false);
    
    const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
    const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [selectedOutcomes, setSelectedOutcomes] = useState<string[]>([]);

    const [questionCount, setQuestionCount] = useState<number[]>([20]);
    const [difficulties, setDifficulties] = useState<string[]>([]);
    const [onlyIncorrect, setOnlyIncorrect] = useState(false);
    
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Solve States
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> optionId
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Result States
    const [resultData, setResultData] = useState<any>(null);

    // Initial Fetch
    useEffect(() => {
        const fetchAreas = async () => {
            try {
                const data = await apiClient.get('/exam-areas/student/my-areas');
                setExamAreas(data);
            } catch (e) {
                toast({ title: 'Hata', description: 'Soru bankaları yüklenemedi.', variant: 'destructive' });
            }
        };
        fetchAreas();
    }, []);

    // Fetch Hierarchy when area selected
    useEffect(() => {
        if (selectedArea && wizardStep === 2 && !hierarchy) {
            const fetchHierarchy = async () => {
                setIsHierarchyLoading(true);
                try {
                    const data = await apiClient.get(`/exam-areas/slug/${selectedArea.slug}`);
                    setHierarchy(data);
                } catch (e) {
                    toast({ title: 'Hata', description: 'Müfredat ağacı yüklenemedi.', variant: 'destructive' });
                } finally {
                    setIsHierarchyLoading(false);
                }
            };
            fetchHierarchy();
        }
    }, [selectedArea, wizardStep]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const payload = {
                examAreaId: selectedArea.id,
                lessonIds: selectedLessons,
                unitIds: selectedUnits,
                topicIds: selectedTopics,
                learningOutcomeIds: selectedOutcomes,
                difficulties: difficulties,
                onlyIncorrect: onlyIncorrect,
                questionCount: questionCount[0]
            };
            const generatedQuestions = await apiClient.post('/self-test/generate', payload);
            if (generatedQuestions.length === 0) {
                toast({ title: 'Soru Bulunamadı', description: 'Bu kriterlere uygun soru bulunamadı. Lütfen filtreleri esnetin.', variant: 'destructive' });
            } else {
                setQuestions(generatedQuestions);
                setMainStep('solve');
                
                if (generatedQuestions.length < questionCount[0]) {
                    toast({ 
                        title: 'Eksik Soru Sayısı', 
                        description: `Havuzda yeterli soru olmadığı için ${generatedQuestions.length} adet soru ile deneme başlatıldı.`
                    });
                } else {
                    toast({ title: 'Deneme Hazır!', description: `${generatedQuestions.length} soru başarıyla derlendi.` });
                }
            }
        } catch (error: any) {
            toast({ title: 'Hata', description: error.message || 'Deneme oluşturulamadı.', variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const payload = {
                answers: questions.map(q => ({ 
                    questionId: q.id, 
                    selectedOptionId: answers[q.id] || "" 
                }))
            };
            const result = await apiClient.post('/self-test/submit', payload);
            setResultData(result);
            setMainStep('result');
            toast({ title: 'Sınav Tamamlandı', description: 'Sonuçlarınız başarıyla kaydedildi.' });
        } catch (error: any) {
            toast({ title: 'Hata', description: error.message || 'Gönderim başarısız.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper to toggle arrays
    const toggleArray = (arr: string[], val: string) => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

    // ==========================================
    // RENDER: WIZARD
    // ==========================================
    if (mainStep === 'wizard') {
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto space-y-8 py-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                            <Layers className="h-8 w-8 text-slate-600" />
                            Mini Deneme Oluştur
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Kendi kurallarını koy! İstediğin konulardan, istediğin zorlukta özel bir test hazırla.
                        </p>
                    </div>

                    {/* Step Progress */}
                    <div className="flex items-center justify-between relative pb-4">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 rounded-full z-0"></div>
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-slate-600 rounded-full z-0 transition-all duration-500" style={{ width: `${((wizardStep - 1) / 2) * 100}%` }}></div>
                        
                        {[1, 2, 3].map((step) => (
                            <div key={step} className={cn("relative z-10 flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm border-4 transition-colors duration-300", 
                                wizardStep >= step ? "bg-slate-600 border-slate-100 text-white" : "bg-white border-slate-200 text-slate-400"
                            )}>
                                {step}
                            </div>
                        ))}
                    </div>

                    <Card className="border-t-4 border-t-slate-600 shadow-xl rounded-2xl overflow-hidden">
                        
                        {/* STEP 1: SELECT AREA */}
                        {wizardStep === 1 && (
                            <>
                                <CardHeader className="bg-slate-50 border-b pb-6">
                                    <CardTitle className="text-xl text-slate-900">1. Soru Havuzunu Seç</CardTitle>
                                    <CardDescription>Hangi soru bankasından deneme oluşturmak istiyorsun?</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    {examAreas.length === 0 ? (
                                        <div className="text-center py-10 text-muted-foreground">Henüz tanımlı soru bankanız bulunmuyor.</div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {examAreas.map(area => (
                                                <div 
                                                    key={area.id}
                                                    onClick={() => setSelectedArea(area)}
                                                    className={cn("cursor-pointer border-2 rounded-xl p-4 transition-all hover:shadow-md",
                                                        selectedArea?.id === area.id ? "border-slate-600 bg-slate-50/50" : "border-slate-200 hover:border-slate-300"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-600">
                                                            <BookOpen className="h-5 w-5" />
                                                        </div>
                                                        <h3 className="font-bold text-slate-800 leading-tight">{area.name}</h3>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-2">{area._count?.lessons || 0} Ders • {area._count?.questions || 0} Soru</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="bg-slate-50 border-t p-4 flex justify-end">
                                    <Button onClick={() => setWizardStep(2)} disabled={!selectedArea} className="bg-slate-600 hover:bg-slate-700">
                                        İleri <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                </CardFooter>
                            </>
                        )}

                        {/* STEP 2: SELECT SCOPE */}
                        {wizardStep === 2 && (
                            <>
                                <CardHeader className="bg-slate-50 border-b pb-6">
                                    <CardTitle className="text-xl text-slate-900 flex items-center gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => setWizardStep(1)} className="h-8 w-8 -ml-2"><ArrowLeft className="h-4 w-4" /></Button>
                                        2. Kapsamı Belirle
                                    </CardTitle>
                                    <CardDescription className="pl-8">Hangi konulardan soru gelmesini istiyorsun? Tüm dersi veya sadece belirli konuları seçebilirsin. (Boş bırakırsan havuzdaki tüm konular dahil edilir.)</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0 h-[500px]">
                                    {isHierarchyLoading ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                            <Loader2 className="h-8 w-8 animate-spin mb-4 text-slate-500" />
                                            <p>Ağaç yükleniyor...</p>
                                        </div>
                                    ) : !hierarchy ? (
                                        <div className="text-center py-10">Veri bulunamadı.</div>
                                    ) : (
                                        <ScrollArea className="h-full p-6">
                                            <div className="space-y-6">
                                                {hierarchy.lessons?.map((lesson: any) => (
                                                    <div key={lesson.id} className="border rounded-xl p-4 bg-white shadow-sm">
                                                        <div className="flex items-center space-x-3 pb-2 border-b">
                                                            <Checkbox 
                                                                id={`lesson-${lesson.id}`} 
                                                                checked={selectedLessons.includes(lesson.id)}
                                                                onCheckedChange={() => setSelectedLessons(prev => toggleArray(prev, lesson.id))}
                                                            />
                                                            <label htmlFor={`lesson-${lesson.id}`} className="text-base font-bold text-slate-800 cursor-pointer flex items-center gap-2">
                                                                <BookOpen className="h-4 w-4 text-blue-500" /> {lesson.name}
                                                            </label>
                                                        </div>
                                                        <div className="pl-6 pt-3 space-y-4">
                                                            {lesson.units?.map((unit: any) => (
                                                                <div key={unit.id} className="space-y-2">
                                                                    <div className="flex items-center space-x-3">
                                                                        <Checkbox 
                                                                            id={`unit-${unit.id}`} 
                                                                            checked={selectedUnits.includes(unit.id)}
                                                                            onCheckedChange={() => setSelectedUnits(prev => toggleArray(prev, unit.id))}
                                                                        />
                                                                        <label htmlFor={`unit-${unit.id}`} className="text-sm font-semibold text-slate-700 cursor-pointer flex items-center gap-2">
                                                                            <Layers className="h-3 w-3 text-slate-400" /> {unit.name}
                                                                        </label>
                                                                    </div>
                                                                    <div className="pl-6 space-y-2">
                                                                        {unit.topics?.map((topic: any) => (
                                                                            <div key={topic.id} className="space-y-1">
                                                                                <div className="flex items-center space-x-3">
                                                                                    <Checkbox 
                                                                                        id={`topic-${topic.id}`} 
                                                                                        checked={selectedTopics.includes(topic.id)}
                                                                                        onCheckedChange={() => setSelectedTopics(prev => toggleArray(prev, topic.id))}
                                                                                    />
                                                                                    <label htmlFor={`topic-${topic.id}`} className="text-sm text-slate-600 cursor-pointer flex items-center gap-2">
                                                                                        <Target className="h-3 w-3 text-slate-400" /> {topic.name}
                                                                                    </label>
                                                                                </div>
                                                                                <div className="pl-6 space-y-1">
                                                                                    {topic.learningOutcomes?.map((outcome: any) => (
                                                                                        <div key={outcome.id} className="flex items-center space-x-3">
                                                                                            <Checkbox 
                                                                                                id={`outcome-${outcome.id}`} 
                                                                                                checked={selectedOutcomes.includes(outcome.id)}
                                                                                                onCheckedChange={() => setSelectedOutcomes(prev => toggleArray(prev, outcome.id))}
                                                                                            />
                                                                                            <label htmlFor={`outcome-${outcome.id}`} className="text-xs text-slate-500 cursor-pointer flex items-center gap-2 leading-tight">
                                                                                                <CheckSquare className="h-2 w-2 text-emerald-400" /> {outcome.name}
                                                                                            </label>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    )}
                                </CardContent>
                                <CardFooter className="bg-slate-50 border-t p-4 flex justify-between">
                                    <div className="text-sm text-slate-500">
                                        Seçim yapılmazsa <strong>tüm</strong> konular dahil edilir.
                                    </div>
                                    <Button onClick={() => setWizardStep(3)} className="bg-slate-600 hover:bg-slate-700">
                                        İleri <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                </CardFooter>
                            </>
                        )}

                        {/* STEP 3: CONFIGURATION */}
                        {wizardStep === 3 && (
                            <>
                                <CardHeader className="bg-slate-50 border-b pb-6">
                                    <CardTitle className="text-xl text-slate-900 flex items-center gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => setWizardStep(2)} className="h-8 w-8 -ml-2"><ArrowLeft className="h-4 w-4" /></Button>
                                        3. Deneme Ayarları
                                    </CardTitle>
                                    <CardDescription className="pl-8">Sınavın zorluğunu ve uzunluğunu belirle.</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-8 space-y-10 px-8">
                                    
                                    {/* Question Count */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-base font-bold text-slate-800">Soru Sayısı</Label>
                                            <Badge variant="outline" className="text-lg px-3 py-1 font-mono border-slate-200 text-slate-700 bg-slate-50">{questionCount[0]}</Badge>
                                        </div>
                                        <Slider 
                                            defaultValue={[20]} 
                                            max={100} min={5} step={5} 
                                            value={questionCount} 
                                            onValueChange={setQuestionCount} 
                                            className="py-4"
                                        />
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>5 Soru (Hızlı Pratik)</span>
                                            <span>100 Soru (Tam Deneme)</span>
                                        </div>
                                    </div>

                                    {/* Difficulty */}
                                    <div className="space-y-4">
                                        <Label className="text-base font-bold text-slate-800">Zorluk Derecesi (Opsiyonel)</Label>
                                        <div className="flex flex-wrap gap-3">
                                            {['VERY_EASY', 'EASY', 'MEDIUM', 'HARD', 'VERY_HARD'].map(diff => (
                                                <div 
                                                    key={diff}
                                                    onClick={() => setDifficulties(prev => toggleArray(prev, diff))}
                                                    className={cn("cursor-pointer border rounded-full px-4 py-2 text-sm transition-colors",
                                                        difficulties.includes(diff) ? "bg-slate-600 text-white border-slate-600 shadow-md" : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                                                    )}
                                                >
                                                    {diff === 'VERY_EASY' ? 'Çok Kolay' : diff === 'EASY' ? 'Kolay' : diff === 'MEDIUM' ? 'Orta' : diff === 'HARD' ? 'Zor' : 'Çok Zor'}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground">Hiçbiri seçilmezse karışık zorlukta sorular gelir.</p>
                                    </div>

                                    {/* Smart Filters */}
                                    <div className="space-y-4 pt-4 border-t">
                                        <Label className="text-base font-bold text-slate-800">Akıllı Filtreler</Label>
                                        <div className="flex items-start space-x-3 p-4 border rounded-xl bg-orange-50/50 border-orange-100">
                                            <Checkbox 
                                                id="onlyIncorrect" 
                                                checked={onlyIncorrect} 
                                                onCheckedChange={(c) => setOnlyIncorrect(!!c)} 
                                                className="mt-1 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                                            />
                                            <div className="space-y-1">
                                                <label htmlFor="onlyIncorrect" className="text-sm font-bold text-orange-900 cursor-pointer">Sadece Yanlış Yaptıklarımı Sor</label>
                                                <p className="text-xs text-orange-700/80">Sistem, daha önce çözüp yanlış yaptığın veya boş bıraktığın soruları tarar ve onlardan yeni bir deneme oluşturur. (Eksik kapatmak için mükemmeldir!)</p>
                                            </div>
                                        </div>
                                    </div>

                                </CardContent>
                                <CardFooter className="bg-slate-50 border-t p-6 flex justify-end">
                                    <Button onClick={handleGenerate} disabled={isGenerating} size="lg" className="w-full sm:w-auto bg-gradient-to-r from-slate-600 to-slate-600 hover:from-slate-700 hover:to-slate-700 shadow-lg text-md h-12 px-8">
                                        {isGenerating ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Derleniyor...</> : <><CheckSquare className="mr-2 h-5 w-5" /> Denemeyi Başlat</>}
                                    </Button>
                                </CardFooter>
                            </>
                        )}
                    </Card>
                </div>
            </DashboardLayout>
        );
    }

    // ==========================================
    // RENDER: SOLVE
    // ==========================================
    if (mainStep === 'solve') {
        const q = questions[currentQuestionIndex];
        const isLast = currentQuestionIndex === questions.length - 1;
        const answeredCount = Object.keys(answers).length;

        return (
            <div className="min-h-screen bg-slate-100">
                {/* Header */}
                <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
                    <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Layers className="h-6 w-6 text-slate-600" />
                            <h2 className="font-bold text-slate-800">Karışık Çöz</h2>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md">
                                {answeredCount} / {questions.length} Cevaplandı
                            </div>
                            <Button variant="destructive" size="sm" onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckSquare className="h-4 w-4 mr-2" />} 
                                Sınavı Bitir
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto py-8 px-4 flex flex-col lg:flex-row gap-6 items-start">
                    {/* Main Question Area */}
                    <Card className="flex-1 shadow-xl border-t-4 border-t-slate-600 w-full overflow-hidden flex flex-col">
                        <CardHeader className="flex flex-row items-center justify-between bg-slate-50 border-b">
                            <Badge variant="outline" className="bg-white text-base py-1 px-3">Soru {currentQuestionIndex + 1}</Badge>
                            <div className="flex gap-2">
                                {q.topics?.map((t: any) => <Badge key={t.id} variant="secondary" className="text-xs">{t.name}</Badge>)}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 flex flex-col lg:flex-row">
                            {/* Left: Question Content */}
                            <div className="p-8 lg:w-1/2 border-b lg:border-b-0 lg:border-r border-slate-100 overflow-y-auto h-[75vh] min-h-[500px] max-h-[900px] custom-scrollbar">
                                <div className="space-y-4">
                                    {typeof q.content === 'object' && q.content !== null ? (
                                        <>
                                            {q.content.text && <div className="prose max-w-none text-slate-800" dangerouslySetInnerHTML={{ __html: q.content.text }} />}
                                            {q.content.image && (
                                                <div className="mt-4 flex justify-center">
                                                    <img src={getFileUrl(q.content.image)} alt="Soru görseli" className="max-w-full max-h-[400px] object-contain rounded-lg shadow-sm border" />
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="prose max-w-none text-slate-800" dangerouslySetInnerHTML={{ __html: typeof q.content === 'string' ? q.content : '' }} />
                                    )}
                                </div>
                            </div>
                            
                            {/* Right: Options */}
                            <div className="p-8 lg:w-1/2 bg-slate-50/50 overflow-y-auto h-[75vh] min-h-[500px] max-h-[900px] custom-scrollbar">
                                <div className="space-y-3">
                                    {q.options?.map((opt: any, i: number) => {
                                        const labels = ['A', 'B', 'C', 'D', 'E'];
                                        const isSelected = answers[q.id] === opt.id;
                                        
                                        return (
                                            <div 
                                                key={opt.id}
                                                onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                                                className={cn("flex items-center p-4 border rounded-xl cursor-pointer transition-all hover:shadow-md",
                                                    isSelected ? "bg-slate-50 border-slate-500 ring-1 ring-slate-500" : "bg-white border-slate-200 hover:border-slate-200 hover:bg-slate-50"
                                                )}
                                            >
                                                <div className={cn("w-8 h-8 flex items-center justify-center rounded-full font-bold mr-4 shrink-0 transition-colors", 
                                                    isSelected ? "bg-slate-600 text-white" : "bg-slate-100 text-slate-500"
                                                )}>
                                                    {labels[i]}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    {opt.content && <div dangerouslySetInnerHTML={{ __html: opt.content }} className={cn(isSelected && "font-medium text-slate-900")} />}
                                                    {opt.image && (
                                                        <div className="mt-2">
                                                            <img src={getFileUrl(opt.image)} alt="Şık görseli" className="max-h-[200px] object-contain rounded border border-slate-200 shadow-sm" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-slate-50 border-t p-4 flex justify-between">
                            <Button 
                                variant="outline" 
                                onClick={() => setCurrentQuestionIndex(p => Math.max(0, p - 1))} 
                                disabled={currentQuestionIndex === 0}
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" /> Önceki
                            </Button>

                            {isLast ? (
                                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Sınavı Bitir"}
                                </Button>
                            ) : (
                                <Button className="bg-slate-600 hover:bg-slate-700" onClick={() => setCurrentQuestionIndex(p => Math.min(questions.length - 1, p + 1))}>
                                    Sonraki <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            )}
                        </CardFooter>
                    </Card>

                    {/* Quick Navigator Sidebar */}
                    <div className="w-full lg:w-[320px] shrink-0 sticky top-[100px]">
                        <Card className="shadow-lg border-0 bg-white">
                            <CardHeader className="bg-slate-50 pb-4 border-b">
                                <CardTitle className="text-base text-slate-800 flex items-center justify-between">
                                    Soru Gezgini
                                    <span className="text-xs text-slate-500 font-normal">{answeredCount}/{questions.length}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="grid grid-cols-5 gap-2">
                                    {questions.map((_, i) => {
                                        const isCurrent = i === currentQuestionIndex;
                                        const isAns = !!answers[questions[i].id];
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => setCurrentQuestionIndex(i)}
                                                className={cn("w-10 h-10 flex items-center justify-center rounded-full font-medium text-sm transition-all border-2",
                                                    isCurrent ? "ring-2 ring-slate-300 ring-offset-2 border-slate-600" : "border-transparent",
                                                    isAns ? "bg-slate-600 text-white" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-100"
                                                )}
                                            >
                                                {i + 1}
                                            </button>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER: RESULT
    // ==========================================
    if (mainStep === 'result' && resultData) {
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto space-y-8 py-6">
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckSquare className="h-10 w-10" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sınav Sonuçları</h1>
                        <p className="text-muted-foreground text-lg">Tebrikler, karışık çöz testini tamamladın!</p>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <Card className="bg-emerald-50 border-emerald-200">
                            <CardContent className="p-6 text-center">
                                <div className="text-4xl font-black text-emerald-600 mb-2">{resultData.correctCount}</div>
                                <div className="font-semibold text-emerald-800">Doğru</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-red-50 border-red-200">
                            <CardContent className="p-6 text-center">
                                <div className="text-4xl font-black text-red-600 mb-2">{resultData.wrongCount}</div>
                                <div className="font-semibold text-red-800">Yanlış</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-50 border-slate-200">
                            <CardContent className="p-6 text-center">
                                <div className="text-4xl font-black text-slate-600 mb-2">{resultData.emptyCount}</div>
                                <div className="font-semibold text-slate-800">Boş</div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Sorular ve Çözümler</CardTitle>
                            <CardDescription>Sorulardaki performansın ve video çözümleri</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {resultData.evaluatedAnswers?.map((ans: any, idx: number) => (
                                    <div key={ans.questionId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-xl bg-white shadow-sm gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0", 
                                                ans.isCorrect ? "bg-emerald-500" : ans.isEmpty ? "bg-slate-300" : "bg-red-500"
                                            )}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-800">
                                                    {ans.isCorrect ? "Doğru Yanıt" : ans.isEmpty ? "Boş Bırakıldı" : "Yanlış Yanıt"}
                                                </h4>
                                                <p className="text-sm text-slate-500">
                                                    {ans.isEmpty ? "Cevap işaretlenmedi." : `Senin cevabın farklıydı.`} Doğru Cevap: <strong className="text-slate-700">{ans.correctOptionId}</strong>
                                                </p>
                                            </div>
                                        </div>
                                        {ans.videoSolution ? (
                                            <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 shrink-0" onClick={() => window.open(ans.videoSolution, '_blank')}>
                                                Video Çözümü İzle
                                            </Button>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">Video çözüm eklenmemiş</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Konu Analizi</CardTitle>
                            <CardDescription>Hangi konuda ne kadar başarılı oldun?</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {Object.values(resultData.topicStats).map((stat: any, idx: number) => {
                                    const total = stat.correct + stat.wrong + stat.empty;
                                    const successRate = total > 0 ? Math.round((stat.correct / total) * 100) : 0;
                                    return (
                                        <div key={idx} className="border p-4 rounded-xl flex items-center justify-between">
                                            <div>
                                                <h4 className="font-bold text-slate-800">{stat.name}</h4>
                                                <div className="flex gap-4 text-sm mt-2">
                                                    <span className="text-emerald-600">{stat.correct} Doğru</span>
                                                    <span className="text-red-500">{stat.wrong} Yanlış</span>
                                                    <span className="text-slate-500">{stat.empty} Boş</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-black text-slate-600">%{successRate}</div>
                                                <div className="text-xs text-muted-foreground">Başarı Oranı</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                        <CardFooter className="bg-slate-50 border-t p-6 flex justify-center">
                            <Button onClick={() => window.location.reload()} variant="outline" className="mr-4">Ana Ekrana Dön</Button>
                            <Button onClick={() => setMainStep('wizard')} className="bg-slate-600 hover:bg-slate-700">Yeni Bir Deneme Oluştur</Button>
                        </CardFooter>
                    </Card>
                </div>
            </DashboardLayout>
        );
    }

    return null;
}
