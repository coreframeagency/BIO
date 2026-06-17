import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { StudentLayout } from '@/components/layout/RoleLayouts';
import { Card } from '@/components/ui/Card';
import { PageLoader, ErrorState } from '@/components/ui/Loading';
import { apiFetch } from '@/services/api';
import { Subject } from '@/types';

export default function SubjectHomePage() {
  const { boardSlug, subjectSlug } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['subject', boardSlug, subjectSlug],
    queryFn: async () => {
      const res = await apiFetch<Subject>(`/subjects/${boardSlug}/${subjectSlug}`);
      if (!res.ok) throw new Error(res.error);
      return res.data!;
    },
    enabled: !!boardSlug && !!subjectSlug,
  });

  return (
    <StudentLayout>
      {isLoading && <PageLoader />}
      {error && <ErrorState message={(error as Error).message} />}
      {data && (
        <>
          <h1 className="font-serif text-3xl font-bold">{data.name}</h1>
          <p className="mt-1 text-ui-muted">{data.examBoard?.name}</p>
          <p className="mt-4 text-ui-muted">{data.description}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.grades?.map((grade) => (
              <Link
                key={grade.id}
                to={`/subjects/${boardSlug}/${subjectSlug}/${grade.slug}`}
              >
                <Card accentColor={data.color || undefined}>
                  <h2 className="font-serif text-xl font-semibold">{grade.name}</h2>
                  <p className="mt-1 text-sm text-ui-muted">{grade._count?.units ?? 0} units</p>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </StudentLayout>
  );
}
