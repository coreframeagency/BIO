import { Router } from 'express';
import * as controller from '../controllers/teacher.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.get(
  '/dashboard',
  authenticate,
  requireRole('TEACHER', 'ADMIN'),
  controller.getTeacherDashboard
);

router.get(
  '/students',
  authenticate,
  requireRole('TEACHER', 'ADMIN'),
  controller.getTeacherStudents
);

router.get(
  '/lessons',
  authenticate,
  requireRole('TEACHER', 'ADMIN'),
  controller.getTeacherLessonsWithFree
);

export default router;
