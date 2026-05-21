import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Users, BookOpen, GraduationCap, PenTool, Clock, Laptop, Check, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CreateGroupModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: any;
}

const COLORS = [
    { id: 'blue', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', ring: 'ring-blue-500' },
    { id: 'purple', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', ring: 'ring-purple-500' },
    { id: 'green', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', ring: 'ring-green-500' },
    { id: 'orange', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', ring: 'ring-orange-500' },
    { id: 'pink', bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', ring: 'ring-pink-500' },
    { id: 'red', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', ring: 'ring-red-500' },
    { id: 'slate', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', ring: 'ring-slate-500' },
];

const ICONS = [
    { id: 'users', icon: Users, label: 'Sınıf' },
    { id: 'book', icon: BookOpen, label: 'Ders' },
    { id: 'grad', icon: GraduationCap, label: 'Sınav' },
    { id: 'pen', icon: PenTool, label: 'Kurs' },
    { id: 'clock', icon: Clock, label: 'Etüt' },
    { id: 'laptop', icon: Laptop, label: 'Online' },
];

export function CreateGroupModal({ open, onOpenChange, onSubmit, initialData }: CreateGroupModalProps) {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: initialData?.description || '',
        type: initialData?.type || 'OFFLINE',
        color: initialData?.color || 'blue',
        icon: initialData?.icon || 'users',
        endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : ''
    });

    // Reset or populate form when modal opens
    useEffect(() => {
        if (open) {
            if (initialData) {
                setFormData({
                    name: initialData.name || '',
                    code: initialData.code || '',
                    description: initialData.description || '',
                    type: initialData.type || 'OFFLINE',
                    color: initialData.color || 'blue',
                    icon: initialData.icon || 'users',
                    endDate: initialData.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : ''
                });
            } else {
                setFormData({ name: '', code: '', description: '', type: 'OFFLINE', color: 'blue', icon: 'users', endDate: '' });
            }
            setStep(1);
        }
    }, [open, initialData]);

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const payload = { ...formData };
            if (!payload.endDate) delete (payload as any).endDate;
            await onSubmit(payload);
            setStep(1);
            setFormData({ name: '', code: '', description: '', type: 'OFFLINE', color: 'blue', icon: 'users', endDate: '' });
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const SelectedIcon = ICONS.find(i => i.id === formData.icon)?.icon || Users;
    const selectedColor = COLORS.find(c => c.id === formData.color) || COLORS[0];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden gap-0">
                <div className="flex h-full">
                    {/* Sidebar / Preview */}
                    <div className={cn("hidden sm:flex w-[200px] bg-slate-50/50 border-r p-6 flex-col items-center justify-center text-center gap-4")}>
                        <div className={cn("w-24 h-24 rounded-2xl flex items-center justify-center shadow-sm transition-all duration-300", selectedColor.bg, selectedColor.text)}>
                            <SelectedIcon className="w-12 h-12" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-semibold text-sm line-clamp-1">{formData.name || 'Grup Adı'}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-1">{formData.code || 'grup-kodu'}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] items-center gap-1">
                            <Users className="w-3 h-3" /> 0 Öğrenci
                        </Badge>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col">
                        <DialogHeader className="p-6 pb-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                <span className={cn("w-6 h-6 rounded-full flex items-center justify-center border", step >= 1 ? "bg-primary text-primary-foreground border-primary" : "")}>1</span>
                                <div className="h-[1px] flex-1 bg-border" />
                                <span className={cn("w-6 h-6 rounded-full flex items-center justify-center border", step >= 2 ? "bg-primary text-primary-foreground border-primary" : "")}>2</span>
                            </div>
                            <DialogTitle>{step === 1 ? (initialData ? 'Grubu Düzenle' : 'Grup Bilgileri') : 'Görünüm Özelleştirme'}</DialogTitle>
                            <DialogDescription>
                                {step === 1 ? (initialData ? 'Grubun temel bilgilerini güncelleyin.' : 'Grubunuz için temel bilgileri girin.') : 'Grubunuzun nasıl görüneceğini seçin.'}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="p-6 pt-2 flex-1 space-y-4">
                            {step === 1 ? (
                                <>
                                    <div className="space-y-2">
                                        <Label>Grup Adı</Label>
                                        <Input
                                            placeholder="Örn: 12-A Sınıfı"
                                            value={formData.name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Grup Kodu (Benzersiz)</Label>
                                        <Input
                                            placeholder="Örn: 12-a-2024"
                                            value={formData.code}
                                            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Açıklama (Opsiyonel)</Label>
                                        <Textarea
                                            placeholder="Grup hakkında notlar..."
                                            value={formData.description}
                                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                            className="h-20"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Son Kullanma Tarihi (Opsiyonel)</Label>
                                        <Input
                                            type="date"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-3">
                                        <Label>Tema Rengi</Label>
                                        <div className="flex flex-wrap gap-3">
                                            {COLORS.map(color => (
                                                <button
                                                    key={color.id}
                                                    onClick={() => setFormData(prev => ({ ...prev, color: color.id }))}
                                                    className={cn(
                                                        "w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center",
                                                        color.bg,
                                                        formData.color === color.id ? `border-transparent ring-2 ring-offset-2 ${color.ring}` : "border-transparent hover:scale-110"
                                                    )}
                                                >
                                                    {formData.color === color.id && <Check className={cn("w-4 h-4", color.text)} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <Label>Grup İkonu</Label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {ICONS.map(item => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => setFormData(prev => ({ ...prev, icon: item.id }))}
                                                    className={cn(
                                                        "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all hover:bg-muted",
                                                        formData.icon === item.id ? "bg-muted border-primary/50 ring-1 ring-primary/20" : "border-transparent"
                                                    )}
                                                >
                                                    <item.icon className="w-6 h-6 text-muted-foreground" />
                                                    <span className="text-[10px] text-muted-foreground">{item.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <DialogFooter className="p-6 pt-0">
                            {step === 1 ? (
                                <Button className="w-full" onClick={() => setStep(2)} disabled={!formData.name || !formData.code}>
                                    Devam Et <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            ) : (
                                <div className="flex gap-2 w-full">
                                    <Button variant="outline" onClick={() => setStep(1)} disabled={isLoading}>
                                        <ChevronLeft className="w-4 h-4 mr-2" /> Geri
                                    </Button>
                                    <Button className="flex-1" onClick={handleSubmit} disabled={isLoading}>
                                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        {initialData ? 'Kaydet' : 'Oluştur'}
                                    </Button>
                                </div>
                            )}
                        </DialogFooter>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export { COLORS, ICONS };
