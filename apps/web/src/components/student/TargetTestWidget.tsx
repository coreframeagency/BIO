import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner } from '@/components/ui/Loading';
import { apiFetch } from '@/services/api';
import { cn } from '@/utils/helpers';

interface WeakUnit {
  unitName: string;
  unitId: string;
  unitSlug: string;
  score: number;
  totalAttempts: number;
}

interface WeakTopicSubject {
  subjectName: string;
  subjectId: string;
  boardSlug: string;
  categorySlug: string;
  gradeSlug: string;
  subjectSlug: string;
  weakUnits: WeakUnit[];
}

function scoreBarColor(score: number): string {
  if (score < 40) return 'bg-brand-red';
  return 'bg-amber-500';
}

export function TargetTestWidget() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['weak-topics'],
    queryFn: async () => {
      const res = await apiFetch<WeakTopicSubject[]>('/progress/weak-topics');
      if (!res.ok) throw new Error(res.error ?? 'Failed to load weak topics');
      return res.data ?? [];
    },
  });

  const hasWeakTopics = data && data.some((s) => s.weakUnits.length > 0);

  return (
    <div className="rounded-2xl border border-ui-border bg-white p-5">
      <h3 className="font-serif text-xl font-semibold">📍 Your weak topics</h3>
      <p className="mt-1 text-xs text-ui-muted">Based on your question attempts</p>

      {isLoading && <LoadingSpinner className="py-6" />}

      {error && (
        <p className="mt-4 text-sm text-brand-red">Could not load weak topics.</p>
      )}

      {!isLoading && !error && !hasWeakTopics && (
        <p className="mt-4 text-sm text-ui-muted">
          Great work! No weak topics identified yet.
        </p>
      )}

      {!isLoading && hasWeakTopics && (
        <div className="mt-4 space-y-4">
          {data!.map((subject) =>
            subject.weakUnits.map((unit) => {
              const unitPath = `/subjects/${subject.boardSlug}/${subject.categorySlug}/${subject.gradeSlug}/${subject.subjectSlug}/${unit.unitSlug}`;
              return (
                <div key={`${subject.subjectId}-${unit.unitId}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{unit.unitName}</p>
                    <span className="shrink-0 text-xs text-ui-muted">{unit.score}%</span>
                  </div>
                  <p className="text-xs text-ui-muted">{subject.subjectName}</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-ui-subtle">
                    <div
                      className={cn('h-full rounded-full transition-all', scoreBarColor(unit.score))}
                      style={{ width: `${unit.score}%` }}
                    />
                  </div>
                  <Link
                    to={unitPath}
                    className="mt-2 inline-block text-xs font-medium text-brand-green hover:underline"
                  >
                    Practise now →
                  </Link>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
