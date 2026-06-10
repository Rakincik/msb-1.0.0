import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
    // 5 dakikalık basit in-memory cache
    private cache = new Map<string, { data: any, expires: number }>();
    private readonly CACHE_TTL = 5 * 60 * 1000;

    constructor(private readonly prisma: PrismaService) { }

    // ==========================================
    // ÖĞRENCİ KARNESİ
    // ==========================================

    async getStudentReport(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, firstName: true, lastName: true, tenantId: true },
        });

        if (!user) {
            throw new NotFoundException('Kullanıcı bulunamadı');
        }

        // Tüm sınav sonuçlarını getir
        const results = await this.prisma.studentExamResult.findMany({
            where: { userId, finishedAt: { not: null } },
            orderBy: { finishedAt: 'desc' },
            include: {
                exam: {
                    select: { id: true, title: true, type: true, totalQuestions: true },
                },
                topicAnalysis: {
                    include: {
                        result: true,
                    },
                },
            },
        });

        // Özet istatistikler
        const totalExams = results.length;
        const totalCorrect = results.reduce((sum, r) => sum + r.correctCount, 0);
        const totalWrong = results.reduce((sum, r) => sum + r.wrongCount, 0);
        const totalEmpty = results.reduce((sum, r) => sum + r.emptyCount, 0);
        const totalQuestions = totalCorrect + totalWrong + totalEmpty;
        const averageNet = totalExams > 0
            ? results.reduce((sum, r) => sum + r.netScore, 0) / totalExams
            : 0;

        // Son 5 sınavın trendi
        const recentExams = results.slice(0, 5).map(r => ({
            examId: r.examId,
            examTitle: r.exam.title,
            netScore: r.netScore,
            date: r.finishedAt,
            rank: r.rank,
            totalParticipants: r.totalParticipants,
        }));

        return {
            user: {
                id: user.id,
                name: `${user.firstName} ${user.lastName}`,
            },
            summary: {
                totalExams,
                totalQuestions,
                totalCorrect,
                totalWrong,
                totalEmpty,
                averageNet: Math.round(averageNet * 100) / 100,
                successRate: totalQuestions > 0
                    ? Math.round((totalCorrect / totalQuestions) * 10000) / 100
                    : 0,
            },
            recentExams,
            trend: this.calculateTrend(results.slice(0, 10)),
        };
    }

    // ==========================================
    // KONU ANALİZİ
    // ==========================================

    async getTopicAnalysis(userId: string, lessonId?: string) {
        const topicResults = await this.prisma.topicAnalysis.findMany({
            where: {
                result: { userId },
            },
            include: {
                result: {
                    include: {
                        exam: { select: { title: true } },
                    },
                },
            },
        });

        // Konulara göre grupla
        const topicMap: Record<string, {
            topicId: string;
            correct: number;
            wrong: number;
            empty: number;
            attempts: number;
        }> = {};

        for (const tr of topicResults) {
            if (!topicMap[tr.topicId]) {
                topicMap[tr.topicId] = {
                    topicId: tr.topicId,
                    correct: 0,
                    wrong: 0,
                    empty: 0,
                    attempts: 0,
                };
            }
            topicMap[tr.topicId].correct += tr.correctCount;
            topicMap[tr.topicId].wrong += tr.wrongCount;
            topicMap[tr.topicId].empty += tr.emptyCount;
            topicMap[tr.topicId].attempts++;
        }

        // Konu bilgilerini getir
        const topicIds = Object.keys(topicMap);
        const topics = await this.prisma.topic.findMany({
            where: { id: { in: topicIds } },
            include: {
                unit: {
                    include: { lesson: true },
                },
            },
        });

        // Sonuçları birleştir
        const analysis = topics
            .filter(t => !lessonId || t.unit.lessonId === lessonId)
            .map(topic => {
                const stats = topicMap[topic.id];
                const total = stats.correct + stats.wrong + stats.empty;

                return {
                    topicId: topic.id,
                    topicName: topic.name,
                    unitName: topic.unit.name,
                    lessonName: topic.unit.lesson.name,
                    lessonCode: topic.unit.lesson.code,
                    correct: stats.correct,
                    wrong: stats.wrong,
                    empty: stats.empty,
                    total,
                    successRate: total > 0 ? Math.round((stats.correct / total) * 100) : 0,
                    attempts: stats.attempts,
                };
            })
            .sort((a, b) => a.successRate - b.successRate); // Düşükten yükseğe (zayıf konular önce)

        return {
            strongTopics: analysis.filter(a => a.successRate >= 70),
            weakTopics: analysis.filter(a => a.successRate < 50),
            allTopics: analysis,
        };
    }

    // ==========================================
    // GELİŞİM GRAFİĞİ
    // ==========================================

    async getProgressChart(userId: string, limit: number = 20) {
        const results = await this.prisma.studentExamResult.findMany({
            where: { userId, finishedAt: { not: null } },
            orderBy: { finishedAt: 'asc' },
            take: limit,
            select: {
                id: true,
                netScore: true,
                correctCount: true,
                wrongCount: true,
                finishedAt: true,
                rank: true,
                percentile: true,
                exam: {
                    select: { title: true, type: true },
                },
            },
        });

        return {
            data: results.map((r, index) => ({
                index: index + 1,
                examTitle: r.exam.title,
                examType: r.exam.type,
                netScore: r.netScore,
                correctCount: r.correctCount,
                wrongCount: r.wrongCount,
                date: r.finishedAt,
                rank: r.rank,
                percentile: r.percentile,
            })),
            trend: this.calculateTrend(results),
        };
    }

    // ==========================================
    // KURUM RAPORLARI
    // ==========================================

    async getTenantReport(tenantId: string) {
        // Kurum öğrenci sayıları
        const studentCount = await this.prisma.user.count({
            where: { tenantId, role: 'STUDENT', isActive: true },
        });

        const teacherCount = await this.prisma.user.count({
            where: { tenantId, role: 'TEACHER', isActive: true },
        });

        // Sınav sayısı
        const examCount = await this.prisma.exam.count({
            where: { tenantId },
        });

        // Aktif sınav sayısı
        const activeExamCount = await this.prisma.exam.count({
            where: { tenantId, status: 'ACTIVE' },
        });

        // Sınav katılım oranı
        const totalResults = await this.prisma.studentExamResult.count({
            where: { exam: { tenantId } },
        });

        // Ortalama net
        const avgNetResult = await this.prisma.studentExamResult.aggregate({
            where: { exam: { tenantId }, finishedAt: { not: null } },
            _avg: { netScore: true },
        });

        // Sınıf bazlı öğrenci sayıları
        const classeStats = await this.prisma.class.findMany({
            where: { tenantId },
            include: {
                _count: { select: { students: true } },
            },
        });

        return {
            overview: {
                studentCount,
                teacherCount,
                examCount,
                activeExamCount,
                totalParticipations: totalResults,
                averageNet: avgNetResult._avg.netScore
                    ? Math.round(avgNetResult._avg.netScore * 100) / 100
                    : 0,
            },
            classes: classeStats.map(c => ({
                id: c.id,
                name: c.name,
                grade: c.grade,
                studentCount: c._count.students,
            })),
        };
    }

    async getClassReport(classId: string) {
        const classData = await this.prisma.class.findUnique({
            where: { id: classId },
            include: {
                students: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        examResults: {
                            where: { finishedAt: { not: null } },
                            orderBy: { finishedAt: 'desc' },
                            take: 5,
                            select: {
                                netScore: true,
                                correctCount: true,
                                wrongCount: true,
                                exam: { select: { title: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!classData) {
            throw new NotFoundException('Sınıf bulunamadı');
        }

        // Öğrenci performanslarını hesapla
        const studentPerformances = classData.students.map(student => {
            const avgNet = student.examResults.length > 0
                ? student.examResults.reduce((sum, r) => sum + r.netScore, 0) / student.examResults.length
                : 0;

            return {
                id: student.id,
                name: `${student.firstName} ${student.lastName}`,
                examCount: student.examResults.length,
                averageNet: Math.round(avgNet * 100) / 100,
                recentExams: student.examResults.map(r => ({
                    examTitle: r.exam.title,
                    netScore: r.netScore,
                })),
            };
        }).sort((a, b) => b.averageNet - a.averageNet);

        return {
            class: {
                id: classData.id,
                name: classData.name,
                grade: classData.grade,
                studentCount: classData.students.length,
            },
            students: studentPerformances,
            classAverage: studentPerformances.length > 0
                ? studentPerformances.reduce((sum, s) => sum + s.averageNet, 0) / studentPerformances.length
                : 0,
        };
    }

    // ==========================================
    // YARDIMCI METODLAR
    // ==========================================

    private calculateTrend(results: Array<{ netScore: number }>): 'up' | 'down' | 'stable' {
        if (results.length < 2) return 'stable';

        const recentAvg = results.slice(0, Math.ceil(results.length / 2))
            .reduce((sum, r) => sum + r.netScore, 0) / Math.ceil(results.length / 2);

        const olderAvg = results.slice(Math.ceil(results.length / 2))
            .reduce((sum, r) => sum + r.netScore, 0) / Math.floor(results.length / 2);

        const diff = recentAvg - olderAvg;

        if (diff > 2) return 'up';
        if (diff < -2) return 'down';
        return 'stable';
    }

    // ==========================================
    // SORU BANKASI ANALİTİKLERİ
    // ==========================================

    async getQuestionBankAnalytics() {
        const CACHE_KEY = 'getQuestionBankAnalytics';
        const cached = this.cache.get(CACHE_KEY);
        if (cached && cached.expires > Date.now()) {
            return cached.data;
        }

        // Temel istatistikler
        const totalQuestions = await this.prisma.question.count({ where: { isActive: true, deletedAt: null } });
        const questionsWithImage = await this.prisma.question.count({
            where: { isActive: true, content: { path: ['image'], not: null } }
        });
        const questionsWithVideo = await this.prisma.question.count({
            where: { isActive: true, videoSolution: { not: null } }
        });

        // Zorluk dağılımı
        const difficultyStats = await this.prisma.question.groupBy({
            by: ['difficulty'],
            where: { isActive: true },
            _count: { id: true }
        });

        // Ders bazlı soru sayıları
        const lessons = await this.prisma.lesson.findMany({
            include: {
                units: {
                    include: {
                        topics: {
                            include: {
                                _count: { select: { questions: true } }
                            }
                        }
                    }
                }
            }
        });

        const questionsByLesson = lessons.map(lesson => {
            const questionCount = lesson.units.reduce((sum, unit) =>
                sum + unit.topics.reduce((tSum, topic) => tSum + topic._count.questions, 0), 0
            );
            return {
                id: lesson.id,
                name: lesson.name,
                code: lesson.code,
                questionCount
            };
        }).sort((a, b) => b.questionCount - a.questionCount);

        // Soru bankası başına soru sayısı
        const examAreas = await this.prisma.examArea.findMany({
            include: {
                _count: { select: { examAreaQuestions: true } },
                students: { select: { id: true } },
                groups: { select: { id: true } }
            }
        });

        const examAreaStats = examAreas.map(ea => ({
            id: ea.id,
            name: ea.name,
            color: ea.color,
            questionCount: ea._count.examAreaQuestions,
            studentCount: ea.students.length,
            groupCount: ea.groups.length
        })).sort((a, b) => b.questionCount - a.questionCount);

        // Öğretmen bazlı soru ekleme (son 30 gün)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const teacherContributions = await this.prisma.question.groupBy({
            by: ['createdById'],
            where: {
                isActive: true,
                createdAt: { gte: thirtyDaysAgo }
            },
            _count: { id: true }
        });

        const teacherIds = teacherContributions.map(tc => tc.createdById);
        const teachers = await this.prisma.user.findMany({
            where: { id: { in: teacherIds } },
            select: { id: true, firstName: true, lastName: true }
        });

        const contributionsByTeacher = teacherContributions.map(tc => {
            const teacher = teachers.find(t => t.id === tc.createdById);
            return {
                teacherId: tc.createdById,
                teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Bilinmeyen',
                questionCount: tc._count.id
            };
        }).sort((a, b) => b.questionCount - a.questionCount);

        // Aylık soru ekleme trendi (son 6 ay)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyQuestions = await this.prisma.question.findMany({
            where: {
                isActive: true,
                createdAt: { gte: sixMonthsAgo }
            },
            select: { createdAt: true }
        });

        const monthlyTrend: Record<string, number> = {};
        const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

        monthlyQuestions.forEach(q => {
            const date = new Date(q.createdAt);
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            monthlyTrend[key] = (monthlyTrend[key] || 0) + 1;
        });

        const trendData = Object.entries(monthlyTrend)
            .map(([key, count]) => {
                const [year, month] = key.split('-').map(Number);
                return {
                    month: monthNames[month],
                    year,
                    count,
                    sortKey: year * 12 + month
                };
            })
            .sort((a, b) => a.sortKey - b.sortKey)
            .slice(-6);

        // Eksik konular (sorusu olmayan konular)
        const topicsWithoutQuestions = await this.prisma.topic.findMany({
            where: {
                questions: { none: {} }
            },
            include: {
                unit: {
                    include: { lesson: { select: { name: true, code: true } } }
                }
            }
        });

        const missingTopics = topicsWithoutQuestions.map(t => ({
            id: t.id,
            name: t.name,
            unitName: t.unit.name,
            lessonName: t.unit.lesson.name,
            lessonCode: t.unit.lesson.code
        }));

        // Son eklenen sorular
        const recentQuestions = await this.prisma.question.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                topics: { select: { name: true } },
                createdBy: { select: { firstName: true, lastName: true } }
            }
        });

        const recentActivity = recentQuestions.map(q => ({
            id: q.id,
            topicName: q.topics[0]?.name || 'Bilinmeyen',
            difficulty: q.difficulty,
            createdBy: q.createdBy ? `${q.createdBy.firstName} ${q.createdBy.lastName}` : 'Bilinmeyen',
            createdAt: q.createdAt
        }));

        // Öğrenci pratik aktivitesi
        const activeStudents = await this.prisma.userQuestionProgress.groupBy({
            by: ['userId'],
            _count: { id: true }
        });

        const totalAttempts = await this.prisma.userQuestionProgress.count();
        const correctAttempts = await this.prisma.userQuestionProgress.count({
            where: { isCorrect: true }
        });

        const result = {
            summary: {
                totalQuestions,
                questionsWithImage,
                questionsWithVideo,
                totalExamAreas: examAreas.length,
                totalLessons: lessons.length,
                missingTopicsCount: missingTopics.length,
                activeStudents: activeStudents.length,
                totalAttempts,
                successRate: totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0
            },
            difficultyDistribution: difficultyStats.map(d => ({
                difficulty: d.difficulty,
                count: d._count.id
            })),
            questionsByLesson,
            examAreaStats: examAreaStats.slice(0, 10),
            contributionsByTeacher: contributionsByTeacher.slice(0, 10),
            monthlyTrend: trendData,
            missingTopics: missingTopics.slice(0, 20),
            recentActivity
        };

        this.cache.set(CACHE_KEY, { data: result, expires: Date.now() + this.CACHE_TTL });
        return result;
    }

    // ==========================================
    // ÖĞRENCİ PRATİK İSTATİSTİKLERİ
    // ==========================================

    async getStudentPracticeStats(userId: string) {
        // Get all user's question progress
        const progress = await this.prisma.userQuestionProgress.findMany({
            where: { userId },
            include: {
                question: {
                    include: {
                        topics: {
                            include: {
                                unit: {
                                    include: { lesson: true }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const totalSolved = progress.length;
        const correctCount = progress.filter(p => p.isCorrect).length;
        const wrongCount = progress.filter(p => !p.isCorrect).length;
        const successRate = totalSolved > 0 ? Math.round((correctCount / totalSolved) * 100) : 0;

        // Stats by difficulty
        const difficultyStats: Record<string, { correct: number; wrong: number }> = {};
        progress.forEach(p => {
            const diff = p.question.difficulty;
            if (!difficultyStats[diff]) {
                difficultyStats[diff] = { correct: 0, wrong: 0 };
            }
            if (p.isCorrect) {
                difficultyStats[diff].correct++;
            } else {
                difficultyStats[diff].wrong++;
            }
        });

        // Stats by lesson
        const lessonStats: Record<string, { name: string; correct: number; wrong: number }> = {};
        progress.forEach(p => {
            const lesson = p.question.topics?.[0]?.unit?.lesson;
            if (lesson) {
                if (!lessonStats[lesson.id]) {
                    lessonStats[lesson.id] = { name: lesson.name, correct: 0, wrong: 0 };
                }
                if (p.isCorrect) {
                    lessonStats[lesson.id].correct++;
                } else {
                    lessonStats[lesson.id].wrong++;
                }
            }
        });

        // Daily activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailyProgress = await this.prisma.userQuestionProgress.groupBy({
            by: ['createdAt'],
            where: {
                userId,
                createdAt: { gte: thirtyDaysAgo }
            },
            _count: { id: true }
        });

        // Convert to daily counts
        const dailyActivity: Record<string, number> = {};
        dailyProgress.forEach(d => {
            const dateKey = new Date(d.createdAt).toISOString().split('T')[0];
            dailyActivity[dateKey] = (dailyActivity[dateKey] || 0) + d._count.id;
        });

        // Recent activity
        const recentProgress = progress.slice(0, 10).map(p => ({
            questionId: p.questionId,
            topicName: p.question.topics?.[0]?.name || 'Bilinmiyor',
            isCorrect: p.isCorrect,
            date: p.createdAt
        }));

        // Streak calculation (consecutive days solved)
        const today = new Date();
        let streak = 0;
        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const dateKey = checkDate.toISOString().split('T')[0];
            if (dailyActivity[dateKey]) {
                streak++;
            } else if (i > 0) {
                break;
            }
        }

        return {
            summary: {
                totalSolved,
                correctCount,
                wrongCount,
                successRate,
                streak
            },
            difficultyStats: Object.entries(difficultyStats).map(([difficulty, stats]) => ({
                difficulty,
                correct: stats.correct,
                wrong: stats.wrong,
                total: stats.correct + stats.wrong,
                successRate: Math.round((stats.correct / (stats.correct + stats.wrong)) * 100)
            })),
            lessonStats: Object.entries(lessonStats).map(([id, stats]) => ({
                lessonId: id,
                lessonName: stats.name,
                correct: stats.correct,
                wrong: stats.wrong,
                total: stats.correct + stats.wrong,
                successRate: Math.round((stats.correct / (stats.correct + stats.wrong)) * 100)
            })).sort((a, b) => b.total - a.total),
            dailyActivity: Object.entries(dailyActivity).map(([date, count]) => ({
                date,
                count
            })).sort((a, b) => a.date.localeCompare(b.date)),
            recentProgress
        };
    }

    // ==========================================
    // ADMIN DASHBOARD İSTATİSTİKLERİ
    // ==========================================

    async getDashboardStats(tenantScope?: string | null) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Tenant filtresi
        const tenantFilter = tenantScope ? { tenantId: tenantScope } : {};
        const globalOrTenantFilter = tenantScope ? { OR: [{ tenantId: null }, { tenantId: tenantScope }] } : {};
        const questionTenantFilter = tenantScope ? { OR: [{ tenantId: null }, { tenantId: tenantScope }] } : {};

        const [
            examAreaCount,
            questionCount,
            activeUserCount,
            totalUserCount,
            todayProgressCount,
            weekProgressCount,
            examCount,
            completedExamCount,
            difficultyStats,
            lessonQuestionCounts,
        ] = await Promise.all([
            // Aktif soru bankası
            this.prisma.examArea.count({ where: { isActive: true, ...globalOrTenantFilter } }),
            // Toplam soru
            this.prisma.question.count({ where: { isActive: true, ...questionTenantFilter } }),
            // Aktif kullanıcı (son 30 gün)
            this.prisma.user.count({ where: { isActive: true, lastLoginAt: { gte: thirtyDaysAgo }, ...tenantFilter } }),
            // Toplam kullanıcı
            this.prisma.user.count({ where: { isActive: true, ...tenantFilter } }),
            // Bugün çözülen soru
            this.prisma.userQuestionProgress.count({ where: { createdAt: { gte: today }, user: tenantFilter } }),
            // Bu hafta çözülen soru
            this.prisma.userQuestionProgress.count({ where: { createdAt: { gte: sevenDaysAgo }, user: tenantFilter } }),
            // Toplam sınav
            this.prisma.exam.count({ where: tenantFilter }),
            // Tamamlanan sınav sonuçları
            this.prisma.studentExamResult.count({ where: { finishedAt: { not: null }, user: tenantFilter } }),
            // Zorluk dağılımı
            this.prisma.question.groupBy({
                by: ['difficulty'],
                where: { isActive: true, ...questionTenantFilter },
                _count: { id: true },
            }),
            // Ders bazlı soru sayıları (top 8)
            this.prisma.lesson.findMany({
                where: tenantScope ? { OR: [{ tenantId: null }, { tenantId: tenantScope }] } : {},
                select: {
                    id: true,
                    name: true,
                    code: true,
                    units: {
                        select: {
                            topics: {
                                select: {
                                    _count: {
                                        select: { questions: true },
                                    },
                                },
                            },
                        },
                    },
                },
                take: 10,
            }),
        ]);

        // Ders bazlı soru sayılarını hesapla
        const lessonStats = lessonQuestionCounts.map(lesson => {
            const total = lesson.units.reduce((sum, unit) =>
                sum + unit.topics.reduce((topicSum, topic) =>
                    topicSum + topic._count.questions, 0
                ), 0
            );
            return { name: lesson.name, code: lesson.code, total };
        }).filter(l => l.total > 0).sort((a, b) => b.total - a.total).slice(0, 8);

        // Zorluk dağılımını formatlama
        const difficultyMap: Record<string, number> = {};
        difficultyStats.forEach(d => { difficultyMap[d.difficulty] = d._count.id; });
        const difficultyData = [
            { name: 'Çok Kolay', value: difficultyMap['VERY_EASY'] || 0, color: '#22c55e' },
            { name: 'Kolay', value: difficultyMap['EASY'] || 0, color: '#10b981' },
            { name: 'Orta', value: difficultyMap['MEDIUM'] || 0, color: '#3b82f6' },
            { name: 'Zor', value: difficultyMap['HARD'] || 0, color: '#f97316' },
            { name: 'Çok Zor', value: difficultyMap['VERY_HARD'] || 0, color: '#ef4444' },
        ];

        return {
            stats: {
                examAreaCount,
                questionCount,
                activeUserCount,
                totalUserCount,
                todayProgressCount,
                weekProgressCount,
                examCount,
                completedExamCount,
            },
            lessonStats,
            difficultyData,
        };
    }

    // Son aktiviteler (dashboard feed)
    async getRecentActivity(tenantScope?: string | null) {
        const tenantFilter = tenantScope ? { user: { tenantId: tenantScope } } : {};

        // Son sınav sonuçları
        const recentResults = await this.prisma.studentExamResult.findMany({
            where: { finishedAt: { not: null }, ...tenantFilter },
            orderBy: { finishedAt: 'desc' },
            take: 10,
            select: {
                id: true,
                correctCount: true,
                wrongCount: true,
                emptyCount: true,
                netScore: true,
                finishedAt: true,
                user: { select: { firstName: true, lastName: true } },
                exam: { select: { title: true, totalQuestions: true } },
            },
        });

        // Son eklenen sorular
        const recentQuestions = await this.prisma.question.findMany({
            where: { isActive: true, ...(tenantScope ? { OR: [{ tenantId: null }, { tenantId: tenantScope }] } : {}) },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                createdAt: true,
                createdBy: { select: { firstName: true, lastName: true } },
                topics: { select: { name: true }, take: 1 },
            },
        });

        // Birleştir ve zamana göre sırala
        const activities: any[] = [];

        recentResults.forEach(r => {
            const total = r.exam.totalQuestions || (r.correctCount + r.wrongCount + r.emptyCount);
            const successRate = total > 0 ? Math.round((r.correctCount / total) * 100) : 0;
            activities.push({
                id: `result-${r.id}`,
                type: 'solved_test',
                user: { name: `${r.user.firstName} ${r.user.lastName}`, initials: `${r.user.firstName[0]}${r.user.lastName[0]}` },
                description: `${r.exam.title} sınavını tamamladı (%${successRate} Başarı)`,
                timestamp: r.finishedAt,
            });
        });

        recentQuestions.forEach(q => {
            activities.push({
                id: `question-${q.id}`,
                type: 'added_question',
                user: { name: `${q.createdBy.firstName} ${q.createdBy.lastName}`, initials: `${q.createdBy.firstName[0]}${q.createdBy.lastName[0]}` },
                description: `${q.topics[0]?.name || 'Genel'} konusuna yeni soru ekledi`,
                timestamp: q.createdAt,
            });
        });

        return activities
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 10);
    }
}
