import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const area = await prisma.examArea.findUnique({where: {slug: 'asd'}, include: {lessons: true}});
  console.log(JSON.stringify(area, null, 2));
}
main().finally(() => prisma.$disconnect());
