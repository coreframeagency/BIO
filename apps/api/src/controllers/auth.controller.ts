import { Response, Request } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { prisma } from '../lib/prisma';
import { errorResponse, successResponse } from '../types';

const REFRESH_COOKIE = 'refreshToken';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

export async function register(req: Request, res: Response) {
  const role = req.body?.role;
  if (role === 'TEACHER' || role === 'ADMIN') {
    res.status(403).json(errorResponse('Teacher accounts are created by administrators only.'));
    return;
  }

  try {
    const result = await authService.registerUser(req.body);
    setRefreshCookie(res, result.refreshToken);
    res.status(201).json(successResponse({ user: result.user, accessToken: result.accessToken }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    res.status(400).json(errorResponse(message));
  }
}

export async function login(req: Request, res: Response) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.loginUser(data.email, data.password);
    setRefreshCookie(res, result.refreshToken);
    res.json(successResponse({ user: result.user, accessToken: result.accessToken }));
  } catch {
    res.status(401).json(errorResponse('Invalid credentials'));
  }
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) {
    res.status(401).json(errorResponse('No refresh token'));
    return;
  }

  try {
    const result = authService.refreshAccessToken(token);
    res.json(successResponse(result));
  } catch {
    res.status(401).json(errorResponse('Invalid refresh token'));
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.json(successResponse({ message: 'Logged out' }));
}

export async function me(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json(errorResponse('Unauthorized'));
    return;
  }
  const user = await authService.getUserById(req.user!.userId);
  if (!user) {
    res.status(404).json(errorResponse('User not found'));
    return;
  }
  res.json(successResponse(user));
}

export async function verifyEmail(req: Request, res: Response) {
  try {
    const { token } = z.object({ token: z.string() }).parse(req.body);
    await authService.verifyEmailToken(token);
    res.json(successResponse({ message: 'Email verified' }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed';
    res.status(400).json(errorResponse(message));
  }
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  const token = await authService.createForgotPasswordToken(email);
  // In production, send email via Resend; return token only in dev
  res.json(
    successResponse({
      message: 'If an account exists, a reset link has been sent',
      ...(process.env.NODE_ENV === 'development' && token ? { resetToken: token } : {}),
    })
  );
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, password } = z
      .object({ token: z.string(), password: z.string().min(8) })
      .parse(req.body);
    await authService.resetPassword(token, password);
    res.json(successResponse({ message: 'Password reset successful' }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Reset failed';
    res.status(400).json(errorResponse(message));
  }
}

export async function changePassword(req: Request, res: Response) {
  try {
    const { currentPassword, newPassword } = z
      .object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      })
      .parse(req.body);
    await authService.changePassword(req.user!.userId, currentPassword, newPassword);
    res.json(successResponse({ message: 'Password changed successfully' }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Password change failed';
    res.status(400).json(errorResponse(message));
  }
}

export async function getMyMeta(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { metadata: true },
  });
  const meta = (user?.metadata ?? {}) as Record<string, unknown>;
  res.json(successResponse(meta));
}
