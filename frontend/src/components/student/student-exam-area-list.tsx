'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, ChevronRight, GraduationCap } from 'lucide-react';
import { cn, getFileUrl } from '@/lib/utils';
import Image from 'next/image';

interface ExamArea {
    id: string;
    name: string;
    slug: string;
    description?: string;
    coverImage?: string;
    icon?: string;
    color?: string;
    _count?: {
        lessons: number;
        questions: number;
    };
}

export function StudentExamAreaList() {
    const router = useRouter();
    const [examAreas, setExamAreas] = useState<ExamArea[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchExamAreas = async () => {
            try {
                const data = await apiClient.get('/exam-areas/student/my-areas');
                setExamAreas(data);
            } catch (error) {
                console.error('Failed to fetch exam areas', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchExamAreas();
    }, []);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-4">
                            <Skeleton className="aspect-[2/3] w-full rounded-r-xl rounded-l-sm" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (examAreas.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed rounded-2xl bg-slate-50/50">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <BookOpen className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Kütüphaneniz Boş</h3>
                <p className="text-slate-500 mt-2 max-w-sm text-center">
                    Size tanımlanmış bir soru bankası bulamadık. Yeni bir yayın satın almak veya kod kullanmak için mağazaya göz atın.
                </p>
                <Button className="mt-6 font-semibold shadow-md" size="lg">
                    Mağazaya Git
                </Button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-12 py-8">
            {examAreas.map((area) => {
                // Fake a random mock progress so they see what it looks like
                // In a real app, this comes from backend (e.g., area.progress)
                const completionPercentage = Math.floor(Math.random() * 40) + 10; 

                return (
                    <div 
                        key={area.id} 
                        className="group flex flex-col items-center cursor-pointer"
                        onClick={() => router.push(`/student/exam-areas/${area.slug || area.id}`)}
                    >
                        {/* 3D Book Container */}
                        <div className="relative aspect-[2/3] w-full max-w-[200px] mb-4 perspective-1000">
                            <div 
                                className="w-full h-full relative transition-all duration-500 transform-style-3d 
                                          group-hover:rotate-y-[-10deg] group-hover:scale-105 group-hover:-translate-y-2
                                          shadow-xl group-hover:shadow-2xl rounded-r-xl rounded-l-[3px] overflow-hidden 
                                          border-y border-r border-slate-900/10"
                                style={{
                                    backgroundColor: area.color || '#1e293b'
                                }}
                            >
                                {/* Spine Lighting/Shadows */}
                                <div className="absolute top-0 bottom-0 left-0 w-6 bg-gradient-to-r from-black/40 via-black/10 to-transparent z-10 pointer-events-none" />
                                <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-white/30 z-20 pointer-events-none" />
                                <div className="absolute top-0 bottom-0 left-6 w-[1px] bg-black/10 z-20 pointer-events-none" />
                                <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10 z-10 pointer-events-none" />

                                {/* Cover Image or Fallback */}
                                {area.coverImage ? (
                                    <Image
                                        src={getFileUrl(area.coverImage)}
                                        alt={area.name}
                                        fill
                                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                                        className="object-cover absolute inset-0 z-0"
                                        unoptimized={getFileUrl(area.coverImage).startsWith('http://localhost')}
                                    />
                                ) : (
                                    <div className="w-full h-full absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                                        <BookOpen className="w-12 h-12 text-white/50 mb-3" />
                                        <h3 className="text-white font-bold text-xl drop-shadow-md leading-tight">
                                            {area.name}
                                        </h3>
                                    </div>
                                )}
                            </div>
                            
                            {/* Shelf Shadow */}
                            <div className="absolute -bottom-4 left-4 right-4 h-4 bg-black/20 blur-md rounded-[100%] transition-opacity duration-300 group-hover:opacity-40" />
                        </div>

                        {/* Detail Text */}
                        <div className="w-full text-center px-2 space-y-1">
                            <h4 className="font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                                {area.name}
                            </h4>
                            <p className="text-xs text-slate-500">
                                {area._count?.lessons || 0} Ders • {area._count?.questions || 0} Soru
                            </p>
                            
                            {/* Progress Bar (Visual Only for now) */}
                            <div className="pt-2 w-full max-w-[160px] mx-auto">
                                <div className="flex justify-between items-center text-[10px] font-medium text-slate-400 mb-1">
                                    <span>İlerleme</span>
                                    <span>%{completionPercentage}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-emerald-500 rounded-full relative"
                                        style={{ width: `${completionPercentage}%` }}
                                    >
                                        <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

