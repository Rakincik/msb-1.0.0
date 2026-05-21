"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function runWorkflowTest() {
    console.log('🚀 E2E Soru Bankası İş Akışı (Book Flow) Başlıyor...\n');
    try {
        console.log('🧹 Eski test verileri temizleniyor...');
        await prisma.group.deleteMany({ where: { name: 'Test Grubu 101' } });
        await prisma.user.deleteMany({ where: { email: { in: ['testogrenci@4takademi.com', 'testogretmen@4takademi.com'] } } });
        await prisma.examArea.deleteMany({ where: { name: 'Test Soru Bankası' } });
        await prisma.lesson.deleteMany({ where: { name: 'Test Matematik' } });
        console.log('👤 1. Öğrenci (Student) Hesabı Oluşturuluyor...');
        const hashedPassword = await bcrypt.hash('123456', 10);
        const student = await prisma.user.create({
            data: {
                firstName: 'Ali',
                lastName: 'Test',
                email: 'testogrenci@4takademi.com',
                password: hashedPassword,
                role: 'STUDENT',
            }
        });
        console.log('👥 2. Grup Oluşturuluyor...');
        const group = await prisma.group.create({
            data: {
                name: 'Test Grubu 101',
                code: 'TEST101',
                description: 'Sistem testi için geçici grup',
            }
        });
        console.log('🔗 3. Öğrenci Gruba Atanıyor...');
        await prisma.group.update({
            where: { id: group.id },
            data: { students: { connect: { id: student.id } } }
        });
        console.log('📚 4. Hiyerarşi (Ders -> Ünite -> Konu) Oluşturuluyor...');
        const lesson = await prisma.lesson.create({
            data: {
                name: 'Test Matematik',
                code: 'MAT-TEST',
                units: {
                    create: [{
                            name: 'Ünite 1: Sayılar',
                            order: 1,
                            topics: {
                                create: [
                                    { name: 'Doğal Sayılar', order: 1 },
                                    { name: 'Kesirler', order: 2 }
                                ]
                            }
                        }]
                }
            },
            include: { units: { include: { topics: true } } }
        });
        const topicId = lesson.units[0].topics[0].id;
        console.log('📘 5. Soru Bankası (Kitap) Oluşturuluyor...');
        const examArea = await prisma.examArea.create({
            data: {
                name: 'Test Soru Bankası',
                slug: 'test-soru-bankasi',
                description: 'Mock data kitap',
                lessons: { connect: { id: lesson.id } }
            }
        });
        console.log('❓ 6. Havuza Soru Ekleniyor ve Kitaba Bağlanıyor...');
        const question1 = await prisma.question.create({
            data: {
                content: { text: '2 + 2 kaçtır?' },
                options: { A: { text: "3" }, B: { text: "4" }, C: { text: "5" } },
                correctAnswer: 'B',
                explanation: { text: '2 ve 2 nin toplamı 4 eder.' },
                topics: { connect: { id: topicId } },
                examAreas: { connect: { id: examArea.id } },
                createdBy: { connect: { id: student.id } }
            }
        });
        console.log('🎯 7. Soru Bankası Gruba Atanıyor...');
        await prisma.group.update({
            where: { id: group.id },
            data: { examAreas: { connect: { id: examArea.id } } }
        });
        console.log('\n🔎 --- DOĞRULAMA (ÖĞRENCİ TARAFINDAN GETİRME) ---');
        const studentWithGroups = await prisma.user.findUnique({
            where: { id: student.id },
            include: {
                groups: {
                    include: {
                        examAreas: {
                            include: {
                                lessons: {
                                    include: {
                                        units: {
                                            include: {
                                                topics: {
                                                    include: {
                                                        questions: { select: { id: true } }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        const studentExamAreas = studentWithGroups?.groups.flatMap((g) => g.examAreas) || [];
        console.log(`✅ Öğrenci Ali'nin Toplam Kitap (Soru Bankası) Sayısı: ${studentExamAreas.length}`);
        if (studentExamAreas.length > 0) {
            console.log(`✅ Kitap Adı: ${studentExamAreas[0].name}`);
            console.log(`✅ Dersteki Ünite Sayısı: ${studentExamAreas[0].lessons[0].units.length}`);
            console.log(`✅ Toplam Atanan Soru: ${studentExamAreas[0].lessons[0].units[0].topics[0].questions.length}`);
            console.log('\n🌟 İŞ AKIŞI BAŞARIYLA TAMAMLANDI! VERİTABANI İLİŞKİLERİ KUSURSUZ ÇALIŞIYOR.');
        }
        else {
            console.log('❌ Hata: Öğrenciye kitaplar gitmedi.');
        }
    }
    catch (error) {
        console.error('❌ Test sırasında hata:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
runWorkflowTest();
//# sourceMappingURL=test-workflow.js.map