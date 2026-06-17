import { Response, Request } from 'express';
import { prisma } from '../lib/prisma';
import { successResponse } from '../types';

export async function getProfile(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      avatarUrl: true,
      isVerified: true,
      createdAt: true,
      metadata: true,
      studentProfile: true,
      parentProfile: { include: { studentLinks: { include: { studentProfile: { include: { user: true } } } } } },
      teacherProfile: true,
      adminProfile: true,
    },
  });
  res.json(successResponse(user));
}

export async function updateProfile(req: Request, res: Response) {
  const { firstName, lastName, avatarUrl } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { firstName, lastName, avatarUrl },
  });
  res.json(successResponse(user));
}
