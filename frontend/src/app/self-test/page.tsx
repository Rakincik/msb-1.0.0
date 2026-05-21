import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers } from "lucide-react";

export default function SelfTestPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Kendin Oluştur</h1>
            <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Modül Hazırlanıyor</CardTitle>
                    <Layers className="h-4 w-4 text-muted-foreground ml-auto" />
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Bu modül yapım aşamasındadır.</p>
                </CardContent>
            </Card>
        </div>
    );
}
