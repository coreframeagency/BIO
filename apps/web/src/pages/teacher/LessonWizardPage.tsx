import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TeacherLayout } from '@/components/layout/RoleLayouts';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { WysiwygEditor } from '@/components/teacher/WysiwygEditor';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/services/api';
import { Unit } from '@/types';
import { slugify } from '@/utils/helpers';

interface SubjectTile {
  id: string;
  name: string;
  grade: {
    name: string;
    category: {
      name: string;
      examBoard: { name: string };
    };
  };
}

const STEPS = [
  'Lesson info',
  'Notes',
  'Visual lesson',
  'Practice questions',
  'Past paper questions',
  'Review & publish',
];

export default function LessonWizardPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [step, setStep] = useState(0);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    subjectId: '',
    unitIds: [] as string[],
    learningObjectives: [''] as string[],
    estimatedMinutes: 30,
  });
  const [visualProgress, setVisualProgress] = useState('');
  const [visualHtml, setVisualHtml] = useState('');
  const [questions, setQuestions] = useState<
    { type: string; questionText: string; marks: number; modelAnswer: string; keyPhrases: string[] }[]
  >([]);
  const [notesText, setNotesText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: teacherMeta } = useQuery({
    queryKey: ['teacher-meta'],
    queryFn: async () => {
      const res = await apiFetch<{ allowedSubjectIds?: string[] }>(
        '/auth/me/meta'
      );
      if (!res.ok) return null;
      return res.data ?? null;
    },
    enabled: isAuthenticated,
  });

  const allowedIds = (teacherMeta?.allowedSubjectIds as string[]) ?? [];

  const { data: assignedSubjects } = useQuery({
    queryKey: ['assigned-subjects-tiles', allowedIds.join(',')],
    queryFn: async () => {
      if (allowedIds.length === 0) return [];
      const res = await apiFetch<SubjectTile[]>('/subjects');
      if (!res.ok) return [];
      return (res.data ?? []).filter((s) => allowedIds.includes(s.id));
    },
    enabled: allowedIds.length > 0,
  });

  const { data: units } = useQuery({
    queryKey: ['units', form.subjectId],
    queryFn: async () => {
      const res = await apiFetch<Unit[]>(
        `/units?subjectId=${form.subjectId}`
      );
      if (!res.ok) return [];
      return res.data ?? [];
    },
    enabled: !!form.subjectId,
  });

  const handleStep0 = async () => {
    setLoading(true);
    setError('');

    if (!form.title.trim()) {
      setError('Please enter a lesson title');
      setLoading(false);
      return;
    }
    if (!form.subjectId) {
      setError('Please select a subject');
      setLoading(false);
      return;
    }

    let unitIds = form.unitIds;
    if (unitIds.length === 0) {
      const cached = units ?? [];
      if (cached.length > 0) {
        unitIds = cached.map((u) => u.id);
      } else {
        const unitsRes = await apiFetch<Unit[]>(
          `/units?subjectId=${form.subjectId}`
        );
        unitIds = (unitsRes.data ?? []).map((u) => u.id);
      }
    }

    const res = await apiFetch<{ id: string }>('/lessons', {
      method: 'POST',
      body: JSON.stringify({
        title: form.title,
        slug: form.slug || slugify(form.title),
        description: form.description,
        learningObjectives: form.learningObjectives.filter(Boolean),
        estimatedMinutes: form.estimatedMinutes,
        unitIds,
      }),
    });
    setLoading(false);
    if (res.ok && res.data) {
      setLessonId(res.data.id);
      setStep(1);
    } else {
      setError(res.error || 'Failed to create lesson');
    }
  };

  const saveNotes = async () => {
    if (!lessonId) return;
    setLoading(true);
    const notesHtml = notesText;
    const res = await apiFetch(`/lessons/${lessonId}`, {
      method: 'PATCH',
      body: JSON.stringify({ notesHtml }),
    });
    setLoading(false);
    if (res.ok) setStep(2);
    else setError(res.error || 'Failed to save notes');
  };

  const generateVisual = async () => {
    if (!lessonId) return;
    setVisualProgress('Starting...');
    const { streamVisualGeneration } = await import('@/services/api');
    await streamVisualGeneration(lessonId, (event) => {
      setVisualProgress(event.message);
      if (event.html) setVisualHtml(event.html);
    });
  };

  const saveQuestions = async () => {
    if (!lessonId) return;
    setLoading(true);
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await apiFetch('/questions', {
        method: 'POST',
        body: JSON.stringify({
          lessonId,
          type: q.type,
          order: i + 1,
          marks: q.marks,
          questionText: q.questionText,
          modelAnswer: q.modelAnswer,
          keyPhrases: q.keyPhrases,
          status: 'PUBLISHED',
        }),
      });
    }
    setLoading(false);
    setStep(4);
  };

  const publish = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (!lessonId) return;
    setLoading(true);
    await apiFetch(`/lessons/${lessonId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    navigate('/cms/lessons');
  };

  return (
    <TeacherLayout>
      <h1 className="font-serif text-3xl font-bold">Create new lesson</h1>
      <div className="mt-6 flex gap-2 overflow-x-auto">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
              i === step ? 'bg-brand-green text-white' : i < step ? 'bg-brand-greenLight text-brand-green' : 'bg-ui-subtle text-ui-muted'
            }`}
          >
            {i + 1}. {label}
          </div>
        ))}
      </div>

      {error && step !== 0 && <p className="mt-4 text-brand-red">{error}</p>}

      <Card className="mt-8">
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-brand-black">
                Lesson title
              </label>
              <input
                type="text"
                placeholder="e.g. Introduction to Cells"
                value={form.title}
                onChange={(e) => setForm({
                  ...form,
                  title: e.target.value,
                  slug: slugify(e.target.value),
                })}
                className="w-full rounded-xl border border-ui-border px-4 py-3 text-sm text-brand-black placeholder:text-ui-muted focus:border-brand-green focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-brand-black">
                Slug
                <span className="ml-1 text-xs font-normal text-ui-muted">
                  (auto-filled from title)
                </span>
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) =>
                  setForm({ ...form, slug: e.target.value })
                }
                className="w-full rounded-xl border border-ui-border px-4 py-3 text-sm text-brand-black placeholder:text-ui-muted focus:border-brand-green focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-brand-black">
                Description
                <span className="ml-1 text-xs font-normal text-ui-muted">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="Brief description of this lesson"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full rounded-xl border border-ui-border px-4 py-3 text-sm text-brand-black placeholder:text-ui-muted focus:border-brand-green focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-3 block text-sm font-semibold text-brand-black">
                Select subject
              </label>
              {!assignedSubjects || assignedSubjects.length === 0 ? (
                <div className="rounded-2xl border border-ui-border bg-white px-5 py-8 text-center">
                  <p className="text-sm text-ui-muted">
                    No subjects assigned yet.
                  </p>
                  <p className="mt-1 text-xs text-ui-muted">
                    Contact admin to get subjects assigned to your account.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {assignedSubjects.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        setForm({ ...form, subjectId: s.id, unitIds: [] })
                      }
                      className={[
                        'rounded-2xl border-2 p-5 text-left',
                        'transition hover:border-brand-green/50',
                        form.subjectId === s.id
                          ? 'border-brand-green bg-brand-green/5'
                          : 'border-ui-border bg-white',
                      ].join(' ')}
                    >
                      <p className="text-base font-semibold text-brand-black">
                        {s.name}
                      </p>
                      <p className="mt-1 text-xs text-ui-muted">
                        {s.grade.category.examBoard.name}
                        {' · '}
                        {s.grade.category.name}
                        {' · '}
                        {s.grade.name}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-brand-black">
                Estimated time (minutes)
              </label>
              <input
                type="number"
                value={form.estimatedMinutes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    estimatedMinutes: Number(e.target.value),
                  })
                }
                className="w-32 rounded-xl border border-ui-border px-4 py-3 text-sm text-brand-black focus:border-brand-green focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-brand-red">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleStep0}
              disabled={loading}
              className="rounded-xl bg-brand-green px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Continue →'}
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-xl font-semibold text-brand-black">
                Lesson notes
              </h2>
              <p className="mt-1 text-sm text-ui-muted">
                Write your lesson notes below. Use the
                toolbar to format, add tables, equations,
                and structure. The AI will read these
                notes to generate the visual lesson.
              </p>
            </div>
            <WysiwygEditor
              value={notesText}
              onChange={setNotesText}
              placeholder={`Start writing your lesson notes...
Click here and begin typing. Use the toolbar above
to format your content just like Word.`}
              minHeight={500}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="rounded-xl border border-ui-border px-6 py-3 text-sm font-semibold text-brand-black hover:bg-ui-subtle"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={saveNotes}
                disabled={loading || !notesText.trim()}
                className="rounded-xl bg-brand-green px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-ui-muted">Generate an interactive visual lesson from your notes using Claude.</p>
            <Button className="mt-4" onClick={generateVisual}>Generate with Claude</Button>
            {visualProgress && <p className="mt-4 text-sm text-brand-green">{visualProgress}</p>}
            {visualHtml && (
              <iframe
                title="Preview"
                srcDoc={visualHtml}
                sandbox="allow-scripts"
                className="mt-4 min-h-[400px] w-full rounded-xl border-0"
              />
            )}
            <Button className="mt-4" onClick={() => setStep(3)} disabled={!visualHtml}>
              Continue
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={i} className="rounded-xl border border-ui-border p-4">
                <Select
                  id={`type-${i}`}
                  label="Type"
                  value={q.type}
                  onChange={(e) => {
                    const updated = [...questions];
                    updated[i].type = e.target.value;
                    setQuestions(updated);
                  }}
                  options={[
                    { value: 'MCQ', label: 'Multiple choice' },
                    { value: 'SHORT_ANSWER', label: 'Short answer' },
                    { value: 'LONG_ANSWER', label: 'Long answer' },
                  ]}
                />
                <textarea
                  className="mt-2 w-full rounded-xl border border-ui-border p-3"
                  placeholder="Question text"
                  value={q.questionText}
                  onChange={(e) => {
                    const updated = [...questions];
                    updated[i].questionText = e.target.value;
                    setQuestions(updated);
                  }}
                />
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() =>
                setQuestions([
                  ...questions,
                  { type: 'SHORT_ANSWER', questionText: '', marks: 1, modelAnswer: '', keyPhrases: [] },
                ])
              }
            >
              Add question
            </Button>
            <Button onClick={saveQuestions} isLoading={loading}>Continue</Button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl font-semibold text-brand-black">
                Past paper questions
              </h2>
              <p className="mt-1 text-sm text-ui-muted">
                Add questions from past papers for this lesson.
                Students can practice these alongside the lesson
                content.
              </p>
            </div>

            <div className="rounded-2xl border border-ui-border bg-white p-6 text-center">
              <p className="text-2xl">📄</p>
              <p className="mt-3 text-sm font-medium text-brand-black">
                Past paper questions
              </p>
              <p className="mt-1 text-xs text-ui-muted">
                Link past paper questions to this lesson after
                you have uploaded past papers to the subject.
              </p>
              <p className="mt-3 text-xs text-ui-muted">
                You can skip this step and add questions later.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-xl border border-ui-border px-6 py-3 text-sm font-semibold text-brand-black hover:bg-ui-subtle"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(5)}
                className="rounded-xl bg-brand-green px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 className="font-serif text-xl font-semibold">Review & publish</h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li>✓ Lesson info complete</li>
              <li>✓ Notes saved</li>
              <li>{visualHtml ? '✓' : '○'} Visual lesson generated</li>
              <li>{questions.length ? '✓' : '○'} Practice questions added</li>
            </ul>
            <div className="mt-6 flex gap-4">
              <Button variant="secondary" onClick={() => publish('DRAFT')} isLoading={loading}>
                Save as draft
              </Button>
              <Button onClick={() => publish('PUBLISHED')} isLoading={loading}>
                Publish
              </Button>
            </div>
          </div>
        )}
      </Card>
    </TeacherLayout>
  );
}
