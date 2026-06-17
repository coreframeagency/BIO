import { Router } from 'express';
import * as controller from '../controllers/parent.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.use(authenticate, requireRole('PARENT'));

router.get('/profile', controller.getProfile);
router.post('/link-student', controller.linkStudent);
router.delete('/unlink-student/:studentId', controller.unlinkStudent);
router.get('/student/:studentId/progress', controller.getStudentProgress);

export default router;
