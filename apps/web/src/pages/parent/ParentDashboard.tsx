import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { ParentLayout } from '@/components/layout/ParentLayout';
import { PageLoader } from '@/components/ui/Loading';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/services/api';

interface SubjectSummary {
  subjectId: string;
  name: string;
  examBoard: string;
  completedLessons: number;
  totalLessons: number;
}

interface LinkedStudent {
  linkId: string;
  studentProfileId: string;
  user: { firstName: string; lastName: string; email: string };
  summary: {
    lessonsCompleted: number;
    averageScore: number;
    streakDays: number;
    subjects: SubjectSummary[];
  };
}

interface ParentProfile {
  linkedStudents: LinkedStudent[];
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default function ParentDashboard() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['parent-profile'],
    queryFn: async () => {
      const res = await apiFetch<ParentProfile>('/parent/profile');
      if (!res.ok) throw new Error(res.error ?? 'Failed to load profile');
      return res.data!;
    },
  });

  const children = data?.linkedStudents ?? [];

  return (
    <ParentLayout>
      <div className="min-h-full bg-brand-shell p-4 md:p-8">
        <section className="rounded-2xl bg-brand-green p-8 text-white">
          <h1 className="font-serif text-3xl font-bold">
            {getGreeting()}, {user?.firstName}!
          </h1>
          <p className="mt-2 text-green-200">
            Monitor your child&apos;s exam preparation progress.
          </p>
        </section>

        {isLoading && <PageLoader />}

        {error && (
          <p className="mt-6 text-sm text-brand-red">{(error as Error).message}</p>
        )}

        {!isLoading && !error && children.length === 0 && (
          <div className="mt-8 rounded-2xl border border-ui-border bg-white p-12 text-center">
            <Users className="mx-auto mb-4 size-12 text-ui-muted" />
            <h2 className="font-serif text-xl font-semibold text-brand-black">
              No children linked yet
            </h2>
            <p className="mt-2 text-ui-muted">
              Link your child&apos;s account to start monitoring their progress.
            </p>
            <Link
              to="/parent/children"
              className="mt-6 inline-block rounded-xl bg-brand-green px-6 py-2.5 text-sm font-semibold text-white"
            >
              Link a student account
            </Link>
          </div>
        )}

        {!isLoading && !error && children.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {children.map((child) => (
              <div
                key={child.studentProfileId}
                className="rounded-2xl border border-ui-border bg-white p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-lavender text-sm font-bold text-white">
                    {getInitials(child.user.firstName, child.user.lastName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-xl font-semibold text-brand-black">
                      {child.user.firstName} {child.user.lastName}
                    </h3>
                    <Link
                      to={`/parent/children/${child.studentProfileId}`}
                      className="mt-1 inline-block text-sm font-medium text-brand-green hover:underline"
                    >
                      View progress →
                    </Link>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-ui-subtle px-2 py-3">
                    <p className="font-serif text-lg font-bold text-brand-black">
                      {child.summary.lessonsCompleted}
                    </p>
                    <p className="text-xs text-ui-muted">Lessons done</p>
                  </div>
                  <div className="rounded-xl bg-ui-subtle px-2 py-3">
                    <p className="font-serif text-lg font-bold text-brand-black">
                      {child.summary.averageScore}%
                    </p>
                    <p className="text-xs text-ui-muted">Avg score</p>
                  </div>
                  <div className="rounded-xl bg-ui-subtle px-2 py-3">
                    <p className="font-serif text-lg font-bold text-brand-black">
                      {child.summary.streakDays}
                    </p>
                    <p className="text-xs text-ui-muted">Day streak</p>
                  </div>
                </div>

                {child.summary.subjects.length > 0 && (
                  <div className="mt-5 space-y-3">
                    {child.summary.subjects.map((subject) => {
                      const pct =
                        subject.totalLessons > 0
                          ? Math.round(
                              (subject.completedLessons / subject.totalLessons) * 100
                            )
                          : 0;
                      return (
                        <div key={subject.subjectId}>
                          <div className="mb-1 flex justify-between text-xs text-ui-muted">
                            <span>{subject.name}</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-ui-subtle">
                            <div
                              className="h-2 rounded-full bg-brand-green transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ParentLayout>
  );
}
