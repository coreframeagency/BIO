import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { StudentLayout } from '@/components/layout/RoleLayouts';
import { Card } from '@/components/ui/Card';
import { PageLoader, ErrorState } from '@/components/ui/Loading';
import { apiFetch } from '@/services/api';
import { Grade } from '@/types';

export default function GradeOverviewPage() {
  const { boardSlug, subjectSlug, gradeSlug } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['grade', boardSlug, subjectSlug, gradeSlug],
    queryFn: async () => {
      const res = await apiFetch<Grade>(`/grades/${boardSlug}/${subjectSlug}/${gradeSlug}`);
      if (!res.ok) throw new Error(res.error);
      return res.data!;
    },
    enabled: !!boardSlug && !!subjectSlug && !!gradeSlug,
  });

  return (
    <StudentLayout>
      {isLoading && <PageLoader />}
      {error && <ErrorState message={(error as Error).message} />}
      {data && (
        <>
          <h1 className="font-serif text-3xl font-bold">{data.name}</h1>
          <p className="mt-1 text-ui-muted">{data.subject?.name}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {data.units?.map((unit) => (
              <Link
                key={unit.id}
                to={`/subjects/${boardSlug}/${subjectSlug}/${gradeSlug}/units/${unit.slug}`}
              >
                <Card accentColor={data.subject?.color || undefined}>
                  <h2 className="font-serif text-xl font-semibold">{unit.name}</h2>
                  <p className="mt-2 text-sm text-ui-muted">{unit.description}</p>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </StudentLayout>
  );
}
