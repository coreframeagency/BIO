import { Response, Request } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getParam } from '../lib/params';
import { errorResponse, successResponse } from '../types';

const linkStudentSchema = z.object({
  studentEmail: z.string().email(),
});

const parentProfileInclude = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
  studentLinks: {
    include: {
      studentProfile: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
};

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

function formatParentProfile(
  profile: NonNullable<Awaited<ReturnType<typeof fetchParentProfile>>>
) {
  return {
    id: profile.id,
    userId: profile.userId,
    user: profile.user,
    linkedStudents: profile.studentLinks.map((link) => ({
      linkId: link.id,
      studentProfileId: link.studentProfile.id,
      studentProfile: link.studentProfile,
      user: link.studentProfile.user,
    })),
  };
}

async function fetchParentProfile(parentProfileId: string) {
  return prisma.parentProfile.findUnique({
    where: { id: parentProfileId },
    include: parentProfileInclude,
  });
}

async function assertParentLink(parentProfileId: string, studentProfileId: string) {
  return prisma.parentStudentLink.findFirst({
    where: { parentProfileId, studentProfileId },
  });
}

async function buildStudentSummary(studentProfileId: string) {
  const [progress, attempts, subscriptions] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: { studentProfileId },
      select: {
        isComplete: true,
        latestScore: true,
        totalTimeSeconds: true,
        lastAccessedAt: true,
        lesson: {
          select: {
            unitLinks: {
              take: 1,
              select: { unit: { select: { subjectId: true } } },
            },
          },
        },
      },
    }),
    prisma.questionAttempt.findMany({
      where: { user: { studentProfile: { id: studentProfileId } } },
      include: { question: { select: { marks: true } } },
    }),
    prisma.subscription.findMany({
      where: { studentProfileId, status: 'ACTIVE' },
      include: {
        subject: {
          include: {
            grade: {
              include: {
                category: { include: { examBoard: { select: { name: true } } } },
              },
            },
          },
        },
      },
    }),
  ]);

  const lessonsCompleted = progress.filter((p) => p.isComplete).length;
  const scoredProgress = progress.filter((p) => p.latestScore != null);
  const progressAverage =
    scoredProgress.length > 0
      ? Math.round(
          scoredProgress.reduce((sum, p) => sum + (p.latestScore ?? 0), 0) / scoredProgress.length
        )
      : 0;

  const attemptScores =
    attempts.length > 0
      ? attempts.map((a) =>
          a.question.marks > 0 ? ((a.marksAwarded ?? 0) / a.question.marks) * 100 : 0
        )
      : [];
  const averageScore =
    attemptScores.length > 0
      ? Math.round(attemptScores.reduce((sum, s) => sum + s, 0) / attemptScores.length)
      : progressAverage;

  const streakDays = calculateStreakDays(
    progress.filter((p) => p.lastAccessedAt).map((p) => p.lastAccessedAt!)
  );

  const timeStudiedSeconds = progress.reduce((sum, p) => sum + p.totalTimeSeconds, 0);

  const subjects = await Promise.all(
    subscriptions.map(async (sub) => {
      const subjectId = sub.subjectId;
      const [totalLessons, completedLessons] = await Promise.all([
        prisma.lesson.count({
          where: {
            status: 'PUBLISHED',
            unitLinks: { some: { unit: { subjectId } } },
          },
        }),
        prisma.lessonProgress.count({
          where: {
            studentProfileId,
            isComplete: true,
            lesson: { unitLinks: { some: { unit: { subjectId } } } },
          },
        }),
      ]);

      const boardName = sub.subject.grade?.category?.examBoard?.name ?? '';

      return {
        subjectId,
        name: sub.subject.name,
        examBoard: boardName,
        completedLessons,
        totalLessons,
      };
    })
  );

  return {
    lessonsCompleted,
    averageScore,
    streakDays,
    timeStudiedSeconds,
    subjects,
  };
}

export async function getProfile(req: Request, res: Response) {
  const profile = await fetchParentProfile(req.user!.profileId);

  if (!profile) {
    res.status(404).json(errorResponse('Parent profile not found'));
    return;
  }

  const linkedWithSummary = await Promise.all(
    profile.studentLinks.map(async (link) => ({
      linkId: link.id,
      studentProfileId: link.studentProfile.id,
      studentProfile: link.studentProfile,
      user: link.studentProfile.user,
      summary: await buildStudentSummary(link.studentProfile.id),
    }))
  );

  res.json(
    successResponse({
      id: profile.id,
      userId: profile.userId,
      user: profile.user,
      linkedStudents: linkedWithSummary,
    })
  );
}

export async function linkStudent(req: Request, res: Response) {
  const { studentEmail } = linkStudentSchema.parse(req.body);
  const parentProfileId = req.user!.profileId;

  const studentUser = await prisma.user.findFirst({
    where: { email: studentEmail.toLowerCase(), role: 'STUDENT' },
    include: { studentProfile: true },
  });

  if (!studentUser?.studentProfile) {
    res.status(404).json(errorResponse('No student found with that email'));
    return;
  }

  const existing = await prisma.parentStudentLink.findUnique({
    where: {
      parentProfileId_studentProfileId: {
        parentProfileId,
        studentProfileId: studentUser.studentProfile.id,
      },
    },
  });

  if (existing) {
    res.status(400).json(errorResponse('Already linked to this student'));
    return;
  }

  await prisma.parentStudentLink.create({
    data: {
      parentProfileId,
      studentProfileId: studentUser.studentProfile.id,
    },
  });

  const profile = await fetchParentProfile(parentProfileId);
  if (!profile) {
    res.status(404).json(errorResponse('Parent profile not found'));
    return;
  }

  res.status(201).json(successResponse(formatParentProfile(profile)));
}

export async function unlinkStudent(req: Request, res: Response) {
  const parentProfileId = req.user!.profileId;
  const studentProfileId = getParam(req.params.studentId);

  const link = await assertParentLink(parentProfileId, studentProfileId);
  if (!link) {
    res.status(404).json(errorResponse('Link not found'));
    return;
  }

  await prisma.parentStudentLink.delete({ where: { id: link.id } });

  const profile = await fetchParentProfile(parentProfileId);
  if (!profile) {
    res.status(404).json(errorResponse('Parent profile not found'));
    return;
  }

  res.json(successResponse(formatParentProfile(profile)));
}

export async function getStudentProgress(req: Request, res: Response) {
  const parentProfileId = req.user!.profileId;
  const studentProfileId = getParam(req.params.studentId);

  const link = await assertParentLink(parentProfileId, studentProfileId);
  if (!link) {
    res.status(403).json(errorResponse('Not linked to this student'));
    return;
  }

  const student = await prisma.studentProfile.findUnique({
    where: { id: studentProfileId },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  if (!student) {
    res.status(404).json(errorResponse('Student not found'));
    return;
  }

  const summary = await buildStudentSummary(studentProfileId);

  const recentActivity = await prisma.lessonProgress.findMany({
    where: { studentProfileId },
    orderBy: { lastAccessedAt: 'desc' },
    take: 5,
    include: {
      lesson: { select: { id: true, title: true, slug: true } },
    },
  });

  res.json(
    successResponse({
      student: {
        id: student.id,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        email: student.user.email,
      },
      subjects: summary.subjects,
      lessonsCompleted: summary.lessonsCompleted,
      averageScore: summary.averageScore,
      studyStreak: summary.streakDays,
      timeStudiedSeconds: summary.timeStudiedSeconds,
      recentActivity: recentActivity.map((item) => ({
        id: item.id,
        lessonId: item.lessonId,
        lessonTitle: item.lesson.title,
        lessonSlug: item.lesson.slug,
        score: item.latestScore,
        isComplete: item.isComplete,
        date: item.lastAccessedAt ?? item.updatedAt,
      })),
    })
  );
}
