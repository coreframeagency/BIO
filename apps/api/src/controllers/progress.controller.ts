import { Response, Request } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getParam } from '../lib/params';
import { errorResponse, successResponse } from '../types';

const lessonSubjectInclude = {
  lesson: {
    include: {
      unitLinks: {
        take: 1,
        include: {
          unit: {
            include: { subject: true },
          },
        },
      },
    },
  },
} as const;

function getSubjectFromProgress(progress: {
  lesson: {
    unitLinks: { unit: { subject: { id: string; name: string } } }[];
  };
}) {
  return progress.lesson.unitLinks[0]?.unit.subject;
}

function calculateStreakDays(accessDates: Date[]): number {
  if (accessDates.length === 0) return 0;

  const uniqueDays = new Set(
    accessDates.map((date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (uniqueDays.has(cursor.getTime())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export async function getProgress(req: Request, res: Response) {
  const progress = await prisma.lessonProgress.findMany({
    where: { studentProfileId: req.user!.profileId },
    include: {
      lesson: {
        select: {
          id: true,
          title: true,
          slug: true,
          estimatedMinutes: true,
          unitLinks: {
            take: 1,
            select: {
              unit: {
                select: {
                  subjectId: true,
                  subject: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { lastAccessedAt: 'desc' },
  });
  res.json(successResponse(progress));
}

export async function getRecentProgress(req: Request, res: Response) {
  const progress = await prisma.lessonProgress.findMany({
    where: { studentProfileId: req.user!.profileId },
    orderBy: { lastAccessedAt: 'desc' },
    take: 3,
    include: lessonSubjectInclude,
  });

  const items = progress.map((item) => {
    const subject = getSubjectFromProgress(item);
    return {
      id: item.id,
      lessonTitle: item.lesson.title,
      subjectName: subject?.name ?? 'Unknown',
      latestScore: item.latestScore,
      lastAccessedAt: item.lastAccessedAt,
      completedAt: item.completedAt,
      isComplete: item.isComplete,
    };
  });

  res.json(successResponse(items));
}

export async function getProgressStats(req: Request, res: Response) {
  const allProgress = await prisma.lessonProgress.findMany({
    where: { studentProfileId: req.user!.profileId },
    select: {
      isComplete: true,
      latestScore: true,
      totalTimeSeconds: true,
      lastAccessedAt: true,
    },
  });

  const lessonsCompleted = allProgress.filter((p) => p.isComplete).length;
  const scored = allProgress.filter((p) => p.latestScore != null);
  const averageScore =
    scored.length > 0
      ? Math.round(scored.reduce((sum, p) => sum + (p.latestScore ?? 0), 0) / scored.length)
      : 0;
  const timeStudiedSeconds = allProgress.reduce((sum, p) => sum + p.totalTimeSeconds, 0);
  const streakDays = calculateStreakDays(
    allProgress.filter((p) => p.lastAccessedAt).map((p) => p.lastAccessedAt!)
  );

  res.json(
    successResponse({
      lessonsCompleted,
      averageScore,
      timeStudiedSeconds,
      streakDays,
    })
  );
}

export async function getLessonProgress(req: Request, res: Response) {
  const progress = await prisma.lessonProgress.findUnique({
    where: {
      studentProfileId_lessonId: {
        studentProfileId: req.user!.profileId,
        lessonId: getParam(req.params.lessonId),
      },
    },
  });
  res.json(successResponse(progress));
}

const updateProgressSchema = z.object({
  isComplete: z.boolean().optional(),
  totalTimeSeconds: z.number().int().optional(),
  visualWatched: z.boolean().optional(),
  studentNotes: z.string().optional(),
  bestScore: z.number().int().optional(),
  latestScore: z.number().int().optional(),
});

interface UnitAttemptAggregate {
  unitId: string;
  unitName: string;
  unitSlug: string;
  subjectId: string;
  subjectName: string;
  boardSlug: string;
  categorySlug: string;
  gradeSlug: string;
  subjectSlug: string;
  correct: number;
  total: number;
}

export async function getWeakTopics(req: Request, res: Response) {
  const attempts = await prisma.questionAttempt.findMany({
    where: { userId: req.user!.userId },
    include: {
      question: {
        include: {
          lesson: {
            include: {
              unitLinks: {
                take: 1,
                include: {
                  unit: {
                    include: {
                      subject: {
                        include: {
                          grade: {
                            include: {
                              category: { include: { examBoard: true } },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const unitMap = new Map<string, UnitAttemptAggregate>();

  for (const attempt of attempts) {
    const unit = attempt.question.lesson?.unitLinks[0]?.unit;
    if (!unit?.subject) continue;

    const subject = unit.subject;
    const key = `${subject.id}:${unit.id}`;
    const existing = unitMap.get(key) ?? {
      unitId: unit.id,
      unitName: unit.name,
      unitSlug: unit.slug,
      subjectId: subject.id,
      subjectName: subject.name,
      boardSlug: subject.grade?.category?.examBoard?.slug ?? '',
      categorySlug: subject.grade?.category?.slug ?? '',
      gradeSlug: subject.grade?.slug ?? '',
      subjectSlug: subject.slug,
      correct: 0,
      total: 0,
    };

    existing.total += 1;
    if (attempt.isCorrect === true) {
      existing.correct += 1;
    }
    unitMap.set(key, existing);
  }

  const bySubject = new Map<
    string,
    {
      subjectName: string;
      subjectId: string;
      boardSlug: string;
      categorySlug: string;
      gradeSlug: string;
      subjectSlug: string;
      weakUnits: {
        unitName: string;
        unitId: string;
        unitSlug: string;
        score: number;
        totalAttempts: number;
      }[];
    }
  >();

  for (const aggregate of unitMap.values()) {
    const score = Math.round((aggregate.correct / aggregate.total) * 100);
    if (score >= 60) continue;

    const subjectEntry = bySubject.get(aggregate.subjectId) ?? {
      subjectName: aggregate.subjectName,
      subjectId: aggregate.subjectId,
      boardSlug: aggregate.boardSlug,
      categorySlug: aggregate.categorySlug,
      gradeSlug: aggregate.gradeSlug,
      subjectSlug: aggregate.subjectSlug,
      weakUnits: [],
    };

    subjectEntry.weakUnits.push({
      unitName: aggregate.unitName,
      unitId: aggregate.unitId,
      unitSlug: aggregate.unitSlug,
      score,
      totalAttempts: aggregate.total,
    });

    bySubject.set(aggregate.subjectId, subjectEntry);
  }

  res.json(successResponse(Array.from(bySubject.values())));
}

export async function upsertProgress(req: Request, res: Response) {
  const data = updateProgressSchema.parse(req.body);
  const lessonId = getParam(req.params.lessonId);

  const progress = await prisma.lessonProgress.upsert({
    where: {
      studentProfileId_lessonId: {
        studentProfileId: req.user!.profileId,
        lessonId,
      },
    },
    create: {
      studentProfileId: req.user!.profileId,
      lessonId,
      lastAccessedAt: new Date(),
      ...data,
      completedAt: data.isComplete ? new Date() : undefined,
      visualWatchedAt: data.visualWatched ? new Date() : undefined,
      attemptCount: 1,
    },
    update: {
      lastAccessedAt: new Date(),
      ...data,
      completedAt: data.isComplete ? new Date() : undefined,
      visualWatchedAt: data.visualWatched ? new Date() : undefined,
      attemptCount: { increment: 1 },
    },
  });

  res.json(successResponse(progress));
}

