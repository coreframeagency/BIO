import { useQuery } from '@tanstack/react-query';
import { TeacherLayout } from '@/components/layout/RoleLayouts';
import { PageLoader } from '@/components/ui/Loading';
import { apiFetch } from '@/services/api';

interface StudentRow {
  id: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  subject: {
    id: string;
    name: string;
    gradeName: string;
    categoryName: string;
    boardName: string;
  };
  subscribedAt: string;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function CmsStudentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['teacher-students'],
    queryFn: async () => {
      const res = await apiFetch<StudentRow[]>('/teacher/students');
      if (!res.ok) throw new Error(res.error ?? 'Failed');
      return res.data ?? [];
    },
  });

  const uniqueStudents = data ? new Set(data.map((r) => r.student.id)).size : 0;

  return (
    <TeacherLayout>
      <div>
        <h1 className="font-serif text-3xl font-bold text-brand-black">My students</h1>
        <p className="mt-1 text-sm text-ui-muted">
          Students subscribed to your assigned subjects
        </p>
      </div>

      {isLoading && <PageLoader />}

      {!isLoading && (
        <>
          {data && data.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-4">
              <div className="rounded-2xl bg-brand-green px-6 py-4 text-white">
                <p className="font-serif text-3xl font-bold">{uniqueStudents}</p>
                <p className="mt-1 text-sm font-medium opacity-90">Total students</p>
              </div>
              <div className="rounded-2xl bg-brand-lavender px-6 py-4 text-white">
                <p className="font-serif text-3xl font-bold">{data.length}</p>
                <p className="mt-1 text-sm font-medium opacity-90">Subject subscriptions</p>
              </div>
            </div>
          )}

          <div className="mt-6 overflow-x-auto rounded-2xl border border-ui-border bg-white">
            {!data || data.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <p className="text-2xl">👩‍🎓</p>
                <p className="mt-3 font-medium text-brand-black">No students yet</p>
                <p className="mt-1 text-sm text-ui-muted">
                  Students will appear here once they subscribe to your subjects
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ui-border bg-ui-subtle">
                  <tr>
                    <th className="px-4 py-3 font-medium text-ui-muted">Student</th>
                    <th className="px-4 py-3 font-medium text-ui-muted">Subject</th>
                    <th className="px-4 py-3 font-medium text-ui-muted">Subscribed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.id} className="border-b border-ui-border last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-brand-black">
                          {row.student.firstName} {row.student.lastName}
                        </p>
                        <p className="text-xs text-ui-muted">{row.student.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-brand-black">{row.subject.name}</span>
                        <span className="ml-1 text-xs text-ui-muted">
                          — {row.subject.boardName} {row.subject.categoryName}{' '}
                          {row.subject.gradeName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ui-muted">{fmt(row.subscribedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </TeacherLayout>
  );
}
