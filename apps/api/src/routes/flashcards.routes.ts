import { Router } from 'express';
import * as controller from '../controllers/flashcards.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requireRole('STUDENT', 'TEACHER', 'ADMIN'),
  controller.listFlashcards
);

router.get(
  '/stats',
  requireRole('STUDENT'),
  controller.getFlashcardStats
);

router.post(
  '/',
  requireRole('TEACHER', 'ADMIN'),
  controller.createFlashcards
);

router.post(
  '/:id/attempt',
  requireRole('STUDENT'),
  controller.recordAttempt
);

export default router;
