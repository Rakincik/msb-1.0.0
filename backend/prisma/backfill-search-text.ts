/**
 * Data Migration: Mevcut soruların searchText alanını doldurur
 * Kullanım: npx ts-node prisma/backfill-search-text.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateSearchText(content: any, options: any, explanation?: any): string {
    const parts: string[] = [];

    if (content?.text) parts.push(content.text);
    if (options) {
        Object.values(options).forEach(v => {
            if (typeof v === 'string') parts.push(v);
        });
    }
    if (explanation?.text) parts.push(explanation.text);

    return parts.join(' ').substring(0, 2000);
}

async function main() {
    console.log('🔍 searchText alanı boş olan sorular aranıyor...');

    const questions = await prisma.question.findMany({
        where: { searchText: null },
        select: {
            id: true,
            content: true,
            options: true,
            explanation: true,
        },
    });

    console.log(`📝 ${questions.length} soru bulundu, güncelleniyor...`);

    let updated = 0;
    for (const q of questions) {
        const searchText = generateSearchText(q.content, q.options, q.explanation);
        await prisma.question.update({
            where: { id: q.id },
            data: { searchText },
        });
        updated++;
        if (updated % 100 === 0) {
            console.log(`  ✅ ${updated}/${questions.length} güncellendi`);
        }
    }

    console.log(`🎉 Toplam ${updated} soru güncellendi!`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
