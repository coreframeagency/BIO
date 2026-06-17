import { Router } from 'express';
import * as controller from '../controllers/pastPaperQuestions.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.use(authenticate, requireRole('TEACHER', 'ADMIN'));

router.get('/', controller.listPastPaperQuestions);
router.post('/', controller.createPastPaperQuestion);
router.put('/:id', controller.updatePastPaperQuestion);
router.delete('/:id', controller.deletePastPaperQuestion);

export default router;
