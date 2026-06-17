import { Resend } from 'resend';
import { logger } from '../lib/logger';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) {
    logger.warn({ to: params.to, subject: params.subject }, 'Email not sent — RESEND_API_KEY missing');
    return null;
  }

  return resend.emails.send({
    from: 'Markly <noreply@markly.live>',
    replyTo: 'learnwithmarkly@gmail.com',
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  return sendEmail({
    to,
    subject: 'Verify your email',
    html: `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#EAE4DA;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#ffffff;
        border-radius:16px;overflow:hidden;">
        <div style="background:#245E55;padding:32px 40px;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">
            Markly
            <span style="display:inline-block;width:8px;height:8px;
              background:#EAC119;border-radius:50%;margin-left:4px;
              vertical-align:middle;"></span>
          </p>
        </div>
        <div style="padding:40px;">
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;
            color:#1D1D1B;">Verify your email</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#8B8580;
            line-height:1.6;">
            Click the button below to verify your email address and
            start studying with Markly.
          </p>
          <a href="${url}"
            style="display:inline-block;background:#245E55;color:#ffffff;
              text-decoration:none;padding:14px 32px;border-radius:10px;
              font-size:15px;font-weight:600;">
            Verify email →
          </a>
          <p style="margin:24px 0 0;font-size:13px;color:#8B8580;">
            If you didn't create a Markly account, ignore this email.
          </p>
        </div>
        <div style="padding:24px 40px;border-top:1px solid #EAE4DA;">
          <p style="margin:0;font-size:12px;color:#8B8580;">
            © 2026 Markly · 
            <a href="mailto:learnwithmarkly@gmail.com"
              style="color:#245E55;">learnwithmarkly@gmail.com</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `,
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  return sendEmail({
    to,
    subject: 'Reset your password',
    html: `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#EAE4DA;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#ffffff;
        border-radius:16px;overflow:hidden;">
        <div style="background:#245E55;padding:32px 40px;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">
            Markly
            <span style="display:inline-block;width:8px;height:8px;
              background:#EAC119;border-radius:50%;margin-left:4px;
              vertical-align:middle;"></span>
          </p>
        </div>
        <div style="padding:40px;">
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;
            color:#1D1D1B;">Reset your password</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#8B8580;
            line-height:1.6;">
            Click the button below to set a new password.
            This link expires in 1 hour.
          </p>
          <a href="${url}"
            style="display:inline-block;background:#245E55;color:#ffffff;
              text-decoration:none;padding:14px 32px;border-radius:10px;
              font-size:15px;font-weight:600;">
            Reset password →
          </a>
          <p style="margin:24px 0 0;font-size:13px;color:#8B8580;">
            If you didn't request this, ignore this email.
            Your password won't change.
          </p>
        </div>
        <div style="padding:24px 40px;border-top:1px solid #EAE4DA;">
          <p style="margin:0;font-size:12px;color:#8B8580;">
            © 2026 Markly · 
            <a href="mailto:learnwithmarkly@gmail.com"
              style="color:#245E55;">learnwithmarkly@gmail.com</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `,
  });
}

export async function sendPaymentFailedEmail(to: string) {
  return sendEmail({
    to,
    subject: 'Payment failed — action required',
    html: `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#EAE4DA;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#ffffff;
        border-radius:16px;overflow:hidden;">
        <div style="background:#245E55;padding:32px 40px;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">
            Markly
            <span style="display:inline-block;width:8px;height:8px;
              background:#EAC119;border-radius:50%;margin-left:4px;
              vertical-align:middle;"></span>
          </p>
        </div>
        <div style="padding:40px;">
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;
            color:#1D1D1B;">Payment failed</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#8B8580;
            line-height:1.6;">
            We couldn't process your subscription payment.
            Please update your payment method to keep access to your subjects.
          </p>
          <a href="${process.env.FRONTEND_URL}/settings"
            style="display:inline-block;background:#245E55;color:#ffffff;
              text-decoration:none;padding:14px 32px;border-radius:10px;
              font-size:15px;font-weight:600;">
            Update payment →
          </a>
          <p style="margin:24px 0 0;font-size:13px;color:#8B8580;">
            Need help? Reply to this email and we'll sort it out.
          </p>
        </div>
        <div style="padding:24px 40px;border-top:1px solid #EAE4DA;">
          <p style="margin:0;font-size:12px;color:#8B8580;">
            © 2026 Markly · 
            <a href="mailto:learnwithmarkly@gmail.com"
              style="color:#245E55;">learnwithmarkly@gmail.com</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `,
  });
}
