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
        const { examAreaIds, ...lessonData } = dto;
        // Code uniqueness kontrolü (tenant bazlı)
        const existing = await this.prisma.lesson.findFirst({
            where: { code: dto.code, tenantId: dto.tenantId || null },
        });

        if (existing) {
            throw new ConflictException('Bu ders kodu zaten kullanılıyor');
        }

        return this.prisma.lesson.create({
            data: {
                ...lessonData,
                examAreas: examAreaIds?.length ? {
                    connect: examAreaIds.map(id => ({ id }))
                } : undefined,
            },
            include: { units: true, examAreas: { select: { id: true, name: true, color: true } } },
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
                examAreas: {
                    select: { id: true, name: true, color: true }
                },
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
                examAreas: {
                    select: { id: true, name: true, color: true }
                },
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
        const { examAreaIds, ...lessonData } = dto;
        const lesson = await this.prisma.lesson.findUnique({ where: { id } });

        if (!lesson) {
            throw new NotFoundException('Ders bulunamadı');
        }

        return this.prisma.lesson.update({
            where: { id },
            data: {
                ...lessonData,
                examAreas: examAreaIds ? {
                    set: examAreaIds.map(id => ({ id }))
                } : undefined,
            },
            include: { examAreas: { select: { id: true, name: true, color: true } } },
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

    async bulkImportToLesson(lessonId: string, items: { unitName: string; topicName: string }[]) {
        const lesson = await this.prisma.lesson.findUnique({
            where: { id: lessonId },
        });

        if (!lesson) {
            throw new NotFoundException('Ders bulunamadı');
        }

        // 1. Derse ait tüm mevcut üniteleri ve altındaki konuları çek
        const existingUnits = await this.prisma.unit.findMany({
            where: { lessonId },
            include: { topics: true },
        });

        // Ünite isimlerini hızlı arama için eşleme tablosuna (map) al
        const existingUnitsMap = new Map<string, typeof existingUnits[0]>();
        for (const unit of existingUnits) {
            existingUnitsMap.set(unit.name.trim().toLowerCase(), unit);
        }

        // Mevcut en büyük ünite sırasını bul
        let maxUnitOrder = existingUnits.reduce((max, u) => Math.max(max, u.order || 0), -1);

        // 2. Gelen verileri filtrele ve temizle
        const validItems = items
            .map(item => ({
                unitName: item.unitName?.trim() || '',
                topicName: item.topicName?.trim() || '',
            }))
            .filter(item => item.unitName !== '' && item.topicName !== '');

        // 3. Yeni üniteleri tespit et ve sırayla oluştur (ID'leri elde etmek için)
        const newUnitNames = Array.from(
            new Set(
                validItems
                    .map(item => item.unitName)
                    .filter(name => !existingUnitsMap.has(name.toLowerCase()))
            )
        );

        for (const name of newUnitNames) {
            maxUnitOrder++;
            const newUnit = await this.prisma.unit.create({
                data: {
                    name,
                    lessonId,
                    order: maxUnitOrder,
                    isActive: true,
                },
                include: { topics: true },
            });
            existingUnitsMap.set(name.toLowerCase(), newUnit);
        }

        // 4. Konu sırasını takip etmek ve mükerrer kontrolü için map/set yapılarını kur
        const maxTopicOrderMap = new Map<string, number>(); // unitId -> maxOrder
        const existingTopicsSet = new Set<string>(); // "unitId:topicname_lowercase" -> boolean

        for (const [_, unit] of existingUnitsMap) {
            const maxOrder = unit.topics.reduce((max, t) => Math.max(max, t.order || 0), -1);
            maxTopicOrderMap.set(unit.id, maxOrder);

            for (const topic of unit.topics) {
                existingTopicsSet.add(`${unit.id}:${topic.name.trim().toLowerCase()}`);
            }
        }

        // 5. Yeni konuları belirle
        const newTopicsToCreate: { name: string; unitId: string; order: number }[] = [];
        const processedInSession = new Set<string>(); // "unitId:topicname_lowercase"

        for (const item of validItems) {
            const unit = existingUnitsMap.get(item.unitName.toLowerCase());
            if (!unit) continue;

            const topicKey = `${unit.id}:${item.topicName.toLowerCase()}`;
            if (!existingTopicsSet.has(topicKey) && !processedInSession.has(topicKey)) {
                processedInSession.add(topicKey);

                let currentMaxOrder = maxTopicOrderMap.get(unit.id) ?? -1;
                currentMaxOrder++;
                maxTopicOrderMap.set(unit.id, currentMaxOrder);

                newTopicsToCreate.push({
                    name: item.topicName,
                    unitId: unit.id,
                    order: currentMaxOrder,
                });
            }
        }

        // 6. Yeni konuları tek seferde topluca ekle
        if (newTopicsToCreate.length > 0) {
            await this.prisma.topic.createMany({
                data: newTopicsToCreate.map(t => ({
                    name: t.name,
                    unitId: t.unitId,
                    order: t.order,
                    isActive: true,
                })),
            });
        }

        return {
            success: true,
            unitsCreated: newUnitNames.length,
            topicsCreated: newTopicsToCreate.length,
            totalProcessed: validItems.length,
        };
    }
}

