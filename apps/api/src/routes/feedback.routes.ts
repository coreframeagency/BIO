import { Router } from 'express';
import * as controller from '../controllers/feedback.controller';

const router = Router();

router.post('/', controller.submitFeedback);

export default router;
