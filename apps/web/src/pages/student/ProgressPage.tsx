import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Flame, Target, TrendingUp } from 'lucide-react';
import { StudentLayout } from '@/components/layout/RoleLayouts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, PageLoader } from '@/components/ui/Loading';
import { apiFetch } from '@/services/api';

interface ProgressStats {
  lessonsCompleted: number;
  averageScore: number;
  timeStudiedSeconds: number;
  streakDays: number;
}

interface RecentProgress {
  id: string;
  lessonTitle: string;
  subjectName: string;
  latestScore: number | null;
  lastAccessedAt: string;
  isComplete: boolean;
}

function formatStudyTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function ProgressPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['progress-stats'],
    queryFn: async () => {
      const res = await apiFetch<ProgressStats>('/progress/stats');
      if (!res.ok) throw new Error(res.error ?? 'Failed to load stats');
      return res.data!;
    },
  });

  const { data: recent, isLoading: recentLoading } = useQuery({
    queryKey: ['progress-recent'],
    queryFn: async () => {
      const res = await apiFetch<RecentProgress[]>('/progress/recent');
      if (!res.ok) throw new Error(res.error ?? 'Failed to load recent progress');
      return res.data ?? [];
    },
  });

  const isLoading = statsLoading || recentLoading;
  const hasActivity = (stats?.lessonsCompleted ?? 0) > 0 || (recent?.length ?? 0) > 0;

  return (
    <StudentLayout>
      <h1 className="font-serif text-2xl font-bold md:text-3xl">My progress</h1>
      <p className="mt-1 text-sm text-ui-muted">Track your learning journey</p>

      {isLoading && <PageLoader />}

      {!isLoading && stats && (
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="bg-brand-lavender text-white">
            <BookOpen className="mb-2 size-5 opacity-80" />
            <p className="font-serif text-3xl font-bold">{stats.lessonsCompleted}</p>
            <p className="text-sm opacity-90">Lessons completed</p>
          </Card>
          <Card className="bg-brand-mustard text-brand-black">
            <Target className="mb-2 size-5 opacity-80" />
            <p className="font-serif text-3xl font-bold">{stats.averageScore}%</p>
            <p className="text-sm opacity-90">Average score</p>
          </Card>
          <Card className="bg-brand-sky text-brand-black">
            <Flame className="mb-2 size-5 opacity-80" />
            <p className="font-serif text-3xl font-bold">{stats.streakDays}</p>
            <p className="text-sm opacity-90">Day streak</p>
          </Card>
          <Card className="bg-brand-tangerine text-white">
            <Clock className="mb-2 size-5 opacity-80" />
            <p className="font-serif text-3xl font-bold">{formatStudyTime(stats.timeStudiedSeconds)}</p>
            <p className="text-sm opacity-90">Time studied</p>
          </Card>
        </div>
      )}

      {!isLoading && hasActivity && recent && recent.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 font-serif text-xl font-semibold">Recent activity</h2>
          <div className="space-y-3">
            {recent.map((item) => (
              <Card key={item.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold">{item.lessonTitle}</h3>
                    <p className="text-sm text-ui-muted">{item.subjectName}</p>
                  </div>
                  <div className="text-sm text-ui-muted">
                    {item.latestScore != null && <span>Score: {item.latestScore}% · </span>}
                    {item.isComplete && <span className="text-brand-green">Complete</span>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {!isLoading && !hasActivity && (
        <EmptyState
          className="mt-8"
          icon={TrendingUp}
          title="No activity yet"
          description="Start studying to track your progress"
          action={
            <Link to="/subjects">
              <Button>Browse subjects</Button>
            </Link>
          }
        />
      )}
    </StudentLayout>
  );
}
