import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';

async function seedTeacherAccess() {
  const edexcel = await prisma.examBoard.findFirst({
    where: { slug: 'edexcel' },
  });
  if (!edexcel) {
    console.log('Edexcel not found');
    return;
  }

  const gcse = await prisma.category.findFirst({
    where: { examBoardId: edexcel.id, slug: 'gcse' },
  });
  if (!gcse) {
    console.log('GCSE not found');
    return;
  }

  const grade10 = await prisma.grade.findFirst({
    where: { categoryId: gcse.id, slug: 'grade-10' },
  });
  if (!grade10) {
    console.log('Grade 10 not found');
    return;
  }

  const biology = await prisma.subject.findFirst({
    where: { gradeId: grade10.id, slug: 'biology' },
  });
  if (!biology) {
    console.log('Biology not found');
    return;
  }

  const grade11 = await prisma.grade.findFirst({
    where: { categoryId: gcse.id, slug: 'grade-11' },
  });
  const biology11 = grade11
    ? await prisma.subject.findFirst({
        where: { gradeId: grade11.id, slug: 'biology' },
      })
    : null;

  const hashedPassword = await bcrypt.hash('Teacher123!', 10);

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@platform.com' },
    update: {
      passwordHash: hashedPassword,
      firstName: 'Jane',
      lastName: 'Teacher',
      role: 'TEACHER',
      isVerified: true,
    },
    create: {
      email: 'teacher@platform.com',
      passwordHash: hashedPassword,
      firstName: 'Jane',
      lastName: 'Teacher',
      role: 'TEACHER',
      isVerified: true,
    },
  });

  await prisma.teacherProfile.upsert({
    where: { userId: teacher.id },
    update: { isApproved: true, approvedAt: new Date() },
    create: {
      userId: teacher.id,
      isApproved: true,
      approvedAt: new Date(),
      bio: 'Experienced science teacher specialising in Edexcel GCSE Biology.',
    },
  });

  console.log('Teacher account ready: teacher@platform.com / Teacher123!');
  console.log('Assigned to: Edexcel GCSE Grade 10 Biology');
  console.log('Subject ID:', biology.id);
  if (biology11) {
    console.log('Grade 11 Biology Subject ID:', biology11.id);
  }

  await prisma.$disconnect();
}

seedTeacherAccess().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
