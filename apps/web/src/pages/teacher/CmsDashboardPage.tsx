import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BookOpen, FileText, HelpCircle, Plus, Upload } from 'lucide-react';
import { TeacherLayout } from '@/components/layout/RoleLayouts';
import { PageLoader } from '@/components/ui/Loading';
import { apiFetch } from '@/services/api';

interface SubjectInfo {
  id: string;
  name: string;
  grade: {
    name: string;
    category: { name: string; examBoard: { name: string } };
  };
}

interface RecentLesson {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  subject: {
    name: string;
    gradeName: string;
    categoryName: string;
    boardName: string;
  } | null;
}

interface DashboardStats {
  totalLessons: number;
  publishedLessons: number;
  pendingLessons: number;
  draftLessons: number;
  pastPapersCount: number;
  questionsCount: number;
  flashcardsCount: number;
  assignedSubjectsCount: number;
}

interface DashboardData {
  stats: DashboardStats;
  assignedSubjects: SubjectInfo[];
  recentLessons: RecentLesson[];
}

function statusLabel(s: string) {
  if (s === 'PUBLISHED') return 'Published';
  if (s === 'PENDING_REVIEW') return 'Pending review';
  return 'Draft';
}

function statusClass(s: string) {
  if (s === 'PUBLISHED') return 'bg-brand-green/10 text-brand-green';
  if (s === 'PENDING_REVIEW') return 'bg-amber-100 text-amber-700';
  return 'bg-ui-subtle text-ui-muted';
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function CmsDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['teacher-dashboard-v2'],
    queryFn: async () => {
      const res = await apiFetch<DashboardData>('/teacher/dashboard');
      if (!res.ok) throw new Error(res.error ?? 'Failed');
      return res.data!;
    },
  });

  const stats = data?.stats;

  return (
    <TeacherLayout>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-black">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-ui-muted">
            Welcome back — here's your content overview
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

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-brand-lavender p-6">
          <p className="font-serif text-4xl font-bold text-white">
            {stats?.assignedSubjectsCount ?? 0}
          </p>
          <p className="mt-1 text-sm font-medium text-white/90">My subjects</p>
          <p className="mt-1 text-xs text-white/70">Assigned by admin</p>
        </div>
        <div className="rounded-2xl bg-brand-green p-6">
          <p className="font-serif text-4xl font-bold text-white">
            {stats?.publishedLessons ?? 0}
          </p>
          <p className="mt-1 text-sm font-medium text-white/90">Lessons published</p>
          {(stats?.pendingLessons ?? 0) > 0 && (
            <p className="mt-1 text-xs text-white/70">
              {stats!.pendingLessons} pending review
            </p>
          )}
        </div>
        <div className="rounded-2xl bg-brand-mustard p-6">
          <p className="font-serif text-4xl font-bold text-white">
            {stats?.pastPapersCount ?? 0}
          </p>
          <p className="mt-1 text-sm font-medium text-white/90">Past papers uploaded</p>
        </div>
        <div className="rounded-2xl bg-brand-sky p-6">
          <p className="font-serif text-4xl font-bold text-white">
            {stats?.questionsCount ?? 0}
          </p>
          <p className="mt-1 text-sm font-medium text-white/90">Questions added</p>
          <p className="mt-1 text-xs text-white/70">
            {(stats?.flashcardsCount ?? 0) > 0
              ? `+ ${stats!.flashcardsCount} flashcards`
              : 'Practice + flashcards'}
          </p>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-4 font-serif text-xl font-semibold text-brand-black">
          My assigned subjects
        </h2>
        <div className="rounded-2xl border border-ui-border bg-white p-5">
          {data?.assignedSubjects && data.assignedSubjects.length > 0 ? (
            <>
              <p className="mb-3 text-sm text-ui-muted">
                You can create content for these subjects
              </p>
              <div className="flex flex-wrap gap-2">
                {data.assignedSubjects.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center rounded-full bg-brand-green/10 px-3 py-1.5 text-xs font-medium text-brand-green"
                  >
                    {s.name} — {s.grade.category.examBoard.name}{' '}
                    {s.grade.category.name} {s.grade.name}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-ui-muted">
              No subjects assigned yet. Contact admin to get subjects assigned to your account.
            </p>
          )}
        </div>
      </div>

      {isLoading && <PageLoader />}

      <div className="mt-10">
        <h2 className="mb-4 font-serif text-xl font-semibold text-brand-black">
          Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/cms/lessons/new"
            className="flex items-center gap-3 rounded-2xl border border-ui-border bg-white p-5 hover:border-brand-green/40 hover:bg-brand-green/5 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green/10">
              <Plus size={20} className="text-brand-green" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-black">Create lesson</p>
              <p className="text-xs text-ui-muted">Add notes, visual, questions</p>
            </div>
          </Link>
          <Link
            to="/cms/past-papers"
            className="flex items-center gap-3 rounded-2xl border border-ui-border bg-white p-5 hover:border-brand-lavender/40 hover:bg-brand-lavender/5 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-lavender/10">
              <Upload size={20} className="text-brand-lavender" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-black">Upload past paper</p>
              <p className="text-xs text-ui-muted">PDF, by year and session</p>
            </div>
          </Link>
          <Link
            to="/cms/lessons"
            className="flex items-center gap-3 rounded-2xl border border-ui-border bg-white p-5 hover:border-brand-mustard/40 hover:bg-brand-mustard/5 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-mustard/10">
              <BookOpen size={20} className="text-brand-mustard" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-black">Manage lessons</p>
              <p className="text-xs text-ui-muted">Edit, review, publish</p>
            </div>
          </Link>
          <Link
            to="/cms/questions"
            className="flex items-center gap-3 rounded-2xl border border-ui-border bg-white p-5 hover:border-brand-sky/40 hover:bg-brand-sky/5 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-sky/10">
              <HelpCircle size={20} className="text-brand-sky" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-black">Question bank</p>
              <p className="text-xs text-ui-muted">Browse all questions</p>
            </div>
          </Link>
          <Link
            to="/cms/past-papers"
            className="flex items-center gap-3 rounded-2xl border border-ui-border bg-white p-5 hover:border-brand-tangerine/40 hover:bg-brand-tangerine/5 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tangerine/10">
              <FileText size={20} className="text-brand-tangerine" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-black">Past papers</p>
              <p className="text-xs text-ui-muted">View all uploaded papers</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-brand-black">
            Recent lessons
          </h2>
          <Link to="/cms/lessons" className="text-sm font-medium text-brand-green hover:underline">
            View all →
          </Link>
        </div>
        <div className="rounded-2xl border border-ui-border bg-white">
          {!data?.recentLessons || data.recentLessons.length === 0 ? (
            <div className="px-4 py-12 text-center">
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
                {data.recentLessons.map((l) => (
                  <tr key={l.id} className="border-b border-ui-border last:border-0">
                    <td className="px-4 py-3 font-medium text-brand-black">{l.title}</td>
                    <td className="px-4 py-3 text-ui-muted">
                      {l.subject ? (
                        <span>
                          <span className="font-medium text-brand-black">{l.subject.name}</span>
                          <span className="ml-1 text-xs">
                            — {l.subject.boardName} {l.subject.categoryName} {l.subject.gradeName}
                          </span>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={['rounded-full px-2.5 py-0.5 text-xs font-semibold', statusClass(l.status)].join(' ')}>
                        {statusLabel(l.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ui-muted">{fmt(l.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {stats && (stats.draftLessons > 0 || stats.pendingLessons > 0) && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-800">Content awaiting action</p>
          <p className="mt-1 text-sm text-amber-700">
            {stats.draftLessons > 0 && (
              <>{stats.draftLessons} lesson{stats.draftLessons > 1 ? 's' : ''} in draft — </>
            )}
            {stats.pendingLessons > 0 && (
              <>{stats.pendingLessons} lesson{stats.pendingLessons > 1 ? 's' : ''} waiting for admin approval</>
            )}
          </p>
          <Link to="/cms/lessons" className="mt-2 inline-block text-sm font-semibold text-amber-800 underline">
            View all lessons →
          </Link>
        </div>
      )}
    </TeacherLayout>
  );
}
