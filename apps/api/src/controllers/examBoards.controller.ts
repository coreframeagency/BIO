import { Response, Request } from 'express';

import { z } from 'zod';

import { prisma } from '../lib/prisma';

import { getParam } from '../lib/params';

import { errorResponse, successResponse } from '../types';



export async function listExamBoards(_req: Request, res: Response) {

  const boards = await prisma.examBoard.findMany({

    where: { isActive: true },

    orderBy: { name: 'asc' },

    include: {

      categories: {

        where: { isActive: true },

        orderBy: { order: 'asc' },

      },

      _count: { select: { categories: true } },

    },

  });

  res.json(successResponse(boards));

}



export async function getExamBoard(req: Request, res: Response) {

  const board = await prisma.examBoard.findUnique({

    where: { slug: getParam(req.params.slug) },

    include: {

      categories: {

        where: { isActive: true },

        orderBy: { order: 'asc' },

        include: {

          grades: {

            where: { isActive: true },

            orderBy: { order: 'asc' },

            include: {

              subjects: {

                where: { isActive: true },

                include: { pricing: true },

              },

            },

          },

        },

      },

    },

  });

  if (!board) {

    res.status(404).json(errorResponse('Exam board not found'));

    return;

  }

  res.json(successResponse(board));

}



const createBoardSchema = z.object({

  name: z.string().min(1),

  slug: z.string().min(1),

  logoUrl: z.string().url().optional(),

  country: z.string().default('UK'),

});



export async function createExamBoard(req: Request, res: Response) {

  const data = createBoardSchema.parse(req.body);

  const board = await prisma.examBoard.create({ data });

  res.status(201).json(successResponse(board));

}



export async function updateExamBoard(req: Request, res: Response) {

  const data = createBoardSchema.partial().parse(req.body);

  const board = await prisma.examBoard.update({

    where: { id: getParam(req.params.id) },

    data,

  });

  res.json(successResponse(board));

}



export async function deleteExamBoard(req: Request, res: Response) {

  await prisma.examBoard.update({

    where: { id: getParam(req.params.id) },

    data: { isActive: false },

  });

  res.json(successResponse({ message: 'Exam board deactivated' }));

}

