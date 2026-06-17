import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/Loading';
import { apiFetch } from '@/services/api';

interface TeacherUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  teacherProfile: {
    id: string;
    isApproved: boolean;
    approvedAt: string | null;
  } | null;
}

interface CreateTeacherPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  schoolName?: string;
  subjectIds?: string[];
}

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

interface SelectedSubject {
  id: string;
  name: string;
  boardName: string;
  categoryName: string;
  gradeName: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminTeachersPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    schoolName: '',
  });
  const [formError, setFormError] = useState('');
  const [tBoard, setTBoard] = useState('');
  const [tCategory, setTCategory] = useState('');
  const [tGrade, setTGrade] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<SelectedSubject[]>([]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-teachers'],
    queryFn: async () => {
      const res = await apiFetch<TeacherUser[]>('/admin/teachers');
      if (!res.ok) throw new Error(res.error ?? 'Failed to load teachers');
      return res.data ?? [];
    },
  });

  const { data: boards } = useQuery({
    queryKey: ['exam-boards'],
    queryFn: async () => {
      const res = await apiFetch<ExamBoard[]>('/exam-boards');
      return res.data ?? [];
    },
  });
  const { data: tCategories } = useQuery({
    queryKey: ['t-cat', tBoard],
    queryFn: async () => {
      const res = await apiFetch<Category[]>(
        `/categories?examBoardId=${tBoard}`);
      return res.data ?? [];
    },
    enabled: !!tBoard,
  });
  const { data: tGrades } = useQuery({
    queryKey: ['t-grade', tCategory],
    queryFn: async () => {
      const res = await apiFetch<Grade[]>(
        `/grades?categoryId=${tCategory}`);
      return res.data ?? [];
    },
    enabled: !!tCategory,
  });
  const { data: tSubjects } = useQuery({
    queryKey: ['t-subj', tGrade],
    queryFn: async () => {
      const res = await apiFetch<SubjectOption[]>(
        `/subjects?gradeId=${tGrade}`);
      return res.data ?? [];
    },
    enabled: !!tGrade,
  });

  const createTeacher = useMutation({
    mutationFn: async (payload: CreateTeacherPayload) => {
      const res = await apiFetch<TeacherUser>('/admin/teachers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(res.error ?? 'Failed to create teacher');
      return res.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setModalOpen(false);
      setForm({ firstName: '', lastName: '', email: '', password: '', schoolName: '' });
      setTBoard(''); setTCategory(''); setTGrade(''); setSelectedSubjects([]);
      setFormError('');
      setToast('Teacher account created');
      setTimeout(() => setToast(''), 4000);
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const deleteTeacher = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/admin/teachers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(res.error ?? 'Failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.password) {
      setFormError('Please fill in all required fields');
      return;
    }

    createTeacher.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      password: form.password,
      ...(form.schoolName.trim() ? { schoolName: form.schoolName.trim() } : {}),
      ...(selectedSubjects.length > 0
        ? { subjectIds: selectedSubjects.map((s) => s.id) }
        : {}),
    });
  };

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-3xl font-bold text-brand-black">Teachers</h1>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-xl bg-brand-green px-5 py-2.5 text-sm font-semibold text-white"
        >
          Add teacher
        </button>
      </div>

      {toast && (
        <div className="mt-4 rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm font-medium text-brand-green">
          {toast}
        </div>
      )}

      {isLoading && <PageLoader />}

      {error && (
        <p className="mt-4 text-sm text-brand-red">{(error as Error).message}</p>
      )}

      {!isLoading && !error && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-ui-border bg-white">
          {data && data.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ui-border bg-ui-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium text-ui-muted">Name</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Email</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Approved</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Joined</th>
                  <th className="px-4 py-3 font-medium text-ui-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((teacher) => (
                  <tr key={teacher.id} className="border-b border-ui-border last:border-0">
                    <td className="px-4 py-3 font-medium text-brand-black">
                      {teacher.firstName} {teacher.lastName}
                    </td>
                    <td className="px-4 py-3 text-ui-muted">{teacher.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          teacher.teacherProfile?.isApproved
                            ? 'rounded-full bg-brand-green/10 px-2.5 py-0.5 text-xs font-medium text-brand-green'
                            : 'rounded-full bg-brand-mustard/20 px-2.5 py-0.5 text-xs font-medium text-brand-black'
                        }
                      >
                        {teacher.teacherProfile?.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ui-muted">{formatDate(teacher.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(
                            `Remove ${teacher.firstName} ${teacher.lastName}?
They will be hidden from the site.`
                          )) {
                            deleteTeacher.mutate(teacher.id);
                          }
                        }}
                        disabled={deleteTeacher.isPending}
                        className="rounded-lg p-2 text-brand-red hover:bg-red-50 disabled:opacity-50"
                        aria-label="Delete teacher"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-12 text-center text-ui-muted">
              No teachers yet. Add your first teacher.
            </p>
          )}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => {
        setModalOpen(false);
        setTBoard(''); setTCategory(''); setTGrade(''); setSelectedSubjects([]);
        setFormError('');
      }} title="Add teacher">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="teacherFirstName"
              label="First name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
            <Input
              id="teacherLastName"
              label="Last name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </div>
          <Input
            id="teacherEmail"
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            id="teacherPassword"
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
          />
          <Input
            id="teacherSchool"
            label="School name (optional)"
            value={form.schoolName}
            onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
          />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-brand-black">
              Assigned subjects (optional)
            </label>
            <select value={tBoard}
              onChange={(e) => { setTBoard(e.target.value);
                setTCategory(''); setTGrade(''); }}
              className="w-full rounded-xl border border-ui-border px-3
                py-2 text-sm focus:border-brand-green focus:outline-none">
              <option value="">Select exam board</option>
              {boards?.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {tBoard && (
              <select value={tCategory}
                onChange={(e) => { setTCategory(e.target.value);
                  setTGrade(''); }}
                className="w-full rounded-xl border border-ui-border px-3
                  py-2 text-sm focus:border-brand-green focus:outline-none">
                <option value="">Select category</option>
                {tCategories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            {tCategory && (
              <select value={tGrade}
                onChange={(e) => setTGrade(e.target.value)}
                className="w-full rounded-xl border border-ui-border px-3
                  py-2 text-sm focus:border-brand-green focus:outline-none">
                <option value="">Select grade / year</option>
                {tGrades?.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            )}
            {tGrade && tSubjects && tSubjects.length > 0 && (
              <div className="max-h-36 overflow-y-auto rounded-xl border
                border-ui-border bg-white p-2 space-y-1">
                {tSubjects.map((subj) => (
                  <label key={subj.id}
                    className="flex cursor-pointer items-center gap-2.5
                      rounded-lg px-2 py-1.5 hover:bg-ui-subtle">
                    <input type="checkbox"
                      className="accent-brand-green"
                      checked={selectedSubjects.some((s) => s.id === subj.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (!selectedSubjects.find((s) => s.id === subj.id)) {
                            setSelectedSubjects((prev) => [
                              ...prev,
                              {
                                id: subj.id,
                                name: subj.name,
                                boardName: boards?.find(
                                  (b) => b.id === tBoard)?.name ?? '',
                                categoryName: tCategories?.find(
                                  (c) => c.id === tCategory)?.name ?? '',
                                gradeName: tGrades?.find(
                                  (g) => g.id === tGrade)?.name ?? '',
                              },
                            ]);
                          }
                        } else {
                          setSelectedSubjects((prev) =>
                            prev.filter((s) => s.id !== subj.id)
                          );
                        }
                      }} />
                    <span className="text-sm text-brand-black">{subj.name}</span>
                  </label>
                ))}
              </div>
            )}
            {selectedSubjects.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedSubjects.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1
                      rounded-full bg-brand-green/10 px-3 py-1
                      text-xs font-medium text-brand-green"
                  >
                    {s.name} — {s.boardName} {s.categoryName}{' '}
                    {s.gradeName}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSubjects((prev) =>
                          prev.filter((x) => x.id !== s.id)
                        )
                      }
                      className="ml-1 text-brand-green/60
                        hover:text-brand-red font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-ui-muted">
              Teacher will only add content to selected subjects
            </p>
          </div>
          {formError && <p className="text-sm text-brand-red">{formError}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createTeacher.isPending}>
              Create teacher
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
