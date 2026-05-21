import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GroupCronService {
    private readonly logger = new Logger(GroupCronService.name);

    constructor(private prisma: PrismaService) {}

    // Runs every 2 days at midnight: '0 0 */2 * *'
    @Cron('0 0 */2 * *')
    async handleExpiredGroups() {
        this.logger.log('Süresi dolmuş gruplar için zamanlanmış kontrol başlatılıyor...');

        try {
            // Find all active groups whose endDate has passed
            const expiredGroups = await this.prisma.group.findMany({
                where: {
                    isActive: true,
                    endDate: {
                        lt: new Date(),
                    },
                },
                include: {
                    students: true,
                },
            });

            if (expiredGroups.length === 0) {
                this.logger.log('Süresi dolmuş herhangi bir grup bulunamadı.');
                return;
            }

            this.logger.log(`${expiredGroups.length} adet süresi dolmuş grup bulundu. Pasife alınıyor...`);

            const groupIds = expiredGroups.map((g) => g.id);

            // 1. Deactivate the groups
            await this.prisma.group.updateMany({
                where: { id: { in: groupIds } },
                data: { isActive: false },
            });

            // 2. Process users in these groups
            // Get all unique student IDs from these expired groups
            const studentIds = new Set<string>();
            expiredGroups.forEach((g) => {
                g.students.forEach((s) => studentIds.add(s.id));
            });

            let deactivatedUserCount = 0;

            for (const userId of studentIds) {
                // Check if user is in any OTHER active group
                const activeGroupsCount = await this.prisma.group.count({
                    where: {
                        isActive: true,
                        students: {
                            some: { id: userId },
                        },
                    },
                });

                if (activeGroupsCount === 0) {
                    // User has no active groups left, deactivate them
                    await this.prisma.user.update({
                        where: { id: userId },
                        data: { isActive: false },
                    });
                    deactivatedUserCount++;
                }
            }

            this.logger.log(`İşlem tamamlandı. ${expiredGroups.length} grup ve başka aktif grubu kalmayan ${deactivatedUserCount} öğrenci pasife alındı.`);
        } catch (error) {
            this.logger.error('Süresi dolmuş grupları kontrol ederken hata oluştu', error);
        }
    }
}
