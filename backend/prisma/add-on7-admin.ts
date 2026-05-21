import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('ON7 Yazılım Super Admin hesabı ekleniyor...');
    const hashedPassword = await bcrypt.hash('on7.Yazilim!?', 10);
    
    await prisma.user.upsert({
        where: { email: 'admin@on7yazilim.com' },
        update: {
            role: Role.SUPER_ADMIN,
        },
        create: {
            email: 'admin@on7yazilim.com',
            password: hashedPassword,
            firstName: 'ON7',
            lastName: 'Yazılım',
            role: Role.SUPER_ADMIN,
        },
    });
    console.log('✅ Yenilmez, dokunulmaz ON7 Yazılım Süper Admin hesabı başarıyla eklendi.');
}

main()
    .catch((e) => {
        console.error('Hata:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
