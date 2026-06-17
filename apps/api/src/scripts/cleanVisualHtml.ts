import { prisma } from '../lib/prisma';

async function clean() {
  const lessons = await prisma.lesson.findMany({
    where: { visualHtml: { not: null } },
  });

  for (const lesson of lessons) {
    await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        visualHtml: null,
        visualStatus: 'NOT_GENERATED',
      },
    });
    console.log(`Reset visual for lesson: ${lesson.title}`);
  }

  await prisma.$disconnect();
  console.log('Done');
}

clean();
