import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageLoader } from '@/components/ui/Loading';
import { apiFetch } from '@/services/api';

interface CategoryPricing {
  id: string;
  name: string;
  pricing: {
    monthlyPriceCents: number;
    yearlyPriceCents: number;
    stripePriceIdMonthly: string;
    currency: string;
  } | null;
}

interface BoardWithCategories {
  id: string;
  name: string;
  categories: CategoryPricing[];
}

function centsToLKR(cents: number) {
  return (cents / 100).toFixed(0);
}
function lkrToCents(lkr: string) {
  return Math.round(parseFloat(lkr || '0') * 100);
}

export default function AdminPricingPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subjectPrice, setSubjectPrice] = useState('');
  const [bundlePrice, setBundlePrice] = useState('');
  const [singlePrice, setSinglePrice] = useState('');
  const [toast, setToast] = useState('');

  const { data: boards, isLoading } = useQuery({
    queryKey: ['admin-pricing-boards'],
    queryFn: async () => {
      const res = await apiFetch<BoardWithCategories[]>(
        '/admin/pricing-overview'
      );
      if (!res.ok) return [];
      return res.data ?? [];
    },
  });

  const savePricing = useMutation({
    mutationFn: async ({
      categoryId, subjectLKR, bundleLKR, singleLKR,
    }: {
      categoryId: string;
      subjectLKR: string;
      bundleLKR: string;
      singleLKR: string;
    }) => {
      const res = await apiFetch('/admin/pricing/category', {
        method: 'POST',
        body: JSON.stringify({
          categoryId,
          subjectPriceCents: lkrToCents(subjectLKR),
          paperBundleCents: lkrToCents(bundleLKR),
          paperSingleCents: lkrToCents(singleLKR),
          currency: 'LKR',
        }),
      });
      if (!res.ok) throw new Error(res.error ?? 'Failed');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin-pricing-boards'],
      });
      setEditingId(null);
      setToast('Pricing saved');
      setTimeout(() => setToast(''), 3000);
    },
  });

  const startEdit = (cat: CategoryPricing) => {
    setEditingId(cat.id);
    setSubjectPrice(cat.pricing
      ? centsToLKR(cat.pricing.monthlyPriceCents) : '');
    setBundlePrice(cat.pricing
      ? centsToLKR(cat.pricing.yearlyPriceCents) : '');
    setSinglePrice(cat.pricing?.stripePriceIdMonthly
      ? centsToLKR(parseInt(cat.pricing.stripePriceIdMonthly || '0', 10))
      : '');
  };

  const inputClass =
    'w-24 rounded-lg border border-ui-border px-2 py-1 text-sm focus:border-brand-green focus:outline-none';

  return (
    <AdminLayout>
      <h1 className="font-serif text-3xl font-bold text-brand-black">
        Pricing
      </h1>
      <p className="mt-1 text-ui-muted">
        Set one-time purchase prices per category in LKR
      </p>

      <div className="mt-4 rounded-2xl border border-brand-mustard/30
        bg-brand-mustard/10 px-5 py-4 space-y-1">
        <p className="text-sm font-semibold text-amber-800">
          Pricing model
        </p>
        <p className="text-sm text-amber-700">
          • <strong>Subject price</strong> — lessons only,
          one-time, access forever
        </p>
        <p className="text-sm text-amber-700">
          • <strong>Past paper bundle</strong> — all papers
          for that subject, one-time purchase
        </p>
        <p className="text-sm text-amber-700">
          • <strong>Individual paper</strong> — one paper
          at a time, per paper price
        </p>
      </div>

      {toast && (
        <div className="mt-4 rounded-xl border border-brand-green/30
          bg-brand-green/10 px-4 py-3 text-sm font-medium
          text-brand-green">
          {toast}
        </div>
      )}

      {isLoading && <PageLoader />}

      {!isLoading && boards?.map((board) => (
        <div key={board.id} className="mt-8">
          <h2 className="mb-3 font-serif text-xl font-semibold
            text-brand-black">
            {board.name}
          </h2>
          <div className="overflow-x-auto rounded-2xl border
            border-ui-border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ui-border bg-ui-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium text-ui-muted">
                    Category
                  </th>
                  <th className="px-4 py-3 font-medium text-ui-muted">
                    Subject (LKR)
                    <span className="block text-[10px] font-normal
                      text-ui-muted">lessons only</span>
                  </th>
                  <th className="px-4 py-3 font-medium text-ui-muted">
                    Paper bundle (LKR)
                    <span className="block text-[10px] font-normal
                      text-ui-muted">all papers</span>
                  </th>
                  <th className="px-4 py-3 font-medium text-ui-muted">
                    Per paper (LKR)
                    <span className="block text-[10px] font-normal
                      text-ui-muted">individual</span>
                  </th>
                  <th className="px-4 py-3 font-medium text-ui-muted">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {board.categories.map((cat) => (
                  <tr key={cat.id}
                    className="border-b border-ui-border last:border-0">
                    <td className="px-4 py-3 font-medium text-brand-black">
                      {cat.name}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === cat.id ? (
                        <input type="number" value={subjectPrice}
                          onChange={(e) =>
                            setSubjectPrice(e.target.value)}
                          placeholder="e.g. 2500"
                          className={inputClass} />
                      ) : (
                        cat.pricing?.monthlyPriceCents
                          ? `LKR ${centsToLKR(
                              cat.pricing.monthlyPriceCents)}`
                          : <span className="text-xs text-ui-muted">
                              Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === cat.id ? (
                        <input type="number" value={bundlePrice}
                          onChange={(e) =>
                            setBundlePrice(e.target.value)}
                          placeholder="e.g. 800"
                          className={inputClass} />
                      ) : (
                        cat.pricing?.yearlyPriceCents
                          ? `LKR ${centsToLKR(
                              cat.pricing.yearlyPriceCents)}`
                          : <span className="text-xs text-ui-muted">
                              Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === cat.id ? (
                        <input type="number" value={singlePrice}
                          onChange={(e) =>
                            setSinglePrice(e.target.value)}
                          placeholder="e.g. 150"
                          className={inputClass} />
                      ) : (
                        cat.pricing?.stripePriceIdMonthly &&
                        parseInt(cat.pricing.stripePriceIdMonthly) > 0
                          ? `LKR ${centsToLKR(parseInt(
                              cat.pricing.stripePriceIdMonthly))}`
                          : <span className="text-xs text-ui-muted">
                              Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === cat.id ? (
                        <div className="flex gap-2">
                          <button type="button"
                            disabled={savePricing.isPending}
                            onClick={() => savePricing.mutate({
                              categoryId: cat.id,
                              subjectLKR: subjectPrice,
                              bundleLKR: bundlePrice,
                              singleLKR: singlePrice,
                            })}
                            className="rounded-lg bg-brand-green
                              px-3 py-1 text-xs font-semibold
                              text-white hover:opacity-90
                              disabled:opacity-50">
                            {savePricing.isPending
                              ? 'Saving…' : 'Save'}
                          </button>
                          <button type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-lg border
                              border-ui-border px-3 py-1 text-xs
                              font-semibold text-brand-black
                              hover:bg-ui-subtle">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button type="button"
                          onClick={() => startEdit(cat)}
                          className="rounded-lg bg-brand-green/10
                            px-3 py-1 text-xs font-semibold
                            text-brand-green hover:bg-brand-green/20">
                          {cat.pricing ? 'Edit' : 'Set price'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </AdminLayout>
  );
}
