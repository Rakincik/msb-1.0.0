import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePdfDocumentDto, UpdatePdfDocumentDto, SaveAnnotationDto } from './dto';

@Injectable()
export class PdfService {
    constructor(private readonly prisma: PrismaService) { }

    // ==========================================
    // PDF DOKÜMAN İŞLEMLERİ
    // ==========================================

    async create(dto: CreatePdfDocumentDto, createdById?: string) {
        return this.prisma.pDFDocument.create({
            data: {
                ...dto,
                createdById,
            },
        });
    }

    async findAll(params: {
        search?: string;
        skip?: number;
        take?: number;
        tenantScope?: string | null;
    }) {
        const { search, skip = 0, take = 50, tenantScope } = params;

        const where: any = { isActive: true };

        if (search) {
            where.title = { contains: search, mode: 'insensitive' };
        }

        // Tenant izolasyonu — Global PDF'ler (null) ve kurumun kendi PDF'leri
        if (tenantScope) {
            where.OR = [
                { tenantId: null },
                { tenantId: tenantScope }
            ];
        }

        const [documents, total] = await Promise.all([
            this.prisma.pDFDocument.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    createdBy: {
                        select: { id: true, firstName: true, lastName: true },
                    },
                    _count: {
                        select: { exams: true, annotations: true },
                    },
                },
            }),
            this.prisma.pDFDocument.count({ where }),
        ]);

        return {
            data: documents,
            meta: { total, skip, take, hasMore: skip + take < total },
        };
    }

    async findOne(id: string) {
        const document = await this.prisma.pDFDocument.findUnique({
            where: { id },
            include: {
                exams: {
                    select: { id: true, title: true, status: true },
                },
            },
        });

        if (!document) {
            throw new NotFoundException('PDF doküman bulunamadı');
        }

        return document;
    }

    async update(id: string, dto: UpdatePdfDocumentDto) {
        return this.prisma.pDFDocument.update({
            where: { id },
            data: dto,
        });
    }

    async remove(id: string) {
        await this.prisma.pDFDocument.delete({ where: { id } });
        return { message: 'PDF doküman silindi' };
    }

    async setAnswerKey(id: string, answerKey: Record<string, string>) {
        return this.prisma.pDFDocument.update({
            where: { id },
            data: { answerKey },
        });
    }

    // ==========================================
    // ANNOTATION (ÇİZİM) İŞLEMLERİ
    // ==========================================

    async saveAnnotation(dto: SaveAnnotationDto, userId: string) {
        // Mevcut annotation varsa güncelle, yoksa oluştur
        const existing = await this.prisma.pDFAnnotation.findUnique({
            where: {
                userId_pdfDocumentId_pageNumber: {
                    userId,
                    pdfDocumentId: dto.pdfDocumentId,
                    pageNumber: dto.pageNumber,
                },
            },
        });

        if (existing) {
            return this.prisma.pDFAnnotation.update({
                where: { id: existing.id },
                data: { data: dto.data },
            });
        }

        return this.prisma.pDFAnnotation.create({
            data: {
                userId,
                pdfDocumentId: dto.pdfDocumentId,
                pageNumber: dto.pageNumber,
                data: dto.data,
            },
        });
    }

    async getAnnotations(pdfDocumentId: string, userId: string) {
        const annotations = await this.prisma.pDFAnnotation.findMany({
            where: {
                pdfDocumentId,
                userId,
            },
            orderBy: { pageNumber: 'asc' },
        });

        // Sayfa numarasına göre map oluştur
        const annotationMap: Record<number, any> = {};
        for (const annotation of annotations) {
            annotationMap[annotation.pageNumber] = annotation.data;
        }

        return annotationMap;
    }

    async getAnnotationByPage(pdfDocumentId: string, userId: string, pageNumber: number) {
        const annotation = await this.prisma.pDFAnnotation.findUnique({
            where: {
                userId_pdfDocumentId_pageNumber: {
                    userId,
                    pdfDocumentId,
                    pageNumber,
                },
            },
        });

        return annotation?.data || null;
    }

    async deleteAnnotation(pdfDocumentId: string, userId: string, pageNumber: number) {
        await this.prisma.pDFAnnotation.deleteMany({
            where: {
                pdfDocumentId,
                userId,
                pageNumber,
            },
        });

        return { message: 'Çizimler silindi' };
    }

    async deleteAllAnnotations(pdfDocumentId: string, userId: string) {
        await this.prisma.pDFAnnotation.deleteMany({
            where: {
                pdfDocumentId,
                userId,
            },
        });

        return { message: 'Tüm çizimler silindi' };
    }

    // ==========================================
    // WATERMARK
    // ==========================================

    generateWatermarkData(user: { firstName: string; lastName: string; tcNo?: string }) {
        const name = `${user.firstName} ${user.lastName}`;
        const tcNo = user.tcNo ? user.tcNo.slice(-4) : '';

        return {
            text: tcNo ? `${name} - ***${tcNo}` : name,
            opacity: 0.1,
            fontSize: 14,
            rotation: -45,
        };
    }
}
