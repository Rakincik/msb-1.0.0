import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        super({
            log: [
                { emit: 'event', level: 'query' },
                { emit: 'stdout', level: 'info' },
                { emit: 'stdout', level: 'warn' },
                { emit: 'stdout', level: 'error' },
            ],
        });
    }

    async onModuleInit() {
        await this.$connect();
        this.logger.log('✅ Veritabanı bağlantısı kuruldu');
    }

    async onModuleDestroy() {
        await this.$disconnect();
        this.logger.log('🔌 Veritabanı bağlantısı kapatıldı');
    }

    // Soft delete için extension
    async cleanDatabase() {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Production ortamında cleanDatabase çalıştırılamaz!');
        }

        // Test ortamı için tüm verileri temizle
        const models = Reflect.ownKeys(this).filter(
            (key) => typeof key === 'string' && !key.startsWith('_') && !key.startsWith('$'),
        );

        return Promise.all(
            models.map((modelKey) => {
                if (this[modelKey as string]?.deleteMany) {
                    return this[modelKey as string].deleteMany();
                }
                return Promise.resolve();
            }),
        );
    }
}
