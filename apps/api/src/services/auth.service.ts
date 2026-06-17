import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Prisma, PrismaClient, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { JwtPayload } from '../types';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

const BCRYPT_ROUNDS = 12;

const registerUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['STUDENT', 'PARENT']),
  phoneNumber: z.string().optional(),
  country: z.string().optional(),
  examBoard: z.string().optional(),
  schoolName: z.string().optional(),
  studyLevel: z.string().optional(),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

function buildUserMetadata(data: RegisterUserInput): Prisma.InputJsonValue | undefined {
  const metadata: Record<string, string> = {};

  if (data.phoneNumber?.trim()) metadata.phoneNumber = data.phoneNumber.trim();
  if (data.country?.trim()) metadata.country = data.country.trim();

  if (data.role === 'STUDENT') {
    if (data.examBoard?.trim()) metadata.examBoard = data.examBoard.trim();
    if (data.schoolName?.trim()) metadata.schoolName = data.schoolName.trim();
    if (data.studyLevel?.trim()) metadata.studyLevel = data.studyLevel.trim();
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function getAccessExpiresIn(): string {
  return process.env.JWT_ACCESS_EXPIRES || '15m';
}

function getRefreshExpiresIn(): string {
  return process.env.JWT_REFRESH_EXPIRES || '7d';
}

function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: getAccessExpiresIn(),
  } as jwt.SignOptions);
}

function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: getRefreshExpiresIn(),
  } as jwt.SignOptions);
}

async function createRoleProfile(tx: TransactionClient, userId: string, role: Role) {
  switch (role) {
    case Role.STUDENT:
      return tx.studentProfile.create({ data: { userId } });
    case Role.PARENT:
      return tx.parentProfile.create({ data: { userId } });
    case Role.TEACHER:
      return tx.teacherProfile.create({ data: { userId } });
    case Role.ADMIN:
      return tx.adminProfile.create({ data: { userId } });
  }
}

async function getProfileId(userId: string, role: Role): Promise<string> {
  switch (role) {
    case Role.STUDENT: {
      const p = await prisma.studentProfile.findUniqueOrThrow({ where: { userId } });
      return p.id;
    }
    case Role.PARENT: {
      const p = await prisma.parentProfile.findUniqueOrThrow({ where: { userId } });
      return p.id;
    }
    case Role.TEACHER: {
      const p = await prisma.teacherProfile.findUniqueOrThrow({ where: { userId } });
      return p.id;
    }
    case Role.ADMIN: {
      const p = await prisma.adminProfile.findUniqueOrThrow({ where: { userId } });
      return p.id;
    }
  }
}

export async function registerUser(input: unknown) {
  const data = registerUserSchema.parse(input);
  const role = data.role as Role;

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) {
    throw new Error('Email already registered');
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  const metadata = buildUserMetadata(data);

  const { user, profile } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role,
        ...(metadata !== undefined ? { metadata } : {}),
      },
    });

    const profile = await createRoleProfile(tx, user.id, role);

    return { user, profile };
  });

  const profileId = profile.id;
  const payload: JwtPayload = { userId: user.id, role: user.role, profileId };

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      profileId,
    },
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user || !user.isActive) {
    throw new Error('Invalid credentials');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const profileId = await getProfileId(user.id, user.role);
  const payload: JwtPayload = { userId: user.id, role: user.role, profileId };

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      profileId,
      isVerified: user.isVerified,
    },
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export function refreshAccessToken(refreshToken: string) {
  const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as JwtPayload;
  return { accessToken: signAccessToken(payload) };
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      avatarUrl: true,
      isVerified: true,
      isActive: true,
      studentProfile: { select: { id: true } },
      parentProfile: { select: { id: true } },
      teacherProfile: { select: { id: true, isApproved: true } },
      adminProfile: { select: { id: true } },
    },
  });

  if (!user) return null;

  const profileId =
    user.studentProfile?.id ||
    user.parentProfile?.id ||
    user.teacherProfile?.id ||
    user.adminProfile?.id ||
    '';

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    avatarUrl: user.avatarUrl,
    isVerified: user.isVerified,
    isActive: user.isActive,
    profileId,
    isApproved: user.teacherProfile?.isApproved ?? true,
  };
}

// Email verification tokens stored in memory for dev; use Redis in production
const verificationTokens = new Map<string, string>();
const resetTokens = new Map<string, { userId: string; expires: Date }>();

export function createVerificationToken(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  verificationTokens.set(token, userId);
  return token;
}

export async function verifyEmailToken(token: string) {
  const userId = verificationTokens.get(token);
  if (!userId) throw new Error('Invalid or expired verification token');

  verificationTokens.delete(token);

  await prisma.user.update({
    where: { id: userId },
    data: { isVerified: true },
  });

  return userId;
}

export function createResetToken(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  resetTokens.set(token, { userId, expires: new Date(Date.now() + 3600000) });
  return token;
}

export async function resetPassword(token: string, newPassword: string) {
  const entry = resetTokens.get(token);
  if (!entry || entry.expires < new Date()) {
    throw new Error('Invalid or expired reset token');
  }

  resetTokens.delete(token);
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: entry.userId },
    data: { passwordHash },
  });
}

export async function createForgotPasswordToken(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return null;
  return createResetToken(user.id);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new Error('Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}
