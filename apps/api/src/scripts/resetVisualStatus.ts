import { prisma } from '../lib/prisma';

async function reset() {
  const updated = await prisma.lesson.updateMany({
    where: { visualStatus: 'GENERATING' },
    data: { visualStatus: 'NOT_GENERATED' },
  });
  console.log(`Reset ${updated.count} lessons`);
  await prisma.$disconnect();
}

reset();
