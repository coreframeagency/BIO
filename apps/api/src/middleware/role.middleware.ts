import { Role } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { errorResponse } from '../types';

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json(errorResponse('Forbidden'));
      return;
    }
    next();
  };
