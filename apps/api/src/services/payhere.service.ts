import crypto from 'crypto';

const MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID!;
const MERCHANT_SECRET = process.env.PAYHERE_SECRET!;
const PAYHERE_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://www.payhere.lk/pay/checkout'
    : 'https://sandbox.payhere.lk/pay/checkout';

export function generateHash(
  merchantId: string,
  orderId: string,
  amount: string,
  currency: string
): string {
  const secretHash = crypto.createHash('md5').update(MERCHANT_SECRET).digest('hex').toUpperCase();
  const hash = crypto
    .createHash('md5')
    .update(merchantId + orderId + amount + currency + secretHash)
    .digest('hex')
    .toUpperCase();
  return hash;
}

export function verifyNotification(params: Record<string, string>): boolean {
  const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig } = params;
  const secretHash = crypto.createHash('md5').update(MERCHANT_SECRET).digest('hex').toUpperCase();
  const expected = crypto
    .createHash('md5')
    .update(merchant_id + order_id + payhere_amount + payhere_currency + status_code + secretHash)
    .digest('hex')
    .toUpperCase();
  return expected === md5sig;
}

export function createRecurringPaymentData(params: {
  orderId: string;
  amount: number;
  currency: string;
  itemTitle: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  priceType: 'monthly' | 'yearly';
}) {
  const amountStr = params.amount.toFixed(2);
  const hash = generateHash(MERCHANT_ID, params.orderId, amountStr, params.currency);
  return {
    merchant_id: MERCHANT_ID,
    return_url: process.env.FRONTEND_URL + '/subjects?success=true',
    cancel_url: process.env.FRONTEND_URL + '/subjects?cancelled=true',
    notify_url: process.env.API_URL + '/api/payhere/notify',
    order_id: params.orderId,
    items: params.itemTitle,
    currency: params.currency,
    amount: amountStr,
    first_name: params.firstName,
    last_name: params.lastName,
    email: params.email,
    phone: params.phone,
    address: 'N/A',
    city: 'Colombo',
    country: 'Sri Lanka',
    recurrence: params.priceType === 'monthly' ? '1 Month' : '1 Year',
    duration: params.priceType === 'monthly' ? '12 Month' : '3 Year',
    hash,
    payhere_base_url: PAYHERE_BASE_URL,
  };
}
