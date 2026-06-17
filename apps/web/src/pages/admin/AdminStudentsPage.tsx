import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Trash2 } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageLoader } from '@/components/ui/Loading';
import { apiFetch } from '@/services/api';

interface ExamBoard { id: string; name: string; }
interface Category { id: string; name: string; }
interface Grade { id: string; name: string; }
interface SubjectOption {
  id: string;
  name: string;
  grade: {
    name: string;
    category: { name: string; examBoard: { name: string } };
  };
}

interface StudentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  metadata: Record<string, string> | null;
  createdAt: string;
  studentProfile: {
    id: string;
    subscriptions: { id: string; status: string }[];
  } | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminStudentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [grantModal, setGrantModal] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [gBoard, setGBoard] = useState('');
  const [gCategory, setGCategory] = useState('');
  const [gGrade, setGGrade] = useState('');
  const [gSubjectId, setGSubjectId] = useState('');
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantToast, setGrantToast] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
  });
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addToast, setAddToast] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-students'],
    queryFn: async () => {
      const res = await apiFetch<StudentUser[]>('/admin/students');
      if (!res.ok) throw new Error(res.error ?? 'Failed to load students');
      return res.data ?? [];
    },
  });

  const { data: gBoards } = useQuery({
    queryKey: ['exam-boards'],
    queryFn: async () => {
      const res = await apiFetch<ExamBoard[]>('/exam-boards');
      return res.data ?? [];
    },
  });
  const { data: gCategories } = useQuery({
    queryKey: ['g-cat', gBoard],
    queryFn: async () => {
      const res = await apiFetch<Category[]>(
        `/categories?examBoardId=${gBoard}`);
      return res.data ?? [];
    },
    enabled: !!gBoard,
  });
  const { data: gGrades } = useQuery({
    queryKey: ['g-grade', gCategory],
    queryFn: async () => {
      const res = await apiFetch<Grade[]>(
        `/grades?categoryId=${gCategory}`);
      return res.data ?? [];
    },
    enabled: !!gCategory,
  });
  const { data: gSubjects } = useQuery({
    queryKey: ['g-subj', gGrade],
    queryFn: async () => {
      const res = await apiFetch<SubjectOption[]>(
        `/subjects?gradeId=${gGrade}`);
      return res.data ?? [];
    },
    enabled: !!gGrade,
  });

  const removeStudent = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(
        `/admin/students/${id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error(res.error ?? 'Failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin-students'],
      });
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;

    return data.filter((student) => {
      const name = `${student.firstName} ${student.lastName}`.toLowerCase();
      return name.includes(q) || student.email.toLowerCase().includes(q);
    });
  }, [data, search]);

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-3xl font-bold text-brand-black">
          Students
        </h1>
        <button
          type="button"
          onClick={() => {
            setAddModal(true);
            setAddForm({ firstName: '', lastName: '', email: '', password: '' });
            setAddError('');
          }}
          className="rounded-xl bg-brand-green px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Add student
        </button>
      </div>

      {addToast && (
        <div className="mt-4 rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm font-medium text-brand-green">
          {addToast}
        </div>
      )}

      <div className="relative mt-6 max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ui-muted" />
        <input
          type="search"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-ui-border bg-white py-2.5 pl-10 pr-4 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
        />
      </div>

      {isLoading && <PageLoader />}

      {error && (
        <p className="mt-4 text-sm text-brand-red">{(error as Error).message}</p>
      )}

      {!isLoading && !error && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-ui-border bg-white">
          {filtered.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ui-border bg-ui-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium text-ui-muted">Name</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Email</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Active subjects</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Joined</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((student) => {
                  const activeCount =
                    student.studentProfile?.subscriptions.filter((s) => s.status === 'ACTIVE')
                      .length ?? 0;

                  return (
                    <tr key={student.id} className="border-b border-ui-border last:border-0">
                      <td className="px-4 py-3 font-medium text-brand-black">
                        {student.firstName} {student.lastName}
                      </td>
                      <td className="px-4 py-3 text-ui-muted">{student.email}</td>
                      <td className="px-4 py-3 text-ui-muted">
                        {activeCount > 0
                          ? `${activeCount} subject${activeCount > 1 ? 's' : ''}`
                          : <span className="text-xs text-ui-muted">None</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-ui-muted">{formatDate(student.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setGrantModal({ id: student.id, name: `${student.firstName} ${student.lastName}` });
                            setGBoard(''); setGCategory(''); setGGrade(''); setGSubjectId('');
                          }}
                          className="rounded-lg bg-brand-green/10 px-3 py-1 text-xs font-semibold text-brand-green hover:bg-brand-green/20"
                        >
                          Grant access
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(
                              `Remove ${student.firstName} ${student.lastName}?
They will be hidden from the site.`
                            )) {
                              removeStudent.mutate(student.id);
                            }
                          }}
                          disabled={removeStudent.isPending}
                          className="ml-2 rounded-lg p-1.5 text-brand-red
                            hover:bg-red-50 disabled:opacity-50"
                          title="Remove student"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-12 text-center text-ui-muted">
              {search.trim() ? 'No students match your search.' : 'No students yet.'}
            </p>
          )}
        </div>
      )}

      {grantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="font-serif text-xl font-bold text-brand-black mb-1">
              Grant free access
            </h2>
            <p className="text-sm text-ui-muted mb-4">
              Granting access to:{' '}
              <span className="font-semibold text-brand-black">
                {grantModal?.name}
              </span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-brand-black">
                  Select subject to unlock
                </label>
                <div className="space-y-2">
                  <select value={gBoard}
                    onChange={(e) => { setGBoard(e.target.value);
                      setGCategory(''); setGGrade(''); setGSubjectId(''); }}
                    className="w-full rounded-xl border-2 border-ui-border
                      px-3 py-2 text-sm focus:border-brand-green
                      focus:outline-none">
                    <option value="">Select exam board</option>
                    {gBoards?.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  {gBoard && (
                    <select value={gCategory}
                      onChange={(e) => { setGCategory(e.target.value);
                        setGGrade(''); setGSubjectId(''); }}
                      className="w-full rounded-xl border-2 border-ui-border
                        px-3 py-2 text-sm focus:border-brand-green
                        focus:outline-none">
                      <option value="">Select category</option>
                      {gCategories?.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                  {gCategory && (
                    <select value={gGrade}
                      onChange={(e) => { setGGrade(e.target.value);
                        setGSubjectId(''); }}
                      className="w-full rounded-xl border-2 border-ui-border
                        px-3 py-2 text-sm focus:border-brand-green
                        focus:outline-none">
                      <option value="">Select grade / year</option>
                      {gGrades?.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  )}
                  {gGrade && (
                    <select value={gSubjectId}
                      onChange={(e) => setGSubjectId(e.target.value)}
                      className="w-full rounded-xl border-2 border-ui-border
                        px-3 py-2 text-sm focus:border-brand-green
                        focus:outline-none">
                      <option value="">Select subject</option>
                      {gSubjects?.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-ui-muted">
                  Student gets permanent access to lessons in this
                  subject at no charge. Past papers are separate.
                </p>
              </div>
              {grantToast && (
                <p className="rounded-xl bg-brand-green/10 px-3 py-2 text-sm text-brand-green font-medium">
                  {grantToast}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setGrantModal(null); setGrantToast('');
                    setGBoard(''); setGCategory(''); setGGrade(''); setGSubjectId('');
                  }}
                  className="flex-1 rounded-xl border border-ui-border py-2.5 text-sm font-semibold text-brand-black hover:bg-ui-subtle"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!gSubjectId || grantLoading}
                  onClick={async () => {
                    setGrantLoading(true);
                    const res = await apiFetch('/admin/students/grant-access', {
                      method: 'POST',
                      body: JSON.stringify({
                        studentUserId: grantModal?.id,
                        subjectId: gSubjectId,
                      }),
                    });
                    setGrantLoading(false);
                    if (res.ok) {
                      setGrantToast('Access granted successfully!');
                      setTimeout(() => {
                        setGrantModal(null);
                        setGrantToast('');
                        setGBoard(''); setGCategory(''); setGGrade(''); setGSubjectId('');
                      }, 1500);
                    } else {
                      setGrantToast('Failed: ' + (res.error ?? 'Unknown error'));
                    }
                  }}
                  className="flex-1 rounded-xl bg-brand-green py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {grantLoading ? 'Granting…' : 'Grant access'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="font-serif text-xl font-bold text-brand-black mb-4">
              Add student
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-brand-black">First name</label>
                  <input
                    type="text"
                    value={addForm.firstName}
                    onChange={(e) =>
                      setAddForm((p) => ({ ...p, firstName: e.target.value }))
                    }
                    className="w-full rounded-xl border border-ui-border px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-brand-black">Last name</label>
                  <input
                    type="text"
                    value={addForm.lastName}
                    onChange={(e) =>
                      setAddForm((p) => ({ ...p, lastName: e.target.value }))
                    }
                    className="w-full rounded-xl border border-ui-border px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-black">Email</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) =>
                    setAddForm((p) => ({ ...p, email: e.target.value }))
                  }
                  className="w-full rounded-xl border border-ui-border px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-black">Password</label>
                <input
                  type="password"
                  value={addForm.password}
                  onChange={(e) =>
                    setAddForm((p) => ({ ...p, password: e.target.value }))
                  }
                  className="w-full rounded-xl border border-ui-border px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                />
              </div>
              {addError && (
                <p className="text-sm text-brand-red">{addError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModal(false)}
                  className="flex-1 rounded-xl border border-ui-border py-2.5 text-sm font-semibold text-brand-black hover:bg-ui-subtle"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={addLoading}
                  onClick={async () => {
                    if (!addForm.firstName || !addForm.lastName ||
                        !addForm.email || !addForm.password) {
                      setAddError('All fields are required');
                      return;
                    }
                    if (addForm.password.length < 8) {
                      setAddError('Password must be at least 8 characters');
                      return;
                    }
                    setAddLoading(true);
                    setAddError('');
                    const res = await apiFetch('/admin/students', {
                      method: 'POST',
                      body: JSON.stringify(addForm),
                    });
                    setAddLoading(false);
                    if (res.ok) {
                      queryClient.invalidateQueries({
                        queryKey: ['admin-students'],
                      });
                      setAddModal(false);
                      setAddToast('Student account created');
                      setTimeout(() => setAddToast(''), 4000);
                    } else {
                      setAddError(res.error ?? 'Failed to create student');
                    }
                  }}
                  className="flex-1 rounded-xl bg-brand-green py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {addLoading ? 'Creating…' : 'Create student'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
