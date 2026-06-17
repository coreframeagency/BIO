import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageLoader } from '@/components/ui/Loading';
import { apiFetch } from '@/services/api';

interface Announcement {
  id: string;
  title: string;
  body: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminAnnouncementsPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [toast, setToast] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const res = await apiFetch<Announcement[]>('/admin/announcements');
      if (!res.ok) return [];
      return res.data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/admin/announcements', {
        method: 'POST',
        body: JSON.stringify({ title, body }),
      });
      if (!res.ok) throw new Error(res.error ?? 'Failed');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin-announcements'],
      });
      setTitle('');
      setBody('');
      setToast('Announcement posted');
      setTimeout(() => setToast(''), 3000);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/admin/announcements/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(res.error ?? 'Failed');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin-announcements'],
      });
    },
  });

  return (
    <AdminLayout>
      <h1 className="font-serif text-3xl font-bold text-brand-black">
        Announcements
      </h1>
      <p className="mt-1 text-ui-muted">
        Post notices that appear on the student dashboard
      </p>

      {toast && (
        <div className="mt-4 rounded-xl border border-brand-green/30
          bg-brand-green/10 px-4 py-3 text-sm font-medium
          text-brand-green">
          {toast}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-ui-border
        bg-white p-6">
        <h2 className="font-serif text-lg font-semibold text-brand-black
          mb-4">
          New announcement
        </h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium
              text-brand-black">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New Chemistry content added"
              className="w-full rounded-xl border border-ui-border px-3
                py-2.5 text-sm focus:border-brand-green focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium
              text-brand-black">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="e.g. We've added 5 new lessons to Chemistry Unit 2..."
              rows={3}
              className="w-full rounded-xl border border-ui-border px-3
                py-2.5 text-sm focus:border-brand-green focus:outline-none
                resize-none"
            />
          </div>
          <button
            type="button"
            disabled={!title.trim() || !body.trim() || create.isPending}
            onClick={() => create.mutate()}
            className="rounded-xl bg-brand-green px-5 py-2.5 text-sm
              font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {create.isPending ? 'Posting…' : 'Post announcement'}
          </button>
        </div>
      </div>

      {isLoading && <PageLoader />}

      {!isLoading && (
        <div className="mt-6 space-y-3">
          <h2 className="font-serif text-lg font-semibold text-brand-black">
            Posted announcements
          </h2>
          {!data || data.length === 0 ? (
            <p className="text-sm text-ui-muted">
              No announcements yet
            </p>
          ) : (
            data.map((a) => (
              <div key={a.id} className="flex items-start justify-between
                gap-4 rounded-2xl border border-ui-border bg-white p-5">
                <div>
                  <p className="font-semibold text-brand-black">{a.title}</p>
                  <p className="mt-1 text-sm text-ui-muted">{a.body}</p>
                  <p className="mt-2 text-xs text-ui-muted">
                    {new Date(a.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove.mutate(a.id)}
                  disabled={remove.isPending}
                  className="shrink-0 rounded-lg p-2 text-brand-red
                    hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </AdminLayout>
  );
}
