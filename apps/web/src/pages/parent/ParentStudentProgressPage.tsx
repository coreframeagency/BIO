import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ParentLayout } from '@/components/layout/ParentLayout';
import { PageLoader } from '@/components/ui/Loading';
import { apiFetch } from '@/services/api';

interface SubjectProgress {
  subjectId: string;
  name: string;
  examBoard: string;
  completedLessons: number;
  totalLessons: number;
}

interface RecentActivity {
  id: string;
  lessonTitle: string;
  score: number | null;
  date: string;
  isComplete: boolean;
}

interface StudentProgress {
  student: { firstName: string; lastName: string };
  subjects: SubjectProgress[];
  lessonsCompleted: number;
  averageScore: number;
  studyStreak: number;
  timeStudiedSeconds: number;
  recentActivity: RecentActivity[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatHours(seconds: number): string {
  const hours = Math.round((seconds / 3600) * 10) / 10;
  return hours < 1 ? '<1' : String(hours);
}

export default function ParentStudentProgressPage() {
  const { studentId } = useParams<{ studentId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['parent-student-progress', studentId],
    queryFn: async () => {
      const res = await apiFetch<StudentProgress>(`/parent/student/${studentId}/progress`);
      if (!res.ok) throw new Error(res.error ?? 'Failed to load progress');
      return res.data!;
    },
    enabled: !!studentId,
  });

  const childName = data
    ? `${data.student.firstName} ${data.student.lastName}`
    : 'Child';

  return (
    <ParentLayout>
      <div className="min-h-full bg-brand-shell p-4 md:p-8">
        <Link to="/parent/children" className="text-sm text-ui-muted hover:text-brand-green">
          ← Back to My Children
        </Link>

        <h1 className="mt-4 font-serif text-3xl font-bold text-brand-black">
          {childName}&apos;s Progress
        </h1>

        {isLoading && <PageLoader />}

        {error && (
          <p className="mt-4 text-sm text-brand-red">{(error as Error).message}</p>
        )}

        {data && (
          <>
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-2xl bg-brand-lavender p-5 text-white">
                <p className="font-serif text-4xl font-bold">{data.lessonsCompleted}</p>
                <p className="mt-1 text-sm opacity-80">Lessons completed</p>
              </div>
              <div className="rounded-2xl bg-brand-mustard p-5 text-brand-black">
                <p className="font-serif text-4xl font-bold">{data.averageScore}%</p>
                <p className="mt-1 text-sm opacity-80">Average score</p>
              </div>
              <div className="rounded-2xl bg-brand-sky p-5 text-brand-black">
                <p className="font-serif text-4xl font-bold">{data.studyStreak}</p>
                <p className="mt-1 text-sm opacity-80">Study streak</p>
              </div>
              <div className="rounded-2xl bg-brand-tangerine p-5 text-white">
                <p className="font-serif text-4xl font-bold">
                  {formatHours(data.timeStudiedSeconds)}
                </p>
                <p className="mt-1 text-sm opacity-80">Hours studied</p>
              </div>
            </div>

            <h2 className="mb-4 mt-10 font-serif text-xl font-semibold text-brand-black">
              Subject progress
            </h2>
            {data.subjects.length === 0 ? (
              <p className="text-ui-muted">No enrolled subjects yet.</p>
            ) : (
              <div className="space-y-3">
                {data.subjects.map((subject) => (
                  <div
                    key={subject.subjectId}
                    className="rounded-xl border border-ui-border bg-white p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="font-medium text-brand-black">{subject.name}</span>
                      {subject.examBoard && (
                        <span className="rounded-full bg-brand-green/10 px-2.5 py-0.5 text-xs font-medium text-brand-green">
                          {subject.examBoard}
                        </span>
                      )}
                    </div>
                    <div className="mb-1 h-2 rounded-full bg-ui-subtle">
                      <div
                        className="h-2 rounded-full bg-brand-green"
                        style={{
                          width: `${
                            subject.totalLessons > 0
                              ? Math.round(
                                  (subject.completedLessons / subject.totalLessons) * 100
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <p className="text-sm text-ui-muted">
                      {subject.completedLessons} of {subject.totalLessons} lessons completed
                    </p>
                  </div>
                ))}
              </div>
            )}

            <h2 className="mb-4 mt-10 font-serif text-xl font-semibold text-brand-black">
              Recent activity
            </h2>
            {data.recentActivity.length === 0 ? (
              <div className="rounded-xl border border-ui-border bg-white p-8 text-center text-ui-muted">
                No recent activity yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-ui-border bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-ui-border bg-ui-subtle">
                    <tr>
                      <th className="px-4 py-3 font-medium text-ui-muted">Lesson</th>
                      <th className="px-4 py-3 font-medium text-ui-muted">Score</th>
                      <th className="px-4 py-3 font-medium text-ui-muted">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentActivity.map((item) => (
                      <tr key={item.id} className="border-b border-ui-border last:border-0">
                        <td className="px-4 py-3 font-medium text-brand-black">
                          {item.lessonTitle}
                          {item.isComplete && (
                            <span className="ml-2 text-xs text-brand-green">Complete</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-ui-muted">
                          {item.score != null ? `${item.score}%` : '—'}
                        </td>
                        <td className="px-4 py-3 text-ui-muted">{formatDate(item.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </ParentLayout>
  );
}
