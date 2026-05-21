'use client';

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Pencil, Eraser, Trash2, MousePointer2 } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface DrawingCanvasProps {
    width?: number;
    height?: number;
    className?: string;
    onSave?: (data: string) => void;
    initialData?: string | null;
}

export type CanvasRef = {
    clear: () => void;
    getData: () => string | null;
};

export const DrawingCanvas = forwardRef<CanvasRef, DrawingCanvasProps>(({
    width,
    height,
    className,
    onSave,
    initialData
}, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<'pen' | 'eraser' | 'move'>('move');
    const [color, setColor] = useState('#ef4444'); // Default red
    const [lineWidth, setLineWidth] = useState(3);

    // Initial load
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx && initialData) {
            const img = new Image();
            img.src = initialData;
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
        }
    }, [initialData]);

    // Resize handler if width/height not fixed
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current && canvasRef.current && !width && !height) {
                // Save current content
                const oldData = canvasRef.current.toDataURL();
                const img = new Image();
                img.src = oldData;

                // Resize
                canvasRef.current.width = containerRef.current.clientWidth;
                canvasRef.current.height = containerRef.current.clientHeight;

                // Restore
                img.onload = () => {
                    canvasRef.current?.getContext('2d')?.drawImage(img, 0, 0);
                }
            }
        };

        handleResize(); // Init
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [width, height]);

    // Drawing logic
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (tool === 'move') return;

        setIsDrawing(true);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left;
        const y = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color; // Eraser paints white (assuming white background)
        // If transparent background is needed, eraser should use generic 'destination-out' composite
        if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out'; // True eraser
            ctx.lineWidth = 20;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.lineWidth = lineWidth;
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left;
        const y = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            if (onSave && canvasRef.current) {
                onSave(canvasRef.current.toDataURL());
            }
        }
    };

    useImperativeHandle(ref, () => ({
        clear: () => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (onSave) onSave(canvas.toDataURL());
            }
        },
        getData: () => canvasRef.current?.toDataURL() || null
    }));

    return (
        <div className={cn("relative flex flex-col h-full pointer-events-none", className)}>
            {/* Toolbar - Enable pointer events explicitly */}
            {/* Toolbar - Enable pointer events explicitly */}
            <div className="absolute top-1/4 right-4 bg-white/90 backdrop-blur shadow-xl border border-slate-200 rounded-3xl p-1.5 flex flex-col gap-2 z-20 pointer-events-auto items-center transition-all">
                <ToggleGroup type="single" value={tool} onValueChange={(v) => v && setTool(v as any)} className="flex-col gap-1">
                    <ToggleGroupItem value="move" aria-label="Move" className="rounded-2xl p-3 data-[state=on]:bg-slate-100 data-[state=on]:text-slate-900">
                        <MousePointer2 className="h-5 w-5" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="pen" aria-label="Pen" className="rounded-2xl p-3 data-[state=on]:bg-indigo-100 data-[state=on]:text-indigo-600">
                        <Pencil className="h-5 w-5" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="eraser" aria-label="Eraser" className="rounded-2xl p-3 data-[state=on]:bg-rose-100 data-[state=on]:text-rose-600">
                        <Eraser className="h-5 w-5" />
                    </ToggleGroupItem>
                </ToggleGroup>

                {tool === 'pen' && (
                    <>
                        <div className="h-px w-8 bg-slate-200 my-1" />
                        <div className="flex flex-col items-center gap-3 py-2">
                            <button onClick={() => setColor('#000000')} className={cn("w-5 h-5 rounded-full bg-black ring-offset-2 transition-all", color === '#000000' && "ring-2 ring-black scale-110")} />
                            <button onClick={() => setColor('#ef4444')} className={cn("w-5 h-5 rounded-full bg-red-500 ring-offset-2 transition-all", color === '#ef4444' && "ring-2 ring-red-500 scale-110")} />
                            <button onClick={() => setColor('#3b82f6')} className={cn("w-5 h-5 rounded-full bg-blue-500 ring-offset-2 transition-all", color === '#3b82f6' && "ring-2 ring-blue-500 scale-110")} />
                        </div>
                    </>
                )}

                <div className="h-px w-8 bg-slate-200 my-1" />

                <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl" onClick={() => {
                    const canvas = canvasRef.current;
                    const ctx = canvas?.getContext('2d');
                    if (canvas && ctx) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        if (onSave) onSave(canvas.toDataURL());
                    }
                }}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {/* Canvas Container that ignores pointer events when tool is 'move' to allow scrolling underneath */}
            <div ref={containerRef} className="relative flex-1 w-full h-full touch-none overflow-hidden">
                <canvas
                    ref={canvasRef}
                    className={cn(
                        "absolute inset-0 z-10 w-full h-full transition-colors",
                        tool === 'move' ? "pointer-events-none" : "cursor-crosshair pointer-events-auto"
                    )}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    width={width || 1000} // Default large width to avoid blur, resize helper will adjust
                    height={height || 1000}
                />
            </div>
        </div>
    );
});

DrawingCanvas.displayName = 'DrawingCanvas';
