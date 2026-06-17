import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getParam } from '../lib/params';
import { errorResponse } from '../types';

export function requireSubscription(subjectIdParam = 'subjectId') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const subjectId =
      getParam(req.params[subjectIdParam]) ||
      (req.query.subjectId as string) ||
      (req.body?.subjectId as string);

    if (!subjectId || !req.user) {
      res.status(400).json(errorResponse('Subject ID required'));
      return;
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        studentProfileId: req.user.profileId,
        subjectId,
        status: 'ACTIVE',
      },
    });

    if (!subscription) {
      res.status(403).json({
        success: false,
        error: 'SUBSCRIPTION_REQUIRED',
        subjectId,
      });
      return;
    }

    next();
  };
}
