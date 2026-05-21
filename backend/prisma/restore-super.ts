import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Süper Admin hesabı geri yükleniyor...');
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    await prisma.user.upsert({
        where: { email: 'admin@sorubankasi.com' },
        update: {
            role: Role.SUPER_ADMIN,
        },
        create: {
            email: 'admin@sorubankasi.com',
            password: hashedPassword,
            firstName: 'Süper',
            lastName: 'Admin',
            role: Role.SUPER_ADMIN,
        },
    });
    console.log('✅ Süper Admin (admin@sorubankasi.com) eski şifresiyle (123456) başarıyla geri getirildi.');
}

main()
    .catch((e) => {
        console.error('Hata:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
