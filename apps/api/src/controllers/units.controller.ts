import { Response, Request } from 'express';

import { z } from 'zod';

import { prisma } from '../lib/prisma';

import { getParam } from '../lib/params';

import { errorResponse, successResponse } from '../types';



export async function listUnits(req: Request, res: Response) {

  const subjectId = req.query.subjectId as string | undefined;

  const gradeId = req.query.gradeId as string | undefined;



  const units = await prisma.unit.findMany({

    where: {

      isActive: true,

      ...(subjectId ? { subjectId } : {}),

      ...(gradeId ? { subject: { gradeId } } : {}),

    },

    orderBy: { order: 'asc' },

    include: {

      subject: {

        select: {

          id: true,

          name: true,

          slug: true,

          color: true,

          grade: {

            select: {

              id: true,

              name: true,

              slug: true,

              category: {

                select: {

                  examBoard: { select: { id: true, name: true, slug: true } },

                },

              },

            },

          },

        },

      },

      _count: { select: { lessonLinks: true } },

    },

  });

  res.json(successResponse(units));

}



export async function getUnit(req: Request, res: Response) {

  const boardSlug = getParam(req.params.boardSlug);

  const subjectSlug = getParam(req.params.subjectSlug);

  const gradeSlug = getParam(req.params.gradeSlug);

  const unitSlug = getParam(req.params.unitSlug);

  const unit = await prisma.unit.findFirst({

    where: {

      slug: unitSlug,

      isActive: true,

      subject: {

        slug: subjectSlug,

        grade: {

          slug: gradeSlug,

          category: { examBoard: { slug: boardSlug } },

        },

      },

    },

    include: {

      subject: {

        include: {

          grade: {

            include: {

              category: { include: { examBoard: true } },

            },

          },

          pricing: true,

        },

      },

      lessonLinks: {

        where: { lesson: { status: 'PUBLISHED' } },

        include: {

          lesson: {

            select: {

              id: true,

              title: true,

              slug: true,

              description: true,

              estimatedMinutes: true,

              learningObjectives: true,

              visualStatus: true,

            },

          },

        },

      },

    },

  });

  if (!unit) {

    res.status(404).json(errorResponse('Unit not found'));

    return;

  }

  res.json(successResponse(unit));

}



const createUnitSchema = z.object({

  subjectId: z.string(),

  name: z.string().min(1),

  slug: z.string().min(1),

  description: z.string().optional(),

  order: z.number().int(),

});



export async function createUnit(req: Request, res: Response) {

  const data = createUnitSchema.parse(req.body);

  if (req.user!.role === 'TEACHER') {
    const teacherUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { metadata: true },
    });
    const meta = teacherUser?.metadata as Record<string, unknown> | null;
    const allowedSubjectIds = meta?.allowedSubjectIds as string[] | undefined;
    if (
      allowedSubjectIds &&
      allowedSubjectIds.length > 0 &&
      !allowedSubjectIds.includes(data.subjectId)
    ) {
      res.status(403).json(
        errorResponse('You are not assigned to this subject.')
      );
      return;
    }
  }

  const unit = await prisma.unit.create({ data });

  res.status(201).json(successResponse(unit));

}



export async function updateUnit(req: Request, res: Response) {

  const data = createUnitSchema.partial().parse(req.body);

  const unit = await prisma.unit.update({

    where: { id: getParam(req.params.id) },

    data,

  });

  res.json(successResponse(unit));

}



export async function deleteUnit(req: Request, res: Response) {

  await prisma.unit.update({

    where: { id: getParam(req.params.id) },

    data: { isActive: false },

  });

  res.json(successResponse({ message: 'Unit deactivated' }));

}

