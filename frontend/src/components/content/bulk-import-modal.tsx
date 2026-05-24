'use client';

import { useState, useRef } from 'react';
import {
    X,
    Upload,
    Download,
    FileSpreadsheet,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    Info,
    Clipboard
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { API_URL } from '@/lib/api-config';

interface BulkImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lessonId: string;
    lessonName: string;
    accessToken?: string;
    onSuccess: () => void;
}

interface ParsedItem {
    unitName: string;
    topicName: string;
    status: 'valid' | 'invalid';
    reason?: string;
}

export function BulkImportModal({
    open,
    onOpenChange,
    lessonId,
    lessonName,
    accessToken,
    onSuccess
}: BulkImportModalProps) {
    const { toast } = useToast();
    const [pasteText, setPasteText] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Dynamic template download specifically designed for Turkish Windows Excel
    const handleDownloadTemplate = () => {
        const headers = ['Ünite Adı', 'Konu Adı'];
        const sampleRows = [
            ['Temel Kavramlar', 'Tek ve Çift Sayılar'],
            ['Temel Kavramlar', 'Asal Sayılar'],
            ['Sözcükte Anlam', 'Eş Anlamlı Kelimeler'],
        ];
        
        // Semicolon (;) is default for TR Windows Excel, using standard UTF-8 BOM
        const csvContent = [
            headers.join(';'),
            ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(';'))
        ].join('\n');
        
        const bom = '\uFEFF'; // Essential for Turkish character set in Excel
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${lessonName.replace(/\s+/g, '_')}_konu_sablonu.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast({ title: 'Şablon İndirildi', description: 'Türkçe Excel uyumlu CSV şablonu başarıyla indirildi.' });
    };

    // Text parsing helper that detects delimiter and separates values
    const parseContent = (text: string) => {
        if (!text.trim()) {
            setParsedItems([]);
            return;
        }

        const lines = text.split(/\r?\n/);
        const newItems: ParsedItem[] = [];

        // Simple delimiter detection
        let delimiter = ';';
        const firstLine = lines[0] || '';
        if (firstLine.includes('\t')) delimiter = '\t';
        else if (firstLine.includes(';')) delimiter = ';';
        else if (firstLine.includes(',')) delimiter = ',';

        // Check if first line is headers
        let startIdx = 0;
        const potentialHeaders = firstLine.split(delimiter).map(h => h.trim().replace(/['"]/g, '').toLowerCase());
        if (potentialHeaders.includes('ünite adı') || potentialHeaders.includes('unite adi') || potentialHeaders.includes('konu adı') || potentialHeaders.includes('konu adi')) {
            startIdx = 1;
        }

        for (let i = startIdx; i < lines.length; i++) {
            const line = lines[i]?.trim();
            if (!line) continue;

            const cols = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
            const unitName = cols[0] || '';
            const topicName = cols[1] || '';

            if (!unitName && !topicName) continue;

            if (!unitName || !topicName) {
                newItems.push({
                    unitName,
                    topicName,
                    status: 'invalid',
                    reason: !unitName ? 'Ünite adı eksik' : 'Konu adı eksik'
                });
            } else {
                newItems.push({
                    unitName,
                    topicName,
                    status: 'valid'
                });
            }
        }
        setParsedItems(newItems);
    };

    const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setPasteText(text);
        parseContent(text);
    };

    // File handling
    const processFile = (file: File) => {
        if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
            toast({
                title: 'Uyumsuz Dosya Formatı',
                description: 'Lütfen sadece .csv veya .txt uzantılı metin dosyaları yükleyin.',
                variant: 'destructive'
            });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            setPasteText('');
            parseContent(text);
        };
        reader.readAsText(file, 'UTF-8');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    // Submit payload to backend bulk API
    const handleSubmit = async () => {
        const validPayload = parsedItems
            .filter(item => item.status === 'valid')
            .map(item => ({
                unitName: item.unitName,
                topicName: item.topicName
            }));

        if (validPayload.length === 0) {
            toast({
                title: 'Geçersiz Veri',
                description: 'Lütfen yüklenebilecek en az bir geçerli ünite ve konu ekleyin.',
                variant: 'destructive'
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/content/lessons/${lessonId}/bulk-import`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify(validPayload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Yükleme başarısız oldu');

            toast({
                title: '✅ Yükleme Başarılı',
                description: `Başarıyla ${data.unitsCreated} ünite ve ${data.topicsCreated} konu eklendi.`
            });
            
            setPasteText('');
            setParsedItems([]);
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: 'Hata',
                description: error.message || 'Beklenmeyen bir sorun oluştu.',
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalValid = parsedItems.filter(i => i.status === 'valid').length;
    const totalInvalid = parsedItems.filter(i => i.status === 'invalid').length;
    const uniqueUnits = Array.from(new Set(parsedItems.filter(i => i.status === 'valid').map(i => i.unitName))).length;
    const uniqueTopics = Array.from(new Set(parsedItems.filter(i => i.status === 'valid').map(i => i.topicName))).length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-white border-0 shadow-apple-2xl rounded-2xl p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <DialogHeader className="px-6 py-4 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div>
                        <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                            <span>{lessonName} Konu Yükleme</span>
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Excel veya CSV kullanarak topluca ünite ve konu ekleyin.</p>
                    </div>
                </DialogHeader>

                {/* Info Alert */}
                <div className="mx-6 mt-4 p-3 bg-blue-50/80 border border-blue-100 rounded-xl flex gap-3 text-sm text-blue-700">
                    <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="font-semibold">Nasıl Yüklenir?</p>
                        <p className="text-xs">Yükleme formatı <strong>2 sütun</strong> olmalıdır: Sütun A: <strong>Ünite Adı</strong>, Sütun B: <strong>Konu Adı</strong>. Türkçe karakterler ve noktalı virgül (;) ayrıcıları tam desteklenir.</p>
                    </div>
                </div>

                {/* Main Tabs */}
                <div className="flex-1 overflow-hidden p-6 flex flex-col min-h-0 gap-4">
                    <Tabs defaultValue="paste" className="w-full flex flex-col flex-1 min-h-0">
                        <TabsList className="grid grid-cols-2 bg-slate-100/80 p-1 rounded-xl mb-4 self-start w-72">
                            <TabsTrigger value="paste" className="rounded-lg text-xs font-medium py-1.5 flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <Clipboard className="h-3.5 w-3.5" />
                                Kopyala & Yapıştır
                            </TabsTrigger>
                            <TabsTrigger value="file" className="rounded-lg text-xs font-medium py-1.5 flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <Upload className="h-3.5 w-3.5" />
                                Dosya Yükle
                            </TabsTrigger>
                        </TabsList>

                        {/* Copy Paste Tab */}
                        <TabsContent value="paste" className="flex-1 flex flex-col min-h-0 gap-2 m-0 border-0 outline-none">
                            <Label htmlFor="paste-textarea" className="text-sm font-semibold text-slate-700">Tabloları Buraya Yapıştırın</Label>
                            <textarea
                                id="paste-textarea"
                                value={pasteText}
                                onChange={handlePasteChange}
                                placeholder="Örn Excel formatı:&#10;Temel Kavramlar&#9;Tek ve Çift Sayılar&#10;Temel Kavramlar&#9;Asal Sayılar&#10;Sözcükte Anlam&#9;Eş Anlamlı Kelimeler"
                                className="flex-1 w-full min-h-[140px] max-h-[220px] rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono bg-slate-50/50 resize-none transition-all"
                            />
                        </TabsContent>

                        {/* File Upload Tab */}
                        <TabsContent value="file" className="flex-1 flex flex-col min-h-0 gap-4 m-0 border-0 outline-none">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold text-slate-700">CSV Dosyası Seçin</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownloadTemplate}
                                    className="h-8 gap-1.5 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Örnek Şablonu İndir
                                </Button>
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".csv,.txt"
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            <div
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer min-h-[140px] max-h-[220px] transition-all ${
                                    dragActive
                                        ? 'border-emerald-500 bg-emerald-50/30'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 bg-slate-50/20'
                                }`}
                            >
                                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 mb-3 group-hover:bg-slate-200">
                                    <Upload className="h-5 w-5 text-slate-500" />
                                </div>
                                <p className="text-sm font-medium text-slate-700">Tıklayın veya CSV dosyasını sürükleyip bırakın</p>
                                <p className="text-xs text-slate-400 mt-1">Sadece .csv veya .txt dosyaları (UTF-8)</p>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* Preview Area */}
                    {parsedItems.length > 0 && (
                        <div className="flex-1 flex flex-col min-h-[160px] border border-slate-100 rounded-xl bg-slate-50/50 overflow-hidden">
                            {/* Summary strip */}
                            <div className="bg-slate-100/60 border-b border-slate-200/50 px-4 py-2 flex items-center justify-between text-xs font-semibold text-slate-600 shrink-0">
                                <div className="flex gap-4">
                                    <span>Toplam Satır: <strong className="text-slate-800">{parsedItems.length}</strong></span>
                                    <span>Geçerli: <strong className="text-emerald-600">{totalValid}</strong></span>
                                    {totalInvalid > 0 && <span>Hatalı: <strong className="text-red-500">{totalInvalid}</strong></span>}
                                </div>
                                <div className="flex gap-3">
                                    <span>Eşsiz Ünite: <strong className="text-slate-800">{uniqueUnits}</strong></span>
                                    <span>Eşsiz Konu: <strong className="text-slate-800">{uniqueTopics}</strong></span>
                                </div>
                            </div>

                            {/* Table */}
                            <ScrollArea className="flex-1">
                                <div className="p-2">
                                    <table className="w-full text-xs text-left border-collapse">
                                        <thead>
                                            <tr className="text-slate-400 font-medium border-b border-slate-100/80">
                                                <th className="py-1.5 px-2 w-8">#</th>
                                                <th className="py-1.5 px-2">Ünite Adı</th>
                                                <th className="py-1.5 px-2">Konu Adı</th>
                                                <th className="py-1.5 px-2 w-24">Durum</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedItems.map((item, idx) => (
                                                <tr key={idx} className="border-b border-slate-100 hover:bg-white/80 transition-colors">
                                                    <td className="py-1.5 px-2 text-slate-400 font-mono">{idx + 1}</td>
                                                    <td className="py-1.5 px-2 font-medium text-slate-700 truncate max-w-[150px]">{item.unitName || <span className="text-red-400 italic">Eksik</span>}</td>
                                                    <td className="py-1.5 px-2 font-medium text-slate-700 truncate max-w-[200px]">{item.topicName || <span className="text-red-400 italic">Eksik</span>}</td>
                                                    <td className="py-1.5 px-2">
                                                        {item.status === 'valid' ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                Geçerli
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full" title={item.reason}>
                                                                <AlertTriangle className="h-3 w-3" />
                                                                Hatalı
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        İptal
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || totalValid === 0}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-1.5"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Aktarılıyor...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4" />
                                Sisteme Aktar ({totalValid} Satır)
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
