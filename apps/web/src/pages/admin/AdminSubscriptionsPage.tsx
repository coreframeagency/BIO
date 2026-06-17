import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageLoader } from '@/components/ui/Loading';
import { apiFetch } from '@/services/api';

interface SubItem {
  id: string;
  status: string;
  interval: string;
  createdAt: string;
  student: { firstName: string; lastName: string; email: string };
  subject: {
    name: string;
    grade: {
      slug: string;
      name: string;
      category: { examBoard: { name: string } };
    };
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function AdminSubscriptionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const res = await apiFetch<SubItem[]>('/admin/subscriptions');
      if (!res.ok) return [];
      return res.data ?? [];
    },
  });

  const active = data?.filter(s => s.status === 'ACTIVE').length ?? 0;
  const total = data?.length ?? 0;

  return (
    <AdminLayout>
      <h1 className="font-serif text-3xl font-bold text-brand-black">
        Subscriptions
      </h1>
      <p className="mt-1 text-ui-muted">
        {active} active · {total} total
      </p>

      {isLoading && <PageLoader />}

      {!isLoading && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-ui-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ui-border bg-ui-subtle">
              <tr>
                <th className="px-4 py-3 font-medium text-ui-muted">Student</th>
                <th className="px-4 py-3 font-medium text-ui-muted">Subject</th>
                <th className="px-4 py-3 font-medium text-ui-muted">Exam board</th>
                <th className="px-4 py-3 font-medium text-ui-muted">Plan</th>
                <th className="px-4 py-3 font-medium text-ui-muted">Status</th>
                <th className="px-4 py-3 font-medium text-ui-muted">Since</th>
              </tr>
            </thead>
            <tbody>
              {!data || data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-ui-muted">
                    No subscriptions yet
                  </td>
                </tr>
              ) : (
                data.map((sub) => (
                  <tr key={sub.id} className="border-b border-ui-border last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-black">
                        {sub.student.firstName} {sub.student.lastName}
                      </p>
                      <p className="text-xs text-ui-muted">{sub.student.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-brand-black">
                        {sub.subject.name}
                      </span>
                      <span className="ml-1 text-xs text-ui-muted">
                        — {sub.subject.grade.category.examBoard.name}{' '}
                        {sub.subject.grade.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ui-muted">
                      {sub.subject.grade.category.examBoard.name}
                    </td>
                    <td className="px-4 py-3 text-ui-muted capitalize">
                      {sub.interval.toLowerCase()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={[
                        'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        sub.status === 'ACTIVE'
                          ? 'bg-brand-green/10 text-brand-green'
                          : 'bg-amber-100 text-amber-700',
                      ].join(' ')}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ui-muted">
                      {formatDate(sub.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
