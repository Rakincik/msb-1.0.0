import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Mevcut kullanıcılar getiriliyor...');
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            role: true,
            firstName: true,
            lastName: true
        }
    });

    console.table(users);
}

main()
    .catch((e) => {
        console.error('Hata:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
