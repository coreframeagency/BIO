import { useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useToast } from '@/context/ToastContext';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Globe, Lock, Play, Shield } from 'lucide-react';
import { StudentLayout } from '@/components/layout/RoleLayouts';
import { ErrorState } from '@/components/ui/Loading';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/services/api';
import { Category, ExamBoard, Grade, LessonSummary, Subject, Subscription, Unit } from '@/types';
import { cn } from '@/utils/helpers';

const CATEGORY_META: Record<string, { emoji: string; gradeRange: string }> = {
  primary: { emoji: '🎒', gradeRange: 'Grades 1–5' },
  checkpoint: { emoji: '📚', gradeRange: 'Grades 6–9' },
  gcse: { emoji: '🎓', gradeRange: 'Grades 10–11' },
  igcse: { emoji: '🎓', gradeRange: 'Grades 10–11' },
  'a-level': { emoji: '🏆', gradeRange: 'Grades 11–12' },
  ielts: { emoji: '🌍', gradeRange: 'General' },
};

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <StudentLayout>
      <div className="min-h-full bg-brand-shell">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </div>
    </StudentLayout>
  );
}

function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-36 animate-pulse rounded-2xl bg-ui-subtle" />
      ))}
    </div>
  );
}

function SkeletonPills({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-14 w-28 animate-pulse rounded-xl bg-ui-subtle" />
      ))}
    </div>
  );
}

function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-ui-subtle" />
      ))}
    </div>
  );
}

interface BreadcrumbItem {
  label: string;
  to?: string;
}

function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-ui-muted">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-2">
          {index > 0 && <span>›</span>}
          {item.to ? (
            <Link to={item.to} className="hover:text-brand-green">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-brand-black">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function getCategoryMeta(slug: string) {
  return CATEGORY_META[slug] ?? { emoji: '📖', gradeRange: '' };
}

function getSubjectBadge(subject: Subject): string {
  const board = subject.grade?.category?.examBoard?.name;
  const category = subject.grade?.category?.name;
  if (board && category) return `${board} ${category}`;
  if (board) return board;
  return 'Subject';
}

function useExamBoard(slug: string | undefined) {
  return useQuery({
    queryKey: ['exam-board', slug],
    queryFn: async () => {
      const res = await apiFetch<ExamBoard>(`/exam-boards/${slug}`);
      if (!res.ok) throw new Error(res.error);
      return res.data!;
    },
    enabled: !!slug,
  });
}

function useCategories(examBoardId: string | undefined) {
  return useQuery({
    queryKey: ['categories', examBoardId],
    queryFn: async () => {
      const res = await apiFetch<Category[]>(`/categories?examBoardId=${examBoardId}`);
      if (!res.ok) throw new Error(res.error);
      return res.data ?? [];
    },
    enabled: !!examBoardId,
  });
}

function useGrades(categoryId: string | undefined) {
  return useQuery({
    queryKey: ['grades', categoryId],
    queryFn: async () => {
      const res = await apiFetch<Grade[]>(`/grades?categoryId=${categoryId}`);
      if (!res.ok) throw new Error(res.error);
      return res.data ?? [];
    },
    enabled: !!categoryId,
  });
}

function useSubjects(gradeId: string | undefined) {
  return useQuery({
    queryKey: ['subjects', gradeId],
    queryFn: async () => {
      const res = await apiFetch<Subject[]>(`/subjects?gradeId=${gradeId}`);
      if (!res.ok) throw new Error(res.error);
      return res.data ?? [];
    },
    enabled: !!gradeId,
  });
}

function useUnits(subjectId: string | undefined) {
  return useQuery({
    queryKey: ['units', subjectId],
    queryFn: async () => {
      const res = await apiFetch<Unit[]>(`/units?subjectId=${subjectId}`);
      if (!res.ok) throw new Error(res.error);
      return res.data ?? [];
    },
    enabled: !!subjectId,
  });
}

function useUnitDetail(
  boardSlug: string | undefined,
  subjectSlug: string | undefined,
  gradeSlug: string | undefined,
  unitSlug: string | undefined
) {
  return useQuery({
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
}

function useSubscriptions(enabled: boolean) {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const res = await apiFetch<Subscription[]>('/subscriptions');
      if (!res.ok) return [];
      return res.data ?? [];
    },
    enabled,
  });
}

interface PayHereStatus {
  hasAccess: boolean;
  subscription: Subscription | null;
  freeLessonId: string | null;
}

function usePayHereStatus(subjectId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['payhere-status', subjectId],
    queryFn: async () => {
      const res = await apiFetch<PayHereStatus>(`/payhere/status/${subjectId}`);
      if (!res.ok) {
        return { hasAccess: false, subscription: null, freeLessonId: null };
      }
      return res.data!;
    },
    enabled: enabled && !!subjectId,
  });
}

function StepChooseBoard() {
  const navigate = useNavigate();

  return (
    <>
      <Breadcrumbs items={[{ label: 'Subjects' }]} />
      <h1 className="mb-2 font-serif text-3xl font-bold">Choose your exam board</h1>
      <p className="mb-8 text-ui-muted">Select the exam board you are studying with</p>
      <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => navigate('/subjects/edexcel')}
          className="cursor-pointer rounded-2xl border-2 border-ui-border bg-white p-8 text-center transition-all hover:border-brand-green hover:shadow-md"
        >
          <Shield className="mx-auto size-12 text-brand-green" strokeWidth={1.5} />
          <p className="mt-4 font-serif text-2xl font-bold">Edexcel</p>
          <p className="mt-2 text-sm text-ui-muted">Pearson Edexcel — UK curriculum</p>
        </button>
        <button
          type="button"
          onClick={() => navigate('/subjects/cambridge')}
          className="cursor-pointer rounded-2xl border-2 border-ui-border bg-white p-8 text-center transition-all hover:border-brand-green hover:shadow-md"
        >
          <Globe className="mx-auto size-12 text-brand-lavender" strokeWidth={1.5} />
          <p className="mt-4 font-serif text-2xl font-bold">Cambridge</p>
          <p className="mt-2 text-sm text-ui-muted">Cambridge International — Global curriculum</p>
        </button>
      </div>
    </>
  );
}

function StepChooseCategory({ boardSlug }: { boardSlug: string }) {
  const navigate = useNavigate();
  const { data: board, isLoading: boardLoading, error: boardError } = useExamBoard(boardSlug);
  const { data: categories, isLoading, error } = useCategories(board?.id);

  if (boardLoading || isLoading) {
    return (
      <>
        <Breadcrumbs items={[{ label: 'Subjects', to: '/subjects' }, { label: '...' }]} />
        <SkeletonCards count={5} />
      </>
    );
  }

  if (boardError || error || !board) {
    return <ErrorState message={(boardError ?? error)?.message ?? 'Failed to load categories'} />;
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Subjects', to: '/subjects' },
          { label: board.name },
        ]}
      />
      <h1 className="mb-2 font-serif text-3xl font-bold">{board.name} Qualifications</h1>
      <p className="mb-8 text-ui-muted">What level are you studying?</p>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {categories?.map((category) => {
          const meta = getCategoryMeta(category.slug);
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => navigate(`/subjects/${boardSlug}/${category.slug}`)}
              className="cursor-pointer rounded-2xl border border-ui-border bg-white p-6 text-left transition-all hover:border-brand-green hover:shadow-md"
            >
              <span className="text-3xl">{meta.emoji}</span>
              <p className="mt-3 font-serif text-xl font-semibold">{category.name}</p>
              <p className="mt-1 text-sm text-ui-muted">{meta.gradeRange}</p>
            </button>
          );
        })}
      </div>
    </>
  );
}

function StepChooseGrade({
  boardSlug,
  categorySlug,
}: {
  boardSlug: string;
  categorySlug: string;
}) {
  const navigate = useNavigate();
  const { data: board } = useExamBoard(boardSlug);
  const { data: categories, isLoading, error } = useCategories(board?.id);

  const category = categories?.find((c) => c.slug === categorySlug);
  const { data: grades, isLoading: gradesLoading } = useGrades(category?.id);

  if (isLoading || gradesLoading) {
    return (
      <>
        <Breadcrumbs items={[{ label: 'Subjects', to: '/subjects' }, { label: '...' }]} />
        <SkeletonPills />
      </>
    );
  }

  if (error || !category) {
    return <ErrorState message={error?.message ?? 'Category not found'} />;
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Subjects', to: '/subjects' },
          { label: board?.name ?? boardSlug, to: `/subjects/${boardSlug}` },
          { label: category.name },
        ]}
      />
      <h1 className="mb-2 font-serif text-3xl font-bold">{category.name}</h1>
      <p className="mb-8 text-ui-muted">Select your grade</p>
      <div className="mx-auto flex max-w-lg flex-wrap justify-center gap-3">
        {(grades ?? category.grades ?? []).map((grade) => (
          <button
            key={grade.id}
            type="button"
            onClick={() => navigate(`/subjects/${boardSlug}/${categorySlug}/${grade.slug}`)}
            className="cursor-pointer rounded-xl border-2 border-ui-border bg-white px-6 py-4 text-center transition-all hover:border-brand-green hover:bg-brand-green/5"
          >
            <p className="text-lg font-semibold text-brand-black">{grade.name}</p>
          </button>
        ))}
      </div>
    </>
  );
}

function StepSubjectsGrid({
  boardSlug,
  categorySlug,
  gradeSlug,
}: {
  boardSlug: string;
  categorySlug: string;
  gradeSlug: string;
}) {
  const navigate = useNavigate();
  const { data: board } = useExamBoard(boardSlug);
  const { data: categories } = useCategories(board?.id);
  const category = categories?.find((c) => c.slug === categorySlug);
  const { data: grades } = useGrades(category?.id);
  const grade = grades?.find((g) => g.slug === gradeSlug);
  const { data: subjects, isLoading, error } = useSubjects(grade?.id);

  const gradeNumber = grade?.name.replace('Grade ', '') ?? gradeSlug;

  if (isLoading) {
    return (
      <>
        <Breadcrumbs items={[{ label: 'Subjects', to: '/subjects' }, { label: '...' }]} />
        <SkeletonCards count={6} />
      </>
    );
  }

  if (error || !grade) {
    return <ErrorState message={error?.message ?? 'Grade not found'} />;
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Subjects', to: '/subjects' },
          { label: board?.name ?? boardSlug, to: `/subjects/${boardSlug}` },
          { label: category?.name ?? categorySlug, to: `/subjects/${boardSlug}/${categorySlug}` },
          { label: grade.name },
        ]}
      />
      <h1 className="mb-2 font-serif text-3xl font-bold">Grade {gradeNumber} Subjects</h1>
      <p className="mb-8 text-ui-muted">Choose a subject to start studying</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects?.map((subject) => {
          const isComingSoon = subject.comingSoon ?? false;
          const borderColor = subject.color ?? '#245E55';

          if (isComingSoon) {
            return (
              <div
                key={subject.id}
                className="cursor-default rounded-2xl border border-ui-border border-l-4 bg-white p-6 opacity-60"
                style={{ borderLeftColor: borderColor }}
              >
                <p className="font-serif text-xl font-semibold">{subject.name}</p>
                <span className="mt-3 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  Coming soon
                </span>
              </div>
            );
          }

          return (
            <button
              key={subject.id}
              type="button"
              onClick={() =>
                navigate(
                  `/subjects/${boardSlug}/${categorySlug}/${gradeSlug}/${subject.slug}`
                )
              }
              className="cursor-pointer rounded-2xl border border-ui-border border-l-4 bg-white p-6 text-left transition-all hover:shadow-md"
              style={{ borderLeftColor: borderColor }}
            >
              <p className="font-serif text-xl font-semibold">{subject.name}</p>
              <span className="mt-2 inline-block rounded-full bg-brand-green/10 px-2.5 py-0.5 text-xs font-medium text-brand-green">
                {getSubjectBadge(subject)}
              </span>
              <p className="mt-3 text-sm font-medium text-brand-green">Start studying →</p>
            </button>
          );
        })}
      </div>
      {subjects?.length === 0 && (
        <p className="text-center text-ui-muted">No subjects available for this grade yet.</p>
      )}
    </>
  );
}

function StepUnitsList({
  boardSlug,
  categorySlug,
  gradeSlug,
  subjectSlug,
}: {
  boardSlug: string;
  categorySlug: string;
  gradeSlug: string;
  subjectSlug: string;
}) {
  const navigate = useNavigate();
  const { data: board } = useExamBoard(boardSlug);
  const { data: categories } = useCategories(board?.id);
  const category = categories?.find((c) => c.slug === categorySlug);
  const { data: grades } = useGrades(category?.id);
  const grade = grades?.find((g) => g.slug === gradeSlug);
  const { data: subjects } = useSubjects(grade?.id);
  const subject = subjects?.find((s) => s.slug === subjectSlug);
  const { data: units, isLoading, error } = useUnits(subject?.id);

  if (isLoading) {
    return (
      <>
        <Breadcrumbs items={[{ label: 'Subjects', to: '/subjects' }, { label: '...' }]} />
        <SkeletonList />
      </>
    );
  }

  if (error || !subject) {
    return <ErrorState message={error?.message ?? 'Subject not found'} />;
  }

  const basePath = `/subjects/${boardSlug}/${categorySlug}/${gradeSlug}/${subjectSlug}`;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Subjects', to: '/subjects' },
          { label: board?.name ?? boardSlug, to: `/subjects/${boardSlug}` },
          { label: category?.name ?? categorySlug, to: `/subjects/${boardSlug}/${categorySlug}` },
          { label: grade?.name ?? gradeSlug, to: `/subjects/${boardSlug}/${categorySlug}/${gradeSlug}` },
          { label: subject.name },
        ]}
      />
      <h1 className="font-serif text-3xl font-bold">{subject.name}</h1>
      <span className="mt-2 inline-block rounded-full bg-brand-green/10 px-3 py-1 text-xs font-medium text-brand-green">
        {getSubjectBadge(subject)}
      </span>
      <div className="mt-8 flex flex-col gap-3">
        {units?.map((unit, index) => (
          <button
            key={unit.id}
            type="button"
            onClick={() => navigate(`${basePath}/${unit.slug}`)}
            className="flex cursor-pointer items-center gap-4 rounded-xl border border-ui-border bg-white p-5 text-left transition-all hover:shadow-md"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-green text-sm font-bold text-white">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-brand-black">{unit.name}</p>
              <p className="text-sm text-ui-muted">
                {unit._count?.lessonLinks ?? 0} lesson
                {(unit._count?.lessonLinks ?? 0) === 1 ? '' : 's'}
              </p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-ui-muted" />
          </button>
        ))}
      </div>
      {units?.length === 0 && (
        <p className="text-center text-ui-muted">No units available yet.</p>
      )}
    </>
  );
}

function StepLessonsList({
  boardSlug,
  categorySlug,
  gradeSlug,
  subjectSlug,
  unitSlug,
}: {
  boardSlug: string;
  categorySlug: string;
  gradeSlug: string;
  subjectSlug: string;
  unitSlug: string;
}) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: board } = useExamBoard(boardSlug);
  const { data: categories } = useCategories(board?.id);
  const category = categories?.find((c) => c.slug === categorySlug);
  const { data: grades } = useGrades(category?.id);
  const grade = grades?.find((g) => g.slug === gradeSlug);
  const { data: subjects } = useSubjects(grade?.id);
  const subject = subjects?.find((s) => s.slug === subjectSlug);
  const { data: unit, isLoading, error } = useUnitDetail(
    boardSlug,
    subjectSlug,
    gradeSlug,
    unitSlug
  );
  const { data: subscriptions } = useSubscriptions(isAuthenticated);
  const { data: payhereStatus } = usePayHereStatus(subject?.id, isAuthenticated);

  const isSubscribed =
    payhereStatus?.hasAccess ??
    (!!subject &&
      (subscriptions?.some(
        (sub) => sub.subject.id === subject.id && sub.status === 'ACTIVE'
      ) ??
        false));

  const freeLessonId = payhereStatus?.freeLessonId ?? null;

  if (isLoading) {
    return (
      <>
        <Breadcrumbs items={[{ label: 'Subjects', to: '/subjects' }, { label: '...' }]} />
        <SkeletonList />
      </>
    );
  }

  if (error || !unit) {
    return <ErrorState message={error?.message ?? 'Unit not found'} />;
  }

  const subjectColor = subject?.color ?? '#245E55';
  const lessons: LessonSummary[] =
    unit.lessonLinks?.map((link) => link.lesson).filter(Boolean) ?? [];

  const basePath = `/subjects/${boardSlug}/${categorySlug}/${gradeSlug}/${subjectSlug}`;
  const pricingPath = `${basePath}/pricing`;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Subjects', to: '/subjects' },
          { label: board?.name ?? boardSlug, to: `/subjects/${boardSlug}` },
          { label: category?.name ?? categorySlug, to: `/subjects/${boardSlug}/${categorySlug}` },
          { label: grade?.name ?? gradeSlug, to: `/subjects/${boardSlug}/${categorySlug}/${gradeSlug}` },
          { label: subject?.name ?? subjectSlug, to: basePath },
          { label: unit.name },
        ]}
      />
      <h1 className="font-serif text-3xl font-bold">{unit.name}</h1>
      <div className="mt-8 flex flex-col gap-3">
        {lessons.map((lesson) => {
          const isFree = freeLessonId ? lesson.id === freeLessonId : false;
          const isLocked = !isFree && !isSubscribed;

          return (
            <button
              key={lesson.id}
              type="button"
              onClick={() => {
                if (isLocked) {
                  navigate(pricingPath);
                  return;
                }
                navigate(`/lessons/${lesson.slug}`);
              }}
              className={cn(
                'flex items-center gap-4 rounded-xl border border-ui-border bg-white p-5 text-left transition-all',
                isLocked ? 'cursor-pointer opacity-90 hover:shadow-md' : 'cursor-pointer hover:shadow-md'
              )}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: subjectColor }}
              >
                <Play className="size-4 fill-white" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-brand-black">{lesson.title}</p>
                <span className="mt-1 inline-block rounded-full bg-ui-subtle px-2.5 py-0.5 text-xs text-ui-muted">
                  {lesson.estimatedMinutes} min
                </span>
              </div>
              {isFree && (
                <span className="shrink-0 rounded-full bg-brand-green/10 px-2.5 py-0.5 text-xs font-medium text-brand-green">
                  FREE
                </span>
              )}
              {isLocked && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-ui-subtle px-2.5 py-0.5 text-xs font-medium text-ui-muted">
                  <Lock className="size-3" />
                  LOCKED
                </span>
              )}
            </button>
          );
        })}
      </div>
      {lessons.length === 0 && (
        <p className="text-center text-ui-muted">No lessons published in this unit yet.</p>
      )}
    </>
  );
}

function PaymentToasts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      showToast('Subscription activated!');
      searchParams.delete('success');
      setSearchParams(searchParams, { replace: true });
    } else if (searchParams.get('cancelled') === 'true') {
      showToast('Payment cancelled.', 'error');
      searchParams.delete('cancelled');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, showToast]);

  return null;
}

export default function SubjectsPage() {
  const { boardSlug, categorySlug, gradeSlug, subjectSlug, unitSlug } = useParams<{
    boardSlug?: string;
    categorySlug?: string;
    gradeSlug?: string;
    subjectSlug?: string;
    unitSlug?: string;
  }>();

  return (
    <PageShell>
      <PaymentToasts />
      {!boardSlug && <StepChooseBoard />}
      {boardSlug && !categorySlug && <StepChooseCategory boardSlug={boardSlug} />}
      {boardSlug && categorySlug && !gradeSlug && (
        <StepChooseGrade boardSlug={boardSlug} categorySlug={categorySlug} />
      )}
      {boardSlug && categorySlug && gradeSlug && !subjectSlug && (
        <StepSubjectsGrid
          boardSlug={boardSlug}
          categorySlug={categorySlug}
          gradeSlug={gradeSlug}
        />
      )}
      {boardSlug && categorySlug && gradeSlug && subjectSlug && !unitSlug && (
        <StepUnitsList
          boardSlug={boardSlug}
          categorySlug={categorySlug}
          gradeSlug={gradeSlug}
          subjectSlug={subjectSlug}
        />
      )}
      {boardSlug && categorySlug && gradeSlug && subjectSlug && unitSlug && (
        <StepLessonsList
          boardSlug={boardSlug}
          categorySlug={categorySlug}
          gradeSlug={gradeSlug}
          subjectSlug={subjectSlug}
          unitSlug={unitSlug}
        />
      )}
    </PageShell>
  );
}
