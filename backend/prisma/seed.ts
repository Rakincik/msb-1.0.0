import { PrismaClient, Role, DifficultyLevel, QuestionType, ExamType, ExamStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seed data oluşturuluyor...');

    // 1. Kurumlar
    const tenant1 = await prisma.tenant.upsert({
        where: { slug: 'demo-kurum' },
        update: {},
        create: {
            name: 'Demo Dershane',
            slug: 'demo-kurum',
            logo: null,
        },
    });

    const tenant2 = await prisma.tenant.upsert({
        where: { slug: 'test-okulu' },
        update: {},
        create: {
            name: 'Test Okulu',
            slug: 'test-okulu',
            logo: null,
        },
    });

    console.log('✅ Kurumlar oluşturuldu');

    // 2. Kullanıcılar
    const hashedPassword = await bcrypt.hash('123456', 10);

    const superAdmin = await prisma.user.upsert({
        where: { email: 'admin@sorubankasi.com' },
        update: {},
        create: {
            email: 'admin@sorubankasi.com',
            password: hashedPassword,
            firstName: 'Süper',
            lastName: 'Admin',
            role: Role.SUPER_ADMIN,
        },
    });

    const kurumAdmin = await prisma.user.upsert({
        where: { email: 'kurum@demo.com' },
        update: {},
        create: {
            email: 'kurum@demo.com',
            password: hashedPassword,
            firstName: 'Kurum',
            lastName: 'Yöneticisi',
            role: Role.ADMIN,
            tenantId: tenant1.id,
        },
    });

    const teacher = await prisma.user.upsert({
        where: { email: 'ogretmen@demo.com' },
        update: {},
        create: {
            email: 'ogretmen@demo.com',
            password: hashedPassword,
            firstName: 'Ahmet',
            lastName: 'Öğretmen',
            role: Role.TEACHER,
            tenantId: tenant1.id,
        },
    });

    const student = await prisma.user.upsert({
        where: { email: 'ogrenci@demo.com' },
        update: {},
        create: {
            email: 'ogrenci@demo.com',
            password: hashedPassword,
            firstName: 'Mehmet',
            lastName: 'Öğrenci',
            role: Role.STUDENT,
            tenantId: tenant1.id,
        },
    });

    console.log('✅ Kullanıcılar oluşturuldu');

    // 3. Dersler
    let turkce = await prisma.lesson.findFirst({ where: { code: 'TRK', tenantId: null } });
    if (!turkce) {
        turkce = await prisma.lesson.create({
            data: {
                name: 'Türkçe',
                code: 'TRK',
                order: 1,
            },
        });
    }

    let matematik = await prisma.lesson.findFirst({ where: { code: 'MAT', tenantId: null } });
    if (!matematik) {
        matematik = await prisma.lesson.create({
            data: {
                name: 'Matematik',
                code: 'MAT',
                order: 2,
            },
        });
    }

    let tarih = await prisma.lesson.findFirst({ where: { code: 'TAR', tenantId: null } });
    if (!tarih) {
        tarih = await prisma.lesson.create({
            data: {
                name: 'Tarih',
                code: 'TAR',
                order: 3,
            },
        });
    }

    console.log('✅ Dersler oluşturuldu');

    // 4. Üniteler
    const sozcukteAnlam = await prisma.unit.create({
        data: {
            name: 'Sözcükte Anlam',
            lessonId: turkce.id,
            order: 1,
        },
    });

    const paragraf = await prisma.unit.create({
        data: {
            name: 'Paragraf',
            lessonId: turkce.id,
            order: 2,
        },
    });

    const sayilar = await prisma.unit.create({
        data: {
            name: 'Sayılar',
            lessonId: matematik.id,
            order: 1,
        },
    });

    console.log('✅ Üniteler oluşturuldu');

    // 5. Konular
    const esAnlamli = await prisma.topic.create({
        data: {
            name: 'Eş Anlamlı Sözcükler',
            unitId: sozcukteAnlam.id,
            order: 1,
        },
    });

    const zitAnlamli = await prisma.topic.create({
        data: {
            name: 'Zıt Anlamlı Sözcükler',
            unitId: sozcukteAnlam.id,
            order: 2,
        },
    });

    const anaFikir = await prisma.topic.create({
        data: {
            name: 'Ana Fikir',
            unitId: paragraf.id,
            order: 1,
        },
    });

    const dogalSayilar = await prisma.topic.create({
        data: {
            name: 'Doğal Sayılar',
            unitId: sayilar.id,
            order: 1,
        },
    });

    console.log('✅ Konular oluşturuldu');

    // 6. Örnek Sorular
    const questionsData = [
        {
            content: { text: '"Güzel" sözcüğünün eş anlamlısı aşağıdakilerden hangisidir?' },
            options: { A: 'Çirkin', B: 'Hoş', C: 'Kötü', D: 'Sert', E: 'Acı' },
            correctAnswer: 'B',
            explanation: { text: '"Güzel" ve "hoş" sözcükleri eş anlamlıdır.' },
            topicId: esAnlamli.id,
            createdById: teacher.id,
            difficulty: DifficultyLevel.EASY,
        },
        {
            content: { text: '"Büyük" sözcüğünün zıt anlamlısı aşağıdakilerden hangisidir?' },
            options: { A: 'Geniş', B: 'Uzun', C: 'Küçük', D: 'Yüksek', E: 'Kalın' },
            correctAnswer: 'C',
            explanation: { text: '"Büyük" ve "küçük" sözcükleri zıt anlamlıdır.' },
            topicId: zitAnlamli.id,
            createdById: teacher.id,
            difficulty: DifficultyLevel.EASY,
        },
        {
            content: { text: 'Aşağıdaki paragrafın ana fikri nedir?\n\n"Kitap okumak, insanın hayal dünyasını genişletir. Okudukça yeni kelimeler öğrenir, farklı kültürleri tanırız."' },
            options: {
                A: 'Kitaplar pahalıdır',
                B: 'Kitap okumak faydalıdır',
                C: 'Herkes kitap okumalıdır',
                D: 'Kitaplar ağırdır',
                E: 'Kitaplar eskidir'
            },
            correctAnswer: 'B',
            explanation: { text: 'Paragrafta kitap okumanın faydalarından bahsediliyor.' },
            topicId: anaFikir.id,
            createdById: teacher.id,
            difficulty: DifficultyLevel.MEDIUM,
        },
        {
            content: { text: '15 + 27 = ?' },
            options: { A: '40', B: '41', C: '42', D: '43', E: '44' },
            correctAnswer: 'C',
            explanation: { text: '15 + 27 = 42' },
            topicId: dogalSayilar.id,
            createdById: teacher.id,
            difficulty: DifficultyLevel.VERY_EASY,
        },
        {
            content: { text: '125 - 78 = ?' },
            options: { A: '45', B: '46', C: '47', D: '48', E: '49' },
            correctAnswer: 'C',
            explanation: { text: '125 - 78 = 47' },
            topicId: dogalSayilar.id,
            createdById: teacher.id,
            difficulty: DifficultyLevel.EASY,
        },
    ];

    for (const q of questionsData) {
        const { topicId, ...questionData } = q;
        await prisma.question.create({
            data: {
                ...questionData,
                topics: { connect: [{ id: topicId }] },
            },
        });
    }

    console.log('✅ Sorular oluşturuldu');

    // 7. Örnek Sınav
    const exam = await prisma.exam.create({
        data: {
            title: 'Türkçe Deneme Sınavı 1',
            description: 'Türkçe konularını içeren deneme sınavı',
            type: ExamType.INSTITUTIONAL,
            status: ExamStatus.ACTIVE,
            duration: 60,
            totalQuestions: 5,
            tenantId: tenant1.id,
        },
    });

    // Soruları sınava ekle
    const allQuestions = await prisma.question.findMany({ take: 5 });
    for (let i = 0; i < allQuestions.length; i++) {
        await prisma.examQuestion.create({
            data: {
                examId: exam.id,
                questionId: allQuestions[i].id,
                orderNumber: i + 1,
            },
        });
    }

    console.log('✅ Sınav oluşturuldu');

    // 8. Sınıf
    const sinif = await prisma.class.create({
        data: {
            name: '12-A',
            grade: '12. Sınıf',
            tenantId: tenant1.id,
        },
    });

    // Öğrenciyi sınıfa ekle
    await prisma.user.update({
        where: { id: student.id },
        data: { classId: sinif.id },
    });

    console.log('✅ Sınıf oluşturuldu');

    console.log('\n🎉 Seed işlemi tamamlandı!\n');
    console.log('📧 Giriş bilgileri:');
    console.log('   Süper Admin: admin@sorubankasi.com / 123456');
    console.log('   Kurum Admin: kurum@demo.com / 123456');
    console.log('   Öğretmen: ogretmen@demo.com / 123456');
    console.log('   Öğrenci: ogrenci@demo.com / 123456\n');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
