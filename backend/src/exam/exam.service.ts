import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionService } from '../question/question.service';
import { CreateExamDto, UpdateExamDto, SubmitExamDto, StartExamDto } from './dto';
import { ExamStatus, ExamType, Role } from '@prisma/client';

@Injectable()
export class ExamService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly questionService: QuestionService,
    ) { }

    // ==========================================
    // SINAV OLUŞTURMA VE YÖNETİMİ
    // ==========================================

    async create(dto: CreateExamDto) {
        const exam = await this.prisma.exam.create({
            data: {
                title: dto.title,
                description: dto.description,
                type: dto.type,
                tenantId: dto.tenantId,
                duration: dto.duration,
                startTime: dto.startTime,
                endTime: dto.endTime,
                correctPoints: dto.correctPoints ?? 1,
                wrongPenalty: dto.wrongPenalty ?? 0.25,
                shuffleQuestions: dto.shuffleQuestions ?? false,
                shuffleOptions: dto.shuffleOptions ?? false,
                showResults: dto.showResults ?? true,
                allowReview: dto.allowReview ?? true,
                singleAttempt: dto.singleAttempt ?? true,
                pdfDocumentId: dto.pdfDocumentId,
            },
        });

        // Eğer sorular varsa ekle
        if (dto.questionIds && dto.questionIds.length > 0) {
            await this.addQuestionsToExam(exam.id, dto.questionIds);
        }

        // Eğer sınıflar varsa ekle
        if (dto.classIds && dto.classIds.length > 0) {
            await this.prisma.exam.update({
                where: { id: exam.id },
                data: {
                    classes: {
                        connect: dto.classIds.map((id) => ({ id })),
                    },
                },
            });
        }

        return this.findOne(exam.id);
    }

    async addQuestionsToExam(examId: string, questionIds: string[]) {
        const examQuestions = questionIds.map((questionId, index) => ({
            examId,
            questionId,
            orderNumber: index + 1,
        }));

        await this.prisma.examQuestion.createMany({
            data: examQuestions,
            skipDuplicates: true,
        });

        // Toplam soru sayısını güncelle
        await this.prisma.exam.update({
            where: { id: examId },
            data: { totalQuestions: questionIds.length },
        });

        // Kullanım sayılarını artır
        await this.questionService.incrementUsageCount(questionIds);
    }

    async findAll(params: {
        tenantId?: string;
        type?: ExamType;
        status?: ExamStatus;
        skip?: number;
        take?: number;
    }) {
        const { tenantId, type, status, skip = 0, take = 50 } = params;

        const where: any = {};

        if (tenantId) where.tenantId = tenantId;
        if (type) where.type = type;
        if (status) where.status = status;

        const [exams, total] = await Promise.all([
            this.prisma.exam.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { questions: true, results: true },
                    },
                    pdfDocument: {
                        select: { id: true, title: true, pageCount: true },
                    },
                    classes: {
                        select: { id: true, name: true },
                    },
                },
            }),
            this.prisma.exam.count({ where }),
        ]);

        return {
            data: exams,
            meta: { total, skip, take, hasMore: skip + take < total },
        };
    }

    async findOne(id: string, tenantScope?: string | null) {
        const exam = await this.prisma.exam.findUnique({
            where: { id },
            include: {
                questions: {
                    orderBy: { orderNumber: 'asc' },
                    include: {
                        question: {
                            include: {
                                topics: {
                                    select: { id: true, name: true },
                                },
                            },
                        },
                    },
                },
                pdfDocument: true,
                classes: true,
                _count: {
                    select: { results: true },
                },
            },
        });

        if (!exam) {
            throw new NotFoundException('Sınav bulunamadı');
        }

        // Tenant izolasyonu kontrolü
        if (tenantScope && exam.tenantId && exam.tenantId !== tenantScope) {
            throw new NotFoundException('Sınav bulunamadı');
        }

        return exam;
    }

    async update(id: string, dto: UpdateExamDto) {
        return this.prisma.exam.update({
            where: { id },
            data: dto,
        });
    }

    async remove(id: string) {
        await this.prisma.exam.delete({ where: { id } });
        return { message: 'Sınav silindi' };
    }

    async updateStatus(id: string, status: ExamStatus) {
        return this.prisma.exam.update({
            where: { id },
            data: { status },
        });
    }

    // ==========================================
    // ÖĞRENCİ SINAV İŞLEMLERİ
    // ==========================================

    async startExam(examId: string, userId: string) {
        const exam = await this.findOne(examId);

        // Sınav aktif mi kontrol et
        if (exam.status !== ExamStatus.ACTIVE && exam.status !== ExamStatus.SCHEDULED) {
            throw new BadRequestException('Sınav şu anda aktif değil');
        }

        // Zaman kontrolü
        const now = new Date();
        if (exam.startTime && now < exam.startTime) {
            throw new BadRequestException('Sınav henüz başlamadı');
        }
        if (exam.endTime && now > exam.endTime) {
            throw new BadRequestException('Sınav süresi dolmuş');
        }

        // Daha önce girmiş mi kontrol et
        if (exam.singleAttempt) {
            const existingResult = await this.prisma.studentExamResult.findUnique({
                where: {
                    userId_examId: { userId, examId },
                },
            });

            if (existingResult) {
                throw new BadRequestException('Bu sınava daha önce girdiniz');
            }
        }

        // Sonuç kaydı oluştur (başlangıç)
        const result = await this.prisma.studentExamResult.create({
            data: {
                userId,
                examId,
                startedAt: now,
                answers: {},
            },
        });

        // Soruları hazırla (karıştır opsiyonel)
        let questions = exam.questions.map((eq) => ({
            id: eq.question.id,
            orderNumber: eq.orderNumber,
            content: eq.question.content,
            options: eq.question.options,
            topicId: eq.question.topics?.[0]?.id || null,
            topicName: eq.question.topics?.[0]?.name || '',
        }));

        if (exam.shuffleQuestions) {
            questions = this.shuffleArray(questions);
        }

        return {
            resultId: result.id,
            examId: exam.id,
            title: exam.title,
            duration: exam.duration,
            totalQuestions: exam.totalQuestions,
            startedAt: result.startedAt,
            questions,
            pdfDocument: exam.pdfDocument ? {
                id: exam.pdfDocument.id,
                title: exam.pdfDocument.title,
                pageCount: exam.pdfDocument.pageCount,
                answerKey: null, // Cevap anahtarını gösterme
            } : null,
        };
    }

    async submitExam(dto: SubmitExamDto, userId: string) {
        const result = await this.prisma.studentExamResult.findFirst({
            where: {
                id: dto.resultId,
                userId,
            },
            include: {
                exam: {
                    include: {
                        questions: {
                            include: {
                                question: {
                                    include: { topics: { select: { id: true, name: true } } }
                                }
                            },
                        },
                        pdfDocument: true,
                    },
                },
            },
        });

        if (!result) {
            throw new NotFoundException('Sınav sonucu bulunamadı');
        }

        if (result.finishedAt) {
            throw new BadRequestException('Bu sınav zaten tamamlanmış');
        }

        const exam = result.exam;
        const now = new Date();

        // Cevapları değerlendir
        let correctCount = 0;
        let wrongCount = 0;
        let emptyCount = 0;
        const topicStats: Record<string, { correct: number; wrong: number; empty: number }> = {};

        // PDF bazlı sınav ise cevap anahtarından değerlendir
        if (exam.pdfDocument?.answerKey) {
            const answerKey = exam.pdfDocument.answerKey as Record<string, string>;

            for (const [questionNum, correctAnswer] of Object.entries(answerKey)) {
                const studentAnswer = dto.answers[questionNum];

                if (!studentAnswer) {
                    emptyCount++;
                } else if (studentAnswer === correctAnswer) {
                    correctCount++;
                } else {
                    wrongCount++;
                }
            }
        } else {
            // Soru bazlı sınav
            for (const eq of exam.questions) {
                const studentAnswer = dto.answers[eq.orderNumber.toString()];
                const correctAnswer = eq.question.correctAnswer;
                const topicId = eq.question.topics?.[0]?.id;

                if (!topicStats[topicId]) {
                    topicStats[topicId] = { correct: 0, wrong: 0, empty: 0 };
                }

                if (!studentAnswer) {
                    emptyCount++;
                    topicStats[topicId].empty++;
                } else if (studentAnswer === correctAnswer) {
                    correctCount++;
                    topicStats[topicId].correct++;
                } else {
                    wrongCount++;
                    topicStats[topicId].wrong++;
                }
            }
        }

        // Net hesapla
        const netScore = correctCount - (wrongCount * exam.wrongPenalty);
        const rawScore = correctCount * exam.correctPoints;
        const duration = Math.floor((now.getTime() - result.startedAt.getTime()) / 1000);

        // Sonucu güncelle
        const updatedResult = await this.prisma.studentExamResult.update({
            where: { id: result.id },
            data: {
                answers: dto.answers,
                correctCount,
                wrongCount,
                emptyCount,
                netScore,
                rawScore,
                finishedAt: now,
                duration,
            },
        });

        // Konu analizlerini kaydet
        for (const [topicId, stats] of Object.entries(topicStats)) {
            const total = stats.correct + stats.wrong + stats.empty;
            const successRate = total > 0 ? (stats.correct / total) * 100 : 0;

            await this.prisma.topicAnalysis.create({
                data: {
                    resultId: result.id,
                    topicId,
                    correctCount: stats.correct,
                    wrongCount: stats.wrong,
                    emptyCount: stats.empty,
                    successRate,
                },
            });
        }

        return {
            ...updatedResult,
            showResults: exam.showResults,
            correctAnswers: exam.showResults ? this.getCorrectAnswers(exam) : null,
        };
    }

    async getMyResult(examId: string, userId: string) {
        const result = await this.prisma.studentExamResult.findUnique({
            where: {
                userId_examId: { userId, examId },
            },
            include: {
                exam: {
                    include: {
                        pdfDocument: true,
                    },
                },
                topicAnalysis: {
                    include: {
                        topic: { select: { name: true } }
                    }
                }
            },
        });

        if (!result) {
            throw new NotFoundException('Henüz bu sınava girmediniz');
        }

        return result;
    }

    // ==========================================
    // LEADERBOARD VE SIRALAMA
    // ==========================================

    async getLeaderboard(examId: string, limit: number = 100) {
        const results = await this.prisma.studentExamResult.findMany({
            where: {
                examId,
                finishedAt: { not: null },
            },
            orderBy: { netScore: 'desc' },
            take: limit,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        tenant: {
                            select: { name: true },
                        },
                    },
                },
            },
        });

        return results.map((r, index) => ({
            rank: index + 1,
            userId: r.userId,
            name: `${r.user.firstName} ${r.user.lastName}`,
            tenantName: r.user.tenant?.name,
            netScore: r.netScore,
            correctCount: r.correctCount,
            wrongCount: r.wrongCount,
            duration: r.duration,
        }));
    }

    async calculateRankings(examId: string) {
        const results = await this.prisma.studentExamResult.findMany({
            where: { examId, finishedAt: { not: null } },
            orderBy: { netScore: 'desc' },
        });

        const totalParticipants = results.length;

        for (let i = 0; i < results.length; i++) {
            const rank = i + 1;
            const percentile = ((totalParticipants - rank) / totalParticipants) * 100;

            await this.prisma.studentExamResult.update({
                where: { id: results[i].id },
                data: {
                    rank,
                    totalParticipants,
                    percentile,
                },
            });
        }

        return { message: `${totalParticipants} öğrenci sıralandı` };
    }

    // ==========================================
    // YARDIMCI METODLAR
    // ==========================================

    private shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    private getCorrectAnswers(exam: any): Record<string, string> {
        if (exam.pdfDocument?.answerKey) {
            return exam.pdfDocument.answerKey;
        }

        const answers: Record<string, string> = {};
        for (const eq of exam.questions) {
            answers[eq.orderNumber.toString()] = eq.question.correctAnswer;
        }
        return answers;
    }

    // ==========================================
    // KENDİN OLUŞTUR (SERBEST TEST)
    // ==========================================

    async createSelfTest(userId: string, topicIds: string[], questionCount: number) {
        // Rastgele sorular al
        const questions = await this.questionService.getRandomQuestions({
            topicIds,
            count: questionCount,
        });

        if (questions.length === 0) {
            throw new BadRequestException('Seçilen konularda soru bulunamadı');
        }

        return {
            questions: questions.map((q, index) => ({
                orderNumber: index + 1,
                id: q.id,
                content: q.content,
                options: q.options,
                topicId: q.topics?.[0]?.id || null,
                topicName: q.topics?.[0]?.name || '',
            })),
            totalQuestions: questions.length,
        };
    }

    async submitSelfTest(userId: string, answers: Record<string, string>, questionIds: string[]) {
        const questions = await this.prisma.question.findMany({
            where: { id: { in: questionIds } },
        });

        let correctCount = 0;
        let wrongCount = 0;
        let emptyCount = 0;

        for (let i = 0; i < questionIds.length; i++) {
            const question = questions.find((q) => q.id === questionIds[i]);
            const studentAnswer = answers[(i + 1).toString()];

            if (!studentAnswer) {
                emptyCount++;
            } else if (studentAnswer === question?.correctAnswer) {
                correctCount++;
            } else {
                wrongCount++;
            }
        }

        // Sonucu kaydet
        const result = await this.prisma.selfTestResult.create({
            data: {
                userId,
                topics: questionIds,
                answers,
                correctCount,
                wrongCount,
                emptyCount,
            },
        });

        return {
            ...result,
            netScore: correctCount - (wrongCount * 0.25),
        };
    }
}
