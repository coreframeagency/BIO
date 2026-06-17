import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Lock } from 'lucide-react';
import { StudentLayout } from '@/components/layout/RoleLayouts';
import { ErrorState } from '@/components/ui/Loading';
import { apiFetch } from '@/services/api';
import { Category, ExamBoard, Grade, Subject } from '@/types';

const DEFAULT_MONTHLY_CENTS = 149900;
const DEFAULT_YEARLY_CENTS = 999900;

const FEATURES = [
  'All lessons in this subject',
  'Interactive visual lessons',
  'Practice questions with AI marking',
  'Past paper questions',
] as const;

interface PayHerePaymentData {
  merchant_id: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  order_id: string;
  items: string;
  currency: string;
  amount: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  recurrence: string;
  duration: string;
  hash: string;
  payhere_base_url: string;
}

function formatLkr(cents: number): string {
  return `LKR ${(cents / 100).toLocaleString('en-LK', { maximumFractionDigits: 0 })}`;
}

function submitPayHereForm(data: PayHerePaymentData) {
  const { payhere_base_url, ...fields } = data;
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = payhere_base_url;

  for (const [key, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

export default function SubjectPricingPage() {
  const { boardSlug, categorySlug, gradeSlug, subjectSlug } = useParams<{
    boardSlug: string;
    categorySlug: string;
    gradeSlug: string;
    subjectSlug: string;
  }>();
  const [searchParams] = useSearchParams();
  const subjectIdParam = searchParams.get('subjectId');
  const [loadingType, setLoadingType] = useState<'monthly' | 'yearly' | null>(null);

  const { data: subject, isLoading, error } = useQuery({
    queryKey: ['subject-pricing', boardSlug, categorySlug, gradeSlug, subjectSlug, subjectIdParam],
    queryFn: async () => {
      const boardRes = await apiFetch<ExamBoard>(`/exam-boards/${boardSlug}`);
      if (!boardRes.ok) throw new Error(boardRes.error);

      const categoriesRes = await apiFetch<Category[]>(
        `/categories?examBoardId=${boardRes.data!.id}`
      );
      if (!categoriesRes.ok) throw new Error(categoriesRes.error);

      const category = categoriesRes.data?.find((c) => c.slug === categorySlug);
      if (!category) throw new Error('Category not found');

      const gradesRes = await apiFetch<Grade[]>(`/grades?categoryId=${category.id}`);
      if (!gradesRes.ok) throw new Error(gradesRes.error);

      const grade = gradesRes.data?.find((g) => g.slug === gradeSlug);
      if (!grade) throw new Error('Grade not found');

      const subjectsRes = await apiFetch<Subject[]>(`/subjects?gradeId=${grade.id}`);
      if (!subjectsRes.ok) throw new Error(subjectsRes.error);

      const found =
        subjectsRes.data?.find(
          (s) => s.id === subjectIdParam || s.slug === subjectSlug
        ) ?? null;
      if (!found) throw new Error('Subject not found');
      return found;
    },
    enabled: !!boardSlug && !!categorySlug && !!gradeSlug && !!subjectSlug,
  });

  const monthlyCents = subject?.pricing?.monthlyPriceCents ?? DEFAULT_MONTHLY_CENTS;
  const yearlyCents = subject?.pricing?.yearlyPriceCents ?? DEFAULT_YEARLY_CENTS;
  const savingsCents = monthlyCents * 12 - yearlyCents;

  const basePath = `/subjects/${boardSlug}/${categorySlug}/${gradeSlug}/${subjectSlug}`;

  async function handleSubscribe(priceType: 'monthly' | 'yearly') {
    if (!subject) return;
    setLoadingType(priceType);
    try {
      const res = await apiFetch<PayHerePaymentData>('/payhere/initiate', {
        method: 'POST',
        body: JSON.stringify({ subjectId: subject.id, priceType }),
      });
      if (!res.ok || !res.data) {
        throw new Error(res.error ?? 'Failed to start payment');
      }
      submitPayHereForm(res.data);
    } catch (err) {
      setLoadingType(null);
      alert(err instanceof Error ? err.message : 'Payment failed to start');
    }
  }

  return (
    <StudentLayout>
      <div className="min-h-screen bg-brand-shell">
        <div className="mx-auto max-w-2xl px-6 py-12">
          {isLoading && (
            <div className="animate-pulse space-y-6">
              <div className="h-4 w-32 rounded bg-ui-subtle" />
              <div className="mx-auto h-12 w-12 rounded-full bg-ui-subtle" />
              <div className="mx-auto h-10 w-2/3 rounded bg-ui-subtle" />
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="h-80 rounded-2xl bg-ui-subtle" />
                <div className="h-80 rounded-2xl bg-ui-subtle" />
              </div>
            </div>
          )}

          {error && <ErrorState message={(error as Error).message} />}

          {subject && (
            <>
              <Link to={basePath} className="mb-8 inline-block text-sm text-ui-muted hover:text-brand-green">
                ← Back to lessons
              </Link>

              <div className="text-center">
                <Lock className="mx-auto mb-4 size-12 text-brand-green" />
                <h1 className="font-serif text-4xl font-bold text-brand-black">{subject.name}</h1>
                <p className="mb-10 mt-3 text-ui-muted">
                  Unlock full access to all lessons in this subject
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl border-2 border-ui-border bg-white p-8">
                  <p className="text-lg font-semibold text-ui-muted">Monthly</p>
                  <p className="mt-2 font-serif text-4xl font-bold text-brand-green">
                    {formatLkr(monthlyCents)}
                    <span className="text-lg font-normal text-ui-muted">/month</span>
                  </p>
                  <ul className="mt-6 space-y-3">
                    {FEATURES.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-brand-black">
                        <Check className="mt-0.5 size-4 shrink-0 text-brand-green" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled={loadingType !== null}
                    onClick={() => handleSubscribe('monthly')}
                    className="mt-6 w-full rounded-xl bg-brand-green py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {loadingType === 'monthly' ? 'Redirecting…' : 'Subscribe Monthly'}
                  </button>
                </div>

                <div className="relative rounded-2xl bg-brand-green p-8 text-white">
                  <span className="absolute right-4 top-4 rounded-full bg-brand-mustard px-3 py-1 text-xs font-bold text-brand-black">
                    Best Value
                  </span>
                  <p className="text-lg font-semibold text-green-200">Yearly</p>
                  <p className="mt-2 font-serif text-4xl font-bold">
                    {formatLkr(yearlyCents)}
                    <span className="text-lg font-normal text-green-200">/year</span>
                  </p>
                  {savingsCents > 0 && (
                    <p className="mt-1 text-sm text-green-200">Save {formatLkr(savingsCents)}</p>
                  )}
                  <ul className="mt-6 space-y-3">
                    {FEATURES.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-white" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled={loadingType !== null}
                    onClick={() => handleSubscribe('yearly')}
                    className="mt-6 w-full rounded-xl bg-white py-3 font-semibold text-brand-green transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {loadingType === 'yearly' ? 'Redirecting…' : 'Subscribe Yearly'}
                  </button>
                </div>
              </div>

              <p className="mt-8 text-center text-sm text-ui-muted">
                ✓ First lesson is always free — no payment required
              </p>
            </>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
