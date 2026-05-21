import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateTenantDto) {
        // Slug kontrolü
        const existing = await this.prisma.tenant.findUnique({
            where: { slug: dto.slug },
        });

        if (existing) {
            throw new ConflictException('Bu kurum kodu zaten kullanılıyor');
        }

        return this.prisma.tenant.create({
            data: dto,
        });
    }

    async findAll(params: {
        isActive?: boolean;
        search?: string;
        skip?: number;
        take?: number;
    }) {
        const { isActive, search, skip = 0, take = 50 } = params;

        const where: any = {};

        if (typeof isActive === 'boolean') {
            where.isActive = isActive;
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [tenants, total] = await Promise.all([
            this.prisma.tenant.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: {
                            users: true,
                            classes: true,
                            exams: true,
                        },
                    },
                },
            }),
            this.prisma.tenant.count({ where }),
        ]);

        return {
            data: tenants,
            meta: {
                total,
                skip,
                take,
                hasMore: skip + take < total,
            },
        };
    }

    async findOne(id: string) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        users: true,
                        classes: true,
                        exams: true,
                    },
                },
                classes: {
                    select: {
                        id: true,
                        name: true,
                        grade: true,
                        _count: {
                            select: { students: true },
                        },
                    },
                },
            },
        });

        if (!tenant) {
            throw new NotFoundException('Kurum bulunamadı');
        }

        return tenant;
    }

    async findBySlug(slug: string) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { slug },
        });

        if (!tenant) {
            throw new NotFoundException('Kurum bulunamadı');
        }

        return tenant;
    }

    async update(id: string, dto: UpdateTenantDto) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id } });

        if (!tenant) {
            throw new NotFoundException('Kurum bulunamadı');
        }

        // Slug değişiyorsa uniqueness kontrolü
        if (dto.slug && dto.slug !== tenant.slug) {
            const existing = await this.prisma.tenant.findUnique({
                where: { slug: dto.slug },
            });
            if (existing) {
                throw new ConflictException('Bu kurum kodu zaten kullanılıyor');
            }
        }

        return this.prisma.tenant.update({
            where: { id },
            data: dto,
        });
    }

    async remove(id: string) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id } });

        if (!tenant) {
            throw new NotFoundException('Kurum bulunamadı');
        }

        await this.prisma.tenant.delete({ where: { id } });

        return { message: 'Kurum başarıyla silindi' };
    }

    async deactivate(id: string) {
        return this.prisma.tenant.update({
            where: { id },
            data: { isActive: false },
        });
    }

    async activate(id: string) {
        return this.prisma.tenant.update({
            where: { id },
            data: { isActive: true },
        });
    }

    async getStats(id: string) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        users: true,
                        classes: true,
                        exams: true,
                    },
                },
            },
        });

        if (!tenant) {
            throw new NotFoundException('Kurum bulunamadı');
        }

        // Rol bazlı kullanıcı sayıları
        const usersByRole = await this.prisma.user.groupBy({
            by: ['role'],
            where: { tenantId: id },
            _count: { role: true },
        });

        return {
            tenantId: id,
            name: tenant.name,
            totalUsers: tenant._count.users,
            totalClasses: tenant._count.classes,
            totalExams: tenant._count.exams,
            usersByRole: usersByRole.map((r) => ({
                role: r.role,
                count: r._count.role,
            })),
        };
    }
}
