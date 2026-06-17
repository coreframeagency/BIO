import { FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { apiFetch } from '@/services/api';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    setMessage(res.ok ? 'Password reset successful. You can now log in.' : res.error || 'Reset failed');
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-md px-4 py-12">
        <Card>
          <h1 className="font-serif text-2xl font-bold">Reset password</h1>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              id="password"
              label="New password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            {message && <p className="text-sm text-brand-green">{message}</p>}
            <Button type="submit" className="w-full" isLoading={loading} disabled={!token}>
              Reset password
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
