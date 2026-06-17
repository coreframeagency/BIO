import Stripe from 'stripe';

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export async function createCheckoutSession(params: {
  customerId?: string;
  priceId: string;
  studentProfileId: string;
  subjectId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  if (!stripe) throw new Error('Stripe not configured');
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: params.customerId,
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      studentProfileId: params.studentProfileId,
      subjectId: params.subjectId,
    },
  });
}

export function constructWebhookEvent(payload: Buffer, signature: string) {
  if (!stripe) throw new Error('Stripe not configured');
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET || ''
  );
}
