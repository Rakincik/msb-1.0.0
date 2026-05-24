'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ConfirmModal } from '@/components/ui/confirm-modal';

interface ConfirmOptions {
    title?: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<{
        isOpen: boolean;
        options: ConfirmOptions;
        resolve: (value: boolean) => void;
    } | null>(null);

    const confirm = (options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setState({
                isOpen: true,
                options: {
                    title: options.title || 'Emin misiniz?',
                    description: options.description,
                    confirmText: options.confirmText || 'Evet, Eminim',
                    cancelText: options.cancelText || 'İptal',
                    isDangerous: options.isDangerous || false,
                },
                resolve,
            });
        });
    };

    const handleConfirm = () => {
        state?.resolve(true);
        setState(null);
    };

    const handleCancel = () => {
        state?.resolve(false);
        setState(null);
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            {state && (
                <ConfirmModal
                    isOpen={state.isOpen}
                    title={state.options.title!}
                    description={state.options.description}
                    confirmText={state.options.confirmText!}
                    cancelText={state.options.cancelText!}
                    isDangerous={state.options.isDangerous}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            )}
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context.confirm;
}
