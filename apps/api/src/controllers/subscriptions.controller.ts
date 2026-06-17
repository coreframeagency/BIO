import { Response, Request } from 'express';
import { z } from 'zod';
import { SubscriptionInterval, SubscriptionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { createCheckoutSession, constructWebhookEvent } from '../services/stripe.service';
import { sendPaymentFailedEmail } from '../services/email.service';
import { errorResponse, successResponse } from '../types';

export async function listSubscriptions(req: Request, res: Response) {
  const subscriptions = await prisma.subscription.findMany({
    where: { studentProfileId: req.user!.profileId },
    include: {
      subject: {
        include: {
          pricing: true,
          grade: {
            include: {
              category: { include: { examBoard: true } },
            },
          },
        },
      },
    },
  });
  res.json(successResponse(subscriptions));
}

const checkoutSchema = z.object({
  subjectId: z.string(),
  interval: z.enum(['MONTHLY', 'YEARLY']),
});

export async function createCheckout(req: Request, res: Response) {
  const { subjectId, interval } = checkoutSchema.parse(req.body);

  const pricing = await prisma.subjectPricing.findUnique({
    where: { subjectId },
    include: { subject: true },
  });

  if (!pricing) {
    res.status(404).json(errorResponse('Pricing not found for subject'));
    return;
  }

  const priceId =
    interval === 'MONTHLY' ? pricing.stripePriceIdMonthly : pricing.stripePriceIdYearly;

  if (!priceId) {
    res.status(400).json(errorResponse('Stripe price not configured for this subject'));
    return;
  }

  const session = await createCheckoutSession({
    priceId,
    studentProfileId: req.user!.profileId,
    subjectId,
    successUrl: `${process.env.FRONTEND_URL}/dashboard?subscribed=true`,
    cancelUrl: `${process.env.FRONTEND_URL}/pricing?cancelled=true`,
  });

  res.json(successResponse({ url: session.url }));
}

export async function handleWebhook(req: Request, res: Response) {
  const signature = req.headers['stripe-signature'] as string;

  try {
    const event = constructWebhookEvent(req.body as unknown as Buffer, signature);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const studentProfileId = session.metadata?.studentProfileId;
        const subjectId = session.metadata?.subjectId;
        const subscriptionId = session.subscription as string;

        if (studentProfileId && subjectId && subscriptionId) {
          const now = new Date();
          const end = new Date(now);
          end.setMonth(end.getMonth() + 1);

          await prisma.subscription.upsert({
            where: {
              studentProfileId_subjectId: { studentProfileId, subjectId },
            },
            create: {
              studentProfileId,
              subjectId,
              status: SubscriptionStatus.ACTIVE,
              interval: SubscriptionInterval.MONTHLY,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: subscriptionId,
              currentPeriodStart: now,
              currentPeriodEnd: end,
            },
            update: {
              status: SubscriptionStatus.ACTIVE,
              stripeSubscriptionId: subscriptionId,
              currentPeriodStart: now,
              currentPeriodEnd: end,
            },
          });
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            status: sub.status === 'active' ? SubscriptionStatus.ACTIVE : SubscriptionStatus.PAST_DUE,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            status: SubscriptionStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        });
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subId = invoice.subscription as string;
        const subscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subId },
          include: { studentProfile: { include: { user: true } } },
        });
        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: SubscriptionStatus.PAST_DUE },
          });
          await sendPaymentFailedEmail(subscription.studentProfile.user.email);
        }
        break;
      }
    }

    res.json({ received: true });
  } catch {
    res.status(400).json(errorResponse('Webhook error'));
  }
}

export async function listPricing(_req: Request, res: Response) {
  const pricing = await prisma.subjectPricing.findMany({
    include: {
      subject: {
        include: {
          grade: {
            include: {
              category: { include: { examBoard: true } },
            },
          },
        },
      },
    },
  });
  res.json(successResponse(pricing));
}
