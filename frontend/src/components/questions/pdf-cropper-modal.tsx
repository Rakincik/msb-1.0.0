'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
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
    Layers,
    ArrowLeft,
    Search,
    Check,
    RotateCcw,
    Trash2,
    FolderKanban,
    BookOpen,
    GripVertical,
    Maximize2,
    Minimize2,
    Scan,
    Edit,
    MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';
import Tesseract from 'tesseract.js';
import { analyzeCanvas, Rect, parseQuestionsFromOCR } from '@/lib/pdf-utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { RichTextEditor, CompactRichTextEditor } from '@/components/ui/rich-text-editor';
import { apiClient } from '@/lib/api-client';
import { API_URL } from '@/lib/api-config';
import { normalizeImageUrl } from '@/lib/image-utils';

// PDF worker setup
if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

interface Lesson {
    id: string;
    name: string;
    code: string;
    units?: any[];
}

interface Topic {
    id: string;
    name: string;
    lessonId?: string;
}

interface ExamArea {
    id: string;
    name: string;
    color?: string;
}

interface CropItem {
    image: string | null;
    text: string;
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

const DIFFICULTY_OPTIONS = [
    { value: 'VERY_EASY', label: 'Çok Kolay', color: 'bg-green-100 text-green-700' },
    { value: 'EASY', label: 'Kolay', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'MEDIUM', label: 'Orta', color: 'bg-blue-100 text-blue-700' },
    { value: 'HARD', label: 'Zor', color: 'bg-orange-100 text-orange-700' },
    { value: 'VERY_HARD', label: 'Çok Zor', color: 'bg-red-100 text-red-700' },
];

interface PDFCropperModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    onBack?: () => void;
    preSelectedBankId?: string;
}

export function PDFCropperModal({ open, onOpenChange, onSuccess, onBack, preSelectedBankId }: PDFCropperModalProps) {
    const { toast } = useToast();
    const { accessToken } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.2);
    const [isSelecting, setIsSelecting] = useState(false);
    const [selection, setSelection] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
    const [startPos, setStartPos] = useState<{ x: number, y: number } | null>(null);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [selectedLessonId, setSelectedLessonId] = useState<string>('');
    const [examAreas, setExamAreas] = useState<ExamArea[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [ocrLoading, setOcrLoading] = useState<string | null>(null);

    const [questionQueue, setQuestionQueue] = useState<any[]>([]);
    const [detectedRegions, setDetectedRegions] = useState<Rect[]>([]);
    const [cropData, setCropData] = useState<CropData>(initialCropData);
    const [fastImageMode, setFastImageMode] = useState(true); // Default to fast mode as recommended

    // Search states
    const [topicSearch, setTopicSearch] = useState('');
    const [bankSearch, setBankSearch] = useState('');

    // Active crop target for re-crop
    const [activeCropTarget, setActiveCropTarget] = useState<keyof CropData | null>(null);

    // Resizable panel state
    const [panelWidth, setPanelWidth] = useState(66); // PDF panel percentage (default 66%)
    const [isResizing, setIsResizing] = useState(false);

    // Expandable field state
    const [expandedField, setExpandedField] = useState<string | null>(null);

    // Zen Mode & Preview Mode
    const [isZenMode, setIsZenMode] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    const [formData, setFormData] = useState({
        correctAnswer: 'A',
        difficulty: 'MEDIUM',
        topicIds: [] as string[],
        examAreaIds: preSelectedBankId ? [preSelectedBankId] : [] as string[],
        saveMode: 'image' as 'image' | 'text', // Global save mode: image or text
    });

    const pageRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);


    // Fetch lessons
    useEffect(() => {
        async function fetchData() {
            try {
                const [lessonsData, topicsData, examAreasData] = await Promise.all([
                    apiClient.get('/content/lessons'),
                    apiClient.get('/content/topics'),
                    apiClient.get('/exam-areas')
                ]);
                setLessons(lessonsData);
                setTopics(topicsData);
                setExamAreas(examAreasData);
            } catch (error) {
                console.error("Fetch data error", error);
            }
        }
        if (open && accessToken) {
            fetchData();
        }
    }, [open, accessToken]);

    // Zen Mode Keyboard Shortcuts
    useEffect(() => {
        if (!isZenMode) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            const key = e.key.toLowerCase();
            if (key === 'q') triggerReCrop('question');
            else if (['a', 'b', 'c', 'd', 'e'].includes(key)) triggerReCrop(key.toUpperCase() as any);
            else if (e.key === 'Escape') setIsZenMode(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isZenMode]);

    const handleCrop = async (target: keyof CropData) => {
        if (!selection || !pageRef.current) return;
        setUploading(true);
        setOcrLoading(target);

        try {
            const canvasEl = pageRef.current.querySelector('canvas');
            if (!canvasEl) throw new Error('PDF canvas render edilemedi');

            const cropCanvas = document.createElement('canvas');
            const ctx = cropCanvas.getContext('2d');
            if (!ctx) throw new Error('Context oluşturulamadı');

            cropCanvas.width = selection.w;
            cropCanvas.height = selection.h;

            const scaleX = canvasEl.width / canvasEl.offsetWidth;
            const scaleY = canvasEl.height / canvasEl.offsetHeight;

            ctx.drawImage(
                canvasEl,
                selection.x * scaleX,
                selection.y * scaleY,
                selection.w * scaleX,
                selection.h * scaleY,
                0,
                0,
                selection.w,
                selection.h
            );

            const blob = await new Promise<Blob | null>(res => cropCanvas.toBlob(res, 'image/webp', 0.9));
            if (!blob) throw new Error('Blob oluşturulamadı');

            const formData = new FormData();
            formData.append('file', blob, `crop_${Date.now()}.webp`);

            const { url: uploadUrl } = await apiClient.post('/upload/image', formData);

            let ocrText = '';
            let finalSaveType: 'image' | 'text' | 'both' = 'image';

            if (!fastImageMode) {
                try {
                    // YÖNTEM 2: PDF'in Kendi Metnini Çekmek
                    // 1. Önce kullanıcının seçtiği alanın (selection) ekrandaki mutlak koordinatlarını bulalım
                    const containerRect = pageRef.current.getBoundingClientRect();
                    const selLeft = containerRect.left + selection.x;
                    const selTop = containerRect.top + selection.y;
                    const selRight = selLeft + selection.w;
                    const selBottom = selTop + selection.h;

                    // 2. Sayfadaki tüm PDF text elementlerini al
                    const textSpans = pageRef.current.querySelectorAll('.react-pdf__Page__textContent span');
                    let extractedText = '';
                    let lastTop = -1;
                    let lastRight = -1;

                    textSpans.forEach((span) => {
                        const spanRect = span.getBoundingClientRect();
                        // Kesişim kontrolü (Intersect)
                        const isIntersecting = !(
                            spanRect.right < selLeft ||
                            spanRect.left > selRight ||
                            spanRect.bottom < selTop ||
                            spanRect.top > selBottom
                        );

                        if (isIntersecting) {
                            if (lastTop !== -1 && Math.abs(spanRect.top - lastTop) > 5) {
                                extractedText += '\n'; // Alt satıra geçiş
                            } else if (lastTop !== -1) {
                                // Aynı satırda, ama aralarında fiziksel bir boşluk var mı kontrol et
                                const gap = spanRect.left - lastRight;
                                if (gap > 4) { // Eğer 4 pikselden fazla boşluk varsa space ekle
                                    extractedText += ' '; 
                                }
                            }
                            extractedText += span.textContent || '';
                            lastTop = spanRect.top;
                            lastRight = spanRect.right;
                        }
                    });

                    ocrText = extractedText.replace(/\s+\n/g, '\n').trim();

                    // Eğer PDF'ten metin çekilemediyse (taranmış resim vb.) o zaman Tesseract OCR kullan
                    if (ocrText.length < 5) {
                        toast({ title: 'Uyarı', description: `Orijinal PDF metni çekilemedi (Bulunan kelime: ${textSpans.length}), Yapay Zeka (OCR) ile okunuyor...`, duration: 2000 });
                        console.log("PDF metni bulunamadı, Tesseract OCR'a düşülüyor...");
                        const worker = await Tesseract.createWorker('tur');
                        const result = await worker.recognize(cropCanvas);
                        ocrText = result.data.text.trim();
                        await worker.terminate();
                    }

                    finalSaveType = ocrText.length > 10 ? 'both' : 'image';
                } catch (ocrErr) {
                    console.error("Text Extraction/OCR Error:", ocrErr);
                }
            }

            setCropData(prev => ({
                ...prev,
                [target]: {
                    image: uploadUrl,
                    text: ocrText,
                    saveType: finalSaveType
                }
            }));

            setSelection(null);
            setActiveCropTarget(null);
            toast({ title: 'Alındı ✓', description: `${target === 'question' ? 'Soru kökü' : target} kesildi.`, duration: 1500 });
        } catch (error: any) {
            console.error('Crop error:', error);
            toast({ title: 'Hata', description: error.message || 'Kırpma hatası.', variant: 'destructive' });
        } finally {
            setUploading(false);
            setOcrLoading(null);
        }
    };

    const resetForm = (keepQueue = false) => {
        setCropData(initialCropData);
        if (!keepQueue) setQuestionQueue([]);
    };

    const handleAutoDetect = async () => {
        if (!pageRef.current) return;
        setLoading(true);
        try {
            const canvasEl = pageRef.current.querySelector('canvas');
            if (!canvasEl) throw new Error('Canvas bulunamadı');
            const regions = await analyzeCanvas(canvasEl);
            setDetectedRegions(regions);
            toast({ title: 'Otomatik Taranıyor', description: `${regions.length} alan bulundu.` });
        } catch (error) {
            toast({ title: 'Hata', description: 'Otomatik seçim başarısız.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPageNumber(1);
            setDetectedRegions([]);
            setCropData(initialCropData);
            setQuestionQueue([]);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!pageRef.current) return;
        const rect = pageRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setStartPos({ x, y });
        setSelection(null);
        setIsSelecting(true);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isSelecting || !startPos || !pageRef.current) return;
        const rect = pageRef.current.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        setSelection({
            x: Math.min(startPos.x, currentX),
            y: Math.min(startPos.y, currentY),
            w: Math.abs(currentX - startPos.x),
            h: Math.abs(currentY - startPos.y)
        });
    };

    const handleMouseUp = () => {
        setIsSelecting(false);
    };

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    const handleSelectRegion = (r: Rect) => {
        setSelection({ ...r });
    };

    const availableTopics = selectedLessonId 
        ? lessons.find(l => l.id === selectedLessonId)?.units?.flatMap((u: any) => u.topics || []) || []
        : topics;

    const filteredTopics = availableTopics.filter((t: any) => 
        t.name.toLowerCase().includes(topicSearch.toLowerCase())
    );

    const filteredExamAreas = examAreas.filter(ea => 
        ea.name.toLowerCase().includes(bankSearch.toLowerCase())
    );

    const updateSaveType = (target: keyof CropData, saveType: 'image' | 'text' | 'both') => {
        setCropData(prev => ({ ...prev, [target]: { ...prev[target], saveType } }));
    };

    const updateText = (target: keyof CropData, text: string) => {
        setCropData(prev => ({ ...prev, [target]: { ...prev[target], text } }));
    };

    const clearCrop = (key: keyof CropData) => {
        setCropData(prev => ({ ...prev, [key]: { ...emptyCropItem } }));
    };

    const triggerReCrop = (target: keyof CropData) => {
        setActiveCropTarget(target);
        toast({ title: 'Yeniden Kırp', description: `PDF'den ${target === 'question' ? 'soru kökünü' : target + ' şıkkını'} seçin.`, duration: 2000 });
        };

    const toggleTopic = (id: string) => {
        setFormData(f => ({
            ...f,
            topicIds: f.topicIds.includes(id)
                ? f.topicIds.filter(tid => tid !== id)
                : [...f.topicIds, id]
        }));
    };

    const toggleExamArea = (id: string) => {
        setFormData(f => ({
            ...f,
            examAreaIds: f.examAreaIds.includes(id)
                ? f.examAreaIds.filter(eid => eid !== id)
                : [...f.examAreaIds, id]
        }));
    };

    const addToQueue = () => {
        if (!cropData.question.image && !cropData.question.text) {
            toast({ title: 'Eksik', description: 'Soru kökü gerekli.', variant: 'destructive' });
            return;
        }
        if (formData.topicIds.length === 0) {
            toast({ title: 'Eksik', description: 'En az bir konu seçiniz.', variant: 'destructive' });
            return;
        }

        const newQuestionDraft = {
            id: Date.now().toString(),
            cropData: JSON.parse(JSON.stringify(cropData)),
            formData: { ...formData },
            timestamp: new Date()
        };

        setQuestionQueue(prev => [...prev, newQuestionDraft]);
        resetForm(true);
        toast({ title: 'Listeye Eklendi', description: `Toplam: ${questionQueue.length + 1}` });
        };

    const saveAllQueue = async () => {
        // If queue is empty but current question is ready, add it first
        let queueToSave = [...questionQueue];

        if (queueToSave.length === 0) {
            // Check if current question can be added
            if (!cropData.question.image && !cropData.question.text) {
                toast({ title: 'Eksik', description: 'Soru kökü gerekli.', variant: 'destructive' });
                return;
            }
            if (formData.topicIds.length === 0) {
                toast({ title: 'Eksik', description: 'En az bir konu seçiniz.', variant: 'destructive' });
                return;
            }

            // Auto-add current question to queue
            queueToSave = [{
                id: Date.now().toString(),
                cropData: JSON.parse(JSON.stringify(cropData)),
                formData: { ...formData },
                timestamp: new Date()
            }];
        }

        setLoading(true);
        let successCount = 0;

        try {
            for (const draft of queueToSave) {
                const cd = draft.cropData as CropData;

                const buildContent = (item: CropItem) => {
                    const mode = draft.formData.saveMode;
                    
                    if (mode === 'text' && item.text && item.text.trim().length > 0) {
                        return { text: item.text, image: null };
                    }
                    if (mode === 'image' && item.image) {
                        return { text: '', image: item.image };
                    }
                    // Fallback
                    return { text: item.text, image: item.image };
                };

                const questionPayload = {
                    content: { ...buildContent(cd.question), type: 'text_image' },
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
                    examAreaIds: draft.formData.examAreaIds || [],
                    type: 'MULTIPLE_CHOICE'
                };

                console.log('Saving question payload:', questionPayload);

                try {
                    await apiClient.post('/questions', questionPayload);
                    successCount++;
                } catch (saveError: any) {
                    console.error('Question save failed:', saveError);
                }
            }

            if (successCount > 0) {
                toast({ title: 'Başarılı', description: `${successCount} soru oluşturuldu.` });
                setQuestionQueue([]);
                resetForm(true);
                onSuccess?.();
            } else {
                toast({ title: 'Hata', description: 'Hiçbir soru kaydedilemedi.', variant: 'destructive' });
        }

        } catch (error) {
            console.error('Save error:', error);
            toast({ title: 'Hata', description: 'Kayıt başarısız.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const removeFromQueue = (id: string) => {
        setQuestionQueue(prev => prev.filter(q => q.id !== id));
    };

    const handleBack = () => {
        onOpenChange(false);
        onBack?.();
    };

    // Resize handlers for draggable divider
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    useEffect(() => {
        const handleResizeMove = (e: MouseEvent) => {
            if (!isResizing || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
            setPanelWidth(Math.min(85, Math.max(40, newWidth)));
        };

        const handleResizeEnd = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleResizeMove);
            document.addEventListener('mouseup', handleResizeEnd);
        }

        return () => {
            document.removeEventListener('mousemove', handleResizeMove);
            document.removeEventListener('mouseup', handleResizeEnd);
        };
    }, [isResizing]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn("max-w-[95vw] max-h-[95vh] w-full h-full p-0 gap-0 overflow-hidden transition-all duration-500", isZenMode ? "bg-slate-950 border-slate-800" : "bg-white")}>
                {/* Header */}
                {!isZenMode && (
                <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/80 backdrop-blur-sm shrink-0">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full hover:bg-slate-200/50">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                PDF Soru Kesici
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                PDF kitabından soruları kesin ve sisteme ekleyin
                            </p>
                        </div>
                    </div>

                    {file && (
                        <div className="flex items-center gap-3">
                            <Button size="sm" variant="outline" onClick={handleAutoDetect} className="gap-1.5 text-xs bg-white hover:bg-slate-100">
                                <Wand2 className="h-3.5 w-3.5 text-slate-700" />
                                Sihirli Seçim
                            </Button>

                            <div className="flex items-center gap-1 border rounded-full px-2 py-1 bg-white shadow-sm">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
                                    <ZoomOut className="h-3.5 w-3.5" />
                                </Button>
                                <span className="text-[10px] w-10 text-center font-medium">{Math.round(scale * 100)}%</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setScale(s => Math.min(3, s + 0.1))}>
                                    <ZoomIn className="h-3.5 w-3.5" />
                                </Button>
                            </div>

                            <div className="flex items-center gap-1 border rounded-full px-2 py-1 bg-white shadow-sm">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-[10px] px-1 font-medium">{pageNumber}/{numPages}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>

                            <Button variant="outline" size="sm" onClick={() => setIsZenMode(true)} className="gap-2 text-xs bg-slate-900 text-white hover:bg-slate-800 border-none rounded-full px-4">
                                <Scan className="h-3.5 w-3.5" />
                                Zen Modu
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="text-red-500 text-xs hover:bg-red-50">
                                <X className="h-4 w-4 mr-1" /> Kapat
                            </Button>
                        </div>
                    )}
                </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                    {!file ? (
                        <div className="h-full flex items-center justify-center bg-slate-50/50">
                            <div className="text-center space-y-6 max-w-md">
                                <div className="bg-slate-900 w-24 h-24 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-slate-200/50">
                                    <Upload className="h-10 w-10 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900">
                                        PDF Kitabı Yükle
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-2">Kitaptan soru kesmek için PDF seçin</p>
                                </div>
                                <Label htmlFor="pdf-modal-upload" className="cursor-pointer inline-flex items-center bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg">
                                    <FileText className="h-5 w-5 mr-2" />
                                    DOSYA SEÇ
                                </Label>
                                <Input id="pdf-modal-upload" type="file" accept="application/pdf" className="hidden" onChange={onFileChange} />

                                {/* Step-by-step instructions */}
                                <div className="text-left bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-slate-200 shadow-sm mt-6">
                                    <h4 className="text-sm font-bold text-slate-800 mb-3">📋 Nasıl Kullanılır?</h4>
                                    <ol className="space-y-2.5 text-sm text-muted-foreground">
                                        <li className="flex items-start gap-2.5">
                                            <span className="bg-slate-100 text-slate-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                                            <span>Yukarıdaki butona tıklayarak <strong className="text-foreground">PDF dosyanızı</strong> yükleyin</span>
                                        </li>
                                        <li className="flex items-start gap-2.5">
                                            <span className="bg-slate-100 text-slate-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                                            <span>PDF üzerinde <strong className="text-foreground">fare ile sürükleyerek</strong> soru kökünü ve şıkları seçin</span>
                                        </li>
                                        <li className="flex items-start gap-2.5">
                                            <span className="bg-slate-100 text-slate-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                                            <span>Seçilen alan otomatik olarak <strong className="text-foreground">metin tanıma</strong> ile okunur ve düzenlenebilir hale gelir</span>
                                        </li>
                                        <li className="flex items-start gap-2.5">
                                            <span className="bg-slate-100 text-slate-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">4</span>
                                            <span>Doğru cevabı, konuyu ve zorluğu belirleyip <strong className="text-foreground">kaydedin</strong></span>
                                        </li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div ref={containerRef} className={cn("h-full flex", isResizing && "select-none cursor-col-resize")}>
                            {/* PDF Viewer */}
                            <div className={cn("overflow-auto relative transition-all duration-500", isZenMode ? "w-full bg-slate-950 flex justify-center" : "bg-slate-100")} style={{ width: isZenMode ? '100%' : `${panelWidth}%` }}>
                                {/* Active crop target indicator */}
                                {activeCropTarget && (
                                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-pulse">
                                        🎯 {activeCropTarget === 'question' ? 'Soru Kökü' : activeCropTarget} için alan seçin
                                    </div>
                                )}

                                <div
                                    ref={pageRef}
                                    className="relative mx-auto cursor-crosshair select-none p-4"
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    style={{ width: 'fit-content' }}
                                >
                                    <Document file={file} onLoadSuccess={onDocumentLoadSuccess} loading={<div className="p-10"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>}>
                                        <Page pageNumber={pageNumber} scale={scale} renderAnnotationLayer={false} renderTextLayer={true} className="pointer-events-none shadow-2xl rounded-lg overflow-hidden" />
                                    </Document>

                                    {detectedRegions.map((r, idx) => (
                                        <div key={idx} className="absolute border-2 border-dashed border-blue-400 bg-blue-200/30 cursor-pointer hover:bg-blue-300/50 z-40 detected-region transition-colors" style={{ left: r.x, top: r.y, width: r.w, height: r.h }} onClick={() => handleSelectRegion(r)}>
                                            <div className="absolute top-0 right-0 bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded-bl font-medium">Oto</div>
                                        </div>
                                    ))}

                                    {selection && (
                                        <div className="absolute border-2 border-blue-500 bg-blue-500/20 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] z-50 rounded" style={{ left: selection.x, top: selection.y, width: selection.w, height: selection.h }} onMouseDown={(e) => e.stopPropagation()}>
                                            <div className="absolute -top-12 left-0 bg-white shadow-xl rounded-xl p-1.5 flex gap-1 border">
                                                {activeCropTarget ? (
                                                    <>
                                                        <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => handleCrop(activeCropTarget)} disabled={uploading}>
                                                            {ocrLoading === activeCropTarget ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                                                            {activeCropTarget === 'question' ? 'Soru' : activeCropTarget} Olarak Kaydet
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="h-8" onClick={() => { setActiveCropTarget(null); setSelection(null); }}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => handleCrop('question')} disabled={uploading}>
                                                            {ocrLoading === 'question' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Soru'}
                                                        </Button>
                                                        {(['A', 'B', 'C', 'D', 'E'] as const).map(opt => (
                                                            <Button key={opt} size="sm" variant="outline" className="h-8 w-8 p-0 text-xs font-bold hover:bg-blue-50" onClick={() => handleCrop(opt)} disabled={uploading}>
                                                                {ocrLoading === opt ? <Loader2 className="h-3 w-3 animate-spin" /> : opt}
                                                            </Button>
                                                        ))}
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:bg-red-50" onClick={() => setSelection(null)}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                                {/* Zen Mode Dynamic Island */}
                                {isZenMode && (
                                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 shadow-2xl rounded-full p-2 flex items-center gap-2 animate-in slide-in-from-bottom-10 fade-in duration-500">
                                        <div className="flex items-center bg-slate-800/80 rounded-full p-1 border border-slate-700">
                                            <Button variant="ghost" size="sm" className={cn("rounded-full px-4 h-9 text-xs font-semibold hover:bg-slate-700", activeCropTarget === 'question' ? "bg-blue-600 text-white hover:bg-blue-600" : "text-slate-300")} onClick={() => triggerReCrop('question')}>
                                                <span className="opacity-50 mr-2 text-[10px] bg-slate-700 px-1.5 py-0.5 rounded border border-slate-600">Q</span>
                                                Soru Kökü
                                            </Button>
                                            <div className="w-px h-5 bg-slate-700 mx-2" />
                                            {(['A', 'B', 'C', 'D', 'E'] as const).map(opt => (
                                                <Button key={opt} variant="ghost" size="sm" className={cn("rounded-full h-9 w-11 p-0 font-bold text-xs hover:bg-slate-700", activeCropTarget === opt ? "bg-blue-600 text-white hover:bg-blue-600" : "text-slate-300")} onClick={() => triggerReCrop(opt)}>
                                                    <div className="flex flex-col items-center leading-none">
                                                        <span>{opt}</span>
                                                        <span className="text-[8px] opacity-50 mt-0.5">{opt}</span>
                                                    </div>
                                                </Button>
                                            ))}
                                        </div>
                                        <div className="w-px h-6 bg-slate-700 mx-1" />
                                        <Button size="sm" className="rounded-full bg-emerald-600 hover:bg-emerald-500 text-white h-9 px-4 font-bold shadow-lg shadow-emerald-900/50" onClick={() => { addToQueue(); setSelection(null); }}>
                                            <Save className="h-4 w-4 mr-1.5" /> Listeye Ekle
                                        </Button>
                                        <div className="w-px h-6 bg-slate-700 mx-1" />
                                        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-slate-400 hover:text-white hover:bg-red-500/20" onClick={() => setIsZenMode(false)} title="Zen Modundan Çık (ESC)">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}

                            {/* Resize Handle */}
                            {!isZenMode && (
                                <div
                                    className={cn(
                                        "w-2 bg-slate-200 hover:bg-blue-300 cursor-col-resize flex items-center justify-center transition-colors shrink-0",
                                        isResizing && "bg-blue-400"
                                    )}
                                    onMouseDown={handleResizeStart}
                                >
                                    <GripVertical className="h-5 w-5 text-slate-400" />
                                </div>
                            )}

                            {/* Control Panel */}
                            {!isZenMode && (
                            <div className="flex-1 flex flex-col bg-white overflow-hidden min-w-[320px] max-w-[400px]">
                                <div className="flex border-b bg-slate-50 p-1 gap-1">
                                    <Button variant={!isPreviewMode ? "default" : "ghost"} size="sm" className="flex-1 text-xs h-8" onClick={() => setIsPreviewMode(false)}>
                                        <Edit className="h-3.5 w-3.5 mr-1.5" /> Düzenle
                                    </Button>
                                    <Button variant={isPreviewMode ? "default" : "ghost"} size="sm" className={cn("flex-1 text-xs h-8", isPreviewMode && "bg-slate-900 text-white hover:bg-slate-800")} onClick={() => setIsPreviewMode(true)}>
                                        <Scan className="h-3.5 w-3.5 mr-1.5" /> Canlı Önizleme
                                    </Button>
                                </div>
                                
                                {!isPreviewMode ? (
                                <>
                                <div className="flex-1 overflow-y-auto">
                                    <div className="p-4 space-y-4">
                                        {/* Queue */}
                                        {questionQueue.length > 0 && (
                                            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-50">
                                                <CardContent className="p-3 space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <h4 className="text-xs font-bold text-blue-700 uppercase flex items-center gap-2">
                                                            <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">{questionQueue.length}</span>
                                                            Taslak Sorular
                                                        </h4>
                                                        <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700" onClick={saveAllQueue} disabled={loading}>
                                                            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                                                            Tümünü Kaydet
                                                        </Button>
                                                    </div>
                                                    <div className="max-h-20 overflow-y-auto space-y-1">
                                                        {questionQueue.map((q, idx) => (
                                                            <div key={q.id} className="bg-white p-2 rounded-lg flex items-center gap-2 text-xs shadow-sm">
                                                                <span className="font-bold text-blue-500">#{idx + 1}</span>
                                                                <Badge variant="outline" className="text-[9px]">{q.formData.correctAnswer}</Badge>
                                                                <div className="flex-1" />
                                                                <Button variant="ghost" size="icon" className="h-5 w-5 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => removeFromQueue(q.id)}>
                                                                    <X className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}

                                        {/* Current Question */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Crop className="h-4 w-4 text-blue-500" />
                                                    <h3 className="font-bold text-sm">Soru Hazırla</h3>
                                                </div>
                                                <div className="flex items-center space-x-2 bg-slate-50 border rounded-full px-2 py-1 shadow-sm">
                                                    <Checkbox 
                                                        id="fast-img-mode" 
                                                        checked={fastImageMode} 
                                                        onCheckedChange={(checked) => setFastImageMode(!!checked)}
                                                        className="h-4 w-4 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                                    />
                                                    <Label htmlFor="fast-img-mode" className="text-xs font-semibold cursor-pointer text-amber-700 flex items-center gap-1">
                                                        <span>🚀 Hızlı Resim Modu</span>
                                                    </Label>
                                                </div>
                                            </div>

                                            {/* Question Root */}
                                            <Card className="border-blue-100">
                                                <CardContent className="p-3 space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <Label className="text-xs font-semibold text-blue-700">SORU KÖKÜ</Label>
                                                        <div className="flex gap-1">
                                                            {cropData.question.image && (
                                                                <>
                                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-blue-500 hover:bg-blue-50" onClick={() => triggerReCrop('question')} title="Yeniden Kırp">
                                                                        <RotateCcw className="h-3 w-3" />
                                                                    </Button>
                                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:bg-red-50" onClick={() => clearCrop('question')} title="Sil">
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {cropData.question.image ? (
                                                        <img src={normalizeImageUrl(cropData.question.image)} className="w-full h-24 object-contain rounded-lg border bg-slate-50" />
                                                    ) : (
                                                        <div className="h-20 border-2 border-dashed border-blue-200 rounded-lg flex items-center justify-center bg-blue-50/50">
                                                            <p className="text-xs text-blue-400">PDF'den soru kökünü seçin</p>
                                                        </div>
                                                    )}

                                                    {(cropData.question.image || cropData.question.text) && (
                                                        <RichTextEditor
                                                            value={cropData.question.text}
                                                            onChange={(v) => updateText('question', v)}
                                                            placeholder="OCR metni veya manuel giriş..."
                                                            expanded={expandedField === 'question'}
                                                            className="text-xs"
                                                            minHeight={expandedField === 'question' ? '150px' : '60px'}
                                                        />
                                                    )}
                                                </CardContent>
                                            </Card>

                                            {/* Options */}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-muted-foreground">ŞIKLAR (Düzenlenebilir)</Label>
                                                <div className="grid grid-cols-5 gap-2">
                                                    {(['A', 'B', 'C', 'D', 'E'] as const).map(opt => {
                                                        const isCorrect = formData.correctAnswer === opt;
                                                        const hasContent = cropData[opt].image || cropData[opt].text;

                                                        return (
                                                            <div key={opt} className={cn(
                                                                "border rounded-xl p-2 space-y-1.5 transition-all",
                                                                isCorrect && "ring-2 ring-green-500 bg-green-50 border-green-200",
                                                                !isCorrect && hasContent && "bg-slate-50"
                                                            )}>
                                                                <div className="flex items-center justify-between">
                                                                    <span className={cn("font-bold text-sm", isCorrect ? "text-green-600" : "text-slate-500")}>{opt}</span>
                                                                    {hasContent && (
                                                                        <div className="flex gap-0.5">
                                                                            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => triggerReCrop(opt)} title="Yeniden Kırp">
                                                                                <RotateCcw className="h-2.5 w-2.5 text-blue-500" />
                                                                            </Button>
                                                                            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => clearCrop(opt)} title="Sil">
                                                                                <Trash2 className="h-2.5 w-2.5 text-red-400" />
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {cropData[opt].image ? (
                                                                    <img src={normalizeImageUrl(cropData[opt].image!)} className="w-full h-12 object-contain rounded border bg-white" />
                                                                ) : (
                                                                    <div className="h-12 border border-dashed rounded flex items-center justify-center text-[9px] text-muted-foreground">
                                                                        Kırp
                                                                    </div>
                                                                )}

                                                                {expandedField === opt ? (
                                                                    <CompactRichTextEditor
                                                                        value={cropData[opt].text}
                                                                        onChange={(v) => updateText(opt, v)}
                                                                        placeholder={`${opt} şıkkı metni...`}
                                                                        autoFocus
                                                                        onBlur={() => setTimeout(() => setExpandedField(null), 300)}
                                                                    />
                                                                ) : (
                                                                    <Input
                                                                        value={cropData[opt].text.replace(/<[^>]*>/g, '')}
                                                                        onFocus={() => setExpandedField(opt)}
                                                                        readOnly
                                                                        className="h-6 text-[9px] px-1.5 cursor-pointer"
                                                                        placeholder={opt}
                                                                        title="Tıkla düzenle"
                                                                    />
                                                                )}

                                                                <Button
                                                                    variant={isCorrect ? "default" : "outline"}
                                                                    size="sm"
                                                                    className={cn("w-full h-5 text-[8px]", isCorrect && "bg-green-600 hover:bg-green-700")}
                                                                    onClick={() => setFormData(f => ({ ...f, correctAnswer: opt }))}
                                                                >
                                                                    {isCorrect ? <Check className="h-2.5 w-2.5 mr-0.5" /> : null}
                                                                    {isCorrect ? 'Doğru' : 'Seç'}
                                                                </Button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Lesson Selector */}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                                    <BookOpen className="h-3.5 w-3.5" />
                                                    DERS SEÇ
                                                </Label>
                                                <Select value={selectedLessonId} onValueChange={(v) => { setSelectedLessonId(v); setFormData(f => ({ ...f, topicIds: [] })); }}>
                                                    <SelectTrigger className="h-9 text-xs">
                                                        <SelectValue placeholder="Önce ders seçin..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {lessons.map(l => (
                                                            <SelectItem key={l.id} value={l.id}>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="outline" className="text-[9px]">{l.code}</Badge>
                                                                    {l.name}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Topics with Search (after Lesson selection) */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                                        <Layers className="h-3.5 w-3.5" />
                                                        KONU SEÇ
                                                    </Label>
                                                    {formData.topicIds.length > 0 && (
                                                        <Badge variant="secondary" className="text-[9px]">{formData.topicIds.length} seçili</Badge>
                                                    )}
                                                </div>
                                                {!selectedLessonId ? (
                                                    <div className="border rounded-xl p-4 bg-slate-50/50 text-center">
                                                        <p className="text-[10px] text-muted-foreground italic">Önce yukarıdan ders seçin</p>
                                                    </div>
                                                ) : (
                                                    <div className="border rounded-xl p-2 space-y-2 bg-slate-50/50">
                                                        <div className="relative">
                                                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                                            <Input
                                                                value={topicSearch}
                                                                onChange={(e) => setTopicSearch(e.target.value)}
                                                                className="h-7 pl-7 text-xs"
                                                                placeholder="Konu ara..."
                                                            />
                                                        </div>
                                                        <div className="max-h-24 overflow-y-auto space-y-0.5">
                                                            {filteredTopics.length === 0 ? (
                                                                <p className="text-[10px] text-muted-foreground italic py-2 text-center">
                                                                    {topics.length === 0 ? 'Bu derste konu yok' : 'Sonuç yok'}
                                                                </p>
                                                            ) : filteredTopics.map(t => (
                                                                <label key={t.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white p-1.5 rounded-lg transition-colors">
                                                                    <Checkbox
                                                                        checked={formData.topicIds.includes(t.id)}
                                                                        onCheckedChange={() => toggleTopic(t.id)}
                                                                        className="h-3.5 w-3.5"
                                                                    />
                                                                    <span className="truncate">{t.name}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Difficulty */}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-muted-foreground">ZORLUK</Label>
                                                <Select value={formData.difficulty} onValueChange={(v) => setFormData(f => ({ ...f, difficulty: v }))}>
                                                    <SelectTrigger className="h-9 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {DIFFICULTY_OPTIONS.map(d => (
                                                            <SelectItem key={d.value} value={d.value}>
                                                                <div className="flex items-center gap-2">
                                                                    <div className={cn("w-2 h-2 rounded-full", d.color.split(' ')[0])} />
                                                                    {d.label}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Exam Areas with Search */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                                        <FolderKanban className="h-3.5 w-3.5" />
                                                        SORU BANKASI SEÇ
                                                    </Label>
                                                    {formData.examAreaIds.length > 0 && (
                                                        <Badge variant="secondary" className="text-[9px]">{formData.examAreaIds.length} seçili</Badge>
                                                    )}
                                                </div>
                                                <div className="border rounded-xl p-2 space-y-2 bg-slate-50/50">
                                                    <div className="relative">
                                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                                        <Input
                                                            value={bankSearch}
                                                            onChange={(e) => setBankSearch(e.target.value)}
                                                            className="h-7 pl-7 text-xs"
                                                            placeholder="Banka ara..."
                                                        />
                                                    </div>
                                                    <div className="max-h-24 overflow-y-auto space-y-0.5">
                                                        {filteredExamAreas.length === 0 ? (
                                                            <p className="text-[10px] text-muted-foreground italic py-2 text-center">
                                                                {examAreas.length === 0 ? 'Soru bankası bulunamadı' : 'Sonuç yok'}
                                                            </p>
                                                        ) : filteredExamAreas.map(ea => (
                                                            <label key={ea.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white p-1.5 rounded-lg transition-colors">
                                                                <Checkbox
                                                                    checked={formData.examAreaIds.includes(ea.id)}
                                                                    onCheckedChange={() => toggleExamArea(ea.id)}
                                                                    className="h-3.5 w-3.5"
                                                                />
                                                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ea.color || '#8B5CF6' }} />
                                                                <span className="truncate">{ea.name}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className="p-4 border-t bg-slate-50 shrink-0 space-y-3">
                                    {/* Save Mode Selector */}
                                    <div className="flex items-center justify-center gap-2 bg-white rounded-lg p-2 border">
                                        <Label className="text-xs text-muted-foreground">Kaydetme Modu:</Label>
                                        <div className="flex gap-1">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={formData.saveMode === 'image' ? 'default' : 'outline'}
                                                onClick={() => setFormData(f => ({ ...f, saveMode: 'image' }))}
                                                className={cn("text-xs h-7 px-3", formData.saveMode === 'image' && "bg-blue-600 hover:bg-blue-700")}
                                            >
                                                <ImageIcon className="h-3.5 w-3.5 mr-1" />
                                                Görsel
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={formData.saveMode === 'text' ? 'default' : 'outline'}
                                                onClick={() => setFormData(f => ({ ...f, saveMode: 'text' }))}
                                                className={cn("text-xs h-7 px-3", formData.saveMode === 'text' && "bg-blue-600 hover:bg-blue-700")}
                                            >
                                                <Type className="h-3.5 w-3.5 mr-1" />
                                                Metin
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-center text-muted-foreground">
                                        {formData.saveMode === 'image'
                                            ? '📷 Sınavda öğrenciye GÖRSEL gösterilecek'
                                            : '📝 Sınavda öğrenciye METİN gösterilecek'}
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button variant="outline" size="sm" onClick={() => resetForm()} className="text-xs">
                                            <X className="h-3.5 w-3.5 mr-1" />
                                            Temizle
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={addToQueue}
                                            disabled={!cropData.question.image && !cropData.question.text}
                                            className="text-xs bg-blue-600 hover:bg-blue-700"
                                        >
                                            <ListTodo className="h-3.5 w-3.5 mr-1" />
                                            Listeye Ekle
                                        </Button>
                                    </div>
                                </div>
                                </>
                                ) : (
                                <div className="flex-1 overflow-y-auto bg-slate-100 p-4 flex flex-col items-center justify-start">
                                    <div className="relative w-[280px] h-[580px] bg-white rounded-[2rem] shadow-2xl border-4 border-slate-800 overflow-hidden shrink-0 flex flex-col">
                                        {/* Notch */}
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-10"></div>
                                        
                                        {/* App Header */}
                                        <div className="bg-blue-600 text-white pt-8 pb-3 px-4 shadow-md z-0 shrink-0">
                                            <div className="flex items-center justify-between">
                                                <ArrowLeft className="h-4 w-4" />
                                                <span className="text-xs font-bold">Soru Çözümü</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </div>
                                        </div>

                                        {/* App Content */}
                                        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
                                            {/* Question Root */}
                                            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 text-sm">
                                                {cropData.question.image && (
                                                    <img src={normalizeImageUrl(cropData.question.image)} className="w-full rounded-lg mb-2" />
                                                )}
                                                {cropData.question.text && (
                                                    <div className="text-xs text-slate-800" dangerouslySetInnerHTML={{ __html: cropData.question.text }} />
                                                )}
                                                {!cropData.question.image && !cropData.question.text && (
                                                    <div className="h-20 flex items-center justify-center text-slate-400 text-xs italic">
                                                        Soru kökü bekleniyor...
                                                    </div>
                                                )}
                                            </div>

                                            {/* Options */}
                                            <div className="space-y-2">
                                                {(['A', 'B', 'C', 'D', 'E'] as const).map((opt) => {
                                                    const hasContent = cropData[opt].image || cropData[opt].text;
                                                    if (!hasContent && !cropData.question.image) return null; // Hide empty options if no question yet
                                                    return (
                                                        <div key={opt} className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-start gap-3 shadow-sm">
                                                            <div className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0 mt-0.5">
                                                                {opt}
                                                            </div>
                                                            <div className="flex-1 overflow-hidden">
                                                                {cropData[opt].image && (
                                                                    <img src={normalizeImageUrl(cropData[opt].image!)} className="max-w-full rounded" />
                                                                )}
                                                                {cropData[opt].text && (
                                                                    <div className="text-xs text-slate-700 mt-1">{cropData[opt].text}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-4 font-medium text-center max-w-[250px]">
                                        Öğrencinin mobil uygulamada göreceği birebir tasarım
                                    </p>
                                </div>
                                )}
                            </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
