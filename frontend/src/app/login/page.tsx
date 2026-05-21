'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await login(formData.email, formData.password);
            toast({
                title: 'Başarılı',
                description: 'Giriş yapıldı, yönlendiriliyorsunuz...',
            });
            router.push('/dashboard');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Giriş yapılamadı';
            toast({
                title: 'Hata',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden p-4">
            {/* Soft Ambient Shapes */}
            <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-blue-200/50 mix-blend-multiply blur-3xl opacity-70 animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-cyan-200/50 mix-blend-multiply blur-3xl opacity-70 animate-pulse" style={{ animationDelay: '2s' }} />
            <div className="absolute top-[20%] right-[10%] w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] rounded-full bg-sky-200/50 mix-blend-multiply blur-3xl opacity-70 animate-pulse" style={{ animationDelay: '4s' }} />

            <Card className="w-full max-w-md relative bg-white/70 backdrop-blur-2xl border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-[2rem] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
                
                <CardHeader className="text-center pt-10 pb-6 relative z-10">
                    <div className="flex justify-center mb-6">
                        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-xl shadow-blue-500/20 ring-4 ring-white">
                            <GraduationCap className="h-10 w-10" strokeWidth={1.5} />
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-800"></CardTitle>
                    <CardDescription className="text-slate-500 mt-2 text-[15px]">Hoş geldiniz</CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit} className="relative z-10">
                    <CardContent className="space-y-5 px-8">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-600 font-medium ml-1">E-posta</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="ornek@email.com"
                                className="h-12 bg-white/60 border-slate-200/60 focus:bg-white focus:border-blue-400 focus:ring-blue-400 rounded-xl transition-all duration-300 shadow-sm"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-600 font-medium ml-1">Şifre</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                className="h-12 bg-white/60 border-slate-200/60 focus:bg-white focus:border-blue-400 focus:ring-blue-400 rounded-xl transition-all duration-300 shadow-sm"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-4 px-8 pb-10 pt-4 relative">
                        <Button 
                            type="submit" 
                            className="w-full h-12 text-base font-medium rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-500/25 transition-all duration-300 hover:scale-[1.02]" 
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : null}
                            {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
