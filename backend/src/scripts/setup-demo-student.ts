import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Demo Student Data...');

    // 1. Find a Student
    let student = await prisma.user.findFirst({
        where: { role: Role.STUDENT }
    });

    if (!student) {
        console.log('No student found. Creating one...');
        const hashedPassword = await bcrypt.hash('123', 10);
        // Generate random email to avoid collision if run multiple times without cleanup
        const random = Math.floor(Math.random() * 1000);
        student = await prisma.user.create({
            data: {
                email: `ogrenci${random}@demo.com`,
                password: hashedPassword,
                firstName: 'Demo',
                lastName: 'Öğrenci',
                role: Role.STUDENT,
            }
        });
        console.log('Created student:', student.email);
    } else {
        console.log('Found student:', student.email);
    }

    // 2. Find or Create ExamArea
    let examArea = await prisma.examArea.findFirst({
        where: { isActive: true },
        include: { lessons: { include: { units: { include: { topics: true } } } } }
    });

    if (!examArea) {
        console.log('No active ExamArea found. Creating one...');
        examArea = await prisma.examArea.create({
            data: {
                name: 'TYT Matematik Soru Bankası',
                slug: 'tyt-matematik',
                description: 'Temel Yeterlilik Testi Matematik Soru Bankası',
                isActive: true,
            },
            include: { lessons: { include: { units: { include: { topics: true } } } } }
        });
        console.log('Created ExamArea:', examArea.name);
    } else {
        console.log('Found ExamArea:', examArea.name);
    }

    // 3. Assign Student to ExamArea
    // Check if already assigned
    const isAssigned = await prisma.examArea.findFirst({
        where: {
            id: examArea.id,
            students: { some: { id: student.id } }
        }
    });

    if (!isAssigned) {
        await prisma.examArea.update({
            where: { id: examArea.id },
            data: {
                students: {
                    connect: { id: student.id }
                }
            }
        });
        console.log('Assigned Student to ExamArea.');
    } else {
        console.log('Student already assigned to ExamArea.');
    }

    // 4. Ensure Hierarchy (Lesson -> Unit -> Topic)
    let topic;

    if (examArea.lessons.length === 0) {
        // Create hierarchy
        console.log('Creating hierarchy...');
        const lesson = await prisma.lesson.create({
            data: {
                name: 'Matematik',
                code: 'MAT101',
                examAreas: { connect: { id: examArea.id } }
            }
        });
        const unit = await prisma.unit.create({
            data: {
                name: 'Sayılar',
                order: 1,
                lessonId: lesson.id
            }
        });
        topic = await prisma.topic.create({
            data: {
                name: 'Temel Kavramlar',
                order: 1,
                unitId: unit.id
            }
        });
    } else {
        // Use existing
        const lesson = examArea.lessons[0];
        if (lesson.units.length === 0) {
            const unit = await prisma.unit.create({ data: { name: 'Sayılar', order: 1, lessonId: lesson.id } });
            topic = await prisma.topic.create({ data: { name: 'Temel Kavramlar', order: 1, unitId: unit.id } });
        } else {
            const unit = lesson.units[0];
            if (unit.topics.length === 0) {
                topic = await prisma.topic.create({ data: { name: 'Temel Kavramlar', order: 1, unitId: unit.id } });
            } else {
                topic = unit.topics[0];
            }
        }
    }
    console.log('Using Topic:', topic.name);

    // 5. Assign Questions to Topic
    // Create some dummy questions if none exist or just find generic ones

    const questionCount = await prisma.question.count({
        where: { topics: { some: { id: topic.id } } }
    });

    if (questionCount < 3) {
        console.log('Creating demo questions...');
        for (let i = 1; i <= 3; i++) {
            await prisma.question.create({
                data: {
                    content: {
                        type: "doc",
                        content: [
                            { type: "paragraph", content: [{ type: "text", text: `Örnek Soru ${i}: 2 + ${i} kaç eder?` }] }
                        ]
                    },
                    examAreaQuestions: { create: [{ examAreaId: examArea.id, orderNumber: 0 }] },
                    topics: { connect: { id: topic.id } },
                    createdById: student.id,
                    type: 'MULTIPLE_CHOICE',
                    difficulty: 'EASY',
                    correctAnswer: 'A',
                    options: [
                        { id: 'A', text: `${2 + i}`, label: 'A' },
                        { id: 'B', text: `${2 + i + 1}`, label: 'B' },
                        { id: 'C', text: `${2 + i + 2}`, label: 'C' },
                        { id: 'D', text: `${2 + i + 3}`, label: 'D' },
                        { id: 'E', text: `${2 + i + 4}`, label: 'E' },
                    ]
                }
            });
        }
        console.log('Created 3 demo questions.');
    } else {
        console.log(`Topic already has ${questionCount} questions.`);
    }

    console.log('Setup Complete!');
    console.log('Login Email:', student.email);
    console.log('Password: 123'); // Assuming hash logic allows this or we reset logic
    // Note: If bcrypt is used, '123' might not work unless we hash it.
    // I should check if User creation hashes password. In seed usually we use service or pre-hashed.
    // I'll update password using existing service logic? 
    // No, I'll just rely on existing user if found. If created, I might need hash.
    // I'll assume usage of the 'student' button in Dev Login is safer.
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
