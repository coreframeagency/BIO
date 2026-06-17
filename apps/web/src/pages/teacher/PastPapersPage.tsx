import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ExternalLink,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import { TeacherLayout } from '@/components/layout/RoleLayouts';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/services/api';
import {
  deletePastPaper,
  getPastPapers,
  uploadPastPaper,
} from '@/services/pastPapers.service';
import { PaperType, PastPaper, Subject } from '@/types';
import { cn } from '@/utils/helpers';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const TYPE_OPTIONS: { value: PaperType; label: string }[] = [
  { value: 'EXAM_PAPER', label: 'Exam Paper' },
  { value: 'MARK_SCHEME', label: 'Mark Scheme' },
  { value: 'SPECIMEN', label: 'Specimen Paper' },
];

const subjectBadgeClass: Record<string, string> = {
  Biology: 'bg-brand-green/10 text-brand-green',
  Chemistry: 'bg-brand-lavender/10 text-brand-lavender',
  Physics: 'bg-brand-sky/30 text-brand-black',
  Maths: 'bg-brand-mustard/20 text-brand-black',
  IELTS: 'bg-brand-tangerine/10 text-brand-tangerine',
};

const typeBadgeClass: Record<PaperType, string> = {
  EXAM_PAPER: 'bg-blue-100 text-blue-800',
  MARK_SCHEME: 'bg-purple-100 text-purple-800',
  SPECIMEN: 'bg-amber-100 text-amber-800',
};

const typeLabels: Record<PaperType, string> = {
  EXAM_PAPER: 'Exam Paper',
  MARK_SCHEME: 'Mark Scheme',
  SPECIMEN: 'Specimen',
};

function formatUploadedDate(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getSubjectBadgeClass(name: string): string {
  return subjectBadgeClass[name] ?? 'bg-brand-green/10 text-brand-green';
}

function formatSubjectLabel(subject: Subject): string {
  const board = subject.grade?.category?.examBoard?.name ?? '';
  const category = subject.grade?.category?.name ?? '';
  const grade = subject.grade?.name ?? '';
  const suffix = [board, category, grade].filter(Boolean).join(' ');
  return suffix ? `${subject.name} — ${suffix}` : subject.name;
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-ui-subtle" />
      ))}
    </div>
  );
}

export default function PastPapersPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentYear = new Date().getFullYear();

  const [modalOpen, setModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [paperNumber, setPaperNumber] = useState('');
  const [paperType, setPaperType] = useState<PaperType>('EXAM_PAPER');
  const [isDragging, setIsDragging] = useState(false);

  const { data: papers, isLoading } = useQuery({
    queryKey: ['past-papers'],
    queryFn: async () => {
      const res = await getPastPapers();
      if (!res.ok) throw new Error(res.error ?? 'Failed to load past papers');
      return res.data ?? [];
    },
  });

  const { data: teacherMeta } = useQuery({
    queryKey: ['teacher-meta'],
    queryFn: async () => {
      const res = await apiFetch<{ allowedSubjectIds?: string[] }>('/auth/me/meta');
      if (!res.ok) return null;
      return res.data ?? null;
    },
    enabled: isAuthenticated,
  });

  const allowedSubjectIds = (teacherMeta?.allowedSubjectIds as string[]) ?? [];

  const { data: allSubjects } = useQuery({
    queryKey: ['subjects', allowedSubjectIds.join(',')],
    queryFn: async () => {
      const res = await apiFetch<Subject[]>('/subjects');
      if (!res.ok) return [];
      return res.data ?? [];
    },
    enabled: modalOpen,
  });

  const subjects = useMemo(() => {
    if (allowedSubjectIds.length === 0) return [];
    return (allSubjects ?? []).filter((s) => allowedSubjectIds.includes(s.id));
  }, [allSubjects, allowedSubjectIds]);

  const uploadMutation = useMutation({
    mutationFn: uploadPastPaper,
    onSuccess: (res) => {
      if (!res.ok) {
        setFormError(res.error ?? 'Upload failed');
        return;
      }
      setModalOpen(false);
      resetForm();
      setSuccessToast(true);
      queryClient.invalidateQueries({ queryKey: ['past-papers'] });
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePastPaper,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['past-papers'] });
    },
  });

  useEffect(() => {
    if (!successToast) return;
    const timer = window.setTimeout(() => setSuccessToast(false), 4000);
    return () => window.clearTimeout(timer);
  }, [successToast]);

  const resetForm = () => {
    setPdfFile(null);
    setTitle('');
    setSubjectId('');
    setYear('');
    setMonth('');
    setPaperNumber('');
    setPaperType('EXAM_PAPER');
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = useCallback((file: File | null) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setFormError('Only PDF files are allowed');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFormError('File must be 50MB or smaller');
      return;
    }
    setFormError(null);
    setPdfFile(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!pdfFile) {
      setFormError('Please select a PDF file');
      return;
    }
    if (!title.trim()) {
      setFormError('Title is required');
      return;
    }
    if (!subjectId) {
      setFormError('Please select a subject');
      return;
    }
    if (!year.trim()) {
      setFormError('Year is required');
      return;
    }

    const yearNum = Number(year);
    if (Number.isNaN(yearNum) || yearNum < 2000 || yearNum > currentYear) {
      setFormError(`Year must be between 2000 and ${currentYear}`);
      return;
    }

    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('title', title.trim());
    formData.append('subjectId', subjectId);
    formData.append('year', String(yearNum));
    if (month) formData.append('month', month);
    if (paperNumber.trim()) formData.append('paperNumber', paperNumber.trim());
    formData.append('type', paperType);

    uploadMutation.mutate(formData);
  };

  const handleDelete = async (paper: PastPaper) => {
    if (!window.confirm(`Delete "${paper.title}"?`)) return;
    const res = await deleteMutation.mutateAsync(paper.id);
    if (!res.ok) {
      window.alert(res.error ?? 'Failed to delete paper');
    }
  };

  const subjectOptions = [
    { value: '', label: 'Select a subject' },
    ...(subjects.map((s) => ({
      value: s.id,
      label: formatSubjectLabel(s),
    }))),
  ];

  const monthOptions = [
    { value: '', label: 'Optional' },
    ...MONTHS.map((m) => ({ value: m, label: m })),
  ];

  return (
    <TeacherLayout>
      {successToast && (
        <div className="fixed right-6 top-6 z-[60] rounded-xl bg-brand-green px-5 py-3 text-sm font-medium text-white shadow-lg">
          Paper uploaded successfully
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Past Papers</h1>
          <p className="mt-1 text-ui-muted">Upload and manage past papers and mark schemes</p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="shrink-0 rounded-xl bg-brand-green px-5 py-2.5 font-semibold text-white"
        >
          Upload paper
        </button>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <TableSkeleton />
        ) : !papers?.length ? (
          <div className="rounded-2xl border border-ui-border bg-white py-16 text-center">
            <FileText className="mx-auto mb-3 size-12 text-ui-muted" />
            <p className="font-serif text-xl font-semibold">No past papers yet</p>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setModalOpen(true);
              }}
              className="mt-4 rounded-xl bg-brand-green px-6 py-2.5 font-semibold text-white"
            >
              Upload your first paper
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-ui-border bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-ui-border text-ui-muted">
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Subject</th>
                  <th className="px-5 py-3 font-medium">Year</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Uploaded</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {papers.map((paper) => (
                  <tr key={paper.id} className="border-b border-ui-border last:border-0">
                    <td className="px-5 py-4 font-medium text-brand-black">{paper.title}</td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                          getSubjectBadgeClass(paper.subject.name)
                        )}
                      >
                        {paper.subject.name}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-brand-black">{paper.year}</td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                          typeBadgeClass[paper.type]
                        )}
                      >
                        {typeLabels[paper.type]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-ui-muted">
                      {formatUploadedDate(paper.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <a
                          href={paper.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ui-muted transition-colors hover:text-brand-green"
                          title="Download"
                        >
                          <ExternalLink size={18} />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDelete(paper)}
                          disabled={deleteMutation.isPending}
                          className="text-ui-muted transition-colors hover:text-brand-red"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !uploadMutation.isPending && setModalOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-6 font-serif text-2xl font-semibold">Upload past paper</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="pdf-upload"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={cn(
                    'block cursor-pointer rounded-xl border-2 border-dashed border-ui-border p-8 text-center transition-colors',
                    isDragging && 'border-brand-green bg-brand-green/5'
                  )}
                >
                  <Upload className="mx-auto mb-2 size-8 text-ui-muted" />
                  <p className="text-sm text-brand-black">Drop PDF here or click to browse</p>
                  {pdfFile && (
                    <p className="mt-2 text-sm text-ui-muted">
                      {pdfFile.name} ({formatFileSize(pdfFile.size)})
                    </p>
                  )}
                  <input
                    ref={fileInputRef}
                    id="pdf-upload"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <Input
                label="Title"
                required
                placeholder="e.g. Edexcel Biology Paper 1 June 2023"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <Select
                label="Subject"
                required
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                options={subjectOptions}
              />

              <Input
                label="Year"
                type="number"
                required
                min={2000}
                max={currentYear}
                placeholder="2023"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />

              <Select
                label="Month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                options={monthOptions}
              />

              <Input
                label="Paper number"
                type="number"
                placeholder="1"
                value={paperNumber}
                onChange={(e) => setPaperNumber(e.target.value)}
              />

              <Select
                label="Type"
                value={paperType}
                onChange={(e) => setPaperType(e.target.value as PaperType)}
                options={TYPE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
              />

              {formError && <p className="text-sm text-brand-red">{formError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={uploadMutation.isPending}
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-ui-border px-5 py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-5 py-2.5 font-semibold text-white disabled:opacity-70"
                >
                  {uploadMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
