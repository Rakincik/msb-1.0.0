'use client';

import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';

import {
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    Pencil,
    Highlighter,
    Eraser,
    Undo,
    Save,
    RotateCw,
} from 'lucide-react';

// PDF.js worker ayarı
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export type Tool = 'pen' | 'highlighter' | 'eraser' | 'none';

export interface DrawingPath {
    id: string;
    points: number[];
    color: string;
    strokeWidth: number;
    tool: Tool;
}

interface PDFViewerProps {
    pdfUrl: string;
    onAnnotationSave?: (pageNumber: number, annotations: DrawingPath[]) => void;
    initialAnnotations?: Record<number, DrawingPath[]>;
    watermark?: { text: string; opacity: number };
}

export function PDFViewer({
    pdfUrl,
    onAnnotationSave,
    initialAnnotations = {},
    watermark,
}: PDFViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [activeTool, setActiveTool] = useState<Tool>('none');
    const [penColor, setPenColor] = useState('#000000');
    const [paths, setPaths] = useState<Record<number, DrawingPath[]>>({});
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<number[]>([]);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // PDF yüklendiğinde
    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        // Initial annotations'ı yükle
        if (initialAnnotations) {
            setPaths(initialAnnotations);
        }
    };

    // Sayfa değişikliği
    const goToPage = (page: number) => {
        if (page >= 1 && page <= numPages) {
            setPageNumber(page);
        }
    };

    // Zoom fonksiyonları
    const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
    const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));

    // Çizim başlatma
    const startDrawing = (e: React.MouseEvent) => {
        if (activeTool === 'none') return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;

        setIsDrawing(true);
        setCurrentPath([x, y]);
    };

    // Çizim süreci
    const draw = (e: React.MouseEvent) => {
        if (!isDrawing || activeTool === 'none') return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;

        setCurrentPath((prev) => [...prev, x, y]);

        // Canvas'a geçici çizim
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.lineTo(x * scale, y * scale);
            ctx.stroke();
        }
    };

    // Çizim bitirme
    const endDrawing = () => {
        if (!isDrawing || currentPath.length < 4) {
            setIsDrawing(false);
            setCurrentPath([]);
            return;
        }

        const newPath: DrawingPath = {
            id: Date.now().toString(),
            points: currentPath,
            color: activeTool === 'highlighter' ? `${penColor}80` : penColor,
            strokeWidth: activeTool === 'highlighter' ? 20 : 3,
            tool: activeTool,
        };

        setPaths((prev) => ({
            ...prev,
            [pageNumber]: [...(prev[pageNumber] || []), newPath],
        }));

        setIsDrawing(false);
        setCurrentPath([]);
    };

    // Canvas'ı yeniden çiz
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Temizle
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Watermark çiz
        if (watermark) {
            ctx.save();
            ctx.globalAlpha = watermark.opacity;
            ctx.font = '14px Arial';
            ctx.fillStyle = '#666';
            ctx.rotate(-Math.PI / 6);
            for (let x = -200; x < canvas.width + 200; x += 200) {
                for (let y = 0; y < canvas.height + 200; y += 100) {
                    ctx.fillText(watermark.text, x, y);
                }
            }
            ctx.restore();
        }

        // Kayıtlı çizimleri render et
        const pagePaths = paths[pageNumber] || [];
        pagePaths.forEach((path) => {
            ctx.beginPath();
            ctx.strokeStyle = path.color;
            ctx.lineWidth = path.strokeWidth * scale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            for (let i = 0; i < path.points.length; i += 2) {
                const x = path.points[i] * scale;
                const y = path.points[i + 1] * scale;
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        });

        // Geçici çizim
        if (isDrawing && currentPath.length >= 2) {
            ctx.beginPath();
            ctx.strokeStyle = activeTool === 'highlighter' ? `${penColor}80` : penColor;
            ctx.lineWidth = (activeTool === 'highlighter' ? 20 : 3) * scale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            for (let i = 0; i < currentPath.length; i += 2) {
                const x = currentPath[i] * scale;
                const y = currentPath[i + 1] * scale;
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }
    }, [paths, pageNumber, scale, isDrawing, currentPath, watermark, penColor, activeTool]);

    // Kaydetme
    const saveAnnotations = () => {
        if (onAnnotationSave) {
            onAnnotationSave(pageNumber, paths[pageNumber] || []);
        }
    };

    // Geri al
    const undo = () => {
        setPaths((prev) => {
            const pagePaths = prev[pageNumber] || [];
            if (pagePaths.length === 0) return prev;
            return {
                ...prev,
                [pageNumber]: pagePaths.slice(0, -1),
            };
        });
        };

    // Temizle
    const clearPage = () => {
        setPaths((prev) => ({
            ...prev,
            [pageNumber]: [],
        }));
    };

    const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center justify-between bg-muted px-4 py-2 border-b">
                <div className="flex items-center gap-2">
                    {/* Sayfa navigasyonu */}
                    <Button variant="outline" size="icon" onClick={() => goToPage(pageNumber - 1)} disabled={pageNumber <= 1}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm min-w-[80px] text-center">
                        {pageNumber} / {numPages}
                    </span>
                    <Button variant="outline" size="icon" onClick={() => goToPage(pageNumber + 1)} disabled={pageNumber >= numPages}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>

                    <div className="w-px h-6 bg-border mx-2" />

                    {/* Zoom */}
                    <Button variant="outline" size="icon" onClick={zoomOut}>
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
                    <Button variant="outline" size="icon" onClick={zoomIn}>
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    {/* Çizim araçları */}
                    <Button
                        variant={activeTool === 'pen' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setActiveTool(activeTool === 'pen' ? 'none' : 'pen')}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={activeTool === 'highlighter' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setActiveTool(activeTool === 'highlighter' ? 'none' : 'highlighter')}
                    >
                        <Highlighter className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={activeTool === 'eraser' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setActiveTool(activeTool === 'eraser' ? 'none' : 'eraser')}
                    >
                        <Eraser className="h-4 w-4" />
                    </Button>

                    <div className="w-px h-6 bg-border mx-2" />

                    {/* Renk seçimi */}
                    <div className="flex gap-1">
                        {colors.map((color) => (
                            <button
                                key={color}
                                className={`w-6 h-6 rounded-full border-2 ${penColor === color ? 'border-primary' : 'border-transparent'}`}
                                style={{ backgroundColor: color }}
                                onClick={() => setPenColor(color)}
                            />
                        ))}
                    </div>

                    <div className="w-px h-6 bg-border mx-2" />

                    {/* Aksiyonlar */}
                    <Button variant="outline" size="icon" onClick={undo}>
                        <Undo className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={clearPage}>
                        <RotateCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={saveAnnotations}>
                        <Save className="h-4 w-4 mr-2" />
                        Kaydet
                    </Button>
                </div>
            </div>

            {/* PDF görüntüleyici */}
            <div
                ref={containerRef}
                className="flex-1 overflow-auto bg-gray-100 flex justify-center p-4"
            >
                <div className="relative" style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
                    <Document
                        file={pdfUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={
                            <div className="flex items-center justify-center h-96">
                                <RotateCw className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        }
                    >
                        <Page
                            pageNumber={pageNumber}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                        />
                    </Document>

                    {/* Çizim canvas'ı */}
                    <canvas
                        ref={canvasRef}
                        className="absolute top-0 left-0 pointer-events-auto"
                        width={612}
                        height={792}
                        style={{
                            cursor: activeTool !== 'none' ? 'crosshair' : 'default',
                        }}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={endDrawing}
                        onMouseLeave={endDrawing}
                    />
                </div>
            </div>
        </div>
    );
}
