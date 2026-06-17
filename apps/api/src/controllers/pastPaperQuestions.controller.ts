import { Request, Response } from 'express';
import { z } from 'zod';
import { Difficulty, Prisma, QuestionStatus, QuestionType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getParam } from '../lib/params';
import { errorResponse, successResponse } from '../types';

const questionTypeEnum = z.enum([
  'MCQ',
  'MULTIPLE_SELECT',
  'SHORT_ANSWER',
  'LONG_ANSWER',
  'TRUE_FALSE',
  'FILL_BLANK',
  'LABEL_DIAGRAM',
  'DATA_ANALYSIS',
  'CALCULATION',
  'MATCHING',
]);

const pastPaperQuestionBodySchema = z.object({
  lessonId: z.string().optional(),
  pastPaperId: z.string().optional(),
  type: questionTypeEnum,
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  marks: z.number().int().min(1).max(20).optional(),
  order: z.number().int().optional(),
  questionText: z.string().min(1),
  modelAnswer: z.string().optional(),
  explanation: z.string().optional(),
  hintText: z.string().optional(),
  mcqOptions: z.unknown().optional(),
  fillBlanks: z.unknown().optional(),
  tableData: z.unknown().optional(),
  year: z.number().int().optional(),
  session: z.string().optional(),
  paperNumber: z.number().int().optional(),
  questionNumber: z.number().int().optional(),
});

const pastPaperInclude = {
  pastPaper: {
    select: {
      id: true,
      year: true,
      month: true,
      paperNumber: true,
    },
  },
} as const;

export async function listPastPaperQuestions(req: Request, res: Response) {
  const lessonId = req.query.lessonId as string | undefined;
  if (!lessonId) {
    res.status(400).json(errorResponse('lessonId query parameter is required'));
    return;
  }

  const questions = await prisma.pastPaperQuestion.findMany({
    where: { lessonId },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    include: pastPaperInclude,
  });

  res.json(successResponse(questions));
}

export async function createPastPaperQuestion(req: Request, res: Response) {
  try {
    const data = pastPaperQuestionBodySchema.parse(req.body);
    const question = await prisma.pastPaperQuestion.create({
      data: {
        lessonId: data.lessonId ?? null,
        pastPaperId: data.pastPaperId ?? null,
        type: data.type as QuestionType,
        status: (data.status as QuestionStatus) ?? 'DRAFT',
        difficulty: (data.difficulty as Difficulty) ?? 'MEDIUM',
        marks: data.marks ?? 1,
        order: data.order ?? 0,
        questionText: data.questionText,
        modelAnswer: data.modelAnswer,
        explanation: data.explanation,
        hintText: data.hintText,
        mcqOptions: data.mcqOptions as Prisma.InputJsonValue | undefined,
        fillBlanks: data.fillBlanks as Prisma.InputJsonValue | undefined,
        tableData: data.tableData as Prisma.InputJsonValue | undefined,
        year: data.year,
        session: data.session,
        paperNumber: data.paperNumber,
        questionNumber: data.questionNumber,
        createdById: req.user!.userId,
      },
      include: pastPaperInclude,
    });
    res.status(201).json(successResponse(question));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create past paper question';
    res.status(400).json(errorResponse(message));
  }
}

export async function updatePastPaperQuestion(req: Request, res: Response) {
  try {
    const data = pastPaperQuestionBodySchema.partial().parse(req.body);
    const updateData: Prisma.PastPaperQuestionUpdateInput = {};

    if (data.lessonId !== undefined) {
      updateData.lesson = data.lessonId
        ? { connect: { id: data.lessonId } }
        : { disconnect: true };
    }
    if (data.pastPaperId !== undefined) {
      updateData.pastPaper = data.pastPaperId
        ? { connect: { id: data.pastPaperId } }
        : { disconnect: true };
    }
    if (data.type) updateData.type = data.type as QuestionType;
    if (data.status) updateData.status = data.status as QuestionStatus;
    if (data.difficulty) updateData.difficulty = data.difficulty as Difficulty;
    if (data.marks !== undefined) updateData.marks = data.marks;
    if (data.order !== undefined) updateData.order = data.order;
    if (data.questionText !== undefined) updateData.questionText = data.questionText;
    if (data.modelAnswer !== undefined) updateData.modelAnswer = data.modelAnswer;
    if (data.explanation !== undefined) updateData.explanation = data.explanation;
    if (data.hintText !== undefined) updateData.hintText = data.hintText;
    if (data.mcqOptions !== undefined) {
      updateData.mcqOptions = data.mcqOptions as Prisma.InputJsonValue;
    }
    if (data.fillBlanks !== undefined) {
      updateData.fillBlanks = data.fillBlanks as Prisma.InputJsonValue;
    }
    if (data.tableData !== undefined) {
      updateData.tableData = data.tableData as Prisma.InputJsonValue;
    }
    if (data.year !== undefined) updateData.year = data.year;
    if (data.session !== undefined) updateData.session = data.session;
    if (data.paperNumber !== undefined) updateData.paperNumber = data.paperNumber;
    if (data.questionNumber !== undefined) updateData.questionNumber = data.questionNumber;

    const question = await prisma.pastPaperQuestion.update({
      where: { id: getParam(req.params.id) },
      data: updateData,
      include: pastPaperInclude,
    });
    res.json(successResponse(question));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update past paper question';
    res.status(400).json(errorResponse(message));
  }
}

export async function deletePastPaperQuestion(req: Request, res: Response) {
  await prisma.pastPaperQuestion.delete({
    where: { id: getParam(req.params.id) },
  });
  res.json(successResponse({ message: 'Deleted' }));
}
