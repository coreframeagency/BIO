import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AuthDivider, GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { useAuth } from '@/context/AuthContext';
import { getRoleHomePath } from '@/components/layout/ProtectedRoute';
import { API_URL } from '@/services/api';

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiWaking, setApiWaking] = useState(true);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    fetch(`${API_URL.replace(/\/$/, '')}/health`, { signal: controller.signal })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeoutId);
        setApiWaking(false);
      });
  }, []);

  if (isAuthenticated && user) {
    return <Navigate to={getRoleHomePath(user.role)} replace />;
  }

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setTimedOut(false);
    setLoading(true);

    const timeoutId = setTimeout(() => {
      setLoading(false);
      setTimedOut(true);
    }, 45000);

    try {
      const result = await login(email, password);
      clearTimeout(timeoutId);
      setLoading(false);
      if (result.ok) {
        navigate(from || getRoleHomePath(result.role || 'STUDENT'));
      } else {
        setError(result.error || 'Login failed');
      }
    } catch {
      clearTimeout(timeoutId);
      setLoading(false);
      setError(
        'The server is taking too long. It may be waking up — please try again in a moment.'
      );
    }
  };

  return (
    <PublicLayout>
      <style>{`
        @keyframes wakeProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-md items-center px-4 py-12">
        <Card className="w-full">
          <h1 className="font-serif text-3xl font-bold text-brand-black">Welcome back</h1>
          <p className="mt-2 text-ui-muted">Sign in to continue your exam preparation</p>
          <div className="mt-6">
            <GoogleSignInButton />
            <AuthDivider />
          </div>
          {apiWaking && (
            <div className="mb-4 rounded-2xl border border-brand-green/20 bg-brand-green/5 p-4">
              <div className="flex items-center gap-3">
                <div className="relative flex size-8 shrink-0 items-center justify-center">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-green opacity-30" />
                  <span className="relative inline-flex size-3 rounded-full bg-brand-green" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-green">Server is starting up…</p>
                  <p className="text-xs text-ui-muted">
                    Free hosting sleeps after inactivity. This takes up to 30 seconds — just once.
                  </p>
                </div>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-brand-green/15">
                <div
                  className="h-full rounded-full bg-brand-green"
                  style={{
                    animation: 'wakeProgress 30s linear forwards',
                  }}
                />
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-brand-red">{error}</p>
            )}
            {timedOut && (
              <div className="rounded-xl border border-brand-mustard/30 bg-brand-mustard/10 px-4 py-3">
                <p className="text-sm font-semibold text-amber-800">Still starting up…</p>
                <p className="mt-0.5 text-xs text-amber-700">
                  The server is taking longer than usual. Click Sign in again to retry — it should be
                  ready now.
                </p>
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              isLoading={loading}
              disabled={loading || apiWaking}
            >
              {apiWaking ? 'Server starting…' : timedOut ? 'Try again →' : 'Sign in'}
            </Button>
          </form>
          <div className="mt-4 flex flex-col gap-2 text-center text-sm">
            <Link to="/forgot-password" className="text-brand-green hover:underline">
              Forgot password?
            </Link>
            <p className="text-ui-muted">
              No account?{' '}
              <Link to="/register" className="font-semibold text-brand-green hover:underline">
                Register
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </PublicLayout>
  );
}
