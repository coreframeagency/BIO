import { FormEvent, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AuthDivider, GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { useAuth } from '@/context/AuthContext';
import { getRoleHomePath } from '@/components/layout/ProtectedRoute';
import { Role } from '@/types';

export default function RegisterPage() {
  const { register, isAuthenticated, user } = useAuth();
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'STUDENT' as Role,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated && user) {
    return <Navigate to={getRoleHomePath(user.role)} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      email: form.email,
      password: form.password,
      firstName: form.firstName,
      lastName: form.lastName,
      role: form.role,
    };

    const result = await register(payload);
    setLoading(false);
    if (!result.ok) setError(result.error || 'Registration failed');
  };

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-80px)] bg-brand-shell px-4 py-12">
        <div className="mx-auto w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-center font-serif text-2xl font-bold text-brand-black">
            Markly
            <span className="ml-1.5 inline-block size-2 rounded-full bg-brand-green align-middle" />
          </p>
          <h1 className="mt-6 font-serif text-3xl font-bold text-brand-black">Create account</h1>
          <p className="mt-2 text-ui-muted">Cambridge & Edexcel exam prep — start for free</p>

          <div className="mt-6">
            <GoogleSignInButton />
            <AuthDivider />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="firstName"
                label="First name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
              <Input
                id="lastName"
                label="Last name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </div>
            <Input
              id="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Input
              id="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
            />
            <Select
              id="role"
              label="I am a..."
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              options={[
                { value: 'STUDENT', label: 'Student' },
                { value: 'PARENT', label: 'Parent' },
              ]}
            />
            {error && <p className="text-sm text-brand-red">{error}</p>}
            <Button type="submit" className="w-full" isLoading={loading}>
              Create account
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-ui-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-green hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
