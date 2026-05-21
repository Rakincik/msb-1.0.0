import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Demo veriler sistemden temizleniyor...');

    // Cascade silinmeyen veya bağımlılığı olan tabloları sırayla temizleyelim
    console.log('İlişkisel kayıtlar siliniyor...');
    await prisma.examQuestion.deleteMany();
    await prisma.topicAnalysis.deleteMany();
    await prisma.studentExamResult.deleteMany();
    await prisma.selfTestResult.deleteMany();
    await prisma.userQuestionProgress.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.pDFAnnotation.deleteMany();

    console.log('İçerik kayıtları (Soru, Sınav, PDF, vb.) siliniyor...');
    await prisma.question.deleteMany();
    await prisma.exam.deleteMany();
    await prisma.learningOutcome.deleteMany();
    await prisma.topic.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.class.deleteMany();
    await prisma.group.deleteMany();
    await prisma.examArea.deleteMany();
    await prisma.pDFDocument.deleteMany();

    console.log('Kullanıcı kayıtları temizleniyor (Super Admin hariç)...');
    // Super Admin hariç tüm kullanıcıları sil
    await prisma.user.deleteMany({
        where: {
            email: { not: 'admin@sorubankasi.com' }
        }
    });

    console.log('Kurumlar (Tenants) siliniyor...');
    await prisma.tenant.deleteMany();

    console.log('✅ BÜTÜN DEMO VERİLER TEMİZLENDİ! Sistem üretime hazır.');
    console.log('⚠️ Sadece \'admin@sorubankasi.com\' hesabı sistemde bırakılmıştır.');
}

main()
    .catch((e) => {
        console.error('Hata oluştu:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
