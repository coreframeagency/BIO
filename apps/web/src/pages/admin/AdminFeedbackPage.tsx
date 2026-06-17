import { useQuery, useMutation, useQueryClient }
  from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageLoader } from '@/components/ui/Loading';
import { apiFetch } from '@/services/api';

interface FeedbackItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  isActive: boolean;
}

function parseTitle(title: string): {
  category: string; from: string;
} {
  const match = title.match(/^\[FEEDBACK:(\w+)\]\s*(.*)/);
  return {
    category: match?.[1] ?? 'General',
    from: match?.[2] ?? 'Anonymous',
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const CATEGORY_COLOURS: Record<string, string> = {
  Bug: 'bg-red-100 text-red-700',
  Suggestion: 'bg-brand-lavender/20 text-brand-lavender',
  General: 'bg-brand-sky/20 text-brand-black',
};

export default function AdminFeedbackPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-feedback'],
    queryFn: async () => {
      const res = await apiFetch<FeedbackItem[]>(
        '/admin/feedback'
      );
      if (!res.ok) return [];
      return res.data ?? [];
    },
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(
        `/admin/announcements/${id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin-feedback'],
      });
    },
  });

  const unread = data?.filter((f) => f.isActive).length ?? 0;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold
            text-brand-black">
            Feedback
          </h1>
          <p className="mt-1 text-ui-muted">
            {unread > 0
              ? `${unread} new submission${unread > 1 ? 's' : ''}`
              : 'All caught up'}
          </p>
        </div>
      </div>

      {isLoading && <PageLoader />}

      {!isLoading && (!data || data.length === 0) && (
        <div className="mt-12 text-center">
          <p className="text-4xl">💬</p>
          <p className="mt-3 text-ui-muted">
            No feedback yet
          </p>
          <p className="text-sm text-ui-muted">
            Share the feedback form link with users:
            <span className="ml-1 font-medium text-brand-green">
              markly.live/feedback
            </span>
          </p>
        </div>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="mt-6 space-y-4">
          {data.map((item) => {
            const { category, from } = parseTitle(item.title);
            return (
              <div key={item.id}
                className="rounded-2xl border border-ui-border
                  bg-white p-5">
                <div className="flex items-start
                  justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={[
                      'rounded-full px-2.5 py-0.5 text-xs',
                      'font-semibold',
                      CATEGORY_COLOURS[category] ??
                        'bg-ui-subtle text-ui-muted',
                    ].join(' ')}>
                      {category}
                    </span>
                    <span className="text-xs text-ui-muted">
                      {from}
                    </span>
                    <span className="text-xs text-ui-muted">
                      · {formatDate(item.createdAt)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss.mutate(item.id)}
                    disabled={dismiss.isPending}
                    className="shrink-0 rounded-lg p-1.5
                      text-ui-muted hover:bg-red-50
                      hover:text-brand-red disabled:opacity-50"
                    title="Dismiss"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="mt-3 text-sm text-brand-black
                  leading-relaxed whitespace-pre-wrap">
                  {item.body}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
