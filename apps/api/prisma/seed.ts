import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check if already seeded
  const existingBoards = await prisma.examBoard.count();
  if (existingBoards > 0) {
    console.log('Database already seeded — skipping.');
    return;
  }
  console.log('Database empty — seeding now...');

  // ── EXAM BOARDS ──────────────────────────────────
  const cambridge = await prisma.examBoard.create({
    data: {
      name: 'Cambridge',
      slug: 'cambridge',
      country: 'UK',
      isActive: true,
    },
  });

  const edexcel = await prisma.examBoard.create({
    data: {
      name: 'Edexcel',
      slug: 'edexcel',
      country: 'UK',
      isActive: true,
    },
  });

  console.log('Exam boards created.');

  // ── CATEGORIES + GRADES + SUBJECTS ───────────────

  const CATEGORIES = [
    {
      name: 'Primary',
      slug: 'primary',
      order: 1,
      grades: [
        { name: 'Year 1', slug: 'year-1', order: 1 },
        { name: 'Year 2', slug: 'year-2', order: 2 },
        { name: 'Year 3', slug: 'year-3', order: 3 },
        { name: 'Year 4', slug: 'year-4', order: 4 },
        { name: 'Year 5', slug: 'year-5', order: 5 },
      ],
      subjects: ['English', 'Maths', 'Science'],
    },
    {
      name: 'Checkpoint',
      slug: 'checkpoint',
      order: 2,
      grades: [
        { name: 'Year 6', slug: 'year-6', order: 1 },
        { name: 'Year 7', slug: 'year-7', order: 2 },
        { name: 'Year 8', slug: 'year-8', order: 3 },
        { name: 'Year 9', slug: 'year-9', order: 4 },
      ],
      subjects: ['English', 'Maths', 'Biology', 'Chemistry', 'Physics'],
    },
    {
      name: 'IGCSE',
      slug: 'igcse',
      order: 3,
      grades: [
        { name: 'Year 10', slug: 'year-10', order: 1 },
        { name: 'Year 11', slug: 'year-11', order: 2 },
      ],
      subjects: ['Biology', 'Chemistry', 'Physics', 'Maths', 'English'],
    },
    {
      name: 'A Level',
      slug: 'a-level',
      order: 4,
      grades: [
        { name: 'Year 12', slug: 'year-12', order: 1 },
        { name: 'Year 13', slug: 'year-13', order: 2 },
      ],
      subjects: ['Biology', 'Chemistry', 'Physics', 'Maths'],
    },
  ];

  for (const board of [cambridge, edexcel]) {
    for (const cat of CATEGORIES) {
      const category = await prisma.category.create({
        data: {
          name: cat.name,
          slug: cat.slug,
          order: cat.order,
          isActive: true,
          examBoardId: board.id,
        },
      });

      for (const gradeData of cat.grades) {
        const grade = await prisma.grade.create({
          data: {
            name: gradeData.name,
            slug: gradeData.slug,
            order: gradeData.order,
            isActive: true,
            categoryId: category.id,
          },
        });

        for (const subjectName of cat.subjects) {
          const slug = `${subjectName.toLowerCase()}-${gradeData.slug}`;

          // Only Edexcel IGCSE Year 10 Biology is live
          const isLive =
            board.slug === 'edexcel' &&
            cat.slug === 'igcse' &&
            gradeData.slug === 'year-10' &&
            subjectName === 'Biology';

          await prisma.subject.create({
            data: {
              name: subjectName,
              slug,
              isActive: true,
              comingSoon: !isLive,
              gradeId: grade.id,
            },
          });
        }
      }
    }
  }

  console.log('Categories, grades and subjects created.');

  // ── ADMIN USER ────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@platform.com',
      passwordHash: adminHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isVerified: true,
    },
  });
  await prisma.adminProfile.create({
    data: { userId: admin.id },
  });

  // ── TEACHER USER ──────────────────────────────────
  const teacherHash = await bcrypt.hash('Teacher123!', 12);
  const teacher = await prisma.user.create({
    data: {
      email: 'teacher@platform.com',
      passwordHash: teacherHash,
      firstName: 'Jane',
      lastName: 'Teacher',
      role: 'TEACHER',
      isVerified: true,
    },
  });
  await prisma.teacherProfile.create({
    data: {
      userId: teacher.id,
      isApproved: true,
      approvedAt: new Date(),
      approvedById: admin.id,
    },
  });

  // ── STUDENT USER ──────────────────────────────────
  const studentHash = await bcrypt.hash('Student123!', 12);
  const student = await prisma.user.create({
    data: {
      email: 'student@platform.com',
      passwordHash: studentHash,
      firstName: 'Alex',
      lastName: 'Student',
      role: 'STUDENT',
      isVerified: true,
    },
  });
  await prisma.studentProfile.create({
    data: { userId: student.id },
  });

  // ── PARENT USER ───────────────────────────────────
  const parentHash = await bcrypt.hash('Parent123!', 12);
  const parent = await prisma.user.create({
    data: {
      email: 'parent@platform.com',
      passwordHash: parentHash,
      firstName: 'Pat',
      lastName: 'Parent',
      role: 'PARENT',
      isVerified: true,
    },
  });
  await prisma.parentProfile.create({
    data: { userId: parent.id },
  });

  console.log('Users created.');
  console.log('');
  console.log('═══════════════════════════════════');
  console.log('Seed complete. Login credentials:');
  console.log('  Admin:   admin@platform.com / Admin123!');
  console.log('  Teacher: teacher@platform.com / Teacher123!');
  console.log('  Student: student@platform.com / Student123!');
  console.log('  Parent:  parent@platform.com / Parent123!');
  console.log('═══════════════════════════════════');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
