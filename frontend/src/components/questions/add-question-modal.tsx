'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FileText, PenTool, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddQuestionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectMethod: (method: 'manual' | 'pdf') => void;
}

export function AddQuestionModal({ open, onOpenChange, onSelectMethod }: AddQuestionModalProps) {
    const [hoveredMethod, setHoveredMethod] = useState<'manual' | 'pdf' | null>(null);

    const handleSelect = (method: 'manual' | 'pdf') => {
        onSelectMethod(method);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden bg-gradient-to-br from-slate-50 to-white">
                {/* Header */}
                <div className="p-8 pb-4 text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-2">
                        <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Yeni Soru Ekle</h2>
                    <p className="text-muted-foreground">Sorunuzu nasıl oluşturmak istiyorsunuz?</p>
                </div>

                {/* Options */}
                <div className="p-8 pt-4 grid grid-cols-2 gap-4">
                    {/* Manual Option */}
                    <button
                        onClick={() => handleSelect('manual')}
                        onMouseEnter={() => setHoveredMethod('manual')}
                        onMouseLeave={() => setHoveredMethod(null)}
                        className={cn(
                            "relative group p-6 rounded-2xl border-2 text-left transition-all duration-300",
                            "hover:border-primary hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1",
                            hoveredMethod === 'manual'
                                ? "border-primary bg-primary/5"
                                : "border-border bg-white"
                        )}
                    >
                        <div className={cn(
                            "w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all",
                            hoveredMethod === 'manual'
                                ? "bg-primary text-white"
                                : "bg-slate-100 text-slate-600"
                        )}>
                            <PenTool className="h-7 w-7" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Manuel Oluştur</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Sıfırdan soru metni yazın, şıkları belirleyin ve görseller ekleyin.
                        </p>
                        <div className={cn(
                            "absolute inset-0 rounded-2xl ring-2 ring-primary ring-offset-2 transition-opacity",
                            hoveredMethod === 'manual' ? "opacity-100" : "opacity-0"
                        )} />
                    </button>

                    {/* PDF Option */}
                    <button
                        onClick={() => handleSelect('pdf')}
                        onMouseEnter={() => setHoveredMethod('pdf')}
                        onMouseLeave={() => setHoveredMethod(null)}
                        className={cn(
                            "relative group p-6 rounded-2xl border-2 text-left transition-all duration-300",
                            "hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1",
                            hoveredMethod === 'pdf'
                                ? "border-blue-500 bg-blue-50"
                                : "border-border bg-white"
                        )}
                    >
                        <div className={cn(
                            "w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all",
                            hoveredMethod === 'pdf'
                                ? "bg-blue-500 text-white"
                                : "bg-slate-100 text-slate-600"
                        )}>
                            <FileText className="h-7 w-7" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">PDF'den Aktar</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            PDF kitabından soruları kesin, otomatik metin tanıma ile aktarın.
                        </p>
                        <div className="absolute top-3 right-3">
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold uppercase">
                                Akıllı Tanıma
                            </span>
                        </div>
                        <div className={cn(
                            "absolute inset-0 rounded-2xl ring-2 ring-blue-500 ring-offset-2 transition-opacity",
                            hoveredMethod === 'pdf' ? "opacity-100" : "opacity-0"
                        )} />
                    </button>
                </div>

                {/* Footer */}
                <div className="px-8 pb-6 pt-2">
                    <p className="text-center text-xs text-muted-foreground">
                        💡 İpucu: PDF'den aktarma özelliği ile kitaplardan hızlıca soru oluşturabilirsiniz.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
