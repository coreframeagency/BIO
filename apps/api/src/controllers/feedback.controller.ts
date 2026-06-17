import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { successResponse, errorResponse } from '../types';

const feedbackSchema = z.object({
  category: z.enum(['Bug', 'Suggestion', 'General']),
  message: z.string().min(5).max(2000),
  email: z.string().email().optional().or(z.literal('')),
});

export async function submitFeedback(
  req: Request,
  res: Response
) {
  try {
    const data = feedbackSchema.parse(req.body);

    const title = `[FEEDBACK:${data.category}] ${
      data.email ? `from ${data.email}` : 'Anonymous'
    }`;

    await prisma.announcement.create({
      data: {
        title,
        body: data.message,
        isActive: true,
        publishedAt: new Date(),
      },
    });

    return res.status(201).json(
      successResponse({ message: 'Feedback submitted' })
    );
  } catch (error) {
    console.error('submitFeedback error:', error);
    return res
      .status(400)
      .json(errorResponse('Failed to submit feedback'));
  }
}
