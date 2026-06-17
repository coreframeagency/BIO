import { Router } from 'express';
import * as controller from '../controllers/subscriptions.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.get('/pricing', controller.listPricing);
router.get('/', authenticate, requireRole('STUDENT'), controller.listSubscriptions);
router.post('/create-checkout', authenticate, requireRole('STUDENT'), controller.createCheckout);
router.post('/webhook', controller.handleWebhook);

export default router;
