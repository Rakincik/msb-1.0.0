import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto, UpdateQuestionDto, QuestionFilterDto } from './dto';
import { DifficultyLevel, QuestionType } from '@prisma/client';

@Injectable()
export class QuestionService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Arama için düz metin üretir — content, options ve explanation'dan birleşik
     */
    private generateSearchText(content: any, options: any, explanation?: any): string {
        const parts: string[] = [];

        if (content?.text) parts.push(content.text);
        if (options) {
            Object.values(options).forEach(v => {
                if (typeof v === 'string') parts.push(v);
            });
        }
        if (explanation?.text) parts.push(explanation.text);

        return parts.join(' ').substring(0, 2000); // Max 2000 karakter
    }

    async create(dto: CreateQuestionDto, createdById: string) {
        const { topicIds, examAreaIds, tenantId, ...rest } = dto;

        // Arama metni üret
        const searchText = this.generateSearchText(rest.content, rest.options, rest.explanation);

        return this.prisma.question.create({
            data: {
                ...rest,
                createdById,
                tenantId,
                searchText,
                topics: {
                    connect: topicIds.map((id) => ({ id })),
                },
                examAreaQuestions: {
                    create: examAreaIds?.map((id) => ({ examAreaId: id })) || [],
                },
            },
            include: {
                topics: {
                    include: {
                        unit: {
                            include: { lesson: true },
                        },
                    },
                },
                learningOutcome: true,
                createdBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
    }

    async findAll(filters: QuestionFilterDto & {
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        hasImage?: boolean;
        hasVideo?: boolean;
    }, tenantScope?: string | null) {
        const {
            topicId,
            unitId,
            lessonId,
            learningOutcomeId,
            difficulty,
            type,
            createdById,
            examAreaId,
            search,
            skip = 0,
            take = 50,
            sortBy,
            sortOrder = 'desc',
            hasImage,
            hasVideo,
            isPastQuestion,
            pastExamName,
            pastExamYear,
        } = filters;

        const where: any = { isActive: true, deletedAt: null };

        // Tenant izolasyonu — Global sorular (null) ve kurumun kendi soruları
        if (tenantScope) {
            where.OR = [
                { tenantId: null },
                { tenantId: tenantScope }
            ];
        }

        if (topicId) where.topics = { some: { id: topicId } };
        if (learningOutcomeId) where.learningOutcomeId = learningOutcomeId;
        if (difficulty) where.difficulty = difficulty;
        if (type) where.type = type;
        if (createdById) where.createdById = createdById;
        if (examAreaId) where.examAreaQuestions = { some: { examAreaId } };

        if (isPastQuestion !== undefined) where.isPastQuestion = isPastQuestion;
        if (pastExamName) where.pastExamName = pastExamName;
        if (pastExamYear) where.pastExamYear = pastExamYear;

        // Üst seviye filtreleme
        if (unitId) {
            where.topics = { some: { unitId } };
        }
        if (lessonId) {
            where.topics = { some: { unit: { lessonId } } };
        }

        // Media filtering
        if (hasImage === true) {
            where.AND = [...(where.AND || []), {
                content: { path: ['image'], not: null }
            }];
        }
        if (hasVideo === true) {
            where.videoSolution = { not: null };
        } else if (hasVideo === false) {
            where.videoSolution = null;
        }

        // Arama — kelime bazlı (her kelime ayrı aranır, AND mantığı)
        if (search) {
            const searchWords = search.trim().split(/\s+/).filter(w => w.length > 1);
            if (searchWords.length > 0) {
                where.AND = [
                    ...(where.AND || []),
                    ...searchWords.map(word => ({
                        searchText: { contains: word, mode: 'insensitive' as const }
                    }))
                ];
            }
        }

        // Dynamic sorting
        let orderBy: any = { createdAt: 'desc' };
        if (sortBy) {
            const order = sortOrder || 'desc';
            switch (sortBy) {
                case 'createdAt': orderBy = { createdAt: order }; break;
                case 'difficulty': orderBy = { difficulty: order }; break;
                case 'usageCount': orderBy = { usageCount: order }; break;
                default: orderBy = { createdAt: 'desc' };
            }
        }

        const [questions, total] = await Promise.all([
            this.prisma.question.findMany({
                where,
                skip,
                take,
                orderBy,
                include: {
                    topics: {
                        select: {
                            id: true,
                            name: true,
                            unit: {
                                select: {
                                    id: true,
                                    name: true,
                                    lesson: {
                                        select: { id: true, name: true, code: true },
                                    },
                                },
                            },
                        },
                    },
                    learningOutcome: {
                        select: { id: true, name: true, code: true },
                    },
                    createdBy: {
                        select: { id: true, firstName: true, lastName: true },
                    },
                },
            }),
            this.prisma.question.count({ where }),
        ]);

        return {
            data: questions,
            meta: {
                total,
                skip,
                take,
                hasMore: skip + take < total,
            },
        };
    }


    async findOne(id: string) {
        const question = await this.prisma.question.findUnique({
            where: { id },
            include: {
                topics: {
                    include: {
                        unit: {
                            include: { lesson: true },
                        },
                    },
                },
                learningOutcome: true,
                createdBy: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
            },
        });

        if (!question) {
            throw new NotFoundException('Soru bulunamadı');
        }

        return question;
    }

    async update(id: string, dto: UpdateQuestionDto) {
        const question = await this.prisma.question.findUnique({ where: { id } });

        if (!question) {
            throw new NotFoundException('Soru bulunamadı');
        }

        const { topicIds, examAreaIds, ...rest } = dto;

        const data: any = { ...rest };

        // Handle Prisma Json fields properly when null is passed to clear them
        if (data.explanation === null) {
            data.explanation = require('@prisma/client').Prisma.DbNull;
        }
        if (data.options === null) {
            data.options = require('@prisma/client').Prisma.DbNull;
        }
        if (data.content === null) {
            data.content = require('@prisma/client').Prisma.DbNull;
        }

        // Arama metnini güncelle (content, options veya explanation değiştiyse)
        const newContent = rest.content || question.content;
        const newOptions = rest.options || question.options;
        const newExplanation = rest.explanation || question.explanation;
        data.searchText = this.generateSearchText(newContent, newOptions, newExplanation);

        if (topicIds) {
            data.topics = { set: topicIds.map(id => ({ id })) };
        }

        if (examAreaIds) {
            data.examAreaQuestions = {
                deleteMany: {},
                create: examAreaIds.map(id => ({ examAreaId: id }))
            };
        }

        return this.prisma.question.update({
            where: { id },
            data,
            include: {
                topics: true,
                learningOutcome: true,
                examAreaQuestions: { include: { examArea: true } },
            },
        });
    }

    // Kalıcı silme
    async remove(id: string) {
        await this.prisma.question.delete({ where: { id } });
        return { message: 'Soru kalıcı olarak silindi' };
    }

    // Kalıcı silme (sadece admin için, dikkatle kullanılmalı)
    async hardRemove(id: string) {
        await this.prisma.question.delete({ where: { id } });
        return { message: 'Soru kalıcı olarak silindi' };
    }

    // Silinen soruyu geri getir
    async restore(id: string) {
        return this.prisma.question.update({
            where: { id },
            data: { deletedAt: null, isActive: true },
        });
    }

    async deactivate(id: string) {
        return this.prisma.question.update({
            where: { id },
            data: { isActive: false },
        });
    }

    // Rastgele sorular getir (Kendin Oluştur özelliği için)
    async getRandomQuestions(params: {
        topicIds?: string[];
        examAreaIds?: string[];
        count: number;
        difficulty?: DifficultyLevel;
        excludeIds?: string[];
    }) {
        const { topicIds, examAreaIds, count, difficulty, excludeIds = [] } = params;

        const where: any = {
            isActive: true,
            deletedAt: null,
        };

        if (topicIds && topicIds.length > 0) {
            where.topics = { some: { id: { in: topicIds } } };
        }

        if (examAreaIds && examAreaIds.length > 0) {
            where.examAreaQuestions = { some: { examAreaId: { in: examAreaIds } } };
        }

        if (difficulty) {
            where.difficulty = difficulty;
        }

        if (excludeIds.length > 0) {
            where.id = { notIn: excludeIds };
        }

        // Toplam soru sayısını al
        const totalQuestions = await this.prisma.question.count({ where });
        const actualCount = Math.min(count, totalQuestions);

        // Rastgele soruları getir
        const questions = await this.prisma.question.findMany({
            where,
            take: actualCount,
            orderBy: {
                // Prisma'da gerçek random yok, bu yüzden createdAt ile karıştırıyoruz
                createdAt: 'desc',
            },
            include: {
                topics: {
                    select: { id: true, name: true },
                },
            },
        });

        // Fisher-Yates shuffle
        for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
        }

        return questions.slice(0, count);
    }

    // Konu bazlı istatistikler
    async getQuestionStats(topicIds?: string[]) {
        const where: any = { isActive: true, deletedAt: null };

        if (topicIds && topicIds.length > 0) {
            where.topics = { some: { id: { in: topicIds } } };
        }

        const stats = await this.prisma.question.groupBy({
            by: ['difficulty'],
            where,
            _count: { id: true },
        });

        return {
            byDifficulty: stats,
        };
    }

    // Kullanım sayısını artır
    async incrementUsageCount(questionIds: string[]) {
        await this.prisma.question.updateMany({
            where: { id: { in: questionIds } },
            data: {
                usageCount: { increment: 1 },
            },
        });
    }

    // Toplu soru oluşturma (Excel/CSV import için)
    async bulkCreate(questions: CreateQuestionDto[], createdById: string) {
        const results = [];
        for (const q of questions) {
            const result = await this.create(q, createdById);
            results.push(result);
        }

        return {
            created: results.length,
            message: `${results.length} soru başarıyla oluşturuldu`,
        };
    }

    async bulkAddToExamAreas(questionIds: string[], examAreaIds: string[]) {
        const updates = questionIds.map((id) =>
            this.prisma.question.update({
                where: { id },
                data: {
                    examAreaQuestions: {
                        createMany: {
                            data: examAreaIds.map((areaId) => ({ examAreaId: areaId })),
                            skipDuplicates: true,
                        },
                    },
                },
            }),
        );
        return this.prisma.$transaction(updates);
    }
}
