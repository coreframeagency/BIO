import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { TeacherLayout } from '@/components/layout/RoleLayouts';
import { PageLoader } from '@/components/ui/Loading';
import { apiFetch } from '@/services/api';

interface LessonItem {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  isFree: boolean;
  subject: {
    id: string;
    name: string;
    gradeName: string;
    categoryName: string;
    boardName: string;
  } | null;
  isAllowed: boolean;
}

function statusLabel(status: string) {
  if (status === 'PUBLISHED') return 'Published';
  if (status === 'PENDING_REVIEW') return 'Pending review';
  if (status === 'ARCHIVED') return 'Archived';
  return 'Draft';
}

function statusClass(status: string) {
  if (status === 'PUBLISHED') return 'bg-brand-green/10 text-brand-green';
  if (status === 'PENDING_REVIEW') return 'bg-amber-100 text-amber-700';
  if (status === 'ARCHIVED') return 'bg-ui-subtle text-ui-muted line-through';
  return 'bg-ui-subtle text-ui-muted';
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function CmsLessonsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['teacher-lessons-free'],
    queryFn: async () => {
      const res = await apiFetch<LessonItem[]>('/teacher/lessons');
      if (!res.ok) throw new Error(res.error ?? 'Failed');
      return res.data ?? [];
    },
  });

  const active = data?.filter((l) => l.status !== 'ARCHIVED') ?? [];
  const archived = data?.filter((l) => l.status === 'ARCHIVED') ?? [];

  return (
    <TeacherLayout>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-black">My lessons</h1>
          <p className="mt-1 text-sm text-ui-muted">
            First lesson per subject is free for all students
          </p>
        </div>
        <Link
          to="/cms/lessons/new"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus size={16} />
          New lesson
        </Link>
      </div>

      {isLoading && <PageLoader />}

      {!isLoading && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-ui-border bg-white">
          {!data || data.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <p className="text-sm text-ui-muted">No lessons yet</p>
              <Link
                to="/cms/lessons/new"
                className="mt-3 inline-block rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Create your first lesson
              </Link>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ui-border bg-ui-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium text-ui-muted">Lesson</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Subject</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Status</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Created</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {active.map((l) => (
                  <tr key={l.id} className="border-b border-ui-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-brand-black">{l.title}</span>
                        {l.isFree && (
                          <span className="rounded-full bg-brand-sky/20 px-2 py-0.5 text-[10px] font-semibold text-brand-sky">
                            FREE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ui-muted">
                      {l.subject ? (
                        <>
                          <span className="font-medium text-brand-black">{l.subject.name}</span>
                          <span className="ml-1 text-xs">
                            — {l.subject.boardName} {l.subject.categoryName}{' '}
                            {l.subject.gradeName}
                          </span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          'rounded-full px-2.5 py-0.5',
                          'text-xs font-semibold',
                          statusClass(l.status),
                        ].join(' ')}
                      >
                        {statusLabel(l.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ui-muted">{fmt(l.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/cms/lessons/${l.id}/edit`}
                          className="rounded-lg bg-ui-subtle px-3 py-1 text-xs font-semibold text-brand-black hover:bg-ui-border"
                        >
                          Edit
                        </Link>
                        <Link
                          to={`/cms/lessons/${l.id}/questions`}
                          className="rounded-lg bg-brand-mustard/10 px-3 py-1 text-xs font-semibold text-brand-mustard hover:bg-brand-mustard/20"
                        >
                          Questions
                        </Link>
                        <Link
                          to={`/cms/lessons/${l.id}/visual`}
                          className="rounded-lg bg-brand-lavender/10 px-3 py-1 text-xs font-semibold text-brand-lavender hover:bg-brand-lavender/20"
                        >
                          Visual
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {archived.length > 0 && (
                  <>
                    <tr>
                      <td
                        colSpan={5}
                        className="bg-ui-subtle px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ui-muted"
                      >
                        Archived
                      </td>
                    </tr>
                    {archived.map((l) => (
                      <tr
                        key={l.id}
                        className="border-b border-ui-border opacity-50 last:border-0"
                      >
                        <td className="px-4 py-3 font-medium text-brand-black">{l.title}</td>
                        <td className="px-4 py-3 text-ui-muted">{l.subject?.name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-ui-subtle px-2.5 py-0.5 text-xs font-semibold text-ui-muted">
                            Archived
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ui-muted">{fmt(l.createdAt)}</td>
                        <td className="px-4 py-3" />
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </TeacherLayout>
  );
}
