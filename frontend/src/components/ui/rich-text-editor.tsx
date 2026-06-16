'use client';

import React, { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline, Strikethrough, Subscript, Superscript, Palette, Highlighter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    minHeight?: string;
    expanded?: boolean;
}

export interface RichTextEditorRef {
    focus: () => void;
}

const TOOLBAR_BUTTONS = [
    { command: 'bold', icon: Bold, title: 'Kalın (Ctrl+B)', shortcut: 'B' },
    { command: 'italic', icon: Italic, title: 'İtalik (Ctrl+I)', shortcut: 'I' },
    { command: 'underline', icon: Underline, title: 'Altı Çizili (Ctrl+U)', shortcut: 'U' },
    { command: 'strikeThrough', icon: Strikethrough, title: 'Üstü Çizili', shortcut: 'S' },
    { command: 'subscript', icon: Subscript, title: 'Alt Simge', shortcut: null },
    { command: 'superscript', icon: Superscript, title: 'Üst Simge', shortcut: null },
];

const COLORS = [
    { name: 'Siyah', value: '#000000' },
    { name: 'Kırmızı', value: '#ef4444' },
    { name: 'Turuncu', value: '#f97316' },
    { name: 'Sarı', value: '#eab308' },
    { name: 'Yeşil', value: '#22c55e' },
    { name: 'Mavi', value: '#3b82f6' },
    { name: 'Mor', value: '#a855f7' },
    { name: 'Pembe', value: '#ec4899' },
    { name: 'Gri', value: '#6b7280' },
];

const HIGHLIGHT_COLORS = [
    { name: 'Yok', value: 'transparent' },
    { name: 'Sarı', value: '#fef08a' },
    { name: 'Yeşil', value: '#bbf7d0' },
    { name: 'Mavi', value: '#bfdbfe' },
    { name: 'Kırmızı', value: '#fecaca' },
    { name: 'Mor', value: '#e9d5ff' },
    { name: 'Gri', value: '#e5e7eb' },
];

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
    value,
    onChange,
    placeholder = 'Metin girin...',
    className,
    minHeight = '60px',
    expanded = false,
}, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = React.useState(false);

    useImperativeHandle(ref, () => ({
        focus: () => editorRef.current?.focus(),
    }));

    const execCommand = useCallback((command: string) => {
        document.execCommand(command, false);
        editorRef.current?.focus();

        // Trigger onChange after command
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    }, [onChange]);

    const handleInput = useCallback(() => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    }, [onChange]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    execCommand('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    execCommand('italic');
                    break;
                case 'u':
                    e.preventDefault();
                    execCommand('underline');
                    break;
            }
        }
    }, [execCommand]);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
    }, []);

    // Sync value prop with editor content
    React.useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    return (
        <div className={cn(
            "border rounded-lg overflow-hidden transition-all duration-200",
            isFocused ? "ring-2 ring-violet-400 border-violet-400" : "border-input",
            className
        )}>
            {/* Toolbar */}
            <div className={cn(
                "flex items-center gap-0.5 px-1 py-1 bg-muted/50 border-b transition-all duration-200",
                isFocused ? "opacity-100" : "opacity-60"
            )}>
                <TooltipProvider delayDuration={300}>
                    {TOOLBAR_BUTTONS.map(({ command, icon: Icon, title }) => (
                        <Tooltip key={command}>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-violet-100"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        execCommand(command);
                                    }}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                                {title}
                            </TooltipContent>
                        </Tooltip>
                    ))}

                    <div className="w-px h-4 bg-slate-300 mx-1" />

                    {/* Text Color Picker */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 hover:bg-violet-100" title="Metin Rengi">
                                <Palette className="h-3.5 w-3.5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-2" align="center">
                            <div className="grid grid-cols-5 gap-1.5">
                                {COLORS.map((c) => (
                                    <button
                                        key={c.name}
                                        type="button"
                                        title={c.name}
                                        className="w-6 h-6 rounded-md border border-slate-200 shadow-sm transition-transform hover:scale-110"
                                        style={{ backgroundColor: c.value }}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            execCommand('foreColor');
                                            document.execCommand('foreColor', false, c.value);
                                        }}
                                    />
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Highlight Color Picker */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 hover:bg-violet-100" title="Arka Plan Rengi">
                                <Highlighter className="h-3.5 w-3.5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-2" align="center">
                            <div className="grid grid-cols-5 gap-1.5">
                                {HIGHLIGHT_COLORS.map((c) => (
                                    <button
                                        key={c.name}
                                        type="button"
                                        title={c.name}
                                        className={cn("w-6 h-6 rounded-md border border-slate-200 shadow-sm transition-transform hover:scale-110", c.value === 'transparent' ? 'bg-[url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==")]' : '')}
                                        style={{ backgroundColor: c.value !== 'transparent' ? c.value : undefined }}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            // Some browsers use backColor, others hiliteColor
                                            document.execCommand('hiliteColor', false, c.value);
                                            document.execCommand('backColor', false, c.value);
                                        }}
                                    />
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                </TooltipProvider>
            </div>

            {/* Editor Area */}
            <div
                ref={editorRef}
                contentEditable
                className={cn(
                    "px-3 py-2 text-sm outline-none transition-all duration-200 overflow-y-auto",
                    "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none",
                    expanded ? "min-h-[150px]" : `min-h-[${minHeight}]`
                )}
                style={{ minHeight: expanded ? '150px' : minHeight }}
                data-placeholder={placeholder}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                suppressContentEditableWarning
            />
        </div>
    );
});

RichTextEditor.displayName = 'RichTextEditor';

// Compact version for options (smaller toolbar)
interface CompactRichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    onFocus?: () => void;
    onBlur?: () => void;
    autoFocus?: boolean;
}

export function CompactRichTextEditor({
    value,
    onChange,
    placeholder = 'Metin...',
    className,
    onFocus,
    onBlur,
    autoFocus,
}: CompactRichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = React.useState(false);
    const [showToolbar, setShowToolbar] = React.useState(false);

    const execCommand = useCallback((command: string) => {
        document.execCommand(command, false);
        editorRef.current?.focus();
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    }, [onChange]);

    const handleInput = useCallback(() => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    }, [onChange]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    execCommand('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    execCommand('italic');
                    break;
                case 'u':
                    e.preventDefault();
                    execCommand('underline');
                    break;
            }
        }
    }, [execCommand]);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
    }, []);

    React.useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    React.useEffect(() => {
        if (autoFocus && editorRef.current) {
            editorRef.current.focus();
        }
    }, [autoFocus]);

    const handleFocus = () => {
        setIsFocused(true);
        setShowToolbar(true);
        onFocus?.();
    };

    const handleBlur = () => {
        setIsFocused(false);
        setTimeout(() => setShowToolbar(false), 200);
        onBlur?.();
    };

    return (
        <div className={cn(
            "relative border rounded-lg overflow-hidden transition-all duration-200",
            isFocused ? "ring-2 ring-violet-400 border-violet-400" : "border-input",
            className
        )}>
            {/* Floating Toolbar */}
            {showToolbar && (
                <div className="absolute -top-8 left-0 right-0 flex items-center justify-center z-10">
                    <div className="flex items-center gap-0.5 px-1 py-0.5 bg-white border rounded-lg shadow-lg">
                        {TOOLBAR_BUTTONS.map(({ command, icon: Icon, title }) => (
                            <Button
                                key={command}
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 hover:bg-violet-100"
                                title={title}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    execCommand(command);
                                }}
                            >
                                <Icon className="h-3 w-3" />
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Editor Area */}
            <div
                ref={editorRef}
                contentEditable
                className={cn(
                    "px-2 py-1.5 text-xs outline-none min-h-[80px]",
                    "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none"
                )}
                data-placeholder={placeholder}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onFocus={handleFocus}
                onBlur={handleBlur}
                suppressContentEditableWarning
            />
        </div>
    );
}
