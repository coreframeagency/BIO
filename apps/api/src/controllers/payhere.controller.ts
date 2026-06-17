import { Response, Request } from 'express';
import { z } from 'zod';
import { SubscriptionInterval, SubscriptionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getParam } from '../lib/params';
import { getSubjectFreeLessonId } from '../services/lessonAccess.service';
import { createRecurringPaymentData, verifyNotification } from '../services/payhere.service';
import { errorResponse, successResponse } from '../types';

const initiateSchema = z.object({
  subjectId: z.string(),
  priceType: z.enum(['monthly', 'yearly']),
});

const cancelSchema = z.object({
  subjectId: z.string(),
});

const DEFAULT_MONTHLY_CENTS = 149900;
const DEFAULT_YEARLY_CENTS = 999900;
const DEFAULT_CURRENCY = 'LKR';

function parseOrderId(orderId: string): {
  userId: string;
  subjectId: string;
  priceType: 'monthly' | 'yearly';
} | null {
  const parts = orderId.split('_');
  if (parts.length < 5 || parts[0] !== 'sub') return null;

  const userId = parts[1];
  const subjectId = parts[2];
  const priceType = parts[3];
  if (priceType !== 'monthly' && priceType !== 'yearly') return null;

  return { userId, subjectId, priceType };
}

function addPeriod(date: Date, priceType: 'monthly' | 'yearly'): Date {
  const end = new Date(date);
  if (priceType === 'monthly') {
    end.setMonth(end.getMonth() + 1);
  } else {
    end.setFullYear(end.getFullYear() + 1);
  }
  return end;
}

export async function initiatePayment(req: Request, res: Response) {
  try {
    const { subjectId, priceType } = initiateSchema.parse(req.body);

    const [subject, user] = await Promise.all([
      prisma.subject.findUnique({
        where: { id: subjectId },
        include: { pricing: true },
      }),
      prisma.user.findUnique({ where: { id: req.user!.userId } }),
    ]);

    if (!subject) {
      res.status(404).json(errorResponse('Subject not found'));
      return;
    }

    if (!user) {
      res.status(404).json(errorResponse('User not found'));
      return;
    }

    const pricing = subject.pricing;
    const currency = pricing?.currency ?? DEFAULT_CURRENCY;
    const amountCents =
      priceType === 'monthly'
        ? (pricing?.monthlyPriceCents ?? DEFAULT_MONTHLY_CENTS)
        : (pricing?.yearlyPriceCents ?? DEFAULT_YEARLY_CENTS);
    const amount = amountCents / 100;

    const orderId = `sub_${user.id}_${subjectId}_${priceType}_${Date.now()}`;
    const metadata = user.metadata as Record<string, string> | null;
    const phone = metadata?.phoneNumber?.trim() || '0770000000';

    const paymentData = createRecurringPaymentData({
      orderId,
      amount,
      currency,
      itemTitle: `${subject.name} — ${priceType === 'monthly' ? 'Monthly' : 'Yearly'} subscription`,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone,
      priceType,
    });

    res.json(successResponse(paymentData));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to initiate payment';
    res.status(400).json(errorResponse(message));
  }
}

export async function handleNotify(req: Request, res: Response) {
  const params = req.body as Record<string, string>;

  if (!verifyNotification(params)) {
    res.status(400).json(errorResponse('Invalid notification signature'));
    return;
  }

  if (params.status_code !== '2') {
    res.status(200).send('OK');
    return;
  }

  const parsed = parseOrderId(params.order_id);
  if (!parsed) {
    res.status(400).json(errorResponse('Invalid order ID'));
    return;
  }

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: parsed.userId },
  });

  if (!studentProfile) {
    res.status(400).json(errorResponse('Student profile not found'));
    return;
  }

  const now = new Date();
  const periodEnd = addPeriod(now, parsed.priceType);
  const interval =
    parsed.priceType === 'monthly' ? SubscriptionInterval.MONTHLY : SubscriptionInterval.YEARLY;

  await prisma.subscription.upsert({
    where: {
      studentProfileId_subjectId: {
        studentProfileId: studentProfile.id,
        subjectId: parsed.subjectId,
      },
    },
    create: {
      studentProfileId: studentProfile.id,
      subjectId: parsed.subjectId,
      status: SubscriptionStatus.ACTIVE,
      interval,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
    },
    update: {
      status: SubscriptionStatus.ACTIVE,
      interval,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
    },
  });

  res.status(200).send('OK');
}

export async function getSubscriptionStatus(req: Request, res: Response) {
  const subjectId = getParam(req.params.subjectId);
  const studentProfileId = req.user!.profileId;

  const [subscription, freeLessonId] = await Promise.all([
    prisma.subscription.findUnique({
      where: {
        studentProfileId_subjectId: { studentProfileId, subjectId },
      },
    }),
    getSubjectFreeLessonId(subjectId),
  ]);

  res.json(
    successResponse({
      hasAccess: subscription?.status === 'ACTIVE',
      subscription,
      freeLessonId,
    })
  );
}

export async function cancelSubscription(req: Request, res: Response) {
  const { subjectId } = cancelSchema.parse(req.body);
  const studentProfileId = req.user!.profileId;

  const subscription = await prisma.subscription.findUnique({
    where: {
      studentProfileId_subjectId: { studentProfileId, subjectId },
    },
  });

  if (!subscription) {
    res.status(404).json(errorResponse('Subscription not found'));
    return;
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: SubscriptionStatus.CANCELLED,
      cancelledAt: new Date(),
    },
  });

  res.json(successResponse({ success: true }));
}
