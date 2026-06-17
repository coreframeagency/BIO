import { Router } from 'express';
import * as controller from '../controllers/progress.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.get('/', authenticate, requireRole('STUDENT'), controller.getProgress);
router.get('/recent', authenticate, requireRole('STUDENT'), controller.getRecentProgress);
router.get('/stats', authenticate, requireRole('STUDENT'), controller.getProgressStats);
router.get('/weak-topics', authenticate, requireRole('STUDENT'), controller.getWeakTopics);
router.get('/lesson/:lessonId', authenticate, requireRole('STUDENT'), controller.getLessonProgress);
router.put('/lesson/:lessonId', authenticate, requireRole('STUDENT'), controller.upsertProgress);
export default router;
