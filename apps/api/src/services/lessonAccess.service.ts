import { prisma } from '../lib/prisma';

export async function getSubjectFreeLessonId(subjectId: string): Promise<string | null> {
  const firstUnit = await prisma.unit.findFirst({
    where: { subjectId, isActive: true },
    orderBy: { order: 'asc' },
  });

  if (!firstUnit) return null;

  const firstLink = await prisma.lessonUnitLink.findFirst({
    where: {
      unitId: firstUnit.id,
      lesson: { status: 'PUBLISHED' },
    },
    orderBy: { lesson: { createdAt: 'asc' } },
  });

  return firstLink?.lessonId ?? null;
}

export async function isFirstFreeLesson(subjectId: string, lessonId: string): Promise<boolean> {
  const freeLessonId = await getSubjectFreeLessonId(subjectId);
  return freeLessonId === lessonId;
}

export async function hasActiveSubscription(
  studentProfileId: string,
  subjectId: string
): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: {
      studentProfileId_subjectId: { studentProfileId, subjectId },
    },
  });

  return subscription?.status === 'ACTIVE';
}
