'use client';

import React, { useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
    isDangerous?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmModal({
    isOpen,
    title,
    description,
    confirmText,
    cancelText,
    isDangerous = false,
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    
    // Keyboard shortcuts
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                onConfirm();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onConfirm]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onCancel(); }}>
            <DialogContent className="max-w-[420px] overflow-hidden border border-border bg-background/80 p-6 backdrop-blur-xl shadow-2xl transition-all duration-200 sm:rounded-2xl">
                
                {/* Visual Accent Bar */}
                <div 
                    className={cn(
                        "absolute top-0 left-0 right-0 h-1.5 transition-colors duration-300",
                        isDangerous ? "bg-gradient-to-r from-red-500 to-orange-500 shadow-[0_2px_10px_rgba(239,68,68,0.3)]" : "bg-gradient-to-r from-blue-500 to-indigo-500"
                    )}
                />

                <div className="flex gap-4 pt-2">
                    {/* Icon container */}
                    <div 
                        className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
                            isDangerous 
                                ? "bg-red-500/10 text-red-500 ring-4 ring-red-500/5" 
                                : "bg-blue-500/10 text-blue-500 ring-4 ring-blue-500/5"
                        )}
                    >
                        {isDangerous ? (
                            <AlertTriangle className="h-5 w-5 animate-pulse" />
                        ) : (
                            <Info className="h-5 w-5" />
                        )}
                    </div>

                    <div className="flex-1 space-y-2">
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold tracking-tight text-foreground/95">
                                {title}
                            </DialogTitle>
                        </DialogHeader>
                        <DialogDescription className="text-sm font-medium leading-relaxed text-muted-foreground/80">
                            {description}
                        </DialogDescription>
                    </div>
                </div>

                <DialogFooter className="mt-6 gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        className="w-full border-border bg-transparent font-semibold text-muted-foreground/90 transition-all hover:bg-muted/40 hover:text-foreground active:scale-[0.98] sm:w-auto sm:px-5"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        type="button"
                        variant={isDangerous ? 'destructive' : 'default'}
                        onClick={onConfirm}
                        className={cn(
                            "w-full font-semibold transition-all active:scale-[0.98] sm:w-auto sm:px-5",
                            !isDangerous && "bg-blue-600 text-white hover:bg-blue-500 hover:shadow-[0_4px_12px_rgba(37,99,235,0.2)]"
                        )}
                    >
                        {confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
