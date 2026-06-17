import { Response, Request } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getParam } from '../lib/params';
import { errorResponse, successResponse } from '../types';

const BCRYPT_ROUNDS = 12;

const createTeacherSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  schoolName: z.string().optional(),
  subjectIds: z.array(z.string()).optional(),
});

export async function getStats(_req: Request, res: Response) {
  // v4 - students, subscriptions, subjects, teachers
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [
    totalStudents,
    newStudentsThisWeek,
    activeSubscriptions,
    newSubscriptionsThisWeek,
    availableSubjects,
    totalTeachers,
    newTeachersThisWeek,
    recentSignups,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT', isActive: true } }),
    prisma.user.count({
      where: { role: 'STUDENT', isActive: true, createdAt: { gte: oneWeekAgo } },
    }),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.subscription.count({
      where: { status: 'ACTIVE', createdAt: { gte: oneWeekAgo } },
    }),
    prisma.subject.count({ where: { isActive: true, comingSoon: false } }),
    prisma.user.count({ where: { role: 'TEACHER', isActive: true } }),
    prisma.user.count({
      where: { role: 'TEACHER', isActive: true, createdAt: { gte: oneWeekAgo } },
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      where: { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
  ]);

  res.json(successResponse({
    totalStudents,
    newStudentsThisWeek,
    activeSubscriptions,
    newSubscriptionsThisWeek,
    availableSubjects,
    totalTeachers,
    newTeachersThisWeek,
    recentSignups,
  }));
}

export async function listTeachers(_req: Request, res: Response) {
  const teachers = await prisma.user.findMany({
    where: { role: 'TEACHER' },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      teacherProfile: {
        select: {
          id: true,
          isApproved: true,
          approvedAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(successResponse(teachers));
}

export async function createTeacher(req: Request, res: Response) {
  try {
    const data = createTeacherSchema.parse(req.body);
    const email = data.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json(errorResponse('Email already registered'));
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const metadataObj: Record<string, unknown> = {};
    if (data.schoolName?.trim()) {
      metadataObj.schoolName = data.schoolName.trim();
    }
    if (data.subjectIds && data.subjectIds.length > 0) {
      metadataObj.allowedSubjectIds = data.subjectIds;
    }
    const metadata =
      Object.keys(metadataObj).length > 0 ? metadataObj : undefined;

    const teacher = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: Role.TEACHER,
          ...(metadata ? { metadata: metadata as Prisma.InputJsonValue } : {}),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          metadata: true,
        },
      });

      const teacherProfile = await tx.teacherProfile.create({
        data: {
          userId: user.id,
          isApproved: true,
          approvedAt: new Date(),
          approvedById: req.user!.userId,
        },
        select: {
          id: true,
          isApproved: true,
          approvedAt: true,
        },
      });

      return { ...user, teacherProfile };
    });

    res.status(201).json(successResponse(teacher));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create teacher';
    res.status(400).json(errorResponse(message));
  }
}

export async function softDeleteTeacher(req: Request, res: Response) {
  try {
    const id = getParam(req.params.id);
    const user = await prisma.user.findFirst({
      where: { id, role: 'TEACHER' },
    });
    if (!user) {
      return res.status(404).json(errorResponse('Teacher not found'));
    }
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    return res.json(successResponse({ message: 'Teacher removed' }));
  } catch {
    return res.status(500).json(errorResponse('Failed to remove teacher'));
  }
}

export async function listStudents(_req: Request, res: Response) {
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      metadata: true,
      createdAt: true,
      studentProfile: {
        select: {
          id: true,
          subscriptions: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(successResponse(students));
}

const createStudentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function createStudent(req: Request, res: Response) {
  try {
    const data = createStudentSchema.parse(req.body);
    const email = data.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json(errorResponse('Email already registered'));
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    const student = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: Role.STUDENT,
          isVerified: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
        },
      });

      await tx.studentProfile.create({
        data: { userId: user.id },
      });

      return user;
    });

    res.status(201).json(successResponse(student));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create student';
    res.status(400).json(errorResponse(message));
  }
}

export async function listUsers(req: Request, res: Response) {
  const role = req.query.role as Role | undefined;
  const users = await prisma.user.findMany({
    where: role ? { role } : {},
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(successResponse(users));
}

export async function listPendingTeachers(_req: Request, res: Response) {
  const teachers = await prisma.teacherProfile.findMany({
    where: { isApproved: false },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });
  res.json(successResponse(teachers));
}

export async function approveTeacher(req: Request, res: Response) {
  const teacher = await prisma.teacherProfile.update({
    where: { id: getParam(req.params.id) },
    data: {
      isApproved: true,
      approvedAt: new Date(),
      approvedById: req.user!.userId,
    },
  });
  res.json(successResponse(teacher));
}

export async function listContent(_req: Request, res: Response) {
  const lessons = await prisma.lesson.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 100,
    include: {
      teacherProfile: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
      unitLinks: {
        take: 1,
        include: {
          unit: {
            include: {
              subject: {
                include: {
                  pricing: true,
                  grade: {
                    include: {
                      category: {
                        include: {
                          examBoard: { select: { name: true } },
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

  const mapped = lessons.map((lesson) => {
    const unit = lesson.unitLinks[0]?.unit;
    const subject = unit?.subject;
    const examBoard = subject?.grade?.category?.examBoard;
    return {
      id: lesson.id,
      title: lesson.title,
      status: lesson.status,
      type: 'Lesson',
      createdAt: lesson.createdAt,
      teacher: lesson.teacherProfile?.user
        ? {
            firstName: lesson.teacherProfile.user.firstName,
            lastName: lesson.teacherProfile.user.lastName,
          }
        : null,
      subject: subject
        ? {
            name: subject.name,
            pricing: subject.pricing ?? null,
            grade: subject.grade
              ? {
                  name: subject.grade.name,
                  category: subject.grade.category
                    ? {
                        name: subject.grade.category.name,
                        examBoard:
                          subject.grade.category.examBoard ?? null,
                      }
                    : null,
                }
              : null,
          }
        : null,
    };
  });

  res.json(successResponse(mapped));
}

export async function approveContent(req: Request, res: Response) {
  try {
    const id = getParam(req.params.id);
    const lesson = await prisma.lesson.findUnique({ where: { id } });
    if (!lesson) {
      return res.status(404).json(errorResponse('Lesson not found'));
    }
    if (lesson.status === 'PUBLISHED') {
      return res.status(400).json(errorResponse('Already published'));
    }
    const updated = await prisma.lesson.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    return res.json(successResponse(updated));
  } catch (error) {
    console.error('approveContent error:', error);
    return res.status(500).json(errorResponse('Failed to approve content'));
  }
}

export async function listAllSubscriptions(_req: Request, res: Response) {
  const subscriptions = await prisma.subscription.findMany({
    include: {
      subject: {
        include: {
          grade: {
            include: {
              category: {
                include: {
                  examBoard: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      studentProfile: {
        include: {
          user: {
            select: { email: true, firstName: true, lastName: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const mapped = subscriptions.map((sub) => ({
    id: sub.id,
    status: sub.status,
    interval: sub.interval,
    createdAt: sub.createdAt,
    student: sub.studentProfile.user,
    subject: {
      name: sub.subject.name,
      grade: {
        slug: sub.subject.grade?.slug ?? '',
        name: sub.subject.grade?.name ?? '',
        category: {
          examBoard: {
            name: sub.subject.grade?.category?.examBoard?.name ?? '—',
          },
        },
      },
    },
  }));

  res.json(successResponse(mapped));
}

const schoolSchema = z.object({
  name: z.string().min(1),
  country: z.string().min(1),
  city: z.string().optional(),
  logoUrl: z.string().url().optional(),
});

export async function listSchools(_req: Request, res: Response) {
  const schools = await prisma.school.findMany({ where: { isActive: true } });
  res.json(successResponse(schools));
}

export async function createSchool(req: Request, res: Response) {
  const data = schoolSchema.parse(req.body);
  const school = await prisma.school.create({ data });
  res.status(201).json(successResponse(school));
}

const announcementSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  targetRole: z.enum(['STUDENT', 'PARENT', 'TEACHER', 'ADMIN']).optional(),
  expiresAt: z.string().datetime().optional(),
});

export async function listAnnouncements(req: Request, res: Response) {
  const announcements = await prisma.announcement.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(successResponse(announcements));
}

export async function createAnnouncement(req: Request, res: Response) {
  const data = announcementSchema.parse(req.body);
  const announcement = await prisma.announcement.create({
    data: {
      ...data,
      targetRole: data.targetRole as Role | undefined,
      publishedAt: new Date(),
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    },
  });
  res.status(201).json(successResponse(announcement));
}

export async function manageExamBoards(req: Request, res: Response) {
  const boards = await prisma.examBoard.findMany({ include: { categories: true } });
  res.json(successResponse(boards));
}

export async function manageSubjects(req: Request, res: Response) {
  const subjects = await prisma.subject.findMany({
    include: {
      grade: { include: { category: { include: { examBoard: true } } } },
      units: true,
      pricing: true,
    },
  });
  res.json(successResponse(subjects));
}

export async function manageGrades(req: Request, res: Response) {
  const grades = await prisma.grade.findMany({
    include: { category: true, subjects: true },
  });
  res.json(successResponse(grades));
}

export async function manageUnits(req: Request, res: Response) {
  const units = await prisma.unit.findMany({
    include: { subject: { include: { grade: true } } },
  });
  res.json(successResponse(units));
}

const freeAccessSchema = z.object({
  studentUserId: z.string(),
  subjectId: z.string(),
});

export async function grantFreeAccess(req: Request, res: Response) {
  try {
    const { studentUserId, subjectId } = freeAccessSchema.parse(req.body);

    const studentProfile = await prisma.studentProfile.findFirst({
      where: { userId: studentUserId },
    });

    if (!studentProfile) {
      return res.status(404).json(errorResponse('Student not found'));
    }

    const existing = await prisma.subscription.findFirst({
      where: {
        studentProfileId: studentProfile.id,
        subjectId,
      },
    });

    if (existing) {
      const updated = await prisma.subscription.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE' },
      });
      return res.json(successResponse(updated));
    }

    const now = new Date();
    const end = new Date(now);
    end.setFullYear(end.getFullYear() + 10);

    const subscription = await prisma.subscription.create({
      data: {
        studentProfileId: studentProfile.id,
        subjectId,
        status: 'ACTIVE',
        interval: 'YEARLY',
        currentPeriodStart: now,
        currentPeriodEnd: end,
      },
    });

    return res.status(201).json(successResponse(subscription));
  } catch (error) {
    console.error('grantFreeAccess error:', error);
    return res.status(500).json(errorResponse('Failed to grant access'));
  }
}

const pricingSchema = z.object({
  subjectId: z.string(),
  monthlyPriceCents: z.number().int(),
  yearlyPriceCents: z.number().int(),
  currency: z.string().default('GBP'),
});

export async function upsertPricing(req: Request, res: Response) {
  const data = pricingSchema.parse(req.body);
  const pricing = await prisma.subjectPricing.upsert({
    where: { subjectId: data.subjectId },
    create: data,
    update: data,
  });
  res.json(successResponse(pricing));
}

const createSubjectSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  gradeId: z.string().min(1),
  comingSoon: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export async function createSubject(
  req: Request,
  res: Response
) {
  try {
    const data = createSubjectSchema.parse(req.body);
    const subject = await prisma.subject.create({
      data: {
        name: data.name,
        slug: data.slug,
        gradeId: data.gradeId,
        comingSoon: data.comingSoon,
        isActive: data.isActive,
      },
      include: {
        grade: {
          include: {
            category: { include: { examBoard: true } },
          },
        },
      },
    });
    res.status(201).json(successResponse(subject));
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : 'Failed to create subject';
    res.status(400).json(errorResponse(message));
  }
}

export async function toggleSubjectAvailability(
  req: Request,
  res: Response
) {
  try {
    const id = getParam(req.params.id);
    const { comingSoon } = req.body as { comingSoon: boolean };
    const subject = await prisma.subject.update({
      where: { id },
      data: { comingSoon },
    });
    res.json(successResponse(subject));
  } catch (error) {
    res.status(500).json(errorResponse('Failed to update subject'));
  }
}

export async function deleteAnnouncement(
  req: Request,
  res: Response
) {
  try {
    const id = getParam(req.params.id);
    await prisma.announcement.update({
      where: { id },
      data: { isActive: false },
    });
    res.json(successResponse({ message: 'Deleted' }));
  } catch {
    res.status(500).json(errorResponse('Failed to delete'));
  }
}

export async function getPricingOverview(
  _req: Request,
  res: Response
) {
  const boards = await prisma.examBoard.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: {
      categories: {
        where: { isActive: true },
        orderBy: { order: 'asc' },
        include: {
          grades: {
            include: {
              subjects: {
                where: { isActive: true },
                take: 1,
                include: { pricing: true },
              },
            },
          },
        },
      },
    },
  });

  const result = boards.map((board) => ({
    id: board.id,
    name: board.name,
    categories: board.categories.map((cat) => {
      const pricedSubject = cat.grades
        .flatMap((g) => g.subjects)
        .find((s) => s.pricing !== null);
      return {
        id: cat.id,
        name: cat.name,
        pricing: pricedSubject?.pricing ?? null,
      };
    }),
  }));

  res.json(successResponse(result));
}

const categoryPricingSchema = z.object({
  categoryId: z.string(),
  subjectPriceCents: z.number().int(),
  paperBundleCents: z.number().int(),
  paperSingleCents: z.number().int(),
  currency: z.string().default('LKR'),
});

export async function upsertCategoryPricing(
  req: Request,
  res: Response
) {
  try {
    const data = categoryPricingSchema.parse(req.body);

    const subjects = await prisma.subject.findMany({
      where: {
        grade: { categoryId: data.categoryId },
        isActive: true,
      },
      select: { id: true },
    });

    if (subjects.length === 0) {
      return res.status(404).json(
        errorResponse('No subjects found in this category')
      );
    }

    await Promise.all(
      subjects.map((s) =>
        prisma.subjectPricing.upsert({
          where: { subjectId: s.id },
          update: {
            monthlyPriceCents: data.subjectPriceCents,
            yearlyPriceCents: data.paperBundleCents,
            stripePriceIdMonthly: String(data.paperSingleCents),
            currency: data.currency,
          },
          create: {
            subjectId: s.id,
            monthlyPriceCents: data.subjectPriceCents,
            yearlyPriceCents: data.paperBundleCents,
            stripePriceIdMonthly: String(data.paperSingleCents),
            stripePriceIdYearly: '',
            currency: data.currency,
          },
        })
      )
    );

    return res.json(
      successResponse({ message: 'Pricing updated for category' })
    );
  } catch (error) {
    console.error('upsertCategoryPricing error:', error);
    return res
      .status(500)
      .json(errorResponse('Failed to update pricing'));
  }
}

export async function softDeleteStudent(req: Request, res: Response) {
  try {
    const id = getParam(req.params.id);
    const user = await prisma.user.findFirst({
      where: { id, role: 'STUDENT' },
    });
    if (!user) {
      return res.status(404).json(errorResponse('Student not found'));
    }
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    return res.json(successResponse({ message: 'Student removed' }));
  } catch {
    return res.status(500).json(errorResponse('Failed to remove student'));
  }
}

export async function softDeleteSubject(req: Request, res: Response) {
  try {
    const id = getParam(req.params.id);
    await prisma.subject.update({
      where: { id },
      data: { isActive: false },
    });
    return res.json(successResponse({ message: 'Subject removed' }));
  } catch {
    return res.status(500).json(errorResponse('Failed to remove subject'));
  }
}

export async function archiveLesson(req: Request, res: Response) {
  try {
    const id = getParam(req.params.id);
    const lesson = await prisma.lesson.findUnique({ where: { id } });
    if (!lesson) {
      return res.status(404).json(errorResponse('Lesson not found'));
    }
    await prisma.lesson.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    return res.json(successResponse({ message: 'Lesson archived' }));
  } catch {
    return res.status(500).json(errorResponse('Failed to archive lesson'));
  }
}

export async function listFeedback(_req: Request, res: Response) {
  const feedback = await prisma.announcement.findMany({
    where: {
      title: { startsWith: '[FEEDBACK:' },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(successResponse(feedback));
}
