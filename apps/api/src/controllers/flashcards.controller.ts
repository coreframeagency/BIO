import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getParam } from '../lib/params';
import { errorResponse, successResponse } from '../types';

const createFlashcardsSchema = z.object({
  lessonId: z.string(),
  cards: z
    .array(
      z.object({
        front: z.string().min(1),
        back: z.string().min(1),
        order: z.number().int().optional(),
      })
    )
    .min(1),
});

const attemptSchema = z.object({
  result: z.enum(['easy', 'medium', 'hard']),
});

export async function listFlashcards(req: Request, res: Response) {
  const lessonId = req.query.lessonId as string | undefined;
  if (!lessonId) {
    res.status(400).json(errorResponse('lessonId is required'));
    return;
  }

  const flashcards = await prisma.flashcard.findMany({
    where: { lessonId, isActive: true },
    orderBy: { order: 'asc' },
  });

  res.json(successResponse(flashcards));
}

export async function createFlashcards(req: Request, res: Response) {
  try {
    const { lessonId, cards } = createFlashcardsSchema.parse(req.body);

    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
      res.status(404).json(errorResponse('Lesson not found'));
      return;
    }

    const created = await prisma.$transaction(async (tx) => {
      await tx.flashcard.deleteMany({ where: { lessonId } });
      await tx.flashcard.createMany({
        data: cards.map((card, i) => ({
          lessonId,
          front: card.front,
          back: card.back,
          order: card.order ?? i,
        })),
      });
      return tx.flashcard.findMany({
        where: { lessonId },
        orderBy: { order: 'asc' },
      });
    });

    res.status(201).json(successResponse(created));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create flashcards';
    res.status(400).json(errorResponse(message));
  }
}

export async function recordAttempt(req: Request, res: Response) {
  try {
    const { result } = attemptSchema.parse(req.body);
    const flashcardId = getParam(req.params.id);

    const flashcard = await prisma.flashcard.findUnique({ where: { id: flashcardId } });
    if (!flashcard) {
      res.status(404).json(errorResponse('Flashcard not found'));
      return;
    }

    const attempt = await prisma.flashcardAttempt.create({
      data: {
        flashcardId,
        userId: req.user!.userId,
        result,
      },
    });

    res.status(201).json(successResponse(attempt));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to record attempt';
    res.status(400).json(errorResponse(message));
  }
}

export async function getFlashcardStats(req: Request, res: Response) {
  const lessonId = req.query.lessonId as string | undefined;
  if (!lessonId) {
    res.status(400).json(errorResponse('lessonId is required'));
    return;
  }

  const userId = req.user!.userId;
  const flashcards = await prisma.flashcard.findMany({
    where: { lessonId, isActive: true },
    select: { id: true },
  });

  const flashcardIds = flashcards.map((f) => f.id);
  const attempts = await prisma.flashcardAttempt.findMany({
    where: { userId, flashcardId: { in: flashcardIds } },
    orderBy: { createdAt: 'desc' },
  });

  const stats = flashcardIds.map((flashcardId) => {
    const cardAttempts = attempts.filter((a) => a.flashcardId === flashcardId);
    return {
      flashcardId,
      easy: cardAttempts.filter((a) => a.result === 'easy').length,
      medium: cardAttempts.filter((a) => a.result === 'medium').length,
      hard: cardAttempts.filter((a) => a.result === 'hard').length,
      lastResult: cardAttempts[0]?.result ?? null,
    };
  });

  res.json(successResponse(stats));
}
