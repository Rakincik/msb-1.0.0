import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    CreateLessonDto,
    UpdateLessonDto,
    CreateUnitDto,
    UpdateUnitDto,
    CreateTopicDto,
    UpdateTopicDto,
    CreateLearningOutcomeDto,
    UpdateLearningOutcomeDto,
} from './dto';

@Injectable()
export class ContentService {
    constructor(private readonly prisma: PrismaService) { }

    // ==========================================
    // DERS (LESSON) İŞLEMLERİ
    // ==========================================

    async createLesson(dto: CreateLessonDto) {
        // Code uniqueness kontrolü (tenant bazlı)
        const existing = await this.prisma.lesson.findFirst({
            where: { code: dto.code, tenantId: dto.tenantId || null },
        });

        if (existing) {
            throw new ConflictException('Bu ders kodu zaten kullanılıyor');
        }

        return this.prisma.lesson.create({
            data: dto,
            include: { units: true },
        });
    }

    async findAllLessons(tenantId?: string) {
        return this.prisma.lesson.findMany({
            where: {
                OR: [
                    { tenantId: null }, // Global dersler
                    { tenantId }, // Tenant özel dersler
                ],
                isActive: true,
            },
            orderBy: { order: 'asc' },
            include: {
                units: {
                    where: { isActive: true },
                    orderBy: { order: 'asc' },
                    include: {
                        topics: {
                            where: { isActive: true },
                            orderBy: { order: 'asc' },
                        },
                    },
                },
                _count: {
                    select: { units: true },
                },
            },
        });
    }

    async findOneLesson(id: string) {
        const lesson = await this.prisma.lesson.findUnique({
            where: { id },
            include: {
                units: {
                    where: { isActive: true },
                    orderBy: { order: 'asc' },
                    include: {
                        topics: {
                            where: { isActive: true },
                            orderBy: { order: 'asc' },
                            include: {
                                learningOutcomes: {
                                    where: { isActive: true },
                                    orderBy: { order: 'asc' },
                                },
                                _count: {
                                    select: { questions: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!lesson) {
            throw new NotFoundException('Ders bulunamadı');
        }

        return lesson;
    }

    async updateLesson(id: string, dto: UpdateLessonDto) {
        const lesson = await this.prisma.lesson.findUnique({ where: { id } });

        if (!lesson) {
            throw new NotFoundException('Ders bulunamadı');
        }

        return this.prisma.lesson.update({
            where: { id },
            data: dto,
        });
    }

    async removeLesson(id: string) {
        await this.prisma.lesson.delete({ where: { id } });
        return { message: 'Ders silindi' };
    }

    // ==========================================
    // ÜNİTE (UNIT) İŞLEMLERİ
    // ==========================================

    async createUnit(dto: CreateUnitDto) {
        return this.prisma.unit.create({
            data: dto,
            include: { lesson: true },
        });
    }

    async findAllUnits(lessonId: string) {
        return this.prisma.unit.findMany({
            where: { lessonId, isActive: true },
            orderBy: { order: 'asc' },
            include: {
                topics: {
                    where: { isActive: true },
                    orderBy: { order: 'asc' },
                },
                _count: {
                    select: { topics: true },
                },
            },
        });
    }

    async findOneUnit(id: string) {
        const unit = await this.prisma.unit.findUnique({
            where: { id },
            include: {
                lesson: true,
                topics: {
                    where: { isActive: true },
                    orderBy: { order: 'asc' },
                    include: {
                        learningOutcomes: true,
                        _count: { select: { questions: true } },
                    },
                },
            },
        });

        if (!unit) {
            throw new NotFoundException('Ünite bulunamadı');
        }

        return unit;
    }

    async updateUnit(id: string, dto: UpdateUnitDto) {
        return this.prisma.unit.update({
            where: { id },
            data: dto,
        });
    }

    async removeUnit(id: string) {
        await this.prisma.unit.delete({ where: { id } });
        return { message: 'Ünite silindi' };
    }

    // ==========================================
    // KONU (TOPIC) İŞLEMLERİ
    // ==========================================

    async createTopic(dto: CreateTopicDto) {
        return this.prisma.topic.create({
            data: dto,
            include: { unit: { include: { lesson: true } } },
        });
    }

    async findAllTopics(unitId: string) {
        return this.prisma.topic.findMany({
            where: { unitId, isActive: true },
            orderBy: { order: 'asc' },
            include: {
                learningOutcomes: {
                    where: { isActive: true },
                    orderBy: { order: 'asc' },
                },
                _count: {
                    select: { questions: true, learningOutcomes: true },
                },
            },
        });
    }

    async findOneTopic(id: string) {
        const topic = await this.prisma.topic.findUnique({
            where: { id },
            include: {
                unit: { include: { lesson: true } },
                learningOutcomes: {
                    where: { isActive: true },
                    orderBy: { order: 'asc' },
                },
                _count: { select: { questions: true } },
            },
        });

        if (!topic) {
            throw new NotFoundException('Konu bulunamadı');
        }

        return topic;
    }

    async updateTopic(id: string, dto: UpdateTopicDto) {
        return this.prisma.topic.update({
            where: { id },
            data: dto,
        });
    }

    async removeTopic(id: string) {
        await this.prisma.topic.delete({ where: { id } });
        return { message: 'Konu silindi' };
    }

    // ==========================================
    // KAZANIM (LEARNING OUTCOME) İŞLEMLERİ
    // ==========================================

    async createLearningOutcome(dto: CreateLearningOutcomeDto) {
        return this.prisma.learningOutcome.create({
            data: dto,
            include: { topic: true },
        });
    }

    async findAllLearningOutcomes(topicId?: string, lessonId?: string) {
        const where: any = { isActive: true };
        
        if (topicId) {
            where.topicId = topicId;
        } else if (lessonId) {
            where.topic = { unit: { lessonId } };
        }

        return this.prisma.learningOutcome.findMany({
            where,
            orderBy: { order: 'asc' },
            include: {
                topic: { select: { id: true, name: true } },
                _count: { select: { questions: true } },
            },
        });
    }

    async updateLearningOutcome(id: string, dto: UpdateLearningOutcomeDto) {
        return this.prisma.learningOutcome.update({
            where: { id },
            data: dto,
        });
    }

    async removeLearningOutcome(id: string) {
        await this.prisma.learningOutcome.delete({ where: { id } });
        return { message: 'Kazanım silindi' };
    }

    // ==========================================
    // AĞAÇ GÖRÜNÜMÜ
    // ==========================================

    async getContentTree(tenantId?: string) {
        const lessons = await this.prisma.lesson.findMany({
            where: {
                OR: [{ tenantId: null }, { tenantId }],
                isActive: true,
            },
            orderBy: { order: 'asc' },
            select: {
                id: true,
                name: true,
                code: true,
                units: {
                    where: { isActive: true },
                    orderBy: { order: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        topics: {
                            where: { isActive: true },
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                name: true,
                                _count: { select: { questions: true } },
                            },
                        },
                    },
                },
            },
        });

        return lessons;
    }
}
