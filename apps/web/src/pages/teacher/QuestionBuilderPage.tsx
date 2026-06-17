import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  ClipboardList,
  FileText,
  Layers,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { TeacherLayout } from '@/components/layout/RoleLayouts';
import { RichTextToolbar } from '@/components/teacher/RichTextToolbar';
import { apiFetch, API_URL, getAccessToken } from '@/services/api';
import type {
  Difficulty,
  FillBlanksData,
  McqOptionsData,
  Question,
  QuestionType,
  TableDataJson,
} from '@/types/question';
import { cn } from '@/utils/helpers';

const TYPE_META: Record<
  QuestionType,
  { label: string; description: string; badge: string }
> = {
  MCQ: {
    label: 'MCQ',
    description: 'Multiple Choice — One correct answer from 4 options',
    badge: 'bg-brand-green/10 text-brand-green',
  },
  MULTIPLE_SELECT: {
    label: 'Multiple Select',
    description: 'Multiple Select — More than one correct answer',
    badge: 'bg-brand-lavender/10 text-brand-lavender',
  },
  SHORT_ANSWER: {
    label: 'Short Answer',
    description: 'Short Answer — 1-3 sentences, AI marked',
    badge: 'bg-brand-mustard/10 text-amber-700',
  },
  LONG_ANSWER: {
    label: 'Long Answer',
    description: 'Long Answer — Extended writing, model answer revealed',
    badge: 'bg-brand-tangerine/10 text-orange-700',
  },
  TRUE_FALSE: {
    label: 'True/False',
    description: 'True or False — Simple binary question',
    badge: 'bg-brand-sky/10 text-cyan-700',
  },
  FILL_BLANK: {
    label: 'Fill in the Blank',
    description: 'Fill the Blank — Complete missing words',
    badge: 'bg-pink-100 text-pink-700',
  },
  CALCULATION: {
    label: 'Calculation',
    description: 'Calculation — Show working, numerical answer',
    badge: 'bg-purple-100 text-purple-700',
  },
  DATA_ANALYSIS: {
    label: 'Data Analysis',
    description: 'Data Analysis — Interpret tables or graphs',
    badge: 'bg-indigo-100 text-indigo-700',
  },
  LABEL_DIAGRAM: {
    label: 'Label Diagram',
    description: 'Label parts of a diagram',
    badge: 'bg-brand-green/10 text-brand-green',
  },
  MATCHING: {
    label: 'Matching',
    description: 'Match pairs of terms and definitions',
    badge: 'bg-brand-lavender/10 text-brand-lavender',
  },
};

interface LessonDetail {
  id: string;
  title: string;
}

interface FlashcardRow {
  front: string;
  back: string;
}

interface PastPaperQuestionRow {
  id: string;
  type: QuestionType;
  status: 'DRAFT' | 'PUBLISHED';
  marks: number;
  difficulty: Difficulty;
  questionText: string;
  modelAnswer?: string | null;
  explanation?: string | null;
  hintText?: string | null;
  mcqOptions?: McqOptionsData | null;
  fillBlanks?: FillBlanksData | null;
  year?: number | null;
  session?: string | null;
  paperNumber?: number | null;
  questionNumber?: number | null;
  pastPaper?: {
    id: string;
    year: number;
    month?: string | null;
    paperNumber?: number | null;
  } | null;
}

interface PastPaperOption {
  id: string;
  year: number;
  month?: string | null;
  paperNumber?: number | null;
}

interface PpqEditorState {
  id?: string;
  type: QuestionType | null;
  marks: number;
  difficulty: Difficulty;
  questionText: string;
  modelAnswer: string;
  explanation: string;
  hintText: string;
  options: string[];
  correctIndex: number;
  correctIndices: number[];
  trueFalseCorrect: boolean;
  fillBlanks: string[];
  finalAnswer: string;
  calcUnits: string;
  status: 'DRAFT' | 'PUBLISHED';
  pastPaperId: string;
  year: string;
  session: string;
  paperNumber: string;
  questionNumber: string;
}

interface EditorState {
  id?: string;
  type: QuestionType | null;
  marks: number;
  difficulty: Difficulty;
  questionText: string;
  explanation: string;
  modelAnswer: string;
  hintText: string;
  timerSeconds: number | null;
  status: 'DRAFT' | 'PUBLISHED';
  options: string[];
  correctIndex: number;
  correctIndices: number[];
  trueFalseCorrect: boolean;
  fillBlanks: string[];
  finalAnswer: string;
  calcUnits: string;
  calcTolerance: number;
  tableRows: number;
  tableCols: number;
  tableHasHeader: boolean;
  tableGrid: string[][];
}

function createTableGrid(rows: number, cols: number, existing?: string[][]): string[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => existing?.[r]?.[c] ?? '')
  );
}

const emptyEditor = (): EditorState => ({
  type: null,
  marks: 1,
  difficulty: 'MEDIUM',
  questionText: '',
  explanation: '',
  modelAnswer: '',
  hintText: '',
  timerSeconds: null,
  status: 'DRAFT',
  options: ['', '', '', ''],
  correctIndex: 0,
  correctIndices: [],
  trueFalseCorrect: true,
  fillBlanks: [],
  finalAnswer: '',
  calcUnits: '',
  calcTolerance: 0.001,
  tableRows: 4,
  tableCols: 3,
  tableHasHeader: true,
  tableGrid: createTableGrid(4, 3),
});

const emptyPpqEditor = (): PpqEditorState => ({
  type: null,
  marks: 1,
  difficulty: 'MEDIUM',
  questionText: '',
  modelAnswer: '',
  explanation: '',
  hintText: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  correctIndices: [],
  trueFalseCorrect: true,
  fillBlanks: [],
  finalAnswer: '',
  calcUnits: '',
  status: 'DRAFT',
  pastPaperId: '',
  year: '',
  session: '',
  paperNumber: '',
  questionNumber: '',
});

function detectBlanks(text: string): string[] {
  const count = (text.match(/_{3,}/g) ?? []).length;
  return Array(count).fill('');
}

function editorFromQuestion(q: Question): EditorState {
  const mcq = (q.mcqOptions ?? {}) as McqOptionsData;
  const options = mcq.options ?? ['', '', '', ''];
  const table = q.tableData as TableDataJson | null | undefined;
  const tableRows = table?.rows ?? 4;
  const tableCols = table?.cols ?? 3;
  return {
    id: q.id,
    type: q.type,
    marks: q.marks,
    difficulty: q.difficulty,
    questionText: q.questionText,
    explanation: q.explanation ?? '',
    modelAnswer: q.modelAnswer ?? '',
    hintText: q.hintText ?? '',
    timerSeconds: q.timerSeconds ?? null,
    status: q.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
    options: options.length ? options : ['', '', '', ''],
    correctIndex: typeof mcq.correct === 'number' ? mcq.correct : 0,
    correctIndices: Array.isArray(mcq.correct) ? mcq.correct : [],
    trueFalseCorrect: mcq.correct === true,
    fillBlanks: q.fillBlanks?.blanks ?? detectBlanks(q.questionText),
    finalAnswer: mcq.finalAnswer != null ? String(mcq.finalAnswer) : '',
    calcUnits: mcq.units ?? '',
    calcTolerance: mcq.tolerance ?? 0.001,
    tableRows,
    tableCols,
    tableHasHeader: table?.hasHeader ?? true,
    tableGrid: createTableGrid(tableRows, tableCols, table?.data),
  };
}

function buildPayload(editor: EditorState, lessonId: string) {
  const base = {
    lessonId,
    type: editor.type!,
    marks: editor.marks,
    difficulty: editor.difficulty,
    questionText: editor.questionText,
    explanation: editor.explanation || undefined,
    modelAnswer: editor.modelAnswer || undefined,
    hintText: editor.hintText || undefined,
    timerSeconds: editor.timerSeconds ?? undefined,
    status: editor.status,
  };

  if (editor.type === 'DATA_ANALYSIS') {
    return {
      ...base,
      tableData: {
        rows: editor.tableRows,
        cols: editor.tableCols,
        hasHeader: editor.tableHasHeader,
        data: editor.tableGrid,
      },
      mcqOptions: {
        options: editor.options.filter(Boolean),
        correct: editor.correctIndex,
        explanation: editor.explanation,
      },
    };
  }
  if (editor.type === 'MCQ' || editor.type === 'LABEL_DIAGRAM' || editor.type === 'MATCHING') {
    return {
      ...base,
      mcqOptions: {
        options: editor.options.filter(Boolean),
        correct: editor.correctIndex,
        explanation: editor.explanation,
      },
    };
  }
  if (editor.type === 'MULTIPLE_SELECT') {
    return {
      ...base,
      mcqOptions: {
        options: editor.options.filter(Boolean),
        correct: editor.correctIndices,
        multiSelect: true,
        explanation: editor.explanation,
      },
    };
  }
  if (editor.type === 'TRUE_FALSE') {
    return {
      ...base,
      mcqOptions: { correct: editor.trueFalseCorrect, explanation: editor.explanation },
    };
  }
  if (editor.type === 'FILL_BLANK') {
    return {
      ...base,
      fillBlanks: { blanks: editor.fillBlanks, caseSensitive: false },
    };
  }
  if (editor.type === 'CALCULATION') {
    return {
      ...base,
      mcqOptions: {
        finalAnswer: parseFloat(editor.finalAnswer) || 0,
        units: editor.calcUnits,
        tolerance: editor.calcTolerance,
        explanation: editor.explanation,
      },
    };
  }
  return base;
}

export default function QuestionBuilderPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'questions' | 'flashcards' | 'pastpaperqs'>('questions');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(emptyEditor());
  const [showHint, setShowHint] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [flashcards, setFlashcards] = useState<FlashcardRow[]>([{ front: '', back: '' }]);
  const [ppqEditorOpen, setPpqEditorOpen] = useState(false);
  const [ppqEditor, setPpqEditor] = useState<PpqEditorState>(emptyPpqEditor());
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { data: lesson, isLoading: lessonLoading } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      const res = await apiFetch<LessonDetail>(`/lessons/${lessonId}`);
      if (!res.ok) throw new Error(res.error);
      return res.data!;
    },
    enabled: !!lessonId,
  });

  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ['questions', lessonId],
    queryFn: async () => {
      const res = await apiFetch<Question[]>(`/questions?lessonId=${lessonId}`);
      if (!res.ok) return [];
      return res.data ?? [];
    },
    enabled: !!lessonId,
  });

  const { data: existingFlashcards } = useQuery({
    queryKey: ['flashcards-manage', lessonId],
    queryFn: async () => {
      const res = await apiFetch<{ front: string; back: string }[]>(
        `/flashcards?lessonId=${lessonId}`
      );
      return res.data ?? [];
    },
    enabled: !!lessonId && tab === 'flashcards',
  });

  const { data: pastPaperQuestions = [], isLoading: ppqLoading, refetch: refetchPPQ } = useQuery({
    queryKey: ['past-paper-questions', lessonId],
    queryFn: async () => {
      const res = await apiFetch<PastPaperQuestionRow[]>(
        `/past-paper-questions?lessonId=${lessonId}`
      );
      if (!res.ok) return [];
      return res.data ?? [];
    },
    enabled: !!lessonId && tab === 'pastpaperqs',
  });

  const { data: availablePastPapers = [] } = useQuery({
    queryKey: ['past-papers-for-lesson', lessonId],
    queryFn: async () => {
      const res = await apiFetch<PastPaperOption[]>('/past-papers');
      if (!res.ok) return [];
      return res.data ?? [];
    },
    enabled: !!lessonId && tab === 'pastpaperqs',
  });

  useEffect(() => {
    if (existingFlashcards?.length) {
      setFlashcards(existingFlashcards);
    }
  }, [existingFlashcards]);

  const stats = useMemo(() => {
    const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
    const published = questions.filter((q) => q.status === 'PUBLISHED').length;
    return { total: questions.length, totalMarks, published };
  }, [questions]);

  const saveMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      const payload = buildPayload(
        { ...editor, status: publish ? 'PUBLISHED' : 'DRAFT' },
        lessonId!
      );
      let questionId = editor.id;
      if (editor.id) {
        const res = await apiFetch<Question>(`/questions/${editor.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(res.error);
        questionId = res.data!.id;
      } else {
        const res = await apiFetch<Question>('/questions', {
          method: 'POST',
          body: JSON.stringify({ ...payload, order: questions.length }),
        });
        if (!res.ok) throw new Error(res.error);
        questionId = res.data!.id;
      }
      if (imageFile && questionId) {
        const form = new FormData();
        form.append('image', imageFile);
        const token = getAccessToken();
        await fetch(`${API_URL}/api/questions/${questionId}/image`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', lessonId] });
      setEditorOpen(false);
      setEditor(emptyEditor());
      setImageFile(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/questions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions', lessonId] }),
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'DRAFT' | 'PUBLISHED' }) => {
      const res = await apiFetch(`/questions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions', lessonId] }),
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await apiFetch('/questions/reorder', {
        method: 'POST',
        body: JSON.stringify({ orderedIds }),
      });
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions', lessonId] }),
  });

  const saveFlashcardsMutation = useMutation({
    mutationFn: async () => {
      const cards = flashcards
        .filter((c) => c.front.trim() && c.back.trim())
        .map((c) => ({ front: c.front.trim(), back: c.back.trim() }));
      if (cards.length === 0) throw new Error('Add at least one flashcard with front and back text');
      if (!lessonId) throw new Error('Lesson ID is missing from the URL');

      const token = getAccessToken();
      if (!token) throw new Error('You must be logged in to save flashcards');

      const url = import.meta.env.VITE_API_URL
        ? `${API_URL.replace(/\/$/, '')}/api/flashcards`
        : '/api/flashcards';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ lessonId, cards }),
      });

      const raw = await response.text();
      let payload: { success?: boolean; error?: string };
      try {
        payload = JSON.parse(raw) as typeof payload;
      } catch {
        throw new Error(raw.slice(0, 200) || `Invalid response (${response.status})`);
      }

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? `Failed to save flashcards (${response.status})`);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flashcards-manage', lessonId] }),
  });

  const savePpqMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      const payload = {
        lessonId,
        type: ppqEditor.type!,
        marks: ppqEditor.marks,
        difficulty: ppqEditor.difficulty,
        questionText: ppqEditor.questionText,
        modelAnswer: ppqEditor.modelAnswer || undefined,
        explanation: ppqEditor.explanation || undefined,
        hintText: ppqEditor.hintText || undefined,
        status: publish ? 'PUBLISHED' : 'DRAFT',
        pastPaperId: ppqEditor.pastPaperId || undefined,
        year: ppqEditor.year ? parseInt(ppqEditor.year, 10) : undefined,
        session: ppqEditor.session || undefined,
        paperNumber: ppqEditor.paperNumber
          ? parseInt(ppqEditor.paperNumber, 10)
          : undefined,
        questionNumber: ppqEditor.questionNumber
          ? parseInt(ppqEditor.questionNumber, 10)
          : undefined,
        ...(ppqEditor.type === 'MCQ' ||
        ppqEditor.type === 'MULTIPLE_SELECT' ||
        ppqEditor.type === 'LABEL_DIAGRAM' ||
        ppqEditor.type === 'MATCHING'
          ? {
              mcqOptions: {
                options: ppqEditor.options.filter(Boolean),
                correct:
                  ppqEditor.type === 'MULTIPLE_SELECT'
                    ? ppqEditor.correctIndices
                    : ppqEditor.correctIndex,
              },
            }
          : {}),
        ...(ppqEditor.type === 'TRUE_FALSE'
          ? { mcqOptions: { correct: ppqEditor.trueFalseCorrect } }
          : {}),
        ...(ppqEditor.type === 'FILL_BLANK'
          ? { fillBlanks: { blanks: ppqEditor.fillBlanks, caseSensitive: false } }
          : {}),
        ...(ppqEditor.type === 'CALCULATION'
          ? {
              mcqOptions: {
                finalAnswer: parseFloat(ppqEditor.finalAnswer) || 0,
                units: ppqEditor.calcUnits,
              },
            }
          : {}),
      };

      if (ppqEditor.id) {
        const res = await apiFetch(`/past-paper-questions/${ppqEditor.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(res.error ?? 'Failed');
      } else {
        const res = await apiFetch('/past-paper-questions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(res.error ?? 'Failed');
      }
    },
    onSuccess: () => {
      void refetchPPQ();
      setPpqEditorOpen(false);
      setPpqEditor(emptyPpqEditor());
    },
  });

  const deletePpqMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/past-paper-questions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(res.error ?? 'Failed');
    },
    onSuccess: () => void refetchPPQ(),
  });

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const next = [...questions];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorderMutation.mutate(next.map((q) => q.id));
  };

  const openNew = () => {
    setEditor(emptyEditor());
    setEditorOpen(true);
  };

  const openEdit = (q: Question) => {
    setEditor(editorFromQuestion(q));
    setEditorOpen(true);
  };

  if (lessonLoading) {
    return (
      <TeacherLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="size-8 animate-spin text-brand-green" />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="min-h-full bg-brand-shell">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link to="/cms/lessons" className="text-sm text-ui-muted hover:text-brand-green">
              ← Back to lessons
            </Link>
            <h1 className="mt-2 font-serif text-2xl font-bold text-brand-black">Questions</h1>
            <p className="text-ui-muted">{lesson?.title}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab('questions')}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-medium',
                tab === 'questions' ? 'bg-brand-green text-white' : 'bg-white text-ui-muted'
              )}
            >
              Questions
            </button>
            <button
              type="button"
              onClick={() => setTab('flashcards')}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium',
                tab === 'flashcards' ? 'bg-brand-green text-white' : 'bg-white text-ui-muted'
              )}
            >
              <Layers size={16} /> Flashcards
            </button>
            <button
              type="button"
              onClick={() => setTab('pastpaperqs')}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium',
                tab === 'pastpaperqs'
                  ? 'bg-brand-green text-white'
                  : 'bg-white text-ui-muted'
              )}
            >
              <FileText size={16} /> Past Paper Qs
            </button>
          </div>
        </div>

        {tab === 'questions' ? (
          <div className="flex gap-6">
            <div className="min-w-0 flex-1">
              <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-ui-muted">
                <span>{stats.total} questions</span>
                <span>{stats.totalMarks} total marks</span>
                <span>{stats.published} published</span>
                <button
                  type="button"
                  onClick={openNew}
                  className="ml-auto flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white"
                >
                  <Plus size={16} /> Add Question
                </button>
              </div>

              {questionsLoading && <Loader2 className="animate-spin text-brand-green" />}

              {!questionsLoading && questions.length === 0 && (
                <div className="rounded-2xl border border-dashed border-ui-border bg-white py-16 text-center">
                  <ClipboardList className="mx-auto mb-3 size-10 text-ui-muted" />
                  <p className="font-medium text-brand-black">No questions yet</p>
                  <p className="mt-1 text-sm text-ui-muted">Add your first question</p>
                </div>
              )}

              {questions.map((q, i) => (
                <div
                  key={q.id}
                  className="mb-3 flex items-start gap-3 rounded-xl border border-ui-border bg-white p-4"
                >
                  <div className="flex flex-col gap-1">
                    <button type="button" onClick={() => moveQuestion(i, -1)} className="text-ui-muted hover:text-brand-black">
                      <ArrowUp size={14} />
                    </button>
                    <button type="button" onClick={() => moveQuestion(i, 1)} className="text-ui-muted hover:text-brand-black">
                      <ArrowDown size={14} />
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap gap-2">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', TYPE_META[q.type].badge)}>
                        {TYPE_META[q.type].label}
                      </span>
                      <span className="rounded-full bg-ui-subtle px-2 py-0.5 text-xs">{q.marks}m</span>
                      <span className="rounded-full bg-ui-subtle px-2 py-0.5 text-xs">{q.difficulty}</span>
                    </div>
                    <p className="truncate font-medium">{q.questionText}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      togglePublishMutation.mutate({
                        id: q.id,
                        status: q.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED',
                      })
                    }
                    className={cn(
                      'rounded-full px-2 py-1 text-xs font-medium',
                      q.status === 'PUBLISHED' ? 'bg-brand-green text-white' : 'bg-gray-200 text-gray-600'
                    )}
                  >
                    {q.status === 'PUBLISHED' ? 'Live' : 'Draft'}
                  </button>
                  <button type="button" onClick={() => openEdit(q)} className="text-sm text-brand-green">
                    Edit
                  </button>
                  <button type="button" onClick={() => deleteMutation.mutate(q.id)} className="text-ui-muted hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {editorOpen && (
              <div className="w-96 shrink-0 rounded-2xl border border-ui-border bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-ui-border p-4">
                  <h2 className="font-serif text-lg font-semibold">
                    {editor.id ? 'Edit Question' : 'New Question'}
                  </h2>
                  <button type="button" onClick={() => setEditorOpen(false)}>
                    <X size={20} />
                  </button>
                </div>
                <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-4">
                  {!editor.type ? (
                    <div className="grid grid-cols-1 gap-2">
                      {(Object.keys(TYPE_META) as QuestionType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setEditor((e) => ({ ...e, type }))}
                          className="rounded-xl border border-ui-border p-3 text-left hover:border-brand-green hover:bg-brand-shell"
                        >
                          <p className="font-medium">{TYPE_META[type].label}</p>
                          <p className="text-xs text-ui-muted">{TYPE_META[type].description}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className={cn('inline-block rounded-full px-2 py-0.5 text-xs', TYPE_META[editor.type].badge)}>
                        {TYPE_META[editor.type].label}
                      </p>

                      <div>
                        <label className="text-xs font-medium text-ui-muted">Marks</label>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {[1, 2, 3, 4, 5, 6].map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setEditor((e) => ({ ...e, marks: m }))}
                              className={cn(
                                'rounded-lg border px-2 py-1 text-xs',
                                editor.marks === m ? 'border-brand-green bg-brand-green/10' : 'border-ui-border'
                              )}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-ui-muted">Difficulty</label>
                        <div className="mt-1 flex gap-1">
                          {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setEditor((e) => ({ ...e, difficulty: d }))}
                              className={cn(
                                'flex-1 rounded-lg border py-1.5 text-xs font-medium',
                                editor.difficulty === d && d === 'EASY' && 'border-green-500 bg-green-50 text-green-700',
                                editor.difficulty === d && d === 'MEDIUM' && 'border-amber-500 bg-amber-50 text-amber-700',
                                editor.difficulty === d && d === 'HARD' && 'border-red-500 bg-red-50 text-red-700',
                                editor.difficulty !== d && 'border-ui-border'
                              )}
                            >
                              {d.charAt(0) + d.slice(1).toLowerCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-ui-muted">Question text</label>
                        <div className="mt-1">
                          <RichTextToolbar
                            rows={4}
                            value={editor.questionText}
                            placeholder="Enter your question..."
                            onChange={(text) => {
                              setEditor((ed) => ({
                                ...ed,
                                questionText: text,
                                fillBlanks:
                                  ed.type === 'FILL_BLANK'
                                    ? detectBlanks(text).map((_, i) => ed.fillBlanks[i] ?? '')
                                    : ed.fillBlanks,
                              }));
                            }}
                          />
                        </div>
                        {editor.type === 'FILL_BLANK' && (
                          <p className="mt-1 text-xs text-ui-muted">
                            Use _____ (5 underscores) or the [ ] button to mark blanks
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-medium text-ui-muted">Question image (optional)</label>
                        <input
                          type="file"
                          accept="image/*"
                          className="mt-1 w-full text-sm"
                          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowHint((h) => !h)}
                        className="text-xs text-brand-green"
                      >
                        {showHint ? 'Hide hint' : 'Add hint'}
                      </button>
                      {showHint && (
                        <input
                          className="w-full rounded-xl border border-ui-border px-3 py-2 text-sm"
                          placeholder="Students can reveal this hint during the question"
                          value={editor.hintText}
                          onChange={(e) => setEditor((ed) => ({ ...ed, hintText: e.target.value }))}
                        />
                      )}

                      {editor.type === 'DATA_ANALYSIS' && (
                        <div className="space-y-3 rounded-xl border border-ui-border p-3">
                          <p className="text-xs font-medium text-ui-muted">Data table</p>
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-ui-muted">Rows:</span>
                              <button
                                type="button"
                                className="rounded-lg border border-ui-border px-2 py-0.5"
                                onClick={() => {
                                  if (editor.tableRows <= 2) return;
                                  const rows = editor.tableRows - 1;
                                  setEditor((ed) => ({
                                    ...ed,
                                    tableRows: rows,
                                    tableGrid: createTableGrid(rows, ed.tableCols, ed.tableGrid),
                                  }));
                                }}
                              >
                                −
                              </button>
                              <span className="w-6 text-center font-medium">{editor.tableRows}</span>
                              <button
                                type="button"
                                className="rounded-lg border border-ui-border px-2 py-0.5"
                                onClick={() => {
                                  if (editor.tableRows >= 10) return;
                                  const rows = editor.tableRows + 1;
                                  setEditor((ed) => ({
                                    ...ed,
                                    tableRows: rows,
                                    tableGrid: createTableGrid(rows, ed.tableCols, ed.tableGrid),
                                  }));
                                }}
                              >
                                +
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-ui-muted">Cols:</span>
                              <button
                                type="button"
                                className="rounded-lg border border-ui-border px-2 py-0.5"
                                onClick={() => {
                                  if (editor.tableCols <= 2) return;
                                  const cols = editor.tableCols - 1;
                                  setEditor((ed) => ({
                                    ...ed,
                                    tableCols: cols,
                                    tableGrid: createTableGrid(ed.tableRows, cols, ed.tableGrid),
                                  }));
                                }}
                              >
                                −
                              </button>
                              <span className="w-6 text-center font-medium">{editor.tableCols}</span>
                              <button
                                type="button"
                                className="rounded-lg border border-ui-border px-2 py-0.5"
                                onClick={() => {
                                  if (editor.tableCols >= 10) return;
                                  const cols = editor.tableCols + 1;
                                  setEditor((ed) => ({
                                    ...ed,
                                    tableCols: cols,
                                    tableGrid: createTableGrid(ed.tableRows, cols, ed.tableGrid),
                                  }));
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={editor.tableHasHeader}
                              onChange={(e) =>
                                setEditor((ed) => ({ ...ed, tableHasHeader: e.target.checked }))
                              }
                            />
                            First row is header
                          </label>
                          <div className="overflow-x-auto">
                            <table className="border-collapse">
                              <tbody>
                                {editor.tableGrid.map((row, r) => (
                                  <tr key={r}>
                                    {row.map((cell, c) => (
                                      <td
                                        key={c}
                                        className={cn(
                                          'min-w-[100px] border border-ui-border',
                                          editor.tableHasHeader && r === 0
                                            ? 'bg-brand-green/10 font-semibold'
                                            : 'bg-white'
                                        )}
                                      >
                                        <input
                                          type="text"
                                          className="w-full border-0 bg-transparent p-1 text-sm outline-none"
                                          value={cell}
                                          onChange={(e) => {
                                            const grid = editor.tableGrid.map((rowCells, ri) =>
                                              ri === r
                                                ? rowCells.map((v, ci) =>
                                                    ci === c ? e.target.value : v
                                                  )
                                                : [...rowCells]
                                            );
                                            setEditor((ed) => ({ ...ed, tableGrid: grid }));
                                          }}
                                        />
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div>
                            <p className="mb-1 text-xs text-ui-muted">Student preview</p>
                            <div className="overflow-x-auto rounded-lg border border-ui-border">
                              <table className="w-full border-collapse text-sm">
                                <tbody>
                                  {editor.tableGrid.map((row, r) => (
                                    <tr key={r}>
                                      {row.map((cell, c) => (
                                        <td
                                          key={c}
                                          className={cn(
                                            'min-w-[100px] border border-ui-border px-2 py-1',
                                            editor.tableHasHeader && r === 0
                                              ? 'bg-brand-green/10 font-semibold'
                                              : 'bg-white'
                                          )}
                                        >
                                          {cell || '—'}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="text-xs text-red-600 hover:underline"
                            onClick={() =>
                              setEditor((ed) => ({
                                ...ed,
                                tableGrid: createTableGrid(ed.tableRows, ed.tableCols),
                              }))
                            }
                          >
                            Clear table
                          </button>
                        </div>
                      )}

                      {(editor.type === 'MCQ' ||
                        editor.type === 'MULTIPLE_SELECT' ||
                        editor.type === 'LABEL_DIAGRAM' ||
                        editor.type === 'DATA_ANALYSIS' ||
                        editor.type === 'MATCHING') && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-ui-muted">Options</p>
                          {editor.options.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              {editor.type === 'MULTIPLE_SELECT' ? (
                                <input
                                  type="checkbox"
                                  checked={editor.correctIndices.includes(i)}
                                  onChange={() =>
                                    setEditor((ed) => ({
                                      ...ed,
                                      correctIndices: ed.correctIndices.includes(i)
                                        ? ed.correctIndices.filter((x) => x !== i)
                                        : [...ed.correctIndices, i],
                                    }))
                                  }
                                />
                              ) : (
                                <input
                                  type="radio"
                                  name="correct"
                                  checked={editor.correctIndex === i}
                                  onChange={() => setEditor((ed) => ({ ...ed, correctIndex: i }))}
                                />
                              )}
                              <input
                                className="flex-1 rounded-lg border border-ui-border px-2 py-1.5 text-sm"
                                value={opt}
                                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                onChange={(e) => {
                                  const options = [...editor.options];
                                  options[i] = e.target.value;
                                  setEditor((ed) => ({ ...ed, options }));
                                }}
                              />
                            </div>
                          ))}
                          {editor.options.length < 6 && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditor((ed) => ({ ...ed, options: [...ed.options, ''] }))
                              }
                              className="text-xs text-brand-green"
                            >
                              + Add option
                            </button>
                          )}
                          <RichTextToolbar
                            rows={2}
                            placeholder="Why is this the correct answer?"
                            value={editor.explanation}
                            onChange={(explanation) => setEditor((ed) => ({ ...ed, explanation }))}
                          />
                        </div>
                      )}

                      {editor.type === 'TRUE_FALSE' && (
                        <div className="flex gap-2">
                          {[true, false].map((val) => (
                            <button
                              key={String(val)}
                              type="button"
                              onClick={() => setEditor((ed) => ({ ...ed, trueFalseCorrect: val }))}
                              className={cn(
                                'flex-1 rounded-xl border-2 py-3 font-semibold',
                                editor.trueFalseCorrect === val
                                  ? 'border-brand-green bg-brand-green/10'
                                  : 'border-ui-border'
                              )}
                            >
                              {val ? 'TRUE ✓' : 'FALSE ✗'}
                            </button>
                          ))}
                        </div>
                      )}

                      {editor.type === 'FILL_BLANK' &&
                        editor.fillBlanks.map((blank, i) => (
                          <div key={i}>
                            <label className="text-xs text-ui-muted">Blank {i + 1} answer</label>
                            <input
                              className="mt-1 w-full rounded-lg border border-ui-border px-2 py-1.5 text-sm"
                              value={blank}
                              onChange={(e) => {
                                const fillBlanks = [...editor.fillBlanks];
                                fillBlanks[i] = e.target.value;
                                setEditor((ed) => ({ ...ed, fillBlanks }));
                              }}
                            />
                          </div>
                        ))}

                      {(editor.type === 'SHORT_ANSWER' ||
                        editor.type === 'LONG_ANSWER' ||
                        editor.type === 'CALCULATION') && (
                        <>
                          <RichTextToolbar
                            rows={editor.type === 'LONG_ANSWER' ? 6 : 3}
                            placeholder="Model answer"
                            value={editor.modelAnswer}
                            onChange={(modelAnswer) => setEditor((ed) => ({ ...ed, modelAnswer }))}
                          />
                          <RichTextToolbar
                            rows={2}
                            placeholder="Mark scheme — how to award marks"
                            value={editor.explanation}
                            onChange={(explanation) => setEditor((ed) => ({ ...ed, explanation }))}
                          />
                        </>
                      )}

                      {editor.type === 'CALCULATION' && (
                        <div className="flex gap-2">
                          <input
                            className="flex-1 rounded-lg border border-ui-border px-2 py-1.5 text-sm"
                            placeholder="Final answer"
                            value={editor.finalAnswer}
                            onChange={(e) => setEditor((ed) => ({ ...ed, finalAnswer: e.target.value }))}
                          />
                          <input
                            className="w-20 rounded-lg border border-ui-border px-2 py-1.5 text-sm"
                            placeholder="Units"
                            value={editor.calcUnits}
                            onChange={(e) => setEditor((ed) => ({ ...ed, calcUnits: e.target.value }))}
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowTimer((t) => !t)}
                        className="text-xs text-ui-muted"
                      >
                        {showTimer ? 'Hide timer' : 'Add timer to this question'}
                      </button>
                      {showTimer && (
                        <div className="flex flex-wrap gap-1">
                          {[30, 60, 90, 120, 300].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setEditor((ed) => ({ ...ed, timerSeconds: s }))}
                              className={cn(
                                'rounded-lg border px-2 py-1 text-xs',
                                editor.timerSeconds === s ? 'border-brand-green' : 'border-ui-border'
                              )}
                            >
                              {s < 60 ? `${s}s` : `${s / 60}min`}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          disabled={saveMutation.isPending}
                          onClick={() => saveMutation.mutate(false)}
                          className="flex-1 rounded-xl border border-ui-border py-2 text-sm font-medium"
                        >
                          Save as Draft
                        </button>
                        <button
                          type="button"
                          disabled={saveMutation.isPending || !editor.questionText.trim()}
                          onClick={() => saveMutation.mutate(true)}
                          className="flex-1 rounded-xl bg-brand-green py-2 text-sm font-semibold text-white disabled:opacity-70"
                        >
                          {saveMutation.isPending ? 'Saving...' : 'Publish'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : tab === 'flashcards' ? (
          <div className="max-w-2xl rounded-2xl border border-ui-border bg-white p-6">
            <p className="mb-4 text-sm text-ui-muted">
              Front = term/concept, Back = definition/explanation
            </p>
            <div className="space-y-3">
              {flashcards.map((card, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-ui-border px-3 py-2 text-sm"
                    placeholder="Front"
                    value={card.front}
                    onChange={(e) => {
                      const next = [...flashcards];
                      next[i] = { ...next[i], front: e.target.value };
                      setFlashcards(next);
                    }}
                  />
                  <input
                    className="flex-1 rounded-lg border border-ui-border px-3 py-2 text-sm"
                    placeholder="Back"
                    value={card.back}
                    onChange={(e) => {
                      const next = [...flashcards];
                      next[i] = { ...next[i], back: e.target.value };
                      setFlashcards(next);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setFlashcards(flashcards.filter((_, j) => j !== i))}
                    className="text-ui-muted hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setFlashcards([...flashcards, { front: '', back: '' }])}
                className="rounded-xl border border-ui-border px-4 py-2 text-sm"
              >
                + Add card
              </button>
              <button
                type="button"
                disabled={saveFlashcardsMutation.isPending}
                onClick={() => saveFlashcardsMutation.mutate()}
                className="rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
              >
                {saveFlashcardsMutation.isPending ? 'Saving...' : 'Save all flashcards'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-6">
            <div className="min-w-0 flex-1">
              <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-ui-muted">
                <span>{pastPaperQuestions.length} past paper questions</span>
                <button
                  type="button"
                  onClick={() => {
                    setPpqEditor(emptyPpqEditor());
                    setPpqEditorOpen(true);
                  }}
                  className="ml-auto flex items-center gap-2 rounded-xl bg-brand-lavender px-4 py-2 text-sm font-semibold text-white"
                >
                  <Plus size={16} /> Add Past Paper Question
                </button>
              </div>

              {ppqLoading && <Loader2 className="animate-spin text-brand-green" />}

              {!ppqLoading && pastPaperQuestions.length === 0 && (
                <div className="rounded-2xl border border-dashed border-ui-border bg-white py-16 text-center">
                  <FileText className="mx-auto mb-3 size-10 text-ui-muted" />
                  <p className="font-medium text-brand-black">No past paper questions yet</p>
                  <p className="mt-1 text-sm text-ui-muted">
                    Add questions from past papers to help students practise exam-style questions
                  </p>
                </div>
              )}

              {pastPaperQuestions.map((q) => (
                <div key={q.id} className="mb-3 rounded-xl border border-ui-border bg-white p-4">
                  <div className="mb-1 flex flex-wrap gap-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', TYPE_META[q.type].badge)}>
                      {TYPE_META[q.type].label}
                    </span>
                    <span className="rounded-full bg-ui-subtle px-2 py-0.5 text-xs">{q.marks}m</span>
                    <span className="rounded-full bg-ui-subtle px-2 py-0.5 text-xs">{q.difficulty}</span>
                    {(q.year || q.pastPaper?.year) && (
                      <span className="rounded-full bg-brand-lavender/10 px-2 py-0.5 text-xs text-brand-lavender">
                        {q.pastPaper?.year ?? q.year}
                        {(q.pastPaper?.month ?? q.session) ? ` · ${q.pastPaper?.month ?? q.session}` : ''}
                        {(q.pastPaper?.paperNumber ?? q.paperNumber)
                          ? ` · Paper ${q.pastPaper?.paperNumber ?? q.paperNumber}`
                          : ''}
                      </span>
                    )}
                    {q.questionNumber && (
                      <span className="rounded-full bg-ui-subtle px-2 py-0.5 text-xs">Q{q.questionNumber}</span>
                    )}
                  </div>
                  <p className="truncate font-medium text-brand-black">{q.questionText}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const mcq = (q.mcqOptions ?? {}) as McqOptionsData;
                        setPpqEditor({
                          id: q.id,
                          type: q.type,
                          marks: q.marks,
                          difficulty: q.difficulty,
                          questionText: q.questionText,
                          modelAnswer: q.modelAnswer ?? '',
                          explanation: q.explanation ?? '',
                          hintText: q.hintText ?? '',
                          options: mcq.options ?? ['', '', '', ''],
                          correctIndex: typeof mcq.correct === 'number' ? mcq.correct : 0,
                          correctIndices: Array.isArray(mcq.correct) ? mcq.correct : [],
                          trueFalseCorrect: mcq.correct === true,
                          fillBlanks: q.fillBlanks?.blanks ?? [],
                          finalAnswer: mcq.finalAnswer != null ? String(mcq.finalAnswer) : '',
                          calcUnits: mcq.units ?? '',
                          status: q.status,
                          pastPaperId: q.pastPaper?.id ?? '',
                          year: q.year ? String(q.year) : '',
                          session: q.session ?? q.pastPaper?.month ?? '',
                          paperNumber: q.paperNumber ? String(q.paperNumber) : '',
                          questionNumber: q.questionNumber ? String(q.questionNumber) : '',
                        });
                        setPpqEditorOpen(true);
                      }}
                      className="text-sm text-brand-green"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePpqMutation.mutate(q.id)}
                      className="text-ui-muted hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {ppqEditorOpen && (
              <div className="w-96 shrink-0 rounded-2xl border border-ui-border bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-ui-border p-4">
                  <h2 className="font-serif text-lg font-semibold">
                    {ppqEditor.id ? 'Edit Past Paper Question' : 'New Past Paper Question'}
                  </h2>
                  <button type="button" onClick={() => setPpqEditorOpen(false)}>
                    <X size={20} />
                  </button>
                </div>
                <div className="max-h-[calc(100vh-12rem)] space-y-4 overflow-y-auto p-4">
                  <div className="rounded-xl border border-ui-border p-3">
                    <p className="mb-2 text-xs font-semibold text-ui-muted">Paper source (optional)</p>
                    {availablePastPapers.length > 0 && (
                      <div className="mb-2">
                        <label className="text-xs text-ui-muted">Link to uploaded paper</label>
                        <select
                          value={ppqEditor.pastPaperId}
                          onChange={(e) => setPpqEditor((ed) => ({ ...ed, pastPaperId: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-ui-border px-2 py-1.5 text-sm"
                        >
                          <option value="">None</option>
                          {availablePastPapers.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.year}
                              {p.month ? ` · ${p.month}` : ''}
                              {p.paperNumber ? ` · Paper ${p.paperNumber}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-ui-muted">Year</label>
                        <input
                          type="number"
                          placeholder="e.g. 2023"
                          value={ppqEditor.year}
                          onChange={(e) => setPpqEditor((ed) => ({ ...ed, year: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-ui-border px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-ui-muted">Session</label>
                        <select
                          value={ppqEditor.session}
                          onChange={(e) => setPpqEditor((ed) => ({ ...ed, session: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-ui-border px-2 py-1.5 text-sm"
                        >
                          <option value="">Select session</option>
                          <option value="May/June">May/June</option>
                          <option value="Oct/Nov">Oct/Nov</option>
                          <option value="Jan/Feb">Jan/Feb</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-ui-muted">Paper No.</label>
                          <input
                            type="number"
                            placeholder="1"
                            value={ppqEditor.paperNumber}
                            onChange={(e) => setPpqEditor((ed) => ({ ...ed, paperNumber: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-ui-border px-2 py-1.5 text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-ui-muted">Question No.</label>
                          <input
                            type="number"
                            placeholder="1"
                            value={ppqEditor.questionNumber}
                            onChange={(e) => setPpqEditor((ed) => ({ ...ed, questionNumber: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-ui-border px-2 py-1.5 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {!ppqEditor.type ? (
                    <div className="grid grid-cols-1 gap-2">
                      {(Object.keys(TYPE_META) as QuestionType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setPpqEditor((e) => ({ ...e, type }))}
                          className="rounded-xl border border-ui-border p-3 text-left hover:border-brand-green hover:bg-brand-shell"
                        >
                          <p className="font-medium">{TYPE_META[type].label}</p>
                          <p className="text-xs text-ui-muted">{TYPE_META[type].description}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className={cn('inline-block rounded-full px-2 py-0.5 text-xs', TYPE_META[ppqEditor.type].badge)}>
                        {TYPE_META[ppqEditor.type].label}
                      </p>

                      <div>
                        <label className="text-xs font-medium text-ui-muted">Marks</label>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {[1, 2, 3, 4, 5, 6].map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setPpqEditor((e) => ({ ...e, marks: m }))}
                              className={cn(
                                'rounded-lg border px-2 py-1 text-xs',
                                ppqEditor.marks === m ? 'border-brand-green bg-brand-green/10' : 'border-ui-border'
                              )}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-ui-muted">Difficulty</label>
                        <div className="mt-1 flex gap-1">
                          {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setPpqEditor((e) => ({ ...e, difficulty: d }))}
                              className={cn(
                                'flex-1 rounded-lg border py-1.5 text-xs font-medium',
                                ppqEditor.difficulty === d && d === 'EASY' && 'border-green-500 bg-green-50 text-green-700',
                                ppqEditor.difficulty === d && d === 'MEDIUM' && 'border-amber-500 bg-amber-50 text-amber-700',
                                ppqEditor.difficulty === d && d === 'HARD' && 'border-red-500 bg-red-50 text-red-700',
                                ppqEditor.difficulty !== d && 'border-ui-border'
                              )}
                            >
                              {d.charAt(0) + d.slice(1).toLowerCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-ui-muted">Question text</label>
                        <RichTextToolbar
                          rows={4}
                          value={ppqEditor.questionText}
                          placeholder="Paste or type the question..."
                          onChange={(text) => setPpqEditor((ed) => ({ ...ed, questionText: text }))}
                        />
                      </div>

                      {(ppqEditor.type === 'MCQ' ||
                        ppqEditor.type === 'MULTIPLE_SELECT' ||
                        ppqEditor.type === 'LABEL_DIAGRAM' ||
                        ppqEditor.type === 'MATCHING') && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-ui-muted">Options</p>
                          {ppqEditor.options.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              {ppqEditor.type === 'MULTIPLE_SELECT' ? (
                                <input
                                  type="checkbox"
                                  checked={ppqEditor.correctIndices.includes(i)}
                                  onChange={() =>
                                    setPpqEditor((ed) => ({
                                      ...ed,
                                      correctIndices: ed.correctIndices.includes(i)
                                        ? ed.correctIndices.filter((x) => x !== i)
                                        : [...ed.correctIndices, i],
                                    }))
                                  }
                                />
                              ) : (
                                <input
                                  type="radio"
                                  name="ppq-correct"
                                  checked={ppqEditor.correctIndex === i}
                                  onChange={() => setPpqEditor((ed) => ({ ...ed, correctIndex: i }))}
                                />
                              )}
                              <input
                                className="flex-1 rounded-lg border border-ui-border px-2 py-1.5 text-sm"
                                value={opt}
                                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                onChange={(e) => {
                                  const options = [...ppqEditor.options];
                                  options[i] = e.target.value;
                                  setPpqEditor((ed) => ({ ...ed, options }));
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {ppqEditor.type === 'TRUE_FALSE' && (
                        <div className="flex gap-2">
                          {[true, false].map((val) => (
                            <button
                              key={String(val)}
                              type="button"
                              onClick={() => setPpqEditor((ed) => ({ ...ed, trueFalseCorrect: val }))}
                              className={cn(
                                'flex-1 rounded-xl border-2 py-3 font-semibold',
                                ppqEditor.trueFalseCorrect === val
                                  ? 'border-brand-green bg-brand-green/10'
                                  : 'border-ui-border'
                              )}
                            >
                              {val ? 'TRUE ✓' : 'FALSE ✗'}
                            </button>
                          ))}
                        </div>
                      )}

                      {(ppqEditor.type === 'SHORT_ANSWER' ||
                        ppqEditor.type === 'LONG_ANSWER' ||
                        ppqEditor.type === 'CALCULATION') && (
                        <RichTextToolbar
                          rows={ppqEditor.type === 'LONG_ANSWER' ? 6 : 3}
                          placeholder="Model answer / mark scheme"
                          value={ppqEditor.modelAnswer}
                          onChange={(modelAnswer) => setPpqEditor((ed) => ({ ...ed, modelAnswer }))}
                        />
                      )}

                      <RichTextToolbar
                        rows={2}
                        placeholder="Explanation / mark scheme notes"
                        value={ppqEditor.explanation}
                        onChange={(explanation) => setPpqEditor((ed) => ({ ...ed, explanation }))}
                      />

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          disabled={savePpqMutation.isPending}
                          onClick={() => savePpqMutation.mutate(false)}
                          className="flex-1 rounded-xl border border-ui-border py-2 text-sm font-medium"
                        >
                          Save as Draft
                        </button>
                        <button
                          type="button"
                          disabled={savePpqMutation.isPending || !ppqEditor.questionText.trim()}
                          onClick={() => savePpqMutation.mutate(true)}
                          className="flex-1 rounded-xl bg-brand-lavender py-2 text-sm font-semibold text-white disabled:opacity-70"
                        >
                          {savePpqMutation.isPending ? 'Saving...' : 'Publish'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}
