import Link from 'next/link';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, FileQuestion, MoreVertical, Eye, Trash, Plus, FileText } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { COLORS, ICONS } from './create-group-modal';

interface Group {
    id: string;
    name: string;
    code: string;
    description?: string;
    isActive: boolean;
    _count: {
        students: number;
        exams: number;
        questions: number;
        pdfs: number;
    };
    // Metadata from JSON description
    color?: string;
    icon?: string;
}

interface GroupCardProps {
    group: Group;
    onDelete: (id: string) => void;
    isAdmin: boolean;
}

export function GroupCard({ group, onDelete, isAdmin }: GroupCardProps) {
    // Parse metadata if available, otherwise default
    // Note: This logic assumes parent component passes parsed color/icon or we do it here.
    // Ideally parent handles parsing.

    const themeColor = COLORS.find(c => c.id === group.color) || COLORS[0];
    const IconComponent = ICONS.find(i => i.id === group.icon)?.icon || Users;

    return (
        <Card className={cn("group hover:shadow-lg transition-all duration-300 border-l-4 overflow-hidden", themeColor.border, `border-l-${themeColor.text.split('-')[1]}-500`)}>
            <div className={cn("h-2 w-full absolute top-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity", themeColor.bg)} />

            <CardHeader className="pb-3 relative">
                <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shadow-sm", themeColor.bg, themeColor.text)}>
                            <IconComponent className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-none mb-1 group-hover:text-primary transition-colors">
                                {group.name}
                            </h3>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-mono text-[10px] px-1.5 h-5">
                                    {group.code}
                                </Badge>
                                {!group.isActive && <Badge variant="outline" className="text-[10px] border-destructive text-destructive px-1.5 h-5">Pasif</Badge>}
                            </div>
                        </div>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <Link href={`/groups/${group.id}`}>
                                    <Eye className="mr-2 h-4 w-4" /> Detaylar
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Plus className="mr-2 h-4 w-4" /> Öğrenci Ekle
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <FileQuestion className="mr-2 h-4 w-4" /> Sınav Ata
                            </DropdownMenuItem>
                            {isAdmin && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onDelete(group.id)} className="text-destructive focus:text-destructive">
                                        <Trash className="mr-2 h-4 w-4" /> Sil
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>

            <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-muted/30 p-2 rounded-lg flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-bold">{group._count.students}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-medium flex items-center gap-1">
                            <Users className="w-3 h-3" /> Öğrenci
                        </span>
                    </div>
                    <div className="bg-muted/30 p-2 rounded-lg flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-bold">{group._count.exams}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-medium flex items-center gap-1">
                            <FileQuestion className="w-3 h-3" /> Sınav
                        </span>
                    </div>
                </div>

                <div className="flex gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            aktif
                        </Badge>
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t flex gap-2">
                    <Button className="w-full flex-1" variant="outline" size="sm" asChild>
                        <Link href={`/groups/${group.id}`}>Grubu Yönet</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
