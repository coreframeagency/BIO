import { Router } from 'express';
import express from 'express';
import * as controller from '../controllers/payhere.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.post(
  '/initiate',
  authenticate,
  requireRole('STUDENT'),
  controller.initiatePayment
);

router.post(
  '/notify',
  express.urlencoded({ extended: false }),
  controller.handleNotify
);

router.get(
  '/status/:subjectId',
  authenticate,
  requireRole('STUDENT'),
  controller.getSubscriptionStatus
);

router.post(
  '/cancel',
  authenticate,
  requireRole('STUDENT'),
  controller.cancelSubscription
);

export default router;
