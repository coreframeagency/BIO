import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { StudentLayout } from '@/components/layout/RoleLayouts';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageLoader, ErrorState } from '@/components/ui/Loading';
import { apiFetch } from '@/services/api';
import { Unit } from '@/types';

export default function UnitPage() {
  const { boardSlug, subjectSlug, gradeSlug, unitSlug } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['unit', boardSlug, subjectSlug, gradeSlug, unitSlug],
    queryFn: async () => {
      const res = await apiFetch<Unit>(
        `/units/${boardSlug}/${subjectSlug}/${gradeSlug}/${unitSlug}`
      );
      if (!res.ok) throw new Error(res.error);
      return res.data!;
    },
    enabled: !!boardSlug && !!subjectSlug && !!gradeSlug && !!unitSlug,
  });

  const accent = data?.grade?.subject?.color;

  return (
    <StudentLayout>
      {isLoading && <PageLoader />}
      {error && <ErrorState message={(error as Error).message} />}
      {data && (
        <>
          <h1 className="font-serif text-3xl font-bold">{data.name}</h1>
          <p className="mt-2 text-ui-muted">{data.description}</p>
          <div className="mt-8 space-y-4">
            {data.lessonLinks?.map(({ lesson }) => (
              <Link key={lesson.id} to={`/lessons/${lesson.slug}`}>
                <Card accentColor={accent || undefined} className="flex items-center justify-between">
                  <div>
                    <h2 className="font-serif text-xl font-semibold">{lesson.title}</h2>
                    <p className="mt-1 text-sm text-ui-muted">{lesson.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {lesson.visualStatus === 'APPROVED' && (
                      <Badge variant="visual">Visual</Badge>
                    )}
                    <span className="flex items-center gap-1 text-sm text-ui-muted">
                      <Clock size={16} />
                      {lesson.estimatedMinutes}m
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </StudentLayout>
  );
}
