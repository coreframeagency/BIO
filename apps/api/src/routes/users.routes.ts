import { Router } from 'express';
import * as controller from '../controllers/users.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/me', authenticate, controller.getProfile);
router.patch('/me', authenticate, controller.updateProfile);

export default router;
