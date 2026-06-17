import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ParentLayout } from '@/components/layout/ParentLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageLoader } from '@/components/ui/Loading';
import { apiFetch } from '@/services/api';

interface LinkedStudent {
  linkId: string;
  studentProfileId: string;
  user: { firstName: string; lastName: string; email: string };
}

interface ParentProfile {
  linkedStudents: LinkedStudent[];
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default function ParentChildrenPage() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ['parent-profile'],
    queryFn: async () => {
      const res = await apiFetch<ParentProfile>('/parent/profile');
      if (!res.ok) throw new Error(res.error ?? 'Failed to load children');
      return res.data!;
    },
  });

  const linkStudent = useMutation({
    mutationFn: async (studentEmail: string) => {
      const res = await apiFetch<ParentProfile>('/parent/link-student', {
        method: 'POST',
        body: JSON.stringify({ studentEmail }),
      });
      if (!res.ok) throw new Error(res.error ?? 'Failed to link student');
      return res.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-profile'] });
      setEmail('');
      setError('');
      setToast('Account linked successfully');
      setTimeout(() => setToast(''), 4000);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const unlinkStudent = useMutation({
    mutationFn: async (studentId: string) => {
      const res = await apiFetch(`/parent/unlink-student/${studentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(res.error ?? 'Failed to unlink student');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-profile'] });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }
    linkStudent.mutate(email.trim());
  };

  const children = data?.linkedStudents ?? [];

  return (
    <ParentLayout>
      <div className="min-h-full bg-brand-shell p-4 md:p-8">
        <h1 className="font-serif text-3xl font-bold text-brand-black">My Children</h1>

        {toast && (
          <div className="mt-4 rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm font-medium text-brand-green">
            {toast}
          </div>
        )}

        <div className="mb-6 mt-8 rounded-2xl border border-ui-border bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-brand-black">
            Link a student account
          </h2>
          <p className="mt-1 text-sm text-ui-muted">
            Enter your child&apos;s registered email address to link their account.
          </p>
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Input
              id="studentEmail"
              type="email"
              placeholder="student@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" isLoading={linkStudent.isPending}>
              Link account
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-brand-red">{error}</p>}
        </div>

        {isLoading && <PageLoader />}

        {loadError && (
          <p className="text-sm text-brand-red">{(loadError as Error).message}</p>
        )}

        {!isLoading && !loadError && (
          <div className="space-y-4">
            {children.length === 0 ? (
              <p className="text-ui-muted">No linked students yet.</p>
            ) : (
              children.map((child) => (
                <div
                  key={child.studentProfileId}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ui-border bg-white p-5"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-lavender text-sm font-bold text-white">
                      {getInitials(child.user.firstName, child.user.lastName)}
                    </div>
                    <div>
                      <p className="font-semibold text-brand-black">
                        {child.user.firstName} {child.user.lastName}
                      </p>
                      <p className="text-sm text-ui-muted">{child.user.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/parent/children/${child.studentProfileId}`}
                      className="rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white"
                    >
                      View progress
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Unlink ${child.user.firstName} ${child.user.lastName}?`
                          )
                        ) {
                          unlinkStudent.mutate(child.studentProfileId);
                        }
                      }}
                      disabled={unlinkStudent.isPending}
                      className="rounded-xl border border-brand-red px-4 py-2 text-sm font-semibold text-brand-red hover:bg-red-50 disabled:opacity-50"
                    >
                      Unlink
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </ParentLayout>
  );
}
