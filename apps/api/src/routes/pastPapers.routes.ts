import { Router } from 'express';
import * as controller from '../controllers/pastPapers.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { uploadSingle } from '../middleware/upload.middleware';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requireRole('TEACHER', 'ADMIN', 'STUDENT'),
  controller.listPastPapers
);

router.get(
  '/:id',
  requireRole('TEACHER', 'ADMIN', 'STUDENT'),
  controller.getPastPaper
);

router.post(
  '/',
  requireRole('TEACHER', 'ADMIN'),
  uploadSingle,
  controller.createPastPaper
);

router.delete(
  '/:id',
  requireRole('TEACHER', 'ADMIN'),
  controller.deletePastPaper
);

export default router;
