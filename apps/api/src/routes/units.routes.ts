import { Router } from 'express';
import * as controller from '../controllers/units.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.get('/', controller.listUnits);
router.get('/:boardSlug/:subjectSlug/:gradeSlug/:unitSlug', controller.getUnit);
router.post('/', authenticate, requireRole('ADMIN'), controller.createUnit);
router.patch('/:id', authenticate, requireRole('ADMIN'), controller.updateUnit);
router.delete('/:id', authenticate, requireRole('ADMIN'), controller.deleteUnit);

export default router;
