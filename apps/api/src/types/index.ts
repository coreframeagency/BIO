import { Role } from '@prisma/client';
import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  role: Role;
  profileId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export type AuthenticatedRequest = Request & { user: JwtPayload };

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function successResponse<T>(data: T): ApiSuccessResponse<T> {
  return { success: true, data };
}

export function errorResponse(error: string): ApiErrorResponse {
  return { success: false, error };
}

export function authUser(req: Request): JwtPayload {
  if (!req.user) throw new Error('Unauthorized');
  return req.user;
}
