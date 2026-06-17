import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { apiFetch } from '@/services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (res.ok) setMessage('If an account exists, a reset link has been sent.');
    else setMessage(res.error || 'Something went wrong');
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-md px-4 py-12">
        <Card>
          <h1 className="font-serif text-2xl font-bold">Forgot password</h1>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {message && <p className="text-sm text-brand-green">{message}</p>}
            <Button type="submit" className="w-full" isLoading={loading}>
              Send reset link
            </Button>
          </form>
          <Link to="/login" className="mt-4 block text-center text-sm text-brand-green">
            Back to login
          </Link>
        </Card>
      </div>
    </PublicLayout>
  );
}
