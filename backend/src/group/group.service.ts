import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto, UpdateGroupDto, AssignStudentsDto, AssignContentDto } from './dto';

@Injectable()
export class GroupService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateGroupDto) {
        // Check if code already exists
        const existing = await this.prisma.group.findUnique({ where: { code: dto.code } });
        if (existing) {
            throw new ConflictException('Bu kod ile bir grup zaten mevcut');
        }

        return this.prisma.group.create({
            data: dto,
            include: {
                tenant: true,
                _count: {
                    select: {
                        students: true,
                        examAreas: true,
                        exams: true,
                        questions: true,
                        pdfs: true,
                    },
                },
            },
        });
    }

    async findAll(tenantId?: string, tenantScope?: string | null) {
        const where: any = {};
        // tenantScope varsa zorla uygula (SUPER_ADMIN hariç)
        if (tenantScope) {
            where.tenantId = tenantScope;
        } else if (tenantId) {
            where.tenantId = tenantId;
        }

        return this.prisma.group.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                tenant: { select: { id: true, name: true } },
                _count: {
                    select: {
                        students: true,
                        examAreas: true,
                        exams: true,
                        questions: true,
                        pdfs: true,
                    },
                },
            },
        });
    }

    async findOne(id: string) {
        const group = await this.prisma.group.findUnique({
            where: { id },
            include: {
                tenant: true,
                parent: { select: { id: true, name: true } },
                children: { select: { id: true, name: true, type: true } },
                students: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                exams: {
                    select: { id: true, title: true, type: true, status: true },
                },
                questions: {
                    select: { id: true, content: true, difficulty: true },
                    take: 20,
                },
                pdfs: {
                    select: { id: true, title: true, fileName: true },
                },
                lessons: {
                    select: { id: true, name: true, code: true },
                },
                _count: {
                    select: {
                        students: true,
                        examAreas: true,
                        exams: true,
                        questions: true,
                        pdfs: true,
                    },
                },
            },
        });

        if (!group) {
            throw new NotFoundException('Grup bulunamadı');
        }

        return group;
    }

    async update(id: string, dto: UpdateGroupDto) {
        await this.findOne(id); // Check exists

        if (dto.code) {
            const existing = await this.prisma.group.findFirst({
                where: { code: dto.code, NOT: { id } },
            });
            if (existing) {
                throw new ConflictException('Bu kod başka bir grup tarafından kullanılıyor');
            }
        }

        return this.prisma.group.update({
            where: { id },
            data: dto,
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        await this.prisma.group.delete({ where: { id } });
        return { message: 'Grup silindi' };
    }

    // ==================== STUDENT ASSIGNMENT ====================
    async assignStudents(groupId: string, dto: AssignStudentsDto) {
        await this.findOne(groupId);

        await this.prisma.group.update({
            where: { id: groupId },
            data: {
                students: {
                    connect: dto.userIds.map(id => ({ id })),
                },
            },
        });

        return { message: `${dto.userIds.length} öğrenci gruba eklendi` };
    }

    async removeStudents(groupId: string, dto: AssignStudentsDto) {
        await this.findOne(groupId);

        await this.prisma.group.update({
            where: { id: groupId },
            data: {
                students: {
                    disconnect: dto.userIds.map(id => ({ id })),
                },
            },
        });

        return { message: `${dto.userIds.length} öğrenci gruptan çıkarıldı` };
    }

    async getStudents(groupId: string) {
        const group = await this.prisma.group.findUnique({
            where: { id: groupId },
            include: {
                students: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                        isActive: true,
                    },
                },
            },
        });

        if (!group) throw new NotFoundException('Grup bulunamadı');
        return group.students;
    }

    // ==================== CONTENT ASSIGNMENT ====================
    async assignContent(groupId: string, dto: AssignContentDto) {
        await this.findOne(groupId);

        const data: any = {};

        if (dto.examIds?.length) {
            data.exams = { connect: dto.examIds.map(id => ({ id })) };
        }
        if (dto.questionIds?.length) {
            data.questions = { connect: dto.questionIds.map(id => ({ id })) };
        }
        if (dto.pdfIds?.length) {
            data.pdfs = { connect: dto.pdfIds.map(id => ({ id })) };
        }
        if (dto.lessonIds?.length) {
            data.lessons = { connect: dto.lessonIds.map(id => ({ id })) };
        }

        await this.prisma.group.update({
            where: { id: groupId },
            data,
        });

        return { message: 'İçerik gruba atandı' };
    }

    async removeContent(groupId: string, dto: AssignContentDto) {
        await this.findOne(groupId);

        const data: any = {};

        if (dto.examIds?.length) {
            data.exams = { disconnect: dto.examIds.map(id => ({ id })) };
        }
        if (dto.questionIds?.length) {
            data.questions = { disconnect: dto.questionIds.map(id => ({ id })) };
        }
        if (dto.pdfIds?.length) {
            data.pdfs = { disconnect: dto.pdfIds.map(id => ({ id })) };
        }
        if (dto.lessonIds?.length) {
            data.lessons = { disconnect: dto.lessonIds.map(id => ({ id })) };
        }

        await this.prisma.group.update({
            where: { id: groupId },
            data,
        });

        return { message: 'İçerik gruptan çıkarıldı' };
    }

    // Get exams for a group (with filtering for students and parent inheritance)
    async getExams(groupId: string) {
        const group = await this.prisma.group.findUnique({
            where: { id: groupId },
            include: {
                exams: {
                    where: { isActive: true },
                    orderBy: { createdAt: 'desc' },
                },
                parent: {
                    include: {
                        exams: {
                            where: { isActive: true },
                            orderBy: { createdAt: 'desc' },
                        }
                    }
                }
            },
        });

        if (!group) throw new NotFoundException('Grup bulunamadı');

        const allExams = [...group.exams];
        if (group.parent && group.parent.exams) {
            for (const pExam of group.parent.exams) {
                if (!allExams.find(e => e.id === pExam.id)) {
                    allExams.push(pExam);
                }
            }
        }

        return allExams;
    }
}
