import { Router } from 'express';
import * as controller from '../controllers/subjects.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.get('/', controller.listSubjects);
router.get('/:boardSlug/:subjectSlug', controller.getSubject);
router.post('/', authenticate, requireRole('ADMIN'), controller.createSubject);
router.patch('/:id', authenticate, requireRole('ADMIN'), controller.updateSubject);
router.delete('/:id', authenticate, requireRole('ADMIN'), controller.deleteSubject);

export default router;
