import { Response, Request } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getParam } from '../lib/params';
import { errorResponse, successResponse } from '../types';

export async function listGrades(req: Request, res: Response) {
  const categoryId = req.query.categoryId as string | undefined;
  const grades = await prisma.grade.findMany({
    where: categoryId ? { categoryId, isActive: true } : { isActive: true },
    orderBy: { order: 'asc' },
    include: {
      subjects: {
        where: { isActive: true },
        orderBy: { name: 'asc' },
      },
    },
  });
  res.json(successResponse(grades));
}

export async function getGrade(req: Request, res: Response) {
  const boardSlug = getParam(req.params.boardSlug);
  const categorySlug = getParam(req.params.categorySlug);
  const gradeSlug = getParam(req.params.gradeSlug);
  const grade = await prisma.grade.findFirst({
    where: {
      slug: gradeSlug,
      category: {
        slug: categorySlug,
        examBoard: { slug: boardSlug },
      },
      isActive: true,
    },
    include: {
      category: { include: { examBoard: true } },
      subjects: {
        where: { isActive: true },
        orderBy: { name: 'asc' },
        include: {
          units: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
            include: {
              lessonLinks: {
                include: {
                  lesson: {
                    select: {
                      id: true,
                      title: true,
                      slug: true,
                      status: true,
                      estimatedMinutes: true,
                      visualStatus: true,
                    },
                  },
                },
              },
            },
          },
          pricing: true,
        },
      },
    },
  });
  if (!grade) {
    res.status(404).json(errorResponse('Grade not found'));
    return;
  }
  res.json(successResponse(grade));
}

const createGradeSchema = z.object({
  categoryId: z.string(),
  name: z.string().min(1),
  slug: z.string().min(1),
  order: z.number().int(),
});

export async function createGrade(req: Request, res: Response) {
  const data = createGradeSchema.parse(req.body);
  const grade = await prisma.grade.create({ data });
  res.status(201).json(successResponse(grade));
}

export async function updateGrade(req: Request, res: Response) {
  const data = createGradeSchema.partial().parse(req.body);
  const grade = await prisma.grade.update({
    where: { id: getParam(req.params.id) },
    data,
  });
  res.json(successResponse(grade));
}

export async function deleteGrade(req: Request, res: Response) {
  await prisma.grade.update({
    where: { id: getParam(req.params.id) },
    data: { isActive: false },
  });
  res.json(successResponse({ message: 'Grade deactivated' }));
}
