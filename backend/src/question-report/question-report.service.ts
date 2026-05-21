import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionReportDto, UpdateQuestionReportStatusDto } from './dto';

@Injectable()
export class QuestionReportService {
    constructor(private prisma: PrismaService) {}

    async create(userId: string, tenantId: string | null, dto: CreateQuestionReportDto) {
        return this.prisma.questionReport.create({
            data: {
                content: dto.content,
                questionId: dto.questionId,
                userId,
                tenantId,
            },
        });
    }

    async findAll(tenantScope?: string | null) {
        const where: any = {};
        
        // Tenant izolasyonu
        if (tenantScope) {
            where.tenantId = tenantScope;
        }

        return this.prisma.questionReport.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                question: {
                    select: {
                        id: true,
                        content: true,
                        pastExamName: true,
                        pastExamYear: true,
                        isPastQuestion: true,
                    }
                },
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    }
                }
            }
        });
    }

    async updateStatus(id: string, dto: UpdateQuestionReportStatusDto, tenantScope?: string | null) {
        const where: any = { id };
        if (tenantScope) {
            where.tenantId = tenantScope;
        }

        const report = await this.prisma.questionReport.findUnique({ where });
        if (!report) {
            throw new NotFoundException('Soru bildirimi bulunamadı');
        }

        return this.prisma.questionReport.update({
            where: { id },
            data: { status: dto.status },
        });
    }

    async remove(id: string, tenantScope?: string | null) {
        const where: any = { id };
        if (tenantScope) {
            where.tenantId = tenantScope;
        }

        const report = await this.prisma.questionReport.findUnique({ where });
        if (!report) {
            throw new NotFoundException('Soru bildirimi bulunamadı');
        }

        return this.prisma.questionReport.delete({
            where: { id },
        });
    }
}
