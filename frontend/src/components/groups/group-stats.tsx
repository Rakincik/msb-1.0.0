import { Card, CardContent } from "@/components/ui/card";
import { Users, LayoutGrid, CheckCircle2, TrendingUp } from "lucide-react";

interface GroupStatsProps {
    groups: any[];
}

export function GroupStats({ groups }: GroupStatsProps) {
    const totalGroups = groups.length;
    const activeGroups = groups.filter(g => g.isActive).length;
    const totalStudents = groups.reduce((acc, curr) => acc + (curr._count?.students || 0), 0);
    const totalExams = groups.reduce((acc, curr) => acc + (curr._count?.exams || 0), 0);

    // Calculate a trend or fun stat? "Avg exams per group"
    const avgExams = totalGroups > 0 ? (totalExams / totalGroups).toFixed(1) : 0;

    const stats = [
        {
            label: "Toplam Grup",
            value: totalGroups,
            icon: LayoutGrid,
            color: "text-blue-500",
            bg: "bg-blue-100",
            desc: `${activeGroups} aktif`
        },
        {
            label: "Toplam Öğrenci",
            value: totalStudents,
            icon: Users,
            color: "text-purple-500",
            bg: "bg-purple-100",
            desc: "Tüm gruplarda"
        },
        {
            label: "Atanan Test",
            value: totalExams,
            icon: CheckCircle2,
            color: "text-green-500",
            bg: "bg-green-100",
            desc: `Ort. ${avgExams} / grup`
        },
        {
            label: "Aktiflik",
            value: totalGroups > 0 ? `%${Math.round((activeGroups / totalGroups) * 100)}` : "%0",
            icon: TrendingUp,
            color: "text-orange-500",
            bg: "bg-orange-100",
            desc: "Grup doluluk oranı"
        }
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, i) => (
                <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                            <h3 className="text-2xl font-bold">{stat.value}</h3>
                            <p className="text-xs text-muted-foreground">{stat.desc}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
