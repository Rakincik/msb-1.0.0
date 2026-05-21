import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, Check, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ImageCropperModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    imageFile: File | null;
    onCropComplete: (croppedImage: Blob) => void;
    aspectRatio?: number; // default 16/9
}

export function ImageCropperModal({
    open,
    onOpenChange,
    imageFile,
    onCropComplete,
    aspectRatio = 16 / 9
}: ImageCropperModalProps) {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Initial Image Load
    useEffect(() => {
        if (imageFile) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setImageSrc(e.target?.result as string);
                setScale(1);
                setPosition({ x: 0, y: 0 });
        };
            reader.readAsDataURL(imageFile);
        } else {
            setImageSrc(null);
        }
    }, [imageFile]);

    // Pan Logic
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => setIsDragging(false);

    // Crop Logic
    const handleCrop = async () => {
        if (!imageRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const image = imageRef.current;

        // Set output size (e.g. 800px width)
        const outputWidth = 800;
        const outputHeight = outputWidth / aspectRatio;

        canvas.width = outputWidth;
        canvas.height = outputHeight;

        if (ctx) {
            // Background
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Calculate source rectangle
            // The logic here maps the visual crop to the actual image coordinates
            const container = containerRef.current;
            if (container) {
                // Determine scale factor between screen pixels and actual image pixels
                // NOTE: This simple version relies on visual placement. 
                // A robust math uses: 
                //   sourceX = (containerCenter - imageCenter - panX) / scale
                // But for simplicity, we map the visible area:

                // For better quality, draw image with transform
                ctx.save();
                ctx.translate(outputWidth / 2, outputHeight / 2);
                ctx.translate(position.x, position.y);
                ctx.scale(scale, scale);
                // Draw image centered
                const drawWidth = outputWidth; // Base size fits width
                const drawHeight = drawWidth * (image.naturalHeight / image.naturalWidth);

                ctx.drawImage(
                    image,
                    -drawWidth / 2,
                    -drawHeight / 2,
                    drawWidth,
                    drawHeight
                );
                ctx.restore();
            }

            canvas.toBlob((blob) => {
                if (blob) {
                    onCropComplete(blob);
                    onOpenChange(false);
                }
            }, 'image/jpeg', 0.9);
        }
    };

    if (!imageSrc) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden bg-slate-900 border-none text-white">
                <DialogHeader className="p-4 bg-slate-900 z-10">
                    <DialogTitle className="flex items-center justify-between">
                        <span>Görseli Ayarla</span>
                        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-white hover:bg-white/10">
                            <X className="h-4 w-4" />
                        </Button>
                    </DialogTitle>
                </DialogHeader>

                <div
                    ref={containerRef}
                    className="relative w-full h-[400px] bg-black overflow-hidden cursor-move select-none flex items-center justify-center"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* Image */}
                    <img
                        ref={imageRef}
                        src={imageSrc}
                        alt="Crop target"
                        className="max-w-none transition-transform duration-75 origin-center"
                        style={{
                            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                            width: '800px' // Base reference width
                        }}
                    />

                    {/* Overlay Guide (16/9) */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div
                            className="border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"
                            style={{
                                width: '80%',
                                aspectRatio: `${aspectRatio}`,
                                borderRadius: '8px'
                            }}
                        >
                            <div className="w-full h-full grid grid-cols-3 grid-rows-3 opacity-30">
                                <div className="border-r border-b border-white"></div>
                                <div className="border-r border-b border-white"></div>
                                <div className="border-b border-white"></div>
                                <div className="border-r border-b border-white"></div>
                                <div className="border-r border-b border-white"></div>
                                <div className="border-b border-white"></div>
                                <div className="border-r border-white"></div>
                                <div className="border-r border-white"></div>
                                <div></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-900 space-y-4">
                    <div className="flex items-center gap-4">
                        <ZoomOut className="h-4 w-4 text-slate-400" />
                        <input
                            type="range"
                            min="0.5"
                            max="3"
                            step="0.1"
                            value={scale}
                            onChange={(e) => setScale(parseFloat(e.target.value))}
                            className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-white"
                        />
                        <ZoomIn className="h-4 w-4 text-slate-400" />
                        <span className="text-xs w-8 text-center tabular-nums">{Math.round(scale * 100)}%</span>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white hover:bg-white/10">
                            İptal
                        </Button>
                        <Button onClick={handleCrop} className="bg-white text-black hover:bg-white/90 gap-2">
                            <Check className="h-4 w-4" />
                            Kırp ve Kullan
                        </Button>
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                </div>
            </DialogContent>
        </Dialog>
    );
}
