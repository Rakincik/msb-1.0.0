import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Kullanıcı rolü güncelleniyor...');

    // Önceden oluşturduğumuz kullanıcıyı ADMIN (Kurum Yöneticisi) olarak güncelliyoruz
    const updatedAdmin = await prisma.user.update({
        where: { email: 'admin@4takademi.com' },
        data: {
            role: Role.ADMIN,
        },
    });

    console.log(`✅ ${updatedAdmin.email} kullanıcısının rolü "${updatedAdmin.role}" olarak değiştirildi.`);
}

main()
    .catch((e) => {
        console.error('Hata oluştu:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
