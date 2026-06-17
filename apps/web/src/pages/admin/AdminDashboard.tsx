import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageLoader } from '@/components/ui/Loading';
import { apiFetch } from '@/services/api';
import { Role } from '@/types';

interface AdminStats {
  totalStudents: number;
  totalTeachers: number;
  totalLessons: number;
  totalPastPapers: number;
  recentSignups: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
    createdAt: string;
  }[];
}

function roleBadgeClass(role: Role): string {
  switch (role) {
    case 'STUDENT':
      return 'bg-brand-green/10 text-brand-green';
    case 'TEACHER':
      return 'bg-brand-lavender/20 text-brand-lavender';
    case 'PARENT':
      return 'bg-brand-sky/30 text-brand-black';
    default:
      return 'bg-ui-subtle text-ui-muted';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await apiFetch<AdminStats>('/admin/stats');
      if (!res.ok) throw new Error(res.error ?? 'Failed to load stats');
      return res.data!;
    },
  });

  return (
    <AdminLayout>
      <h1 className="font-serif text-3xl font-bold text-brand-black">Admin Overview</h1>

      {isLoading && <PageLoader />}

      {error && (
        <p className="mt-4 text-sm text-brand-red">{(error as Error).message}</p>
      )}

      {data && (
        <>
          <div className="mb-8 mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl bg-brand-lavender p-5 text-white">
              <p className="font-serif text-4xl font-bold">{data.totalStudents}</p>
              <p className="mt-1 text-sm opacity-80">Total students</p>
            </div>
            <div className="rounded-2xl bg-brand-green p-5 text-white">
              <p className="font-serif text-4xl font-bold">{data.totalTeachers}</p>
              <p className="mt-1 text-sm opacity-80">Total teachers</p>
            </div>
            <div className="rounded-2xl bg-brand-mustard p-5 text-brand-black">
              <p className="font-serif text-4xl font-bold">{data.totalLessons}</p>
              <p className="mt-1 text-sm opacity-80">Total lessons</p>
            </div>
            <div className="rounded-2xl bg-brand-sky p-5 text-brand-black">
              <p className="font-serif text-4xl font-bold">{data.totalPastPapers}</p>
              <p className="mt-1 text-sm opacity-80">Total past papers</p>
            </div>
          </div>

          <h2 className="mb-4 font-serif text-xl font-semibold text-brand-black">
            Recent signups
          </h2>
          <div className="overflow-hidden rounded-2xl border border-ui-border bg-white">
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
                {data.recentSignups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-ui-muted">
                      No signups yet
                    </td>
                  </tr>
                ) : (
                  data.recentSignups.map((user) => (
                    <tr key={user.id} className="border-b border-ui-border last:border-0">
                      <td className="px-4 py-3 font-medium text-brand-black">
                        {user.firstName} {user.lastName}
                      </td>
                      <td className="px-4 py-3 text-ui-muted">{user.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeClass(user.role)}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ui-muted">{formatDate(user.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
