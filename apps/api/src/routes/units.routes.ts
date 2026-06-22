import { Router } from 'express';
import * as controller from '../controllers/units.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.get('/', controller.listUnits);
router.get('/:boardSlug/:subjectSlug/:gradeSlug/:unitSlug', controller.getUnit);
router.post('/', authenticate, requireRole('ADMIN', 'TEACHER'), controller.createUnit);
router.patch('/:id', authenticate, requireRole('ADMIN', 'TEACHER'), controller.updateUnit);
router.delete('/:id', authenticate, requireRole('ADMIN', 'TEACHER'), controller.deleteUnit);

export default router;
