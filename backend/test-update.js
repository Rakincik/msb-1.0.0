const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const q = await prisma.question.findFirst();
    console.log('ID:', q.id);
    await prisma.question.update({
        where: { id: q.id },
        data: {
            explanation: {
                text: '<span style="color: #ef4444">test</span>',
                image: null,
                type: 'text_image'
            }
        }
    });
    console.log('Update success');
}
main().catch(e => console.error('ERROR:', e)).finally(() => prisma.$disconnect());
