import { useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { apiFetch } from '@/services/api';
import { useEffect, useState } from 'react';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [message, setMessage] = useState('Verifying...');

  useEffect(() => {
    if (!token) {
      setMessage('Invalid verification link');
      return;
    }
    apiFetch('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }).then((res) => {
      setMessage(res.ok ? 'Email verified successfully!' : res.error || 'Verification failed');
    });
  }, [token]);

  return (
    <PublicLayout>
      <div className="mx-auto max-w-md px-4 py-12">
        <Card>
          <h1 className="font-serif text-2xl font-bold">Email verification</h1>
          <p className="mt-4 text-ui-muted">{message}</p>
        </Card>
      </div>
    </PublicLayout>
  );
}
