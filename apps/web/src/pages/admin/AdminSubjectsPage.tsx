import { Fragment, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageLoader } from '@/components/ui/Loading';
import { apiFetch } from '@/services/api';

interface SubjectItem {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  comingSoon: boolean;
  grade: {
    slug: string;
    name: string;
    category: {
      name: string;
      examBoard: { name: string };
    };
  };
}

interface ExamBoard { id: string; name: string; }
interface Category { id: string; name: string; examBoardId: string; }
interface Grade { id: string; name: string; categoryId: string; }

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function AdminSubjectsPage() {
  const queryClient = useQueryClient();
  const [addModal, setAddModal] = useState(false);
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [newUnitName, setNewUnitName] = useState('');
  const [creatingUnit, setCreatingUnit] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({
    name: '',
    examBoardId: '',
    categoryId: '',
    gradeId: '',
    comingSoon: true,
  });

  const { data: subjects, isLoading } = useQuery({
    queryKey: ['admin-subjects-list'],
    queryFn: async () => {
      const res = await apiFetch<SubjectItem[]>('/admin/subjects');
      if (!res.ok) return [];
      return res.data ?? [];
    },
  });

  const { data: examBoards } = useQuery({
    queryKey: ['exam-boards'],
    queryFn: async () => {
      const res = await apiFetch<ExamBoard[]>('/exam-boards');
      if (!res.ok) return [];
      return res.data ?? [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories', form.examBoardId],
    queryFn: async () => {
      const res = await apiFetch<Category[]>(
        `/categories?examBoardId=${form.examBoardId}`
      );
      if (!res.ok) return [];
      return res.data ?? [];
    },
    enabled: !!form.examBoardId,
  });

  const { data: grades } = useQuery({
    queryKey: ['grades', form.categoryId],
    queryFn: async () => {
      const res = await apiFetch<Grade[]>(
        `/grades?categoryId=${form.categoryId}`
      );
      if (!res.ok) return [];
      return res.data ?? [];
    },
    enabled: !!form.categoryId,
  });

  const toggleSubject = useMutation({
    mutationFn: async ({ id, comingSoon }: {
      id: string; comingSoon: boolean;
    }) => {
      const res = await apiFetch(`/admin/subjects/${id}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ comingSoon }),
      });
      if (!res.ok) throw new Error(res.error ?? 'Failed');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subjects-list'] });
    },
  });

  const removeSubject = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(
        `/admin/subjects/${id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error(res.error ?? 'Failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin-subjects-list'],
      });
    },
  });

  const { data: subjectUnits = [], refetch: refetchUnits } = useQuery({
    queryKey: ['admin-units', expandedSubjectId],
    queryFn: async () => {
      if (!expandedSubjectId) return [];
      const res = await apiFetch<{
        id: string;
        name: string;
        order: number;
        isActive: boolean;
        _count: { lessonLinks: number };
      }[]>(`/units?subjectId=${expandedSubjectId}`);
      return res.data ?? [];
    },
    enabled: !!expandedSubjectId,
  });

  const createUnitMutation = useMutation({
    mutationFn: async (subjectId: string) => {
      if (!newUnitName.trim()) return;
      setCreatingUnit(true);
      const res = await apiFetch('/units', {
        method: 'POST',
        body: JSON.stringify({
          subjectId,
          name: newUnitName.trim(),
          slug: newUnitName.trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
          order: subjectUnits.length + 1,
          isActive: true,
        }),
      });
      if (!res.ok) throw new Error(res.error ?? 'Failed');
    },
    onSuccess: () => {
      setNewUnitName('');
      setCreatingUnit(false);
      void refetchUnits();
    },
    onError: () => {
      setCreatingUnit(false);
    },
  });

  const deleteUnitMutation = useMutation({
    mutationFn: async (unitId: string) => {
      const res = await apiFetch(`/units/${unitId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(res.error ?? 'Failed');
    },
    onSuccess: () => void refetchUnits(),
  });

  const addSubject = useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/admin/subjects', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          slug: slugify(form.name),
          gradeId: form.gradeId,
          comingSoon: form.comingSoon,
          isActive: true,
        }),
      });
      if (!res.ok) throw new Error(res.error ?? 'Failed to add subject');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subjects-list'] });
      setAddModal(false);
      setForm({ name: '', examBoardId: '', categoryId: '',
        gradeId: '', comingSoon: true });
      setToast('Subject added successfully');
      setTimeout(() => setToast(''), 3000);
    },
  });

  const selectClass = 'w-full rounded-xl border border-ui-border px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none bg-white';
  const labelClass = 'mb-1 block text-sm font-medium text-brand-black';

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-black">
            Subjects
          </h1>
          <p className="mt-1 text-ui-muted">
            Manage subjects and their availability
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddModal(true)}
          className="rounded-xl bg-brand-green px-5 py-2.5 text-sm
            font-semibold text-white hover:opacity-90"
        >
          + Add subject
        </button>
      </div>

      {toast && (
        <div className="mt-4 rounded-xl border border-brand-green/30
          bg-brand-green/10 px-4 py-3 text-sm font-medium text-brand-green">
          {toast}
        </div>
      )}

      {isLoading && <PageLoader />}

      {!isLoading && (
        <div className="mt-6 overflow-x-auto rounded-2xl border
          border-ui-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ui-border bg-ui-subtle">
              <tr>
                <th className="px-4 py-3 font-medium text-ui-muted">Subject</th>
                <th className="px-4 py-3 font-medium text-ui-muted">Exam board</th>
                <th className="px-4 py-3 font-medium text-ui-muted">Category</th>
                <th className="px-4 py-3 font-medium text-ui-muted">Grade / Year</th>
                <th className="px-4 py-3 font-medium text-ui-muted">Status</th>
                <th className="px-4 py-3 font-medium text-ui-muted">Action</th>
              </tr>
            </thead>
            <tbody>
              {!subjects || subjects.length === 0 ? (
                <tr>
                  <td colSpan={6}
                    className="px-4 py-10 text-center text-ui-muted">
                    No subjects found
                  </td>
                </tr>
              ) : (
                subjects.map((s) => (
                  <Fragment key={s.id}>
                    <tr className="border-b border-ui-border last:border-0">
                      <td className="px-4 py-3 font-medium text-brand-black">
                        {s.name}
                      </td>
                      <td className="px-4 py-3 text-ui-muted">
                        {s.grade.category.examBoard.name}
                      </td>
                      <td className="px-4 py-3 text-ui-muted">
                        {s.grade.category.name}
                      </td>
                      <td className="px-4 py-3 text-ui-muted">
                        {s.grade.name}
                      </td>
                      <td className="px-4 py-3">
                        {s.comingSoon ? (
                          <span className="rounded-full bg-amber-100
                            px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                            Coming soon
                          </span>
                        ) : (
                          <span className="rounded-full bg-brand-green/10
                            px-2.5 py-0.5 text-xs font-semibold text-brand-green">
                            Available
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedSubjectId((prev) =>
                              prev === s.id ? null : s.id
                            );
                            setNewUnitName('');
                          }}
                          className="mr-2 rounded-lg border border-ui-border
                            px-3 py-1 text-xs font-semibold text-brand-black
                            hover:bg-ui-subtle"
                        >
                          {expandedSubjectId === s.id ? 'Hide Units' : 'Manage Units'}
                        </button>
                        <button
                          type="button"
                          disabled={toggleSubject.isPending}
                          onClick={() => toggleSubject.mutate({
                            id: s.id,
                            comingSoon: !s.comingSoon,
                          })}
                          className={[
                            'rounded-lg px-3 py-1 text-xs font-semibold',
                            'transition hover:opacity-90 disabled:opacity-50',
                            s.comingSoon
                              ? 'bg-brand-green text-white'
                              : 'bg-amber-100 text-amber-700',
                          ].join(' ')}
                        >
                          {s.comingSoon ? 'Make available' : 'Set coming soon'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(
                              `Remove ${s.name}?
It will be hidden from the site.`
                            )) {
                              removeSubject.mutate(s.id);
                            }
                          }}
                          disabled={removeSubject.isPending}
                          className="ml-2 rounded-lg p-1.5 text-ui-muted
                            hover:bg-red-50 hover:text-brand-red
                            disabled:opacity-50"
                          title="Remove subject"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                    {expandedSubjectId === s.id && (
                      <tr key={`${s.id}-units`} className="border-b border-ui-border">
                        <td colSpan={6} className="p-0">
                          <div className="border-t border-ui-border bg-ui-subtle px-6 py-4">
                            <p className="mb-3 text-sm font-semibold text-brand-black">
                              Units for this subject
                            </p>

                            {subjectUnits.length === 0 && (
                              <p className="mb-3 text-sm text-ui-muted">
                                No units yet — create the first one below.
                              </p>
                            )}

                            <div className="mb-3 space-y-2">
                              {subjectUnits.map((unit) => (
                                <div
                                  key={unit.id}
                                  className="flex items-center justify-between rounded-xl border border-ui-border bg-white px-4 py-2"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-brand-black">
                                      {unit.name}
                                    </p>
                                    <p className="text-xs text-ui-muted">
                                      {unit._count.lessonLinks} lessons
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => deleteUnitMutation.mutate(unit.id)}
                                    className="text-xs text-red-500 hover:text-red-700"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))}
                            </div>

                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="e.g. Unit 1 — Cells and Organisation"
                                value={newUnitName}
                                onChange={(e) => setNewUnitName(e.target.value)}
                                className="flex-1 rounded-xl border border-ui-border px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                              />
                              <button
                                type="button"
                                disabled={
                                  !newUnitName.trim() ||
                                  createUnitMutation.isPending ||
                                  creatingUnit
                                }
                                onClick={() =>
                                  createUnitMutation.mutate(expandedSubjectId!)
                                }
                                className="rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                              >
                                {createUnitMutation.isPending || creatingUnit
                                  ? 'Adding...'
                                  : '+ Add Unit'}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Subject Modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center
          bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6
            shadow-xl">
            <h2 className="font-serif text-xl font-bold text-brand-black mb-5">
              Add new subject
            </h2>
            <div className="space-y-4">

              <div>
                <label className={labelClass}>Subject name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Biology, IELTS General Training"
                  className={selectClass}
                />
              </div>

              <div>
                <label className={labelClass}>Exam board</label>
                <select
                  value={form.examBoardId}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      examBoardId: e.target.value,
                      categoryId: '',
                      gradeId: '',
                    }))
                  }
                  className={selectClass}
                >
                  <option value="">Select exam board</option>
                  {examBoards?.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Category</label>
                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      categoryId: e.target.value,
                      gradeId: '',
                    }))
                  }
                  disabled={!form.examBoardId}
                  className={selectClass}
                >
                  <option value="">Select category</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-ui-muted">
                  Primary (Yr 1–5) · Checkpoint (Yr 6–9) ·
                  IGCSE/GCSE (Yr 10–11) · A Level (Yr 12–13)
                </p>
              </div>

              <div>
                <label className={labelClass}>Grade / Year</label>
                <select
                  value={form.gradeId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, gradeId: e.target.value }))
                  }
                  disabled={!form.categoryId}
                  className={selectClass}
                >
                  <option value="">Select grade</option>
                  {grades?.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between
                rounded-xl border border-ui-border bg-ui-subtle px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-brand-black">
                    Availability
                  </p>
                  <p className="text-xs text-ui-muted">
                    Set to available if content is ready
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({ ...p, comingSoon: !p.comingSoon }))
                    }
                    className={[
                      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer',
                      'rounded-full border-2 border-transparent transition-colors',
                      !form.comingSoon ? 'bg-brand-green' : 'bg-ui-border',
                    ].join(' ')}
                  >
                    <span className={[
                      'inline-block h-5 w-5 rounded-full bg-white shadow',
                      'transform transition-transform',
                      !form.comingSoon ? 'translate-x-5' : 'translate-x-0',
                    ].join(' ')} />
                  </button>
                  <span className="text-xs font-medium text-ui-muted">
                    {form.comingSoon ? 'Coming soon' : 'Available'}
                  </span>
                </div>
              </div>

              {addSubject.isError && (
                <p className="text-sm text-brand-red">
                  {(addSubject.error as Error).message}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModal(false)}
                  className="flex-1 rounded-xl border border-ui-border
                    py-2.5 text-sm font-semibold text-brand-black
                    hover:bg-ui-subtle"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    !form.name.trim() || !form.gradeId ||
                    addSubject.isPending
                  }
                  onClick={() => addSubject.mutate()}
                  className="flex-1 rounded-xl bg-brand-green py-2.5
                    text-sm font-semibold text-white hover:opacity-90
                    disabled:opacity-50"
                >
                  {addSubject.isPending ? 'Adding…' : 'Add subject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
