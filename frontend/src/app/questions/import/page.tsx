'use client';

import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
    ChevronLeft,
    ChevronRight,
    Crop,
    Save,
    Upload,
    ZoomIn,
    ZoomOut,
    Loader2,
    X,
    FileText,
    ListTodo,
    Wand2,
    Image as ImageIcon,
    Type,
    Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { cn } from '@/lib/utils';
import Tesseract from 'tesseract.js';
import { analyzeCanvas, Rect, parseQuestionsFromOCR } from '@/lib/pdf-utils';
import { API_URL } from '@/lib/api-config';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

// PDF worker setup
if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

interface Topic {
    id: string;
    name: string;
}

// New data structure for cropped content
interface CropItem {
    image: string | null;    // Uploaded image URL
    text: string;            // OCR text
    saveType: 'image' | 'text' | 'both';
}

interface CropData {
    question: CropItem;
    A: CropItem;
    B: CropItem;
    C: CropItem;
    D: CropItem;
    E: CropItem;
}

const emptyCropItem: CropItem = { image: null, text: '', saveType: 'both' };

const initialCropData: CropData = {
    question: { ...emptyCropItem },
    A: { ...emptyCropItem },
    B: { ...emptyCropItem },
    C: { ...emptyCropItem },
    D: { ...emptyCropItem },
    E: { ...emptyCropItem },
};

export default function PDFImportPage() {
    const { accessToken } = useAuth();
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.5);
    const [isSelecting, setIsSelecting] = useState(false);
    const [selection, setSelection] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
    const [startPos, setStartPos] = useState<{ x: number, y: number } | null>(null);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [ocrLoading, setOcrLoading] = useState<string | null>(null); // Which target is loading OCR
    const [stats, setStats] = useState({ sessionTotal: 0 });

    // Queue state for Bulk Mode
    const [questionQueue, setQuestionQueue] = useState<any[]>([]);

    // Auto-Detect Regions
    const [detectedRegions, setDetectedRegions] = useState<Rect[]>([]);

    // NEW: Improved crop data structure
    const [cropData, setCropData] = useState<CropData>(initialCropData);

    // Form state for attributes
    const [formData, setFormData] = useState({
        correctAnswer: 'A',
        difficulty: 'MEDIUM',
        topicIds: [] as string[],
    });

    const pageRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        async function fetchTopics() {
            try {
                const res = await fetch(`${API_URL}/content/topics`, { headers: { Authorization: `Bearer ${accessToken}` } });
                if (res.ok) {
                    const data = await res.json();
                    setTopics(data);
                }
            } catch (error) {
                console.error(error);
            }
        }
        if (accessToken) fetchTopics();
    }, [accessToken]);

    const onFileChange = (e: any) => {
        if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
    };
    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => setNumPages(numPages);
    const handleMouseDown = (e: any) => {};
    const handleMouseMove = (e: any) => {};
    const handleMouseUp = () => {};
    const handleAutoDetect = () => {};
    const handleSelectRegion = (r: any) => {};
    const resetForm = (keepQueue?: boolean) => {
        setCropData(initialCropData);
        setFormData(prev => ({ ...prev, correctAnswer: 'A' }));
    };

    const handleCrop = async (target: keyof CropData) => {
        if (!selection) return;
        setUploading(true);
        setOcrLoading(target as any);
        try {
            setSelection(null);
            toast({
                title: 'Alındı ✓',
                description: `Seçim yapıldı.`,
                duration: 1500,
            });
        } catch (error: any) {
            toast({ title: 'Hata', description: error.message || 'Kırpma hatası.', variant: 'destructive' });
        } finally {
            setUploading(false);
            setOcrLoading(null);
        }
    };

    const updateSaveType = (target: keyof CropData, saveType: 'image' | 'text' | 'both') => {
        setCropData(prev => ({
            ...prev,
            [target]: { ...prev[target], saveType }
        }));
    };

    const updateText = (target: keyof CropData, text: string) => {
        setCropData(prev => ({
            ...prev,
            [target]: { ...prev[target], text }
        }));
    };

    const addToQueue = () => {
        if (!cropData.question.image && !cropData.question.text) {
            toast({ title: 'Eksik Bilgi', description: 'Soru kökü olmadan listeye eklenemez.', variant: 'destructive' });
            return;
        }

        if (formData.topicIds.length === 0) {
            toast({ title: 'Eksik Bilgi', description: 'En az bir konu seçiniz.', variant: 'destructive' });
            return;
        }

        const newQuestionDraft = {
            id: Date.now().toString(),
            cropData: JSON.parse(JSON.stringify(cropData)), // Deep copy
            formData: { ...formData },
            timestamp: new Date()
        };

        setQuestionQueue(prev => [...prev, newQuestionDraft]);
        setStats(s => ({ sessionTotal: s.sessionTotal + 1 }));

        resetForm(true);

        toast({
            title: 'Listeye Eklendi',
            description: `Soru #${newQuestionDraft.id.slice(-4)} kuyruğa alındı. Toplam: ${questionQueue.length + 1}`,
        });
    };

    const saveAllQueue = async () => {
        if (questionQueue.length === 0) return;
        setLoading(true);
        let successCount = 0;

        try {
            for (const draft of questionQueue) {
                const cd = draft.cropData as CropData;

                // Build content based on saveType
                const buildContent = (item: CropItem) => {
                    if (item.saveType === 'image') {
                        return { text: '', image: item.image };
                    } else if (item.saveType === 'text') {
                        return { text: item.text, image: null };
                    } else {
                        return { text: item.text, image: item.image };
                };
                    }

                const questionPayload = {
                    content: {
                        ...buildContent(cd.question),
                        type: 'text_image'
                    },
                    options: {
                        A: buildContent(cd.A),
                        B: buildContent(cd.B),
                        C: buildContent(cd.C),
                        D: buildContent(cd.D),
                        E: buildContent(cd.E),
                    },
                    correctAnswer: draft.formData.correctAnswer,
                    difficulty: draft.formData.difficulty,
                    topicIds: draft.formData.topicIds,
                    type: 'MULTIPLE_CHOICE'
                };

                const res = await fetch(`${API_URL}/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(questionPayload) });

                if (res.ok) successCount++;
            }

            toast({
                title: 'Toplu Kayıt Başarılı',
                description: `${successCount} adet soru havuza aktarıldı.`,
            });
            setQuestionQueue([]);

        } catch (error) {
            toast({ title: 'Hata', description: 'Kayıt sırasında sorun oluştu.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const removeFromQueue = (id: string) => {
        setQuestionQueue(prev => prev.filter(q => q.id !== id));
        setStats(s => ({ sessionTotal: s.sessionTotal - 1 }));
    };

    const clearCrop = (key: keyof CropData) => {
        setCropData(prev => ({ ...prev, [key]: { ...emptyCropItem } }));
    };

    // Render save type toggle
    const renderSaveTypeToggle = (target: keyof CropData) => {
        const item = cropData[target];
        if (!item.image && !item.text) return null;

        return (
            <ToggleGroup
                type="single"
                value={item.saveType}
                onValueChange={(v) => v && updateSaveType(target, v as any)}
                className="h-6"
            >
                <ToggleGroupItem value="image" className="h-6 px-2 text-[9px] data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700" title="Görsel olarak kaydet">
                    <ImageIcon className="h-3 w-3" />
                </ToggleGroupItem>
                <ToggleGroupItem value="text" className="h-6 px-2 text-[9px] data-[state=on]:bg-green-100 data-[state=on]:text-green-700" title="Metin olarak kaydet">
                    <Type className="h-3 w-3" />
                </ToggleGroupItem>
                <ToggleGroupItem value="both" className="h-6 px-2 text-[9px] data-[state=on]:bg-purple-100 data-[state=on]:text-purple-700" title="İkisi birden">
                    <Layers className="h-3 w-3" />
                </ToggleGroupItem>
            </ToggleGroup>
        );
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col h-[calc(100vh-120px)]">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 shrink-0 px-2">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent italic">
                            Soru Kesici v4
                        </h1>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-70 flex items-center gap-2">
                            <span className="bg-indigo-100 text-indigo-600 px-1 py-0.5 rounded">BULK MODE</span>
                            <span className="bg-orange-100 text-orange-600 px-1 py-0.5 rounded">OCR ALL</span>
                            <span className="bg-purple-100 text-purple-600 px-1 py-0.5 rounded">SAVE TYPE</span>
                        </p>
                    </div>

                    {!file ? (
                        <div className="flex items-center gap-2">
                            <Label htmlFor="pdf-upload" className="cursor-pointer bg-primary text-primary-foreground px-6 py-2.5 rounded-full hover:bg-primary/90 flex items-center gap-2 font-bold shadow-lg transition-all hover:scale-105 active:scale-95">
                                <Upload className="h-4 w-4" />
                                KİTAP YÜKLE
                            </Label>
                            <Input id="pdf-upload" type="file" accept="application/pdf" className="hidden" onChange={onFileChange} />
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <Button
                                className="h-7 px-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-[10px] shadow-lg animate-in fade-in"
                                onClick={handleAutoDetect}
                            >
                                <Wand2 className="h-3 w-3 mr-1" />
                                SİHİRLİ SEÇİM
                            </Button>

                            <div className="flex items-center gap-1 border rounded-full px-2 py-1 bg-white shadow-sm">
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
                                    <ZoomOut className="h-3.5 w-3.5" />
                                </Button>
                                <span className="text-[10px] font-bold w-12 text-center text-primary">{Math.round(scale * 100)}%</span>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setScale(s => Math.min(3, s + 0.1))}>
                                    <ZoomIn className="h-3.5 w-3.5" />
                                </Button>
                            </div>

                            <div className="flex items-center gap-1 border rounded-full px-2 py-1 bg-white shadow-sm">
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-[10px] font-bold px-2">SAYFA {pageNumber} / {numPages}</span>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>

                            <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="text-red-500 font-bold text-xs hover:bg-red-50 rounded-full">
                                <X className="h-4 w-4 mr-1" />
                                KAPAT
                            </Button>
                        </div>
                    )}
                </div>

                {!file ? (
                    <div className="flex-1 flex items-center justify-center border-4 border-dashed rounded-3xl bg-primary/5 transition-colors hover:bg-primary/10">
                        <div className="text-center space-y-6">
                            <div className="bg-primary/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-inner animate-pulse">
                                <Upload className="h-10 w-10 text-primary" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-primary">PDF Kitabını Buraya Bırak</h3>
                                <p className="text-muted-foreground text-sm font-medium w-80 mx-auto">
                                    v4 Soru Kesici ile tüm şıklar için OCR desteği ve kayıt tipi seçimi.
                                </p>
                            </div>
                            <Label htmlFor="pdf-upload-2" className="cursor-pointer inline-flex items-center bg-primary text-white px-8 py-3 rounded-xl font-bold hover:shadow-xl transition-all active:scale-95">
                                DOSYA SEÇ
                            </Label>
                            <Input id="pdf-upload-2" type="file" accept="application/pdf" className="hidden" onChange={onFileChange} />
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-6 overflow-hidden">
                        {/* PDF Viewer Area */}
                        <div className="lg:col-span-8 overflow-auto bg-slate-300/50 rounded-3xl relative p-4 lg:p-12 border-2 shadow-inner group">
                            <div
                                ref={pageRef}
                                className="relative shadow-[0_20px_50px_rgba(0,0,0,0.2)] mx-auto cursor-crosshair select-none rounded-sm overflow-hidden"
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                style={{ width: 'fit-content' }}
                            >
                                <Document
                                    file={file}
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    onLoadError={(error) => {
                                        console.error("PDF Load Error:", error);
                                        toast({
                                            title: "PDF Yüklenemedi",
                                            description: error.message || "Dosya okunamadı.",
                                            variant: "destructive"
                                        });
        }}
                                    loading={<div className="flex items-center gap-2 p-20"><Loader2 className="h-5 w-5 animate-spin" /> <span>Yükleniyor...</span></div>}
                                >
                                    <Page
                                        pageNumber={pageNumber}
                                        scale={scale}
                                        renderAnnotationLayer={false}
                                        renderTextLayer={false}
                                        className="pointer-events-none"
                                    />
                                </Document>

                                {/* Detected Regions Overlay */}
                                {detectedRegions.map((r, idx) => (
                                    <div
                                        key={idx}
                                        className="absolute border-2 border-dashed border-indigo-400 bg-indigo-200/20 cursor-pointer hover:bg-indigo-300/40 z-40 detected-region transition-colors"
                                        style={{ left: r.x, top: r.y, width: r.w, height: r.h }}
                                        onClick={() => handleSelectRegion(r)}
                                    >
                                        <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[9px] px-1 rounded-bl">Otomatik</div>
                                    </div>
                                ))}

                                {/* Selection Overlay */}
                                {selection && (
                                    <div
                                        className="absolute border-2 border-primary bg-primary/20 shadow-[0_0_0_9999px_rgba(0,0,0,0.3)] z-50 flex items-center justify-center"
                                        style={{
                                            left: selection.x,
                                            top: selection.y,
                                            width: selection.w,
                                            height: selection.h
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                    >
                                        <div className="absolute -top-10 left-0 bg-white shadow-xl rounded-lg p-1 flex gap-1 animate-in fade-in zoom-in duration-200">
                                            <Button
                                                size="sm"
                                                className="h-7 text-[10px] font-bold bg-primary hover:bg-primary/90"
                                                onClick={() => handleCrop('question')}
                                                disabled={uploading}
                                            >
                                                {ocrLoading === 'question' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Soru'}
                                            </Button>
                                            <div className="w-px bg-slate-200 my-1" />
                                            {['A', 'B', 'C', 'D', 'E'].map(opt => (
                                                <Button
                                                    key={opt}
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 w-7 p-0 text-[10px] font-bold hover:bg-primary hover:text-white"
                                                    onClick={() => handleCrop(opt as any)}
                                                    disabled={uploading}
                                                >
                                                    {ocrLoading === opt ? <Loader2 className="h-3 w-3 animate-spin" /> : opt}
                                                </Button>
                                            ))}
                                            <div className="w-px bg-slate-200 my-1" />
                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => setSelection(null)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Control Panel */}
                        <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar lg:h-[calc(100vh-140px)]">

                            {/* Bulk Queue List */}
                            {questionQueue.length > 0 && (
                                <Card className="border-indigo-200 bg-indigo-50/50 shadow-md">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-black text-indigo-700 text-xs uppercase tracking-wider flex items-center gap-2">
                                                <div className="bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">{questionQueue.length}</div>
                                                TASLAK LİSTESİ
                                            </h4>
                                            <Button size="sm" variant="default" className="h-7 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-bold" onClick={saveAllQueue} disabled={loading}>
                                                {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                                                TÜMÜNÜ KAYDET
                                            </Button>
                                        </div>
                                        <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                            {questionQueue.map((q, idx) => (
                                                <div key={q.id} className="bg-white p-2 rounded-lg border flex items-center gap-3 shadow-sm group">
                                                    <div className="h-10 w-10 bg-slate-100 rounded flex overflow-hidden shrink-0 border">
                                                        {q.cropData.question.image ? (
                                                            <img src={q.cropData.question.image} className="h-full w-full object-contain" />
                                                        ) : (
                                                            <div className="flex items-center justify-center w-full h-full text-[8px] text-slate-400">TXT</div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold text-slate-500">#{idx + 1}</span>
                                                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">cvp: {q.formData.correctAnswer}</span>
                                                        </div>
                                                        <p className="text-[9px] text-muted-foreground truncate">{q.formData.topicIds.length || 0} Konu</p>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-300 hover:text-red-500 hover:bg-red-50" onClick={() => removeFromQueue(q.id)}>
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Current Question Builder Card */}
                            <Card className="shadow-xl border-primary/20 bg-white">
                                <CardContent className="p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-primary/10 p-2 rounded-xl">
                                                <Crop className="h-5 w-5 text-primary" />
                                            </div>
                                            <h3 className="font-black text-sm uppercase tracking-tight">Soru Hazırla</h3>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase">Kuyruk: {questionQueue.length}</p>
                                        </div>
                                    </div>

                                    {/* Question Content */}
                                    <div className="space-y-3 p-3 bg-slate-50/50 rounded-xl border-2 border-dashed">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center px-1">
                                                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Soru Kökü</Label>
                                                <div className="flex items-center gap-2">
                                                    {renderSaveTypeToggle('question')}
                                                    {cropData.question.image && (
                                                        <Button variant="ghost" className="h-5 w-5 p-0 text-red-400 hover:text-red-600" onClick={() => clearCrop('question')}>
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Image Preview */}
                                            {cropData.question.image && cropData.question.saveType !== 'text' && (
                                                <div className="h-24 w-full rounded-lg border-2 flex items-center justify-center overflow-hidden bg-white border-primary/20">
                                                    <img src={cropData.question.image} className="h-full w-full object-contain" alt="Question" />
                                                </div>
                                            )}

                                            {/* OCR Text */}
                                            {(cropData.question.image || cropData.question.text) && (
                                                <div className="relative">
                                                    <div className="absolute top-1 left-2 text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                                        <FileText className="h-3 w-3" />
                                                        OCR Metni
                                                    </div>
                                                    <Textarea
                                                        value={cropData.question.text}
                                                        onChange={(e) => updateText('question', e.target.value)}
                                                        className="min-h-[60px] text-[10px] pt-5 resize-none bg-white font-mono text-slate-600"
                                                        placeholder="OCR metni buraya gelecek..."
                                                    />
                                                </div>
                                            )}

                                            {!cropData.question.image && !cropData.question.text && (
                                                <div className="h-24 w-full rounded-lg border-2 flex items-center justify-center bg-slate-100 border-dashed border-slate-200">
                                                    <span className="text-[10px] font-bold text-slate-400">Görsel Yok (Çizim Yapın)</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Options Grid */}
                                        <div className="grid grid-cols-5 gap-2">
                                            {(['A', 'B', 'C', 'D', 'E'] as const).map(opt => {
                                                const item = cropData[opt];
                                                const isCorrect = formData.correctAnswer === opt;

                                                return (
                                                    <div key={opt} className="space-y-1 group">
                                                        <div className="flex justify-between items-center">
                                                            <span className={cn("text-[10px] font-bold mx-auto", isCorrect ? "text-primary" : "text-muted-foreground")}>{opt}</span>
                                                        </div>

                                                        {/* Option Image/Text Preview */}
                                                        <div
                                                            className={cn(
                                                                "h-12 w-full rounded border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-all",
                                                                item.image ? "bg-white border-primary/20" : "bg-slate-50 border-slate-200",
                                                                isCorrect && "ring-2 ring-primary ring-offset-1"
                                                            )}
                                                            onClick={() => setFormData(f => ({ ...f, correctAnswer: opt }))}
                                                        >
                                                            {item.image && item.saveType !== 'text' ? (
                                                                <img src={item.image} className="h-full w-full object-cover" alt={opt} />
                                                            ) : item.text ? (
                                                                <span className="text-[8px] text-slate-500 p-1 line-clamp-2">{item.text}</span>
                                                            ) : (
                                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                                            )}
                                                        </div>

                                                        {/* Save Type Toggle */}
                                                        {(item.image || item.text) && (
                                                            <div className="flex justify-center">
                                                                {renderSaveTypeToggle(opt)}
                                                            </div>
                                                        )}

                                                        {/* Editable Text */}
                                                        <Input
                                                            value={item.text}
                                                            onChange={(e) => updateText(opt, e.target.value)}
                                                            className="h-6 text-[9px] px-1 font-mono text-slate-600 bg-white shadow-sm"
                                                            placeholder="Metin..."
                                                        />

                                                        {/* Clear button */}
                                                        {item.image && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-5 w-full text-[8px] text-red-400 hover:text-red-600 hover:bg-red-50 p-0"
                                                                onClick={() => clearCrop(opt)}
                                                            >
                                                                Sil
                                                            </Button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">Soru Zorluğu</Label>
                                            <Select value={formData.difficulty} onValueChange={(v) => setFormData(f => ({ ...f, difficulty: v }))}>
                                                <SelectTrigger className="h-9 text-xs font-bold rounded-xl border-2">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="VERY_EASY" className="text-green-600 font-bold">Çok Kolay</SelectItem>
                                                    <SelectItem value="EASY" className="text-emerald-600 font-bold">Kolay</SelectItem>
                                                    <SelectItem value="MEDIUM" className="text-blue-600 font-bold">Orta</SelectItem>
                                                    <SelectItem value="HARD" className="text-orange-600 font-bold">Zor</SelectItem>
                                                    <SelectItem value="VERY_HARD" className="text-red-600 font-bold">Çok Zor</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">Konu Etiketleri</Label>
                                            <div className="border-2 rounded-2xl p-2 max-h-32 overflow-y-auto space-y-1 bg-slate-50/50 scrollbar-hide">
                                                {topics.length === 0 ? (
                                                    <p className="text-[10px] text-muted-foreground italic text-center py-2">Ders/Konu henüz tanımlanmamış.</p>
                                                ) : topics.map(t => (
                                                    <div key={t.id} className="flex items-center space-x-3 p-1.5 rounded-lg hover:bg-white transition-colors border border-transparent hover:border-slate-100 group">
                                                        <Checkbox
                                                            id={`topic-${t.id}`}
                                                            checked={formData.topicIds.includes(t.id)}
                                                            className="h-4 w-4 rounded-md border-2"
                                                            onCheckedChange={(checked) => {
                                                                setFormData(f => ({
                                                                    ...f,
                                                                    topicIds: checked
                                                                        ? [...f.topicIds, t.id]
                                                                        : f.topicIds.filter(id => id !== t.id)
                                                                }));
                                                            }}
                                                        />
                                                        <label htmlFor={`topic-${t.id}`} className="text-[10px] leading-tight cursor-pointer font-bold text-slate-600 group-hover:text-primary transition-colors line-clamp-1">
                                                            {t.name}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* ACTIONS */}
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <Button
                                                variant="outline"
                                                className="h-10 rounded-xl font-bold text-xs border-2 hover:bg-slate-50 text-slate-600"
                                                onClick={() => resetForm()}
                                            >
                                                TEMİZLE
                                            </Button>
                                            <Button
                                                className="h-10 font-black gap-2 shadow-xl shadow-indigo-500/20 rounded-xl bg-indigo-600 hover:bg-indigo-700 transition-all hover:scale-[1.02] active:scale-95"
                                                onClick={addToQueue}
                                                disabled={uploading || (!cropData.question.image && !cropData.question.text) || formData.topicIds.length === 0}
                                            >
                                                <ListTodo className="h-4 w-4" />
                                                <span>LİSTEYE AT</span>
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
