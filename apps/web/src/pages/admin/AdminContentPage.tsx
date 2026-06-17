import { useQuery, useMutation } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageLoader } from '@/components/ui/Loading';
import { apiFetch } from '@/services/api';

interface ContentItem {
  id: string;
  title: string;
  status: string;
  type?: string;
  subject?: {
    name: string;
    grade?: {
      name: string;
      category?: {
        name: string;
        examBoard?: { name: string };
      };
    };
    pricing?: {
      monthlyPriceCents: number;
      currency: string;
    } | null;
  };
  teacher?: { firstName: string; lastName: string };
  createdAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function AdminContentPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-content'],
    queryFn: async () => {
      const res = await apiFetch<ContentItem[]>('/admin/content');
      if (!res.ok) return [];
      return res.data ?? [];
    },
  });

  const archiveLessonMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(
        `/admin/content/${id}/archive`,
        { method: 'PATCH' }
      );
      if (!res.ok) throw new Error(res.error ?? 'Failed');
    },
    onSuccess: () => refetch(),
  });

  return (
    <AdminLayout>
      <h1 className="font-serif text-3xl font-bold text-brand-black">Content</h1>
      <p className="mt-1 text-ui-muted">All lessons across all subjects</p>

      {isLoading && <PageLoader />}

      {!isLoading && (
        <div className="mt-6 overflow-x-auto">
          <div className="overflow-hidden rounded-2xl border border-ui-border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ui-border bg-ui-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium text-ui-muted">Title</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Subject</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Teacher</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Type</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Price</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Status</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Created</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!data || data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-ui-muted">
                      No content yet
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr key={item.id} className="border-b border-ui-border last:border-0">
                      <td className="px-4 py-3 font-medium text-brand-black">{item.title}</td>
                      <td className="px-4 py-3 text-ui-muted">
                        {item.subject ? (
                          <span>
                            <span className="font-medium text-brand-black">
                              {item.subject.name}
                            </span>
                            <span className="ml-1 text-xs">
                              — {item.subject.grade?.category?.examBoard?.name ?? ''}
                              {' '}{item.subject.grade?.category?.name ?? ''}
                              {' '}{item.subject.grade?.name ?? ''}
                            </span>
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-ui-muted">
                        {item.teacher
                          ? `${item.teacher.firstName} ${item.teacher.lastName}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-ui-muted capitalize">
                        {item.type?.toLowerCase() ?? 'Lesson'}
                      </td>
                      <td className="px-4 py-3 text-ui-muted">
                        {item.subject?.pricing
                          ? `LKR ${(item.subject.pricing.monthlyPriceCents / 100).toFixed(0)}/mo`
                          : <span className="text-xs text-ui-muted">Not set</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <span className={[
                          'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          item.status === 'PUBLISHED'
                            ? 'bg-brand-green/10 text-brand-green'
                            : item.status === 'PENDING_REVIEW'
                            ? 'bg-brand-lavender/20 text-brand-lavender'
                            : 'bg-amber-100 text-amber-700',
                        ].join(' ')}>
                          {item.status}
                        </span>
                        {item.status === 'PENDING_REVIEW' && (
                          <button
                            type="button"
                            className="ml-2 rounded-lg bg-brand-green px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                            onClick={() => {
                              apiFetch(`/admin/content/${item.id}/approve`, { method: 'POST' }).then(
                                () => refetch()
                              );
                            }}
                          >
                            Approve
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ui-muted">{formatDate(item.createdAt)}</td>
                      <td className="px-4 py-3">
                        {item.status !== 'ARCHIVED' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(
                                `Archive "${item.title}"?
It will be hidden from students.`
                              )) {
                                archiveLessonMut.mutate(item.id);
                              }
                            }}
                            disabled={archiveLessonMut.isPending}
                            className="rounded-lg p-1.5 text-ui-muted
                              hover:bg-ui-subtle hover:text-brand-red
                              disabled:opacity-50"
                            title="Archive lesson"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        {item.status === 'ARCHIVED' && (
                          <span className="text-xs text-ui-muted italic">
                            Archived
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
