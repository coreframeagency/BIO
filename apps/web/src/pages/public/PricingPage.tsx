import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageLoader, ErrorState } from '@/components/ui/Loading';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { apiFetch } from '@/services/api';
import { SubjectPricing } from '@/types';
import { formatPrice } from '@/utils/helpers';

interface PricingItem extends SubjectPricing {
  subject: { name: string; slug: string; examBoard: { name: string; slug: string } };
}

export default function PricingPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['pricing'],
    queryFn: async () => {
      const res = await apiFetch<PricingItem[]>('/subscriptions/pricing');
      if (!res.ok) throw new Error(res.error);
      return res.data!;
    },
  });

  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-12 text-center">
          <span className="inline-block rounded-full bg-brand-mustard/20 px-4 py-1.5 text-sm font-semibold text-amber-700 mb-4">
            Affordable exam prep
          </span>
          <h1 className="font-serif text-5xl font-bold text-brand-black">
            Affordable exam prep.
            <br />
            <span className="text-brand-green">No excuses.</span>
          </h1>
          <p className="mt-4 text-lg text-ui-muted">
            Pay per subject. First lesson always free.
          </p>
        </div>
        {isLoading && <PageLoader />}
        {error && <ErrorState message={(error as Error).message} />}
        {!isLoading && !error && (!data || data.length === 0) && (
          <div className="mt-16 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-brand-green/10">
              <span className="text-3xl">📚</span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-brand-black">
              Pricing coming soon
            </h2>
            <p className="mt-2 text-ui-muted max-w-sm mx-auto">
              We're finalising our subject pricing.
              First lesson in every subject is always free.
            </p>
            <div className="mt-8 mx-auto max-w-sm rounded-2xl border border-brand-green/20 bg-brand-green/5 p-6">
              <p className="text-sm font-semibold text-brand-green mb-1">
                Current pricing
              </p>
              <p className="font-serif text-4xl font-bold text-brand-black">
                LKR 1,499
                <span className="text-base font-normal text-ui-muted">/month</span>
              </p>
              <p className="mt-1 text-sm text-ui-muted">
                or LKR 9,999/year — save 44%
              </p>
              <p className="mt-3 text-xs text-ui-muted">Per subject · Cancel anytime</p>
              <Link
                to="/register"
                className="mt-5 block rounded-xl bg-brand-green py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
              >
                Start free →
              </Link>
            </div>
            <p className="mt-6 text-xs text-ui-muted">
              ✓ Free first lesson &nbsp;·&nbsp; ✓ No card required
            </p>
          </div>
        )}
        {!isLoading && !error && data && data.length > 0 && (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {data.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-ui-border bg-white p-8 hover:border-brand-green/40 hover:shadow-md transition-all"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-ui-muted mb-1">
                  {item.subject.examBoard?.name ?? 'Cambridge & Edexcel'}
                </p>
                <h2 className="font-serif text-2xl font-semibold text-brand-black">
                  {item.subject.name}
                </h2>
                <div className="mt-6 flex items-end gap-2">
                  <p className="font-serif text-4xl font-bold text-brand-green">
                    {formatPrice(item.monthlyPriceCents, item.currency)}
                  </p>
                  <span className="mb-1 text-sm text-ui-muted">/month</span>
                </div>
                <p className="mt-1 text-sm text-ui-muted">
                  or {formatPrice(item.yearlyPriceCents, item.currency)}/year
                  <span className="ml-2 rounded-full bg-brand-mustard/20 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    Save 44%
                  </span>
                </p>
                <Link to="/register" className="mt-6 block">
                  <button className="w-full rounded-xl bg-brand-green py-3 text-sm font-semibold text-white transition hover:opacity-90">
                    Start free →
                  </button>
                </Link>
                <p className="mt-3 text-center text-xs text-ui-muted">
                  First lesson free · No card required
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
