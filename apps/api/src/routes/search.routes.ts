import { Router } from 'express';
import * as controller from '../controllers/search.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, controller.search);

export default router;
