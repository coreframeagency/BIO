import { Response, Request } from 'express';

import { z } from 'zod';

import { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';

import { getParam } from '../lib/params';

import { errorResponse, successResponse } from '../types';



const subjectInclude = {

  grade: {

    include: {

      category: {

        include: { examBoard: true },

      },

    },

  },

  units: {

    where: { isActive: true },

    orderBy: { order: 'asc' as const },

  },

  pricing: true,

};



export async function listSubjects(req: Request, res: Response) {

  const { gradeId } = req.query;

  const where: Prisma.SubjectWhereInput = { isActive: true };

  if (gradeId) where.gradeId = String(gradeId);



  const subjects = await prisma.subject.findMany({

    where,

    orderBy: { name: 'asc' },

    include: subjectInclude,

  });

  res.json(successResponse(subjects));

}



export async function getSubject(req: Request, res: Response) {

  const boardSlug = getParam(req.params.boardSlug);

  const subjectSlug = getParam(req.params.subjectSlug);

  const subject = await prisma.subject.findFirst({

    where: {

      slug: subjectSlug,

      isActive: true,

      grade: {

        category: {

          examBoard: { slug: boardSlug },

        },

      },

    },

    include: {

      ...subjectInclude,

      units: {

        where: { isActive: true },

        orderBy: { order: 'asc' },

        include: { _count: { select: { lessonLinks: true } } },

      },

    },

  });

  if (!subject) {

    res.status(404).json(errorResponse('Subject not found'));

    return;

  }

  res.json(successResponse(subject));

}



const createSubjectSchema = z.object({

  gradeId: z.string(),

  name: z.string().min(1),

  slug: z.string().min(1),

  description: z.string().optional(),

  iconUrl: z.string().url().optional(),

  color: z.string().optional(),

  comingSoon: z.boolean().optional(),

});



export async function createSubject(req: Request, res: Response) {

  const data = createSubjectSchema.parse(req.body);

  const subject = await prisma.subject.create({ data });

  res.status(201).json(successResponse(subject));

}



export async function updateSubject(req: Request, res: Response) {

  const data = createSubjectSchema.partial().parse(req.body);

  const subject = await prisma.subject.update({

    where: { id: getParam(req.params.id) },

    data,

  });

  res.json(successResponse(subject));

}



export async function deleteSubject(req: Request, res: Response) {

  await prisma.subject.update({

    where: { id: getParam(req.params.id) },

    data: { isActive: false },

  });

  res.json(successResponse({ message: 'Subject deactivated' }));

}

