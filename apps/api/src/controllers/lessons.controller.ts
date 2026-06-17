import { Response, Request } from 'express';
import { z } from 'zod';
import { ContentStatus, QuestionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getParam } from '../lib/params';
import { generateVisualLesson, stripHtmlToText } from '../services/claude.service';
import {
  hasActiveSubscription,
  isFirstFreeLesson,
} from '../services/lessonAccess.service';
import { errorResponse, successResponse } from '../types';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function listLessons(req: Request, res: Response) {
  const teacherProfileId = req.query.mine === 'true' ? req.user!.profileId : undefined;
  const status = req.query.status as ContentStatus | undefined;

  const lessons = await prisma.lesson.findMany({
    where: {
      ...(teacherProfileId ? { teacherProfileId } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      unitLinks: { include: { unit: { select: { id: true, name: true, slug: true } } } },
      _count: { select: { practiceQuestions: true } },
    },
  });
  res.json(successResponse(lessons));
}

const lessonBySlugInclude = {
  unitLinks: {
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
  practiceQuestions: {
    where: { status: 'PUBLISHED' as QuestionStatus },
    orderBy: { order: 'asc' as const },
  },
  paperQuestionLinks: {
    include: {
      paperQuestion: {
        include: { pastPaper: true },
      },
    },
  },
};

export async function getLessonBySlug(req: Request, res: Response) {
  const lesson = await prisma.lesson.findFirst({
    where: {
      slug: getParam(req.params.lessonSlug),
      status: req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN' ? undefined : 'PUBLISHED',
    },
    include: lessonBySlugInclude,
  });

  if (!lesson) {
    res.status(404).json(errorResponse('Lesson not found'));
    return;
  }
  res.json(successResponse(lesson));
}

export async function getLessonBySlugAuth(req: Request, res: Response) {
  try {
    const lesson = await prisma.lesson.findFirst({
      where: {
        slug: getParam(req.params.slug),
        status: 'PUBLISHED',
      },
      include: lessonBySlugInclude,
    });

    if (!lesson) {
      res.status(404).json(errorResponse('Lesson not found'));
      return;
    }

    const role = req.user?.role;
    if (role !== 'TEACHER' && role !== 'ADMIN') {
      const subject = lesson.unitLinks[0]?.unit?.subject;
      if (subject) {
        const isFree = await isFirstFreeLesson(subject.id, lesson.id);
        if (!isFree) {
          const subscribed = await hasActiveSubscription(req.user!.profileId, subject.id);
          if (!subscribed) {
            const boardSlug = subject.grade?.category?.examBoard?.slug ?? '';
            const categorySlug = subject.grade?.category?.slug ?? '';
            const gradeSlug = subject.grade?.slug ?? '';
            res.status(403).json({
              success: false,
              error: 'SUBSCRIPTION_REQUIRED',
              subjectId: subject.id,
              subjectName: subject.name,
              boardSlug,
              categorySlug,
              gradeSlug,
              subjectSlug: subject.slug,
            });
            return;
          }
        }
      }
    }

    res.json(successResponse(lesson));
  } catch (err) {
    res.status(500).json(errorResponse(String(err)));
  }
}

export async function getLessonById(req: Request, res: Response) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: getParam(req.params.id) },
    include: {
      unitLinks: { include: { unit: true } },
      practiceQuestions: { orderBy: { order: 'asc' } },
      versions: { orderBy: { versionNumber: 'desc' }, take: 10 },
    },
  });
  if (!lesson) {
    res.status(404).json(errorResponse('Lesson not found'));
    return;
  }
  res.json(successResponse(lesson));
}

const createLessonSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  learningObjectives: z.array(z.string()).default([]),
  estimatedMinutes: z.number().int().default(30),
  unitIds: z.array(z.string()).default([]),
  notesHtml: z.string().optional(),
});

export async function createLesson(req: Request, res: Response) {
  const data = createLessonSchema.parse(req.body);
  const slug = data.slug || slugify(data.title);
  const notesRawText = data.notesHtml ? stripHtmlToText(data.notesHtml) : undefined;

  // Check teacher subject restrictions
  if (data.unitIds && data.unitIds.length > 0) {
    const teacherUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { metadata: true },
    });

    const meta = teacherUser?.metadata as Record<string, unknown> | null;
    const allowedSubjectIds = meta?.allowedSubjectIds as string[] | undefined;

    if (allowedSubjectIds && allowedSubjectIds.length > 0) {
      const unit = await prisma.unit.findUnique({
        where: { id: data.unitIds[0] },
        select: { subjectId: true },
      });

      if (unit && !allowedSubjectIds.includes(unit.subjectId)) {
        res.status(403).json(
          errorResponse(
            'You are not assigned to this subject. Contact your admin.'
          )
        );
        return;
      }
    }
  }

  const lesson = await prisma.$transaction(async (tx) => {
    const created = await tx.lesson.create({
      data: {
        teacherProfileId: req.user!.profileId,
        title: data.title,
        slug,
        description: data.description,
        learningObjectives: data.learningObjectives,
        estimatedMinutes: data.estimatedMinutes,
        notesHtml: data.notesHtml,
        notesRawText,
        unitLinks: {
          create: data.unitIds.map((unitId) => ({ unitId })),
        },
      },
      include: { unitLinks: true },
    });

    await tx.lessonVersion.create({
      data: {
        lessonId: created.id,
        versionNumber: 1,
        notesHtml: data.notesHtml,
        status: 'DRAFT',
        savedById: req.user!.userId,
        changeNote: 'Initial creation',
      },
    });

    return created;
  });

  res.status(201).json(successResponse(lesson));
}

const updateLessonSchema = createLessonSchema.partial().extend({
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED']).optional(),
  visualScript: z.string().optional(),
});

export async function updateLesson(req: Request, res: Response) {
  const data = updateLessonSchema.parse(req.body);
  const existing = await prisma.lesson.findUnique({ where: { id: getParam(req.params.id) } });

  if (!existing) {
    res.status(404).json(errorResponse('Lesson not found'));
    return;
  }

  if (existing.teacherProfileId !== req.user!.profileId && req.user!.role !== 'ADMIN') {
    res.status(403).json(errorResponse('Forbidden'));
    return;
  }

  const notesRawText = data.notesHtml ? stripHtmlToText(data.notesHtml) : undefined;

  const lesson = await prisma.$transaction(async (tx) => {
    if (data.unitIds) {
      await tx.lessonUnitLink.deleteMany({ where: { lessonId: getParam(req.params.id) } });
    }

    const updated = await tx.lesson.update({
      where: { id: getParam(req.params.id) },
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        learningObjectives: data.learningObjectives,
        estimatedMinutes: data.estimatedMinutes,
        notesHtml: data.notesHtml,
        ...(notesRawText !== undefined ? { notesRawText } : {}),
        visualScript: data.visualScript,
        status: data.status,
        publishedAt: data.status === 'PUBLISHED' ? new Date() : undefined,
        ...(data.unitIds
          ? { unitLinks: { create: data.unitIds.map((unitId) => ({ unitId })) } }
          : {}),
      },
      include: { unitLinks: true, practiceQuestions: true },
    });

    const versionCount = await tx.lessonVersion.count({ where: { lessonId: getParam(req.params.id) } });
    await tx.lessonVersion.create({
      data: {
        lessonId: getParam(req.params.id),
        versionNumber: versionCount + 1,
        notesHtml: updated.notesHtml,
        visualHtml: updated.visualHtml,
        visualScript: updated.visualScript,
        status: updated.status,
        savedById: req.user!.userId,
        changeNote: 'Updated lesson',
      },
    });

    return updated;
  });

  res.json(successResponse(lesson));
}

export async function approveVisual(req: Request, res: Response) {
  const lesson = await prisma.lesson.update({
    where: { id: getParam(req.params.id) },
    data: {
      visualStatus: 'APPROVED',
      visualApprovedAt: new Date(),
    },
  });
  res.json(successResponse(lesson));
}

export async function rejectVisual(req: Request, res: Response) {
  const lesson = await prisma.lesson.update({
    where: { id: getParam(req.params.id) },
    data: {
      visualStatus: 'REJECTED',
      visualHtml: null,
    },
  });
  // Small delay to ensure DB write is committed
  // before the client starts a new SSE stream
  await new Promise((resolve) => setTimeout(resolve, 500));
  res.json(successResponse(lesson));
}

const VISUAL_GENERATION_TIMEOUT_MS = 5 * 60 * 1000;

function cleanGeneratedHtml(raw: string): string {
  let html = raw.trim();
  if (html.startsWith('```html')) {
    html = html.slice(7);
  }
  if (html.startsWith('```')) {
    html = html.slice(3);
  }
  if (html.endsWith('```')) {
    html = html.slice(0, -3);
  }
  return html.trim();
}

export async function generateVisual(req: Request, res: Response) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin',
      process.env.FRONTEND_URL || '*');
    res.setHeader('Access-Control-Allow-Methods',
      'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers',
      'Authorization, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Credentials',
      'true');
    res.status(204).end();
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
  res.flushHeaders();

  // Send immediate keepalive so client knows connection is alive
  res.write(': keepalive\n\n');
  (res as { flush?: () => void }).flush?.();

  // Keepalive ping every 15 seconds to prevent Render timeout
  const keepaliveInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
      (res as { flush?: () => void }).flush?.();
    } catch {
      clearInterval(keepaliveInterval);
    }
  }, 15000);

  const lessonId = getParam(req.params.id);

  const send = (data: object) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      (res as { flush?: () => void }).flush?.();
    } catch {
      // client disconnected
    }
  };

  req.on('close', () => {
    clearInterval(keepaliveInterval);
  });

  try {
    send({ status: 'reading', message: 'Reading lesson notes...' });

    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });

    if (!lesson) {
      send({ status: 'error', message: 'Lesson not found' });
      res.end();
      return;
    }

    send({ status: 'generating', message: 'Identifying key concepts...' });

    await prisma.lesson.update({
      where: { id: lessonId },
      data: { visualStatus: 'GENERATING' },
    });

    send({ status: 'generating', message: 'Building interactive components...' });

    const html = cleanGeneratedHtml(
      await Promise.race([
        generateVisualLesson(
          lesson.title,
          lesson.notesRawText || lesson.title,
          lesson.learningObjectives
        ),
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error('Visual generation timed out after 5 minutes')),
            VISUAL_GENERATION_TIMEOUT_MS
          );
        }),
      ])
    );

    send({ status: 'saving', message: 'Saving visual lesson...' });

    await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        visualHtml: html,
        visualStatus: 'PENDING_APPROVAL',
        visualGeneratedAt: new Date(),
      },
    });

    const versionCount = await prisma.lessonVersion.count({ where: { lessonId } });

    await prisma.lessonVersion.create({
      data: {
        lessonId,
        versionNumber: versionCount + 1,
        visualHtml: html,
        status: 'PENDING_REVIEW',
        savedById: req.user!.userId,
        changeNote: 'AI generated',
      },
    });

    send({ status: 'complete', message: 'Visual lesson ready for preview!' });
    clearInterval(keepaliveInterval);
    res.end();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    try {
      await prisma.lesson.update({
        where: { id: lessonId },
        data: { visualStatus: 'NOT_GENERATED' },
      });
    } catch {
      // lesson may not exist or already reset
    }

    send({ status: 'error', message });
    clearInterval(keepaliveInterval);
    res.end();
  }
}

export async function deleteLesson(req: Request, res: Response) {
  const existing = await prisma.lesson.findUnique({ where: { id: getParam(req.params.id) } });
  if (!existing) {
    res.status(404).json(errorResponse('Lesson not found'));
    return;
  }

  await prisma.lesson.update({
    where: { id: getParam(req.params.id) },
    data: { status: 'ARCHIVED' },
  });
  res.json(successResponse({ message: 'Lesson archived' }));
}
