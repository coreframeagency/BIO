import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { apiFetch } from '@/services/api';

interface Stats {
  totalStudents: number;
  newStudentsThisWeek: number;
  activeSubscriptions: number;
  newSubscriptionsThisWeek: number;
  availableSubjects: number;
  totalTeachers: number;
  newTeachersThisWeek: number;
  recentSignups: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
}

interface Sub {
  id: string;
  status: string;
  createdAt: string;
  student: { firstName: string; lastName: string; email: string };
  subject: {
    name: string;
    grade: { name: string; category: { examBoard: { name: string } } };
  };
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function AdminOverviewPage() {
  const { data } = useQuery({
    queryKey: ['admin-stats-v5'],
    queryFn: async () => {
      const r = await apiFetch<Stats>('/admin/stats');
      if (!r.ok) throw new Error(r.error ?? 'err');
      return r.data!;
    },
  });

  const { data: subs } = useQuery({
    queryKey: ['admin-subs-v5'],
    queryFn: async () => {
      const r = await apiFetch<Sub[]>('/admin/subscriptions');
      if (!r.ok) return [];
      return r.data ?? [];
    },
  });

  return (
    <AdminLayout>
      <h1 className="font-serif text-3xl font-bold text-brand-black">
        Admin Overview
      </h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-brand-lavender p-6">
          <p className="font-serif text-5xl font-bold text-white">
            {data?.totalStudents ?? 0}
          </p>
          <p className="mt-2 text-sm font-semibold text-white/90">
            Students
          </p>
          {!!data?.newStudentsThisWeek && (
            <p className="mt-1 text-xs text-white/70">
              +{data.newStudentsThisWeek} this week
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-brand-green p-6">
          <p className="font-serif text-5xl font-bold text-white">
            {data?.activeSubscriptions ?? 0}
          </p>
          <p className="mt-2 text-sm font-semibold text-white/90">
            Active subscriptions
          </p>
          {!!data?.newSubscriptionsThisWeek && (
            <p className="mt-1 text-xs text-white/70">
              +{data.newSubscriptionsThisWeek} this week
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-brand-mustard p-6">
          <p className="font-serif text-5xl font-bold text-white">
            {data?.availableSubjects ?? 0}
          </p>
          <p className="mt-2 text-sm font-semibold text-white/90">
            Subjects available
          </p>
        </div>

        <div className="rounded-2xl bg-brand-sky p-6">
          <p className="font-serif text-5xl font-bold text-white">
            {data?.totalTeachers ?? 0}
          </p>
          <p className="mt-2 text-sm font-semibold text-white/90">
            Teachers
          </p>
          {!!data?.newTeachersThisWeek && (
            <p className="mt-1 text-xs text-white/70">
              +{data.newTeachersThisWeek} this week
            </p>
          )}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-4 font-serif text-xl font-semibold text-brand-black">
          Recent signups
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-ui-border bg-white">
          {!data?.recentSignups?.length ? (
            <p className="px-4 py-10 text-center text-sm text-ui-muted">
              No signups yet
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ui-border bg-ui-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium text-ui-muted">Name</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Email</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Role</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Joined</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSignups.map((u) => (
                  <tr key={u.id} className="border-b border-ui-border last:border-0">
                    <td className="px-4 py-3 font-medium text-brand-black">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-4 py-3 text-ui-muted">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={[
                        'rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
                        u.role === 'STUDENT'
                          ? 'bg-brand-green/10 text-brand-green'
                          : u.role === 'TEACHER'
                          ? 'bg-brand-lavender/20 text-brand-lavender'
                          : 'bg-ui-subtle text-ui-muted',
                      ].join(' ')}>
                        {u.role.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ui-muted">{fmt(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-4 font-serif text-xl font-semibold text-brand-black">
          Recent subscriptions
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-ui-border bg-white">
          {!subs?.length ? (
            <p className="px-4 py-10 text-center text-sm text-ui-muted">
              No subscriptions yet
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ui-border bg-ui-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium text-ui-muted">Student</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Subject</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Status</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Date</th>
                </tr>
              </thead>
              <tbody>
                {subs.slice(0, 10).map((s) => (
                  <tr key={s.id} className="border-b border-ui-border last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-black">
                        {s.student.firstName} {s.student.lastName}
                      </p>
                      <p className="text-xs text-ui-muted">{s.student.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-brand-black">
                        {s.subject.name}
                      </span>
                      <span className="ml-1 text-xs text-ui-muted">
                        — {s.subject.grade.category.examBoard.name}{' '}
                        {s.subject.grade.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={[
                        'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        s.status === 'ACTIVE'
                          ? 'bg-brand-green/10 text-brand-green'
                          : 'bg-amber-100 text-amber-700',
                      ].join(' ')}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ui-muted">{fmt(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
