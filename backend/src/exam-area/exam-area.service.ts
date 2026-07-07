import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamAreaDto, UpdateExamAreaDto } from './dto/exam-area.dto';
import { Role } from '@prisma/client';

@Injectable()
export class ExamAreaService {
    constructor(private prisma: PrismaService) { }

    async findStudentAreas(userId: string, role: string, tenantId?: string | null) {
        // Admins and Teachers see all active areas (or even inactive if we wanted, but let's say active for "student view" preview)
        if (role === Role.ADMIN || role === Role.SUPER_ADMIN || role === Role.TEACHER) {
            return this.findAll(true, tenantId);
        }

        return this.prisma.examArea.findMany({
            where: {
                isActive: true,
                OR: [
                    { students: { some: { id: userId } } }, // Doğrudan öğrenciye atanmış olanlar (Örn: bireysel satın alım)
                    { groups: { some: { students: { some: { id: userId } } } } } // Öğrencinin üye olduğu gruba atanmış olanlar
                ]
            },
            orderBy: { order: 'asc' },
            include: {
                _count: {
                    select: {
                        lessons: true,
                        exams: true,
                        students: true,
                        examAreaQuestions: true,
                    },
                },
            },
        });
    }

    async create(data: CreateExamAreaDto) {
        const { lessonIds, groupIds, ...examAreaData } = data;
        // Generate slug from name if not provided
        const slug = data.slug || this.generateSlug(data.name);

        return this.prisma.examArea.create({
            data: {
                ...examAreaData,
                slug,
                lessons: lessonIds?.length ? {
                    connect: lessonIds.map(id => ({ id }))
                } : undefined,
                groups: groupIds?.length ? {
                    connect: groupIds.map(id => ({ id }))
                } : undefined,
            },
            include: {
                _count: {
                    select: {
                        lessons: true,
                        exams: true,
                        students: true,
                    },
                },
            },
        });
    }

    async findAll(includeInactive = false, tenantId?: string | null) {
        const where: any = includeInactive ? {} : { isActive: true };

        if (tenantId) {
            where.OR = [
                { tenantId: null },
                { tenantId }
            ];
        } else if (tenantId === null) {
            // SUPER_ADMIN (tenantId is explicitly null from TenantScope)
            // Can see all exam areas, so we don't add a tenantId filter
        }

        return this.prisma.examArea.findMany({
            where,
            orderBy: { order: 'asc' },
            include: {
                lessons: {
                    select: { id: true }
                },
                groups: {
                    select: { id: true }
                },
                _count: {
                    select: {
                        lessons: true,
                        exams: true,
                        students: true,
                    },
                },
            },
        });
    }

    async findOne(id: string) {
        const examArea = await this.prisma.examArea.findUnique({
            where: { id },
            include: {
                lessons: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                groups: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                students: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                _count: {
                    select: {
                        lessons: true,
                        exams: true,
                        students: true,
                    },
                },
            },
        });

        if (!examArea) {
            throw new NotFoundException('Sınav alanı bulunamadı');
        }

        return examArea;
    }

    async findBySlug(slug: string) {
        const examArea = await this.prisma.examArea.findUnique({
            where: { slug },
            include: {
                lessons: {
                    where: { isActive: true },
                    orderBy: { order: 'asc' },
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
                                        }
                                    }
                                },
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        exams: true,
                    },
                },
            },
        });

        if (!examArea) {
            throw new NotFoundException('Sınav alanı bulunamadı');
        }

        return examArea;
    }

    async update(id: string, data: UpdateExamAreaDto) {
        const { lessonIds, groupIds, ...examAreaData } = data;
        await this.findOne(id); // Check if exists

        return this.prisma.examArea.update({
            where: { id },
            data: {
                ...examAreaData,
                lessons: lessonIds ? {
                    set: lessonIds.map(id => ({ id }))
                } : undefined,
                groups: groupIds ? {
                    set: groupIds.map(id => ({ id }))
                } : undefined,
            },
            include: {
                _count: {
                    select: {
                        lessons: true,
                        exams: true,
                        students: true,
                        examAreaQuestions: true,
                    },
                },
            },
        });
    }

    async remove(id: string) {
        await this.findOne(id); // Check if exists

        return this.prisma.examArea.delete({
            where: { id },
        });
    }

    async addLesson(examAreaId: string, lessonId: string) {
        return this.prisma.examArea.update({
            where: { id: examAreaId },
            data: {
                lessons: {
                    connect: { id: lessonId },
                },
            },
        });
    }

    async removeLesson(examAreaId: string, lessonId: string) {
        return this.prisma.examArea.update({
            where: { id: examAreaId },
            data: {
                lessons: {
                    disconnect: { id: lessonId },
                },
            },
        });
    }

    async reorder(items: { id: string; order: number }[]) {
        const updates = items.map(item =>
            this.prisma.examArea.update({
                where: { id: item.id },
                data: { order: item.order },
            })
        );

        await this.prisma.$transaction(updates);
        return { success: true };
    }

    async getQuestions(examAreaId: string) {
        const relations = await this.prisma.examAreaQuestion.findMany({
            where: { examAreaId },
            orderBy: { orderNumber: 'asc' },
            include: {
                question: {
                    include: {
                        topics: { select: { id: true, name: true } },
                    }
                }
            }
        });
        // Sadece soru objelerini dön, orderNumber sıralı olarak
        return relations.map(r => r.question);
    }

    async reorderQuestions(examAreaId: string, items: { id: string; order: number }[]) {
        const updates = items.map(item =>
            this.prisma.examAreaQuestion.update({
                where: {
                    examAreaId_questionId: {
                        examAreaId: examAreaId,
                        questionId: item.id
                    }
                },
                data: { orderNumber: item.order },
            })
        );

        await this.prisma.$transaction(updates);
        return { success: true };
    }

    async addGroup(examAreaId: string, groupId: string) {
        return this.prisma.examArea.update({
            where: { id: examAreaId },
            data: {
                groups: {
                    connect: { id: groupId },
                },
            },
        });
    }

    async removeGroup(examAreaId: string, groupId: string) {
        return this.prisma.examArea.update({
            where: { id: examAreaId },
            data: {
                groups: {
                    disconnect: { id: groupId },
                },
            },
        });
    }

    async addStudent(examAreaId: string, studentId: string) {
        return this.prisma.examArea.update({
            where: { id: examAreaId },
            data: {
                students: {
                    connect: { id: studentId },
                },
            },
        });
    }

    async removeStudent(examAreaId: string, studentId: string) {
        return this.prisma.examArea.update({
            where: { id: examAreaId },
            data: {
                students: {
                    disconnect: { id: studentId },
                },
            },
        });
    }

    async removeQuestion(examAreaId: string, questionId: string) {
        return this.prisma.examAreaQuestion.delete({
            where: {
                examAreaId_questionId: {
                    examAreaId,
                    questionId,
                },
            },
        });
    }


    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
}
