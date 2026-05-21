'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StudentExamAreaList } from '@/components/student/student-exam-area-list';

export default function StudentExamAreasPage() {
    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Soru Bankalarım</h1>
                    <p className="text-muted-foreground mt-2">
                        Tanımlı olduğunuz soru bankalarına buradan erişebilir ve soru çözebilirsiniz.
                    </p>
                </div>

                <StudentExamAreaList />
            </div>
        </DashboardLayout>
    );
}
