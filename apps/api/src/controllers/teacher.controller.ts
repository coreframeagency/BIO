import { Response, Request } from 'express';
import { prisma } from '../lib/prisma';
import { errorResponse, successResponse } from '../types';

export async function getTeacherDashboard(req: Request, res: Response) {
  try {
    const profileId = req.user!.profileId;
    const teacherId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: teacherId },
      select: { metadata: true },
    });

    const meta = (user?.metadata ?? {}) as Record<string, unknown>;
    const allowedSubjectIds = (meta.allowedSubjectIds as string[]) ?? [];

    const assignedSubjects =
      allowedSubjectIds.length > 0
        ? await prisma.subject.findMany({
            where: { id: { in: allowedSubjectIds } },
            include: {
              grade: {
                include: {
                  category: {
                    include: { examBoard: true },
                  },
                },
              },
            },
          })
        : [];

    const [
      totalLessons,
      publishedLessons,
      pendingLessons,
      draftLessons,
      pastPapersCount,
      questionsCount,
    ] = await Promise.all([
      prisma.lesson.count({ where: { teacherProfileId: profileId } }),
      prisma.lesson.count({
        where: { teacherProfileId: profileId, status: 'PUBLISHED' },
      }),
      prisma.lesson.count({
        where: { teacherProfileId: profileId, status: 'PENDING_REVIEW' },
      }),
      prisma.lesson.count({ where: { teacherProfileId: profileId, status: 'DRAFT' } }),
      prisma.pastPaper.count({ where: { teacherProfileId: profileId } }),
      prisma.question.count({ where: { createdById: teacherId } }),
    ]);

    const flashcardsCount = 0;

    const recentLessonsRaw = await prisma.lesson.findMany({
      where: { teacherProfileId: profileId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        unitLinks: {
          include: {
            unit: {
              include: {
                subject: {
                  include: {
                    grade: {
                      include: {
                        category: {
                          include: { examBoard: true },
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

    const recentLessons = recentLessonsRaw.map((lesson) => {
      const subject = lesson.unitLinks[0]?.unit?.subject ?? null;
      return {
        id: lesson.id,
        title: lesson.title,
        status: lesson.status,
        createdAt: lesson.createdAt,
        subject: subject
          ? {
              name: subject.name,
              gradeName: subject.grade?.name ?? '',
              categoryName: subject.grade?.category?.name ?? '',
              boardName: subject.grade?.category?.examBoard?.name ?? '',
            }
          : null,
      };
    });

    return res.json(
      successResponse({
        stats: {
          totalLessons,
          publishedLessons,
          pendingLessons,
          draftLessons,
          pastPapersCount,
          questionsCount,
          flashcardsCount,
          assignedSubjectsCount: assignedSubjects.length,
        },
        assignedSubjects,
        recentLessons,
      })
    );
  } catch (error) {
    console.error('getTeacherDashboard error:', error);
    return res.status(500).json(errorResponse('Failed to load dashboard'));
  }
}

export async function getTeacherStudents(req: Request, res: Response) {
  try {
    const teacherId = (req as Request & { user?: { userId: string } }).user?.userId;
    if (!teacherId) {
      return res.status(401).json(errorResponse('Unauthorized'));
    }

    const user = await prisma.user.findUnique({
      where: { id: teacherId },
      select: { metadata: true },
    });

    const meta = (user?.metadata ?? {}) as Record<string, unknown>;
    const allowedSubjectIds = (meta.allowedSubjectIds as string[]) ?? [];

    if (allowedSubjectIds.length === 0) {
      return res.json(successResponse([]));
    }

    const subscriptions = await prisma.subscription.findMany({
      where: {
        subjectId: { in: allowedSubjectIds },
        status: 'ACTIVE',
      },
      include: {
        studentProfile: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            grade: {
              select: {
                name: true,
                category: {
                  select: {
                    name: true,
                    examBoard: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const seen = new Set<string>();
    const result = subscriptions
      .filter((sub) => {
        const key = `${sub.studentProfileId}-${sub.subjectId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((sub) => ({
        id: sub.id,
        student: sub.studentProfile.user,
        subject: {
          id: sub.subject.id,
          name: sub.subject.name,
          gradeName: sub.subject.grade?.name ?? '',
          categoryName: sub.subject.grade?.category?.name ?? '',
          boardName: sub.subject.grade?.category?.examBoard?.name ?? '',
        },
        subscribedAt: sub.createdAt,
      }));

    return res.json(successResponse(result));
  } catch (error) {
    console.error('getTeacherStudents error:', error);
    return res.status(500).json(errorResponse('Failed to load students'));
  }
}

export async function getTeacherLessonsWithFree(req: Request, res: Response) {
  try {
    const teacherId = (req as Request & { user?: { userId: string } }).user?.userId;
    const profileId = req.user!.profileId;
    if (!teacherId) {
      return res.status(401).json(errorResponse('Unauthorized'));
    }

    const user = await prisma.user.findUnique({
      where: { id: teacherId },
      select: { metadata: true },
    });

    const meta = (user?.metadata ?? {}) as Record<string, unknown>;
    const allowedSubjectIds = (meta.allowedSubjectIds as string[]) ?? [];

    const lessons = await prisma.lesson.findMany({
      where: { teacherProfileId: profileId },
      orderBy: { createdAt: 'asc' },
      include: {
        unitLinks: {
          include: {
            unit: {
              include: {
                subject: {
                  include: {
                    grade: {
                      include: {
                        category: {
                          include: {
                            examBoard: true,
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

    const firstLessonPerSubject = new Map<string, string>();
    for (const lesson of lessons) {
      const subjectId = lesson.unitLinks[0]?.unit?.subject?.id;
      if (subjectId && !firstLessonPerSubject.has(subjectId)) {
        firstLessonPerSubject.set(subjectId, lesson.id);
      }
    }

    const result = lessons.map((lesson) => {
      const subject = lesson.unitLinks[0]?.unit?.subject ?? null;
      const subjectId = subject?.id ?? null;
      const isFree =
        subjectId !== null && firstLessonPerSubject.get(subjectId) === lesson.id;

      return {
        id: lesson.id,
        title: lesson.title,
        status: lesson.status,
        createdAt: lesson.createdAt,
        isFree,
        subject: subject
          ? {
              id: subject.id,
              name: subject.name,
              gradeName: subject.grade?.name ?? '',
              categoryName: subject.grade?.category?.name ?? '',
              boardName: subject.grade?.category?.examBoard?.name ?? '',
            }
          : null,
        isAllowed: subjectId ? allowedSubjectIds.includes(subjectId) : false,
      };
    });

    return res.json(successResponse(result));
  } catch (error) {
    console.error('getTeacherLessonsWithFree error:', error);
    return res.status(500).json(errorResponse('Failed to load lessons'));
  }
}
