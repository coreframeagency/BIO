import { Router } from 'express';
import * as controller from '../controllers/questions.controller';
import { authenticate } from '../middleware/auth.middleware';
import { uploadQuestionImage } from '../middleware/imageUpload.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requireRole('STUDENT', 'TEACHER', 'ADMIN'),
  controller.getQuestions
);

router.post('/reorder', requireRole('TEACHER', 'ADMIN'), controller.reorderQuestions);

router.post('/', requireRole('TEACHER', 'ADMIN'), controller.createQuestion);

router.get(
  '/:id',
  requireRole('STUDENT', 'TEACHER', 'ADMIN'),
  controller.getQuestion
);

router.put('/:id', requireRole('TEACHER', 'ADMIN'), controller.updateQuestion);

router.patch('/:id', requireRole('TEACHER', 'ADMIN'), controller.updateQuestion);

router.delete('/:id', requireRole('TEACHER', 'ADMIN'), controller.deleteQuestion);

router.post(
  '/:id/image',
  requireRole('TEACHER', 'ADMIN'),
  uploadQuestionImage,
  controller.uploadQuestionImage
);

router.post('/:id/attempt', requireRole('STUDENT'), controller.submitAttempt);

export default router;
