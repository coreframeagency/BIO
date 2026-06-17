import { Router } from 'express';
import * as controller from '../controllers/lessons.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.get('/', authenticate, controller.listLessons);
router.get('/by-slug/:slug', authenticate, controller.getLessonBySlugAuth);
router.get('/slug/:lessonSlug', optionalAuthenticate, controller.getLessonBySlug);
router.get('/:id', authenticate, controller.getLessonById);
router.post('/', authenticate, requireRole('TEACHER', 'ADMIN'), controller.createLesson);
router.patch('/:id', authenticate, requireRole('TEACHER', 'ADMIN'), controller.updateLesson);
router.delete('/:id', authenticate, requireRole('TEACHER', 'ADMIN'), controller.deleteLesson);
router.options('/:id/generate-visual', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin',
    process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods',
    'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers',
    'Authorization, Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Credentials',
    'true');
  res.status(204).end();
});
router.post('/:id/generate-visual', authenticate, requireRole('TEACHER', 'ADMIN'), controller.generateVisual);
router.post('/:id/approve-visual', authenticate, requireRole('TEACHER', 'ADMIN'), controller.approveVisual);
router.post('/:id/reject-visual', authenticate, requireRole('TEACHER', 'ADMIN'), controller.rejectVisual);

export default router;
