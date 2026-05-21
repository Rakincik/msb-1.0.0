import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as xlsx from 'xlsx';

// Rol hiyerarşisi: Her rol sadece altındaki rolleri oluşturabilir
const ROLE_HIERARCHY: Record<Role, Role[]> = {
    [Role.SUPER_ADMIN]: [Role.ADMIN, Role.TEACHER, Role.STUDENT],
    [Role.ADMIN]: [Role.TEACHER, Role.STUDENT],
    [Role.TEACHER]: [Role.STUDENT],
    [Role.STUDENT]: [],
};

@Injectable()
export class UserService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateUserDto, creatorRole?: Role, creatorTenantId?: string) {
        // Rol hiyerarşi kontrolü
        if (creatorRole) {
            const allowedRoles = ROLE_HIERARCHY[creatorRole] || [];
            if (!allowedRoles.includes(dto.role)) {
                throw new ForbiddenException(
                    `${creatorRole} rolü, ${dto.role} rolünde kullanıcı oluşturamaz`
                );
            }
        }

        // SUPER_ADMIN hariç herkes kendi tenant'ında oluşturmalı
        if (creatorRole && creatorRole !== Role.SUPER_ADMIN) {
            if (!creatorTenantId) {
                throw new ForbiddenException('Tenant bilgisi bulunamadı');
            }
            dto.tenantId = creatorTenantId; // Zorla kendi tenant'ını ata
        }

        // Email kontrolü
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existing) {
            throw new ConflictException('Bu email adresi zaten kullanılıyor');
        }

        // Şifre hashleme iptal edildi (Hobi projesi)
        const password = dto.password;

        return this.prisma.user.create({
            data: {
                ...dto,
                password: password,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                tenantId: true,
                classId: true,
                isActive: true,
                createdAt: true,
            },
        });
    }

    async bulkUploadUsers(fileBuffer: Buffer, creatorRole: Role, creatorTenantId?: string) {
        if (creatorRole !== Role.SUPER_ADMIN && !creatorTenantId) {
            throw new ForbiddenException('Tenant bilgisi bulunamadı');
        }

        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet);

        const results = {
            success: 0,
            failed: 0,
            errors: [] as { row: number; error: string }[]
        };

        let rowIndex = 2; // Assuming row 1 is header
        for (const rawRow of rows as any[]) {
            const row: Record<string, any> = {};
            for (const key of Object.keys(rawRow)) {
                row[key.toLowerCase().trim()] = rawRow[key];
            }

            const firstName = (row['ad'] || row['adı'])?.toString()?.trim();
            const lastName = (row['soyad'] || row['soyadı'])?.toString()?.trim();
            const email = (row['email'] || row['e-mail'] || row['eposta'] || row['e-posta'])?.toString()?.trim()?.toLowerCase();
            const phone = (row['telefon'] || row['tel'])?.toString()?.trim();
            let roleStr = (row['rol'] || row['role'])?.toString()?.trim()?.toUpperCase() || 'STUDENT';
            
            // Türkçe rol karşılıkları
            if (roleStr === 'ÖĞRENCİ' || roleStr === 'OGRENCI') roleStr = 'STUDENT';
            if (roleStr === 'ÖĞRETMEN' || roleStr === 'OGRETMEN') roleStr = 'TEACHER';
            if (roleStr === 'YÖNETİCİ' || roleStr === 'YONETICI' || roleStr === 'ADMIN') roleStr = 'ADMIN';

            if (!firstName || !lastName || !email || !phone) {
                results.failed++;
                results.errors.push({ row: rowIndex, error: 'Eksik bilgi (Ad, Soyad, Email ve Telefon zorunludur)' });
                rowIndex++;
                continue;
            }

            const cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.length < 6) {
                results.failed++;
                results.errors.push({ row: rowIndex, error: 'Telefon numarası en az 6 hane rakam içermelidir' });
                rowIndex++;
                continue;
            }
            const defaultPassword = cleanPhone.slice(-6);

            let role: Role = Role.STUDENT;
            if (Object.values(Role).includes(roleStr as Role)) {
                role = roleStr as Role;
            }

            const allowedRoles = ROLE_HIERARCHY[creatorRole] || [];
            if (creatorRole !== Role.SUPER_ADMIN && !allowedRoles.includes(role)) {
                results.failed++;
                results.errors.push({ row: rowIndex, error: `Yetkisiz rol ataması (${role})` });
                rowIndex++;
                continue;
            }

            try {
                const existing = await this.prisma.user.findUnique({ where: { email } });
                if (existing) {
                    results.failed++;
                    results.errors.push({ row: rowIndex, error: 'Bu email adresi sistemde kayıtlı' });
                    rowIndex++;
                    continue;
                }

                await this.prisma.user.create({
                    data: {
                        firstName,
                        lastName,
                        email,
                        phone,
                        role,
                        tenantId: creatorRole === Role.SUPER_ADMIN ? undefined : creatorTenantId,
                        password: defaultPassword,
                        isActive: true
                    }
                });
                results.success++;
            } catch (err: any) {
                results.failed++;
                results.errors.push({ row: rowIndex, error: err.message || 'Kayıt hatası' });
            }
            rowIndex++;
        }

        return results;
    }

    async findAll(params: {
        tenantId?: string;
        role?: Role;
        classId?: string;
        isActive?: boolean;
        skip?: number;
        take?: number;
        search?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }) {
        const { tenantId, role, classId, isActive, skip = 0, take = 50, search, sortBy, sortOrder = 'desc' } = params;

        const where: any = {};

        if (tenantId) where.tenantId = tenantId;
        if (role) where.role = role;
        if (classId) where.classId = classId;
        if (typeof isActive === 'boolean') where.isActive = isActive;

        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Dynamic sorting
        let orderBy: any = { createdAt: 'desc' };
        if (sortBy) {
            switch (sortBy) {
                case 'name': orderBy = { firstName: sortOrder }; break;
                case 'email': orderBy = { email: sortOrder }; break;
                case 'lastLogin': orderBy = { lastLoginAt: sortOrder }; break;
                case 'createdAt': orderBy = { createdAt: sortOrder }; break;
                default: orderBy = { createdAt: 'desc' };
            }
        }

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take,
                orderBy,
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    role: true,
                    tenantId: true,
                    classId: true,
                    isActive: true,
                    lastLoginAt: true,
                    createdAt: true,
                    tenant: {
                        select: { id: true, name: true },
                    },
                    class: {
                        select: { id: true, name: true },
                    },
                    groups: {
                        select: { id: true, name: true },
                    },
                    _count: {
                        select: {
                            examResults: true,
                            questionProgress: true,
                        },
                    },
                },
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            data: users,
            meta: {
                total,
                skip,
                take,
                hasMore: skip + take < total,
            },
        };
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                email: true,
                password: true, // Şifreyi adminin görebilmesi için API yanıtına ekledik
                firstName: true,
                lastName: true,
                tcNo: true,
                phone: true,
                avatar: true,
                role: true,
                tenantId: true,
                classId: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true,
                tenant: {
                    select: { id: true, name: true, slug: true },
                },
                class: {
                    select: { id: true, name: true, grade: true },
                },
            },
        });

        if (!user) {
            throw new NotFoundException('Kullanıcı bulunamadı');
        }

        return user;
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

    private async checkPermissionsAndGetTargetUser(targetUserId: string, currentUser: any) {
        const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser) throw new NotFoundException('Kullanıcı bulunamadı');

        // 1. ON7 YAZILIM KORUMASI: Sadece ON7 kendisini düzenleyebilir
        if (targetUser.email === 'admin@on7yazilim.com') {
            if (currentUser.email !== 'admin@on7yazilim.com') {
                throw new ForbiddenException('Bu hesaba müdahale edilemez!');
            }
        }

        // 2. Kendi hesabını düzenleme hakkı her zaman vardır
        if (currentUser.id === targetUser.id) {
            return targetUser;
        }

        // 3. SUPER_ADMIN, (ON7 hariç) HER ŞEYE DOKUNABİLİR
        if (currentUser.role === Role.SUPER_ADMIN) {
            return targetUser;
        }

        // 4. DIĞER ROLLER IÇIN HIYERARŞI VE TENANT KONTROLÜ
        if (targetUser.role === Role.SUPER_ADMIN) {
            throw new ForbiddenException('Super Admin hesaplarına müdahale yetkiniz bulunmamaktadır.');
        }

        if (currentUser.role === Role.ADMIN && targetUser.role === Role.ADMIN) {
            throw new ForbiddenException('Bir Admin başka bir Adminin hesabına müdahale edemez.');
        }

        if (currentUser.tenantId !== targetUser.tenantId) {
            throw new ForbiddenException('Farklı bir kurumun kullanıcısına müdahale edemezsiniz.');
        }

        return targetUser;
    }

    async update(id: string, dto: UpdateUserDto, currentUser: any) {
        const user = await this.checkPermissionsAndGetTargetUser(id, currentUser);

        // Email değişiyorsa uniqueness kontrolü
        if (dto.email && dto.email !== user.email) {
            const existing = await this.prisma.user.findUnique({
                where: { email: dto.email },
            });
            if (existing) {
                throw new ConflictException('Bu email adresi zaten kullanılıyor');
            }
        }

        // Şifre değişiyorsa düz metin olarak kaydet
        if (dto.password) {
            dto.password = dto.password; // bcrypt.hash iptal edildi
        }

        return this.prisma.user.update({
            where: { id },
            data: dto,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                tenantId: true,
                classId: true,
                isActive: true,
                updatedAt: true,
            },
        });
    }

    async remove(id: string, currentUser: any) {
        await this.checkPermissionsAndGetTargetUser(id, currentUser);

        await this.prisma.user.delete({ where: { id } });

        return { message: 'Kullanıcı başarıyla silindi' };
    }

    async deactivate(id: string, currentUser: any) {
        await this.checkPermissionsAndGetTargetUser(id, currentUser);

        return this.prisma.user.update({
            where: { id },
            data: { isActive: false },
        });
    }

    async activate(id: string, currentUser: any) {
        await this.checkPermissionsAndGetTargetUser(id, currentUser);

        return this.prisma.user.update({
            where: { id },
            data: { isActive: true },
        });
    }

    async assignToClass(userId: string, classId: string, currentUser: any) {
        await this.checkPermissionsAndGetTargetUser(userId, currentUser);

        return this.prisma.user.update({
            where: { id: userId },
            data: { classId },
        });
    }

    async removeFromClass(userId: string, currentUser: any) {
        await this.checkPermissionsAndGetTargetUser(userId, currentUser);

        return this.prisma.user.update({
            where: { id: userId },
            data: { classId: null },
        });
    }

    async getUserStats(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('Kullanıcı bulunamadı');

        const [
            questionProgressCount,
            correctCount,
            examResultsCount,
            examResults,
            groupsCount,
        ] = await Promise.all([
            this.prisma.userQuestionProgress.count({ where: { userId } }),
            this.prisma.userQuestionProgress.count({ where: { userId, isCorrect: true } }),
            this.prisma.studentExamResult.count({ where: { userId } }),
            this.prisma.studentExamResult.findMany({
                where: { userId },
                select: { netScore: true, correctCount: true, wrongCount: true, emptyCount: true },
            }),
            this.prisma.group.count({ where: { students: { some: { id: userId } } } }),
        ]);

        const avgNet = examResults.length > 0
            ? examResults.reduce((sum, r) => sum + r.netScore, 0) / examResults.length
            : 0;

        const totalAnswered = examResults.reduce((sum, r) => sum + r.correctCount + r.wrongCount, 0);
        const totalCorrect = examResults.reduce((sum, r) => sum + r.correctCount, 0);
        const examSuccessRate = totalAnswered > 0 ? (totalCorrect / totalAnswered) * 100 : 0;

        const questionSuccessRate = questionProgressCount > 0
            ? (correctCount / questionProgressCount) * 100
            : 0;

        return {
            totalQuestions: questionProgressCount,
            correctQuestions: correctCount,
            totalExams: examResultsCount,
            averageNet: Math.round(avgNet * 100) / 100,
            examSuccessRate: Math.round(examSuccessRate * 100) / 100,
            questionSuccessRate: Math.round(questionSuccessRate * 100) / 100,
            totalGroups: groupsCount,
        };
    }

    async getUserExamResults(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('Kullanıcı bulunamadı');

        return this.prisma.studentExamResult.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: {
                id: true,
                correctCount: true,
                wrongCount: true,
                emptyCount: true,
                netScore: true,
                rawScore: true,
                scaledScore: true,
                rank: true,
                totalParticipants: true,
                percentile: true,
                startedAt: true,
                finishedAt: true,
                duration: true,
                createdAt: true,
                exam: {
                    select: {
                        id: true,
                        title: true,
                        type: true,
                        totalQuestions: true,
                    },
                },
                topicAnalysis: {
                    select: {
                        correctCount: true,
                        wrongCount: true,
                        emptyCount: true,
                        successRate: true,
                        topic: {
                            select: { id: true, name: true },
                        },
                    },
                },
            },
        });
    }

    async getUserActivity(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('Kullanıcı bulunamadı');

        // Get recent exam results
        const recentExams = await this.prisma.studentExamResult.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true,
                netScore: true,
                correctCount: true,
                wrongCount: true,
                createdAt: true,
                exam: { select: { title: true } },
            },
        });

        // Get recent self test results
        const recentSelfTests = await this.prisma.selfTestResult.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true,
                correctCount: true,
                wrongCount: true,
                emptyCount: true,
                createdAt: true,
            },
        });

        // Get recent question progress
        const recentQuestions = await this.prisma.userQuestionProgress.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true,
                isCorrect: true,
                createdAt: true,
            },
        });

        // Get user groups
        const groups = await this.prisma.group.findMany({
            where: { students: { some: { id: userId } } },
            select: {
                id: true,
                name: true,
                code: true,
                isActive: true,
            },
        });

        // Get user exam areas
        const examAreas = await this.prisma.examArea.findMany({
            where: { students: { some: { id: userId } } },
            select: {
                id: true,
                name: true,
                slug: true,
                icon: true,
                color: true,
            },
        });

        return {
            recentExams,
            recentSelfTests,
            recentQuestions,
            groups,
            examAreas,
        };
    }

    async getStudentsByTenant(tenantId: string) {
        return this.prisma.user.findMany({
            where: {
                tenantId,
                role: Role.STUDENT,
                isActive: true,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                classId: true,
                class: {
                    select: { id: true, name: true },
                },
            },
        });
    }

    async getTeachersByTenant(tenantId: string) {
        return this.prisma.user.findMany({
            where: {
                tenantId,
                role: Role.TEACHER,
                isActive: true,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
            },
        });
    }
}
