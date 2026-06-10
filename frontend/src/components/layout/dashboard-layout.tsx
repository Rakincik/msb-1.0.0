'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { AuthGuard } from '@/components/layout/auth-guard';
import { cn } from '@/lib/utils';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Home,
    FileText,
    BookOpen,
    ClipboardList,
    Users,
    Building2,
    BarChart3,
    Settings,
    LogOut,
    GraduationCap,
    Layers,
    FileQuestion,
    UsersRound,
    FolderKanban,
    Flag,
} from 'lucide-react';

const adminMenuItems = [
    { title: 'Dashboard', icon: Home, href: '/dashboard' },
    { title: 'Kullanıcılar', icon: Users, href: '/users' },
    { title: 'Soru Bankalarım', icon: FolderKanban, href: '/exam-areas' },
    { title: 'Dersler', icon: BookOpen, href: '/lessons' },
    { title: 'Gruplar', icon: UsersRound, href: '/groups' },
    { title: 'Soru Havuzu', icon: FileQuestion, href: '/questions' },
    { title: 'Soru Bildirimleri', icon: Flag, href: '/question-reports' },
    { title: 'Raporlar', icon: BarChart3, href: '/analytics' },
];

const teacherMenuItems = [
    { title: 'Dashboard', icon: Home, href: '/dashboard' },
    { title: 'Kullanıcılar', icon: Users, href: '/users' },
    { title: 'Soru Bankalarım', icon: FolderKanban, href: '/exam-areas' },
    { title: 'Dersler', icon: BookOpen, href: '/lessons' },
    { title: 'Gruplar', icon: UsersRound, href: '/groups' },
    { title: 'Soru Havuzu', icon: FileQuestion, href: '/questions' },
    { title: 'Soru Bildirimleri', icon: Flag, href: '/question-reports' },
    { title: 'Raporlar', icon: BarChart3, href: '/analytics' },
];

const studentMenuItems = [
    { title: 'Dashboard', icon: Home, href: '/dashboard' },
    { title: 'Soru Bankalarım', icon: FolderKanban, href: '/student/exam-areas' },
    { title: 'Karışık Çöz', icon: Layers, href: '/student/self-test' },
    { title: 'Karnem', icon: GraduationCap, href: '/analytics/my-report' },
];

export function AppSidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    const getMenuItems = () => {
        switch (user?.role) {
            case 'SUPER_ADMIN':
                return [
                    { title: 'Kurumlar', icon: Building2, href: '/tenants' },
                    ...adminMenuItems,
                ];
            case 'ADMIN':
                return adminMenuItems;
            case 'TEACHER':
                return teacherMenuItems;
            case 'STUDENT':
                return studentMenuItems;
            default:
                return [];
        }
    };

    const menuItems = getMenuItems();

    return (
        <Sidebar>
            <SidebarHeader className="px-6 py-6">
                <Link href="/dashboard" className="flex items-center gap-3 transition-opacity hover:opacity-80">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-apple-md">
                        <GraduationCap className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-lg leading-none tracking-tight">Soru Bankası</span>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Premium Panel</span>
                    </div>
                </Link>
            </SidebarHeader>

            <SidebarContent className="px-4 mt-2">
                <SidebarGroup>
                    <SidebarGroupLabel className="px-4 pb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                        Ana Menü
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-2.5">
                            {menuItems.map((item) => (
                                <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === item.href}
                                        className={cn(
                                            "gap-4 px-4 py-6 min-h-[52px] rounded-2xl transition-all group relative overflow-hidden",
                                            pathname === item.href
                                                ? "bg-slate-100/80 shadow-sm"
                                                : "hover:bg-slate-50"
                                        )}
                                    >
                                        <Link href={item.href} className="flex items-center w-full">
                                            {pathname === item.href && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-r-full" />
                                            )}
                                            <item.icon className={cn(
                                                "h-6 w-6 transition-colors duration-200",
                                                pathname === item.href ? "text-primary" : "text-slate-500 group-hover:text-slate-800"
                                            )} />
                                            <span className={cn(
                                                "text-[15px] tracking-wide ml-3 transition-all",
                                                pathname === item.href 
                                                    ? "font-bold text-slate-900" 
                                                    : "font-semibold text-slate-700 group-hover:text-slate-900"
                                            )}>
                                                {item.title}
                                            </span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="p-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start gap-3 px-2 py-6 hover:bg-sidebar-accent/50 rounded-xl">
                            <Avatar className="h-9 w-9 border border-white/20 shadow-sm">
                                <AvatarImage src={user?.avatar} />
                                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-medium">
                                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start text-sm">
                                <span className="font-semibold text-foreground/90">{user?.firstName} {user?.lastName}</span>
                                <span className="text-xs text-muted-foreground capitalize font-medium">
                                    {user?.role?.replace('_', ' ').toLowerCase()}
                                </span>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 rounded-xl border-white/20 shadow-apple-xl backdrop-blur-xl bg-white/80">
                        <DropdownMenuItem asChild className="rounded-lg focus:bg-primary/5 cursor-pointer">
                            <Link href="/settings">
                                <Settings className="mr-2 h-4 w-4" />
                                Ayarlar
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border/50" />
                        <DropdownMenuItem onClick={logout} className="text-red-600 rounded-lg focus:bg-red-50 cursor-pointer focus:text-red-700">
                            <LogOut className="mr-2 h-4 w-4" />
                            Çıkış Yap
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarFooter>
        </Sidebar>
    );
}

export function DashboardLayout({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: ('SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT')[] }) {
    return (
        <AuthGuard allowedRoles={allowedRoles}>
            <SidebarProvider>
                <div className="flex min-h-screen w-full bg-muted/30">
                    <AppSidebar />
                    <main className="flex-1 overflow-y-auto">
                        <div className="flex items-center gap-4 rounded-xl px-6 py-4">
                            <SidebarTrigger />
                        </div>
                        <div className="p-6">
                            {children}
                        </div>
                    </main>
                </div>
            </SidebarProvider>
        </AuthGuard>
    );
}
