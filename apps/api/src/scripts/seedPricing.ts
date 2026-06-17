import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const subjects = await prisma.subject.findMany({
    include: { grade: { include: { category: { include: { examBoard: true } } } } },
  });

  if (subjects.length === 0) {
    console.log('No subjects found. Seed subjects first.');
    return;
  }

  for (const subject of subjects) {
    await prisma.subjectPricing.upsert({
      where: { subjectId: subject.id },
      update: {},
      create: {
        subjectId: subject.id,
        monthlyPriceCents: 149900,
        yearlyPriceCents: 999900,
        currency: 'LKR',
        stripePriceIdMonthly: '',
        stripePriceIdYearly: '',
      },
    });
    console.log(`Seeded pricing for: ${subject.name}`);
  }

  console.log('Done.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
