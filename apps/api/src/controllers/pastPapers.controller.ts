import { Request, Response } from 'express';
import { z } from 'zod';
import { PaperType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { uploadPdfToStorage } from '../services/storage.service';
import { getParam } from '../lib/params';
import { errorResponse, successResponse } from '../types';

const createPaperSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().min(1),
  year: z.coerce.number().int(),
  month: z.string().optional(),
  paperNumber: z.coerce.number().int().optional(),
  type: z.enum(['EXAM_PAPER', 'MARK_SCHEME', 'SPECIMEN']).default('EXAM_PAPER'),
});

const subjectInclude = {
  subject: {
    include: {
      grade: {
        include: {
          category: { include: { examBoard: true } },
        },
      },
    },
  },
} as const;

export async function createPastPaper(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json(errorResponse('PDF file required'));
      return;
    }

    const data = createPaperSchema.parse(req.body);
    const { url: pdfUrl, publicId: pdfPublicId } = await uploadPdfToStorage(
      req.file.buffer,
      req.file.originalname
    );

    const paper = await prisma.pastPaper.create({
      data: {
        subjectId: data.subjectId,
        title: data.title,
        year: data.year,
        month: data.month || null,
        paperNumber: data.paperNumber ?? null,
        type: data.type as PaperType,
        teacherProfileId: req.user!.profileId,
        pdfUrl,
        pdfPublicId,
        pdfSizeBytes: req.file.size,
      },
      include: subjectInclude,
    });

    res.status(201).json(successResponse(paper));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create past paper';
    res.status(400).json(errorResponse(message));
  }
}

export async function listPastPapers(req: Request, res: Response): Promise<void> {
  try {
    const subjectId = req.query.subjectId as string | undefined;
    const role = req.user!.role;

    const statusFilter =
      role === 'STUDENT'
        ? { status: 'PUBLISHED' as const }
        : { status: { not: 'ARCHIVED' as const } };

    const papers = await prisma.pastPaper.findMany({
      where: {
        ...statusFilter,
        ...(subjectId ? { subjectId } : {}),
      },
      orderBy: [{ year: 'desc' }, { paperNumber: 'asc' }],
      include: subjectInclude,
    });

    res.json(successResponse(papers));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list past papers';
    res.status(500).json(errorResponse(message));
  }
}

export async function getPastPaper(req: Request, res: Response): Promise<void> {
  try {
    const paper = await prisma.pastPaper.findUnique({
      where: { id: getParam(req.params.id) },
      include: {
        ...subjectInclude,
        paperQuestions: { orderBy: { questionNumber: 'asc' } },
      },
    });

    if (!paper || (paper.status === 'ARCHIVED' && req.user!.role === 'STUDENT')) {
      res.status(404).json(errorResponse('Past paper not found'));
      return;
    }

    res.json(successResponse(paper));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get past paper';
    res.status(500).json(errorResponse(message));
  }
}

export async function deletePastPaper(req: Request, res: Response): Promise<void> {
  try {
    const paper = await prisma.pastPaper.update({
      where: { id: getParam(req.params.id) },
      data: { status: 'ARCHIVED' },
    });

    res.json(successResponse(paper));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete past paper';
    res.status(400).json(errorResponse(message));
  }
}
