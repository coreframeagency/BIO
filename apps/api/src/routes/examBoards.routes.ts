import { Router } from 'express';
import * as controller from '../controllers/examBoards.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.get('/', controller.listExamBoards);
router.get('/:slug', controller.getExamBoard);
router.post('/', authenticate, requireRole('ADMIN'), controller.createExamBoard);
router.patch('/:id', authenticate, requireRole('ADMIN'), controller.updateExamBoard);
router.delete('/:id', authenticate, requireRole('ADMIN'), controller.deleteExamBoard);

export default router;
