import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Circle,
  Layers,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { TeacherLayout } from '@/components/layout/RoleLayouts';
import { WysiwygEditor } from '@/components/teacher/WysiwygEditor';
import { RichTextToolbar } from '@/components/teacher/RichTextToolbar';
import { useToast } from '@/context/ToastContext';
import { apiFetch, API_URL, getAccessToken } from '@/services/api';
import { useSSE } from '@/hooks/useSSE';
import { cn, slugify } from '@/utils/helpers';
import type { Difficulty, McqOptionsData, Question, QuestionType, TableDataJson } from '@/types/question';
import type { Lesson, Subject, Unit } from '@/types';

type MainTab = 'info' | 'notes' | 'visual' | 'practice' | 'pastpaper' | 'publish';
type PracticeTab = 'questions' | 'flashcards';
type QuestionStatus = 'DRAFT' | 'PUBLISHED';

type SubjectTile = Subject;

interface TeacherMeta {
  allowedSubjectIds?: string[];
}

interface LessonFormState {
  title: string;
  slug: string;
  description: string;
  subjectId: string;
  estimatedMinutes: number;
}

interface LessonQuestion extends Question {
  status: QuestionStatus;
}

interface FlashcardRow {
  id?: string;
  front: string;
  back: string;
}

interface PastPaperQuestionRow {
  id: string;
  type: QuestionType;
  status: QuestionStatus;
  marks: number;
  difficulty: Difficulty;
  questionText: string;
  modelAnswer?: string | null;
  explanation?: string | null;
  hintText?: string | null;
  mcqOptions?: McqOptionsData | null;
  year?: number | null;
  session?: string | null;
  paperNumber?: number | null;
  questionNumber?: number | null;
}

const TAB_CONFIG: { id: MainTab; label: string }[] = [
  { id: 'info', label: 'Lesson Info' },
  { id: 'notes', label: 'Notes' },
  { id: 'visual', label: 'Visual' },
  { id: 'practice', label: 'Practice Sessions' },
  { id: 'pastpaper', label: 'Past Paper Qs' },
  { id: 'publish', label: 'Publish' },
];

const TYPE_META: Record<QuestionType, { label: string; description: string; badge: string }> = {
  MCQ: { label: 'MCQ', description: 'One correct answer', badge: 'bg-brand-green/10 text-brand-green' },
  MULTIPLE_SELECT: { label: 'Multiple Select', description: 'More than one correct answer', badge: 'bg-brand-lavender/10 text-brand-lavender' },
  SHORT_ANSWER: { label: 'Short Answer', description: '1-3 sentences', badge: 'bg-brand-mustard/10 text-amber-700' },
  LONG_ANSWER: { label: 'Long Answer', description: 'Extended answer', badge: 'bg-brand-tangerine/10 text-orange-700' },
  TRUE_FALSE: { label: 'True/False', description: 'Binary answer', badge: 'bg-brand-sky/10 text-cyan-700' },
  FILL_BLANK: { label: 'Fill in the Blank', description: 'Missing words', badge: 'bg-pink-100 text-pink-700' },
  CALCULATION: { label: 'Calculation', description: 'Numeric final answer', badge: 'bg-purple-100 text-purple-700' },
  DATA_ANALYSIS: { label: 'Data Analysis', description: 'Use table/graph data', badge: 'bg-indigo-100 text-indigo-700' },
  LABEL_DIAGRAM: { label: 'Label Diagram', description: 'Label parts', badge: 'bg-brand-green/10 text-brand-green' },
  MATCHING: { label: 'Matching', description: 'Match pairs', badge: 'bg-brand-lavender/10 text-brand-lavender' },
};

interface EditorState {
  id?: string;
  type: QuestionType | null;
  marks: number;
  difficulty: Difficulty;
  questionText: string;
  explanation: string;
  modelAnswer: string;
  hintText: string;
  status: QuestionStatus;
  options: string[];
  correctIndex: number;
  correctIndices: number[];
  trueFalseCorrect: boolean;
  fillBlanks: string[];
  finalAnswer: string;
  calcUnits: string;
  tableRows: number;
  tableCols: number;
  tableHasHeader: boolean;
  tableGrid: string[][];
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
  status: QuestionStatus;
  year: string;
  session: string;
  paperNumber: string;
  questionNumber: string;
}

const PROGRESS_STEPS = ['Reading lesson notes', 'Identifying key concepts', 'Building interactive components', 'Saving visual lesson', 'Complete'];

function createTableGrid(rows: number, cols: number, existing?: string[][]): string[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => existing?.[r]?.[c] ?? '')
  );
}

function detectBlanks(text: string): string[] {
  const count = (text.match(/_{3,}/g) ?? []).length;
  return Array(count).fill('');
}

function editorFromQuestion(q: LessonQuestion): EditorState {
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
    status: q.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
    options: options.length ? options : ['', '', '', ''],
    correctIndex: typeof mcq.correct === 'number' ? mcq.correct : 0,
    correctIndices: Array.isArray(mcq.correct) ? mcq.correct : [],
    trueFalseCorrect: mcq.correct === true,
    fillBlanks: q.fillBlanks?.blanks ?? detectBlanks(q.questionText),
    finalAnswer: mcq.finalAnswer != null ? String(mcq.finalAnswer) : '',
    calcUnits: mcq.units ?? '',
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
    status: editor.status,
  };
  if (editor.type === 'DATA_ANALYSIS') {
    return {
      ...base,
      tableData: { rows: editor.tableRows, cols: editor.tableCols, hasHeader: editor.tableHasHeader, data: editor.tableGrid },
      mcqOptions: { options: editor.options.filter(Boolean), correct: editor.correctIndex, explanation: editor.explanation },
    };
  }
  if (editor.type === 'MCQ' || editor.type === 'LABEL_DIAGRAM' || editor.type === 'MATCHING') {
    return { ...base, mcqOptions: { options: editor.options.filter(Boolean), correct: editor.correctIndex, explanation: editor.explanation } };
  }
  if (editor.type === 'MULTIPLE_SELECT') {
    return { ...base, mcqOptions: { options: editor.options.filter(Boolean), correct: editor.correctIndices, multiSelect: true, explanation: editor.explanation } };
  }
  if (editor.type === 'TRUE_FALSE') return { ...base, mcqOptions: { correct: editor.trueFalseCorrect, explanation: editor.explanation } };
  if (editor.type === 'FILL_BLANK') return { ...base, fillBlanks: { blanks: editor.fillBlanks, caseSensitive: false } };
  if (editor.type === 'CALCULATION') {
    return { ...base, mcqOptions: { finalAnswer: parseFloat(editor.finalAnswer) || 0, units: editor.calcUnits, explanation: editor.explanation } };
  }
  return base;
}

const emptyEditor = (): EditorState => ({
  type: null,
  marks: 1,
  difficulty: 'MEDIUM',
  questionText: '',
  explanation: '',
  modelAnswer: '',
  hintText: '',
  status: 'DRAFT',
  options: ['', '', '', ''],
  correctIndex: 0,
  correctIndices: [],
  trueFalseCorrect: true,
  fillBlanks: [],
  finalAnswer: '',
  calcUnits: '',
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
  year: '',
  session: '',
  paperNumber: '',
  questionNumber: '',
});

function isStepComplete(stepIndex: number, messages: { status: string }[]): boolean {
  const statuses = new Set(messages.map((m) => m.status));
  if (stepIndex === 0) return statuses.has('reading') || statuses.has('generating') || statuses.has('saving') || statuses.has('complete');
  if (stepIndex === 1) return statuses.has('generating') || statuses.has('saving') || statuses.has('complete');
  if (stepIndex === 2) return statuses.has('saving') || statuses.has('complete') || messages.filter((m) => m.status === 'generating').length >= 2;
  if (stepIndex === 3) return statuses.has('saving') || statuses.has('complete');
  if (stepIndex === 4) return statuses.has('complete');
  return false;
}

function getApiBaseUrl(): string {
  if (!import.meta.env.VITE_API_URL) return '';
  return API_URL.replace(/\/$/, '');
}

function VisualPreview({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(700);
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) setHeight(Math.max(700, doc.documentElement.scrollHeight + 40));
      } catch {
        // ignore
      }
    };
    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [html]);
  return (
    <iframe
      ref={iframeRef}
      title="Visual lesson preview"
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin allow-modals"
      className="w-full rounded-xl border border-ui-border"
      style={{ height: `${height}px`, minHeight: '700px' }}
    />
  );
}

export default function LessonEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const isCreating = !id;
  const lessonId = id ?? null;

  const [activeTab, setActiveTab] = useState<MainTab>(isCreating ? 'info' : 'notes');
  const [visitedTabs, setVisitedTabs] = useState<Set<MainTab>>(new Set([isCreating ? 'info' : 'notes']));
  const [practiceTab, setPracticeTab] = useState<PracticeTab>('questions');
  const [form, setForm] = useState<LessonFormState>({ title: '', slug: '', description: '', subjectId: '', estimatedMinutes: 30 });
  const [notesHtml, setNotesHtml] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(emptyEditor());
  const [flashcards, setFlashcards] = useState<FlashcardRow[]>([{ front: '', back: '' }]);
  const [ppqEditorOpen, setPpqEditorOpen] = useState(false);
  const [ppqEditor, setPpqEditor] = useState<PpqEditorState>(emptyPpqEditor());
  const [isRejecting, setIsRejecting] = useState(false);
  const [publishStatus, setPublishStatus] = useState('DRAFT');
  const [newUnitName, setNewUnitName] = useState('');
  const [creatingUnit, setCreatingUnit] = useState(false);

  const { messages, isStreaming, error: streamError, startStream } = useSSE();

  const { data: lesson, isLoading: lessonLoading, refetch: refetchLesson } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      const res = await apiFetch<Lesson>(`/lessons/${lessonId}`);
      if (!res.ok) throw new Error(res.error ?? 'Failed to load lesson');
      return res.data!;
    },
    enabled: !!lessonId,
  });

  const { data: teacherMeta } = useQuery({
    queryKey: ['teacher-meta'],
    queryFn: async () => {
      const res = await apiFetch<TeacherMeta>('/auth/me/meta');
      if (!res.ok) return { allowedSubjectIds: [] };
      return res.data ?? { allowedSubjectIds: [] };
    },
  });

  const { data: allSubjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await apiFetch<SubjectTile[]>('/subjects');
      return res.ok ? (res.data ?? []) : [];
    },
  });

  const { data: unitsForSubject = [] } = useQuery({
    queryKey: ['units-by-subject', form.subjectId],
    queryFn: async () => {
      const res = await apiFetch<Unit[]>(`/units?subjectId=${form.subjectId}`);
      return res.ok ? (res.data ?? []) : [];
    },
    enabled: !!form.subjectId,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions', lessonId],
    queryFn: async () => {
      const res = await apiFetch<LessonQuestion[]>(`/questions?lessonId=${lessonId}`);
      return res.ok ? (res.data ?? []) : [];
    },
    enabled: !!lessonId,
  });

  const { data: existingFlashcards = [] } = useQuery({
    queryKey: ['flashcards-manage', lessonId],
    queryFn: async () => {
      const res = await apiFetch<FlashcardRow[]>(`/flashcards?lessonId=${lessonId}`);
      return res.ok ? (res.data ?? []) : [];
    },
    enabled: !!lessonId && activeTab === 'practice' && practiceTab === 'flashcards',
  });

  const { data: pastPaperQuestions = [], refetch: refetchPPQ } = useQuery({
    queryKey: ['past-paper-questions', lessonId],
    queryFn: async () => {
      const res = await apiFetch<PastPaperQuestionRow[]>(`/past-paper-questions?lessonId=${lessonId}`);
      return res.ok ? (res.data ?? []) : [];
    },
    enabled: !!lessonId && activeTab === 'pastpaper',
  });

  const subjects = useMemo(() => {
    const allowed = new Set(teacherMeta?.allowedSubjectIds ?? []);
    if (!allowed.size) return allSubjects;
    return allSubjects.filter((s) => allowed.has(s.id));
  }, [allSubjects, teacherMeta?.allowedSubjectIds]);

  const formInitialized = useRef(false);

  useEffect(() => {
    if (!lesson) return;
    if (formInitialized.current) return;
    formInitialized.current = true;
    setForm({
      title: lesson.title ?? '',
      slug: lesson.slug ?? '',
      description: lesson.description ?? '',
      subjectId: lesson.unitLinks?.[0]?.unit?.subjectId ?? '',
      estimatedMinutes: lesson.estimatedMinutes ?? 30,
    });
    setNotesHtml(lesson.notesHtml ?? '');
    setPublishStatus(lesson.status ?? 'DRAFT');
  }, [lesson]);

  useEffect(() => {
    if (existingFlashcards.length > 0) setFlashcards(existingFlashcards);
  }, [existingFlashcards]);

  const unlockTabs = useCallback(() => {
    setVisitedTabs((prev) => new Set([...prev, 'notes', 'visual', 'practice', 'pastpaper', 'publish']));
  }, []);

  const handleCreateUnit = async () => {
    if (!newUnitName.trim() || !form.subjectId) return;
    setCreatingUnit(true);
    const res = await apiFetch<{ id: string; name: string }>('/units', {
      method: 'POST',
      body: JSON.stringify({
        subjectId: form.subjectId,
        name: newUnitName.trim(),
        slug: newUnitName.trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
        order: 1,
        isActive: true,
      }),
    });
    setCreatingUnit(false);
    if (res.ok) {
      setNewUnitName('');
      await queryClient.invalidateQueries({
        queryKey: ['units-by-subject', form.subjectId],
      });
    }
  };

  const createLessonMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || undefined,
        subjectId: form.subjectId,
        estimatedMinutes: Number(form.estimatedMinutes) || 30,
        unitIds: unitsForSubject.map((u) => u.id),
      };
      const res = await apiFetch<Lesson>('/lessons', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(res.error ?? 'Failed to create lesson');
      return res.data!;
    },
    onSuccess: (newLesson) => {
      showToast('Lesson created');
      unlockTabs();
      setActiveTab('notes');
      navigate(`/cms/lessons/${newLesson.id}/edit`);
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const updateLessonMutation = useMutation({
    mutationFn: async () => {
      if (!lessonId) throw new Error('Missing lesson id');
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || undefined,
        subjectId: form.subjectId || undefined,
        estimatedMinutes: Number(form.estimatedMinutes) || 30,
      };
      const res = await apiFetch<Lesson>(`/lessons/${lessonId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(res.error ?? 'Failed to save lesson');
      return res.data!;
    },
    onSuccess: () => {
      showToast('Lesson updated');
      void refetchLesson();
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const saveNotesMutation = useMutation({
    mutationFn: async () => {
      if (!lessonId) throw new Error('Missing lesson id');
      const res = await apiFetch(`/lessons/${lessonId}`, { method: 'PATCH', body: JSON.stringify({ notesHtml }) });
      if (!res.ok) throw new Error(res.error ?? 'Failed to save notes');
    },
    onSuccess: () => {
      showToast('Notes saved');
      void refetchLesson();
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const saveQuestionMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      if (!lessonId) throw new Error('Missing lesson id');
      const payload = buildPayload({ ...editor, status: publish ? 'PUBLISHED' : 'DRAFT' }, lessonId);
      if (editor.id) {
        const res = await apiFetch(`/questions/${editor.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(res.error ?? 'Failed to update question');
      } else {
        const res = await apiFetch('/questions', { method: 'POST', body: JSON.stringify({ ...payload, order: questions.length }) });
        if (!res.ok) throw new Error(res.error ?? 'Failed to create question');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', lessonId] });
      showToast('Question saved');
      setEditorOpen(false);
      setEditor(emptyEditor());
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (qid: string) => {
      const res = await apiFetch(`/questions/${qid}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(res.error ?? 'Failed to delete question');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions', lessonId] }),
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await apiFetch('/questions/reorder', { method: 'POST', body: JSON.stringify({ orderedIds }) });
      if (!res.ok) throw new Error(res.error ?? 'Failed to reorder');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions', lessonId] }),
  });

  const saveFlashcardsMutation = useMutation({
    mutationFn: async () => {
      if (!lessonId) throw new Error('Lesson ID missing');
      const cards = flashcards.filter((c) => c.front.trim() && c.back.trim()).map((c) => ({ front: c.front.trim(), back: c.back.trim() }));
      const token = getAccessToken();
      if (!token) throw new Error('Not authenticated');
      const url = import.meta.env.VITE_API_URL ? `${API_URL.replace(/\/$/, '')}/api/flashcards` : '/api/flashcards';
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ lessonId, cards }),
      });
      if (!response.ok) throw new Error('Failed to save flashcards');
    },
    onSuccess: () => {
      showToast('Flashcards saved');
      queryClient.invalidateQueries({ queryKey: ['flashcards-manage', lessonId] });
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const savePpqMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      if (!lessonId || !ppqEditor.type) throw new Error('Missing lesson or type');
      const payload = {
        lessonId,
        type: ppqEditor.type,
        marks: ppqEditor.marks,
        difficulty: ppqEditor.difficulty,
        questionText: ppqEditor.questionText,
        modelAnswer: ppqEditor.modelAnswer || undefined,
        explanation: ppqEditor.explanation || undefined,
        hintText: ppqEditor.hintText || undefined,
        status: publish ? 'PUBLISHED' : 'DRAFT',
        year: ppqEditor.year ? parseInt(ppqEditor.year, 10) : undefined,
        session: ppqEditor.session || undefined,
        paperNumber: ppqEditor.paperNumber ? parseInt(ppqEditor.paperNumber, 10) : undefined,
        questionNumber: ppqEditor.questionNumber ? parseInt(ppqEditor.questionNumber, 10) : undefined,
      };
      const endpoint = ppqEditor.id ? `/past-paper-questions/${ppqEditor.id}` : '/past-paper-questions';
      const method = ppqEditor.id ? 'PUT' : 'POST';
      const res = await apiFetch(endpoint, { method, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(res.error ?? 'Failed to save past paper question');
    },
    onSuccess: () => {
      showToast('Past paper question saved');
      setPpqEditorOpen(false);
      setPpqEditor(emptyPpqEditor());
      void refetchPPQ();
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const deletePpqMutation = useMutation({
    mutationFn: async (qid: string) => {
      const res = await apiFetch(`/past-paper-questions/${qid}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(res.error ?? 'Failed to delete');
    },
    onSuccess: () => void refetchPPQ(),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!lessonId) throw new Error('Missing lesson id');
      const status = publishStatus === 'PENDING_REVIEW' ? 'PENDING_REVIEW' : 'DRAFT';
      const res = await apiFetch(`/lessons/${lessonId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error(res.error ?? 'Failed to update publish status');
    },
    onSuccess: () => {
      showToast('Lesson status saved');
      navigate('/cms/lessons');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const next = [...questions];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorderMutation.mutate(next.map((q) => q.id));
  };

  const latestMessage = messages[messages.length - 1]?.message;
  const streamComplete = messages.some((m) => m.status === 'complete');
  useEffect(() => {
    if (streamComplete && !isStreaming) void refetchLesson();
  }, [streamComplete, isStreaming, refetchLesson]);

  const handleGenerateVisual = () => {
    if (!lessonId) return;
    const token = getAccessToken();
    if (!token) {
      showToast('Please log in again', 'error');
      return;
    }
    const apiUrl = getApiBaseUrl();
    const streamUrl = apiUrl ? `${apiUrl}/api/lessons/${lessonId}/generate-visual` : `/api/lessons/${lessonId}/generate-visual`;
    startStream(streamUrl, token);
  };

  const handleRejectVisual = async () => {
    if (!lessonId) return;
    await apiFetch(`/lessons/${lessonId}/reject-visual`, { method: 'POST' });
    await refetchLesson();
  };

  const handleRegenerateVisual = async () => {
    setIsRejecting(true);
    try {
      await handleRejectVisual();
    } finally {
      setIsRejecting(false);
    }
    handleGenerateVisual();
  };

  const handleApproveVisual = async () => {
    if (!lessonId) return;
    const res = await apiFetch(`/lessons/${lessonId}/approve-visual`, { method: 'POST' });
    if (!res.ok) showToast(res.error ?? 'Failed to approve visual', 'error');
    else {
      showToast('Visual approved');
      await refetchLesson();
    }
  };

  const tabsLocked = !lessonId;
  const canSubmitInfo = form.title.trim() && form.subjectId;
  const currentTabLocked = (tab: MainTab) => tabsLocked && tab !== 'info';

  const notesDone = Boolean((lesson?.notesHtml ?? notesHtml).trim());
  const visualDone = lesson?.visualStatus === 'APPROVED' || lesson?.visualStatus === 'PENDING_APPROVAL';
  const practiceCount = questions.length;
  const ppqCount = pastPaperQuestions.length;
  const lessonTitle = form.title.trim() || 'New Lesson';

  if (!isCreating && lessonLoading) {
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
      <div className="space-y-4">
        <div>
          <Link to="/cms/lessons" className="text-sm text-ui-muted hover:text-brand-green">
            ← Back to lessons
          </Link>
          <h1 className="mt-2 font-serif text-2xl font-bold text-brand-black">{lessonTitle}</h1>
        </div>

        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-2">
            {TAB_CONFIG.map((tab, i) => {
              const locked = currentTabLocked(tab.id);
              const active = activeTab === tab.id;
              const completed = !active && visitedTabs.has(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    if (locked) return;
                    setActiveTab(tab.id);
                    setVisitedTabs((prev) => new Set([...prev, tab.id]));
                  }}
                  className={cn(
                    'rounded-xl px-4 py-2 text-sm font-medium transition',
                    locked && 'cursor-not-allowed bg-gray-100 text-gray-400 opacity-40',
                    active && 'bg-brand-green text-white',
                    !active && !locked && completed && 'bg-brand-green/20 text-brand-green',
                    !active && !locked && !completed && 'bg-white text-ui-muted'
                  )}
                >
                  {i + 1}. {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-ui-border bg-white p-6">
          {activeTab === 'info' && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-brand-black">Title</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-ui-border px-3 py-2"
                    value={form.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      setForm((prev) => ({ ...prev, title, slug: prev.slug === '' || prev.slug === slugify(prev.title) ? slugify(title) : prev.slug }));
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-black">Slug</label>
                  <input className="mt-1 w-full rounded-xl border border-ui-border px-3 py-2" value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-black">Estimated time (minutes)</label>
                  <input type="number" className="mt-1 w-full rounded-xl border border-ui-border px-3 py-2" value={form.estimatedMinutes} onChange={(e) => setForm((prev) => ({ ...prev, estimatedMinutes: Number(e.target.value) || 0 }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-brand-black">Description</label>
                  <input className="mt-1 w-full rounded-xl border border-ui-border px-3 py-2" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-brand-black">Select Subject</h3>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  {subjects.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, subjectId: s.id }))}
                      className={cn('rounded-xl border p-3 text-left', form.subjectId === s.id ? 'border-brand-green bg-brand-green/5' : 'border-ui-border')}
                    >
                      <p className="font-medium text-brand-black">{s.name}</p>
                      <p className="text-xs text-ui-muted">
                        {s.grade?.category?.examBoard?.name} / {s.grade?.category?.name} / {s.grade?.name}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {form.subjectId && unitsForSubject.length === 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">
                    No units exist for this subject yet
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    Create a unit to organise your lessons (e.g. &quot;Unit 1 — Characteristics of Living
                    Organisms&quot;). Students browse lessons by unit.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      placeholder="Unit name..."
                      value={newUnitName}
                      onChange={(e) => setNewUnitName(e.target.value)}
                      className="flex-1 rounded-xl border border-ui-border px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={!newUnitName.trim() || creatingUnit}
                      onClick={() => void handleCreateUnit()}
                      className="rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {creatingUnit ? 'Creating...' : '+ Create'}
                    </button>
                  </div>
                </div>
              )}

              {form.subjectId && unitsForSubject.length > 0 && (
                <div className="rounded-xl border border-brand-green/30 bg-brand-green/5 p-3">
                  <p className="text-xs font-medium text-brand-green">
                    ✓ {unitsForSubject.length} unit
                    {unitsForSubject.length > 1 ? 's' : ''} found — lesson will be added to
                    &quot;{unitsForSubject[0].name}&quot;
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                {!lessonId ? (
                  <button
                    type="button"
                    disabled={!canSubmitInfo || createLessonMutation.isPending}
                    onClick={() => createLessonMutation.mutate()}
                    className="rounded-xl bg-brand-green px-5 py-2.5 font-semibold text-white disabled:opacity-50"
                  >
                    {createLessonMutation.isPending ? 'Creating...' : 'Create Lesson →'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canSubmitInfo || updateLessonMutation.isPending}
                    onClick={() => updateLessonMutation.mutate()}
                    className="rounded-xl bg-brand-green px-5 py-2.5 font-semibold text-white disabled:opacity-50"
                  >
                    {updateLessonMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notes' && lessonId && (
            <div className="space-y-4">
              <WysiwygEditor value={notesHtml} onChange={setNotesHtml} placeholder="Write lesson notes..." />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => saveNotesMutation.mutate()}
                  disabled={saveNotesMutation.isPending}
                  className="rounded-xl bg-brand-green px-5 py-2.5 font-semibold text-white disabled:opacity-50"
                >
                  {saveNotesMutation.isPending ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'visual' && lessonId && (
            <div>
              {((lesson?.visualStatus === 'NOT_GENERATED' || lesson?.visualStatus === 'REJECTED' || !lesson?.visualStatus) && !isStreaming && !isRejecting) && (
                <div className="mx-auto max-w-2xl rounded-2xl border border-ui-border bg-white p-10 text-center">
                  <Sparkles className="mx-auto mb-4 size-16 text-brand-lavender" />
                  <h2 className="mb-3 font-serif text-2xl font-semibold">Generate Visual Lesson</h2>
                  {streamError && <p className="mb-4 text-sm text-brand-red">{streamError}</p>}
                  <button type="button" onClick={handleGenerateVisual} className="rounded-xl bg-brand-green px-8 py-3 text-lg font-semibold text-white">Generate with Claude</button>
                </div>
              )}
              {(isStreaming || isRejecting || lesson?.visualStatus === 'GENERATING') && (
                <div className="mx-auto max-w-2xl rounded-2xl border border-ui-border bg-white p-10 text-center">
                  <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-green border-t-transparent" />
                  <p className="mb-6 font-medium text-brand-black">{isRejecting ? 'Preparing to regenerate...' : (latestMessage ?? 'Generating visual lesson...')}</p>
                  <div className="flex flex-col gap-2 text-left">
                    {PROGRESS_STEPS.map((step, index) => {
                      const done = isStepComplete(index, messages);
                      return (
                        <div key={step} className="flex items-center gap-2 text-sm">
                          {done ? <Check className="size-4 text-brand-green" /> : <Circle className="size-4 text-ui-muted" />}
                          <span className={cn(done ? 'text-brand-black' : 'text-ui-muted')}>{step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {lesson?.visualStatus === 'PENDING_APPROVAL' && !isStreaming && (
                <div className="space-y-4">
                  {lesson.visualHtml && <VisualPreview html={lesson.visualHtml} />}
                  <div className="flex gap-3">
                    <button type="button" onClick={handleApproveVisual} className="rounded-xl bg-brand-green px-5 py-2.5 font-semibold text-white">Approve & keep</button>
                    <button type="button" onClick={() => void handleRegenerateVisual()} className="rounded-xl border-2 border-brand-tangerine px-5 py-2.5 font-semibold text-brand-tangerine">Regenerate</button>
                  </div>
                </div>
              )}
              {lesson?.visualStatus === 'APPROVED' && !isStreaming && (
                <div className="space-y-4">
                  <div className="inline-flex rounded-full bg-brand-green/10 px-3 py-1 text-sm font-medium text-brand-green">✓ Visual lesson is live</div>
                  {lesson.visualHtml && <VisualPreview html={lesson.visualHtml} />}
                  <button type="button" onClick={() => void handleRegenerateVisual()} className="rounded-xl border-2 border-brand-tangerine px-5 py-2.5 font-semibold text-brand-tangerine">Regenerate</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'practice' && lessonId && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <button type="button" onClick={() => setPracticeTab('questions')} className={cn('rounded-xl px-4 py-2 text-sm font-medium', practiceTab === 'questions' ? 'bg-brand-green text-white' : 'bg-ui-subtle text-ui-muted')}>Questions</button>
                <button type="button" onClick={() => setPracticeTab('flashcards')} className={cn('rounded-xl px-4 py-2 text-sm font-medium', practiceTab === 'flashcards' ? 'bg-brand-green text-white' : 'bg-ui-subtle text-ui-muted')}><Layers size={16} className="mr-1 inline" />Flashcards</button>
              </div>

              {practiceTab === 'questions' ? (
                <div className="flex gap-6">
                  <div className="min-w-0 flex-1">
                    <div className="mb-4 flex items-center gap-4 text-sm text-ui-muted">
                      <span>{questions.length} questions</span>
                      <button type="button" onClick={() => { setEditor(emptyEditor()); setEditorOpen(true); }} className="ml-auto flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white"><Plus size={16} />Add Question</button>
                    </div>
                    {questions.map((q, i) => (
                      <div key={q.id} className="mb-3 flex items-start gap-3 rounded-xl border border-ui-border bg-white p-4">
                        <div className="flex flex-col gap-1">
                          <button type="button" onClick={() => moveQuestion(i, -1)} className="text-ui-muted hover:text-brand-black"><ArrowUp size={14} /></button>
                          <button type="button" onClick={() => moveQuestion(i, 1)} className="text-ui-muted hover:text-brand-black"><ArrowDown size={14} /></button>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap gap-2">
                            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', TYPE_META[q.type].badge)}>{TYPE_META[q.type].label}</span>
                            <span className="rounded-full bg-ui-subtle px-2 py-0.5 text-xs">{q.marks}m</span>
                          </div>
                          <p className="truncate font-medium">{q.questionText}</p>
                        </div>
                        <button type="button" onClick={() => { setEditor(editorFromQuestion(q)); setEditorOpen(true); }} className="text-sm text-brand-green">Edit</button>
                        <button type="button" onClick={() => deleteQuestionMutation.mutate(q.id)} className="text-ui-muted hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>

                  {editorOpen && (
                    <div className="w-96 shrink-0 rounded-2xl border border-ui-border bg-white shadow-lg">
                      <div className="flex items-center justify-between border-b border-ui-border p-4">
                        <h2 className="font-serif text-lg font-semibold">{editor.id ? 'Edit Question' : 'New Question'}</h2>
                        <button type="button" onClick={() => setEditorOpen(false)}><X size={20} /></button>
                      </div>
                      <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-4">
                        {!editor.type ? (
                          <div className="grid grid-cols-1 gap-2">
                            {(Object.keys(TYPE_META) as QuestionType[]).map((type) => (
                              <button key={type} type="button" onClick={() => setEditor((e) => ({ ...e, type }))} className="rounded-xl border border-ui-border p-3 text-left hover:border-brand-green hover:bg-brand-shell">
                                <p className="font-medium">{TYPE_META[type].label}</p>
                                <p className="text-xs text-ui-muted">{TYPE_META[type].description}</p>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <RichTextToolbar rows={4} value={editor.questionText} placeholder="Question text" onChange={(questionText) => setEditor((ed) => ({ ...ed, questionText, fillBlanks: ed.type === 'FILL_BLANK' ? detectBlanks(questionText) : ed.fillBlanks }))} />
                            {(editor.type === 'MCQ' || editor.type === 'MULTIPLE_SELECT' || editor.type === 'LABEL_DIAGRAM' || editor.type === 'MATCHING' || editor.type === 'DATA_ANALYSIS') && (
                              <div className="space-y-2">
                                {editor.options.map((opt, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <input className="flex-1 rounded-lg border border-ui-border px-2 py-1.5 text-sm" value={opt} onChange={(e) => { const options = [...editor.options]; options[i] = e.target.value; setEditor((ed) => ({ ...ed, options })); }} />
                                  </div>
                                ))}
                              </div>
                            )}
                            {(editor.type === 'SHORT_ANSWER' || editor.type === 'LONG_ANSWER' || editor.type === 'CALCULATION') && (
                              <RichTextToolbar rows={3} value={editor.modelAnswer} placeholder="Model answer" onChange={(modelAnswer) => setEditor((ed) => ({ ...ed, modelAnswer }))} />
                            )}
                            <div className="flex gap-2 pt-2">
                              <button type="button" disabled={saveQuestionMutation.isPending} onClick={() => saveQuestionMutation.mutate(false)} className="flex-1 rounded-xl border border-ui-border py-2 text-sm font-medium">Save as Draft</button>
                              <button type="button" disabled={saveQuestionMutation.isPending || !editor.questionText.trim()} onClick={() => saveQuestionMutation.mutate(true)} className="flex-1 rounded-xl bg-brand-green py-2 text-sm font-semibold text-white disabled:opacity-70">Publish</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-2xl rounded-2xl border border-ui-border bg-white p-6">
                  <div className="space-y-3">
                    {flashcards.map((card, i) => (
                      <div key={i} className="flex gap-2">
                        <input className="flex-1 rounded-lg border border-ui-border px-3 py-2 text-sm" placeholder="Front" value={card.front} onChange={(e) => { const next = [...flashcards]; next[i] = { ...next[i], front: e.target.value }; setFlashcards(next); }} />
                        <input className="flex-1 rounded-lg border border-ui-border px-3 py-2 text-sm" placeholder="Back" value={card.back} onChange={(e) => { const next = [...flashcards]; next[i] = { ...next[i], back: e.target.value }; setFlashcards(next); }} />
                        <button type="button" onClick={() => setFlashcards(flashcards.filter((_, j) => j !== i))} className="text-ui-muted hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => setFlashcards([...flashcards, { front: '', back: '' }])} className="rounded-xl border border-ui-border px-4 py-2 text-sm">+ Add card</button>
                    <button type="button" onClick={() => saveFlashcardsMutation.mutate()} className="rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white">Save all flashcards</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'pastpaper' && lessonId && (
            <div className="flex gap-6">
              <div className="min-w-0 flex-1">
                <div className="mb-4 flex items-center gap-4 text-sm text-ui-muted">
                  <span>{pastPaperQuestions.length} past paper questions</span>
                  <button type="button" onClick={() => { setPpqEditor(emptyPpqEditor()); setPpqEditorOpen(true); }} className="ml-auto flex items-center gap-2 rounded-xl bg-brand-lavender px-4 py-2 text-sm font-semibold text-white"><Plus size={16} />Add Past Paper Question</button>
                </div>
                {pastPaperQuestions.map((q) => (
                  <div key={q.id} className="mb-3 rounded-xl border border-ui-border bg-white p-4">
                    <div className="mb-1 flex flex-wrap gap-2">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', TYPE_META[q.type].badge)}>{TYPE_META[q.type].label}</span>
                    </div>
                    <p className="truncate font-medium text-brand-black">{q.questionText}</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => { const mcq = (q.mcqOptions ?? {}) as McqOptionsData; setPpqEditor({ id: q.id, type: q.type, marks: q.marks, difficulty: q.difficulty, questionText: q.questionText, modelAnswer: q.modelAnswer ?? '', explanation: q.explanation ?? '', hintText: q.hintText ?? '', options: mcq.options ?? ['', '', '', ''], correctIndex: typeof mcq.correct === 'number' ? mcq.correct : 0, correctIndices: Array.isArray(mcq.correct) ? mcq.correct : [], trueFalseCorrect: mcq.correct === true, fillBlanks: [], finalAnswer: mcq.finalAnswer != null ? String(mcq.finalAnswer) : '', calcUnits: mcq.units ?? '', status: q.status, year: q.year ? String(q.year) : '', session: q.session ?? '', paperNumber: q.paperNumber ? String(q.paperNumber) : '', questionNumber: q.questionNumber ? String(q.questionNumber) : '' }); setPpqEditorOpen(true); }} className="text-sm text-brand-green">Edit</button>
                      <button type="button" onClick={() => deletePpqMutation.mutate(q.id)} className="text-ui-muted hover:text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
              {ppqEditorOpen && (
                <div className="w-96 shrink-0 rounded-2xl border border-ui-border bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-ui-border p-4">
                    <h2 className="font-serif text-lg font-semibold">{ppqEditor.id ? 'Edit Past Paper Question' : 'New Past Paper Question'}</h2>
                    <button type="button" onClick={() => setPpqEditorOpen(false)}><X size={20} /></button>
                  </div>
                  <div className="max-h-[calc(100vh-12rem)] space-y-3 overflow-y-auto p-4">
                    <div className="rounded-xl border border-ui-border p-3">
                      <p className="mb-2 text-xs font-semibold text-ui-muted">Paper source (optional)</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" placeholder="Year" className="rounded-lg border border-ui-border px-2 py-1.5 text-sm" value={ppqEditor.year} onChange={(e) => setPpqEditor((ed) => ({ ...ed, year: e.target.value }))} />
                        <select className="rounded-lg border border-ui-border px-2 py-1.5 text-sm" value={ppqEditor.session} onChange={(e) => setPpqEditor((ed) => ({ ...ed, session: e.target.value }))}>
                          <option value="">Session</option>
                          <option value="May/June">May/June</option>
                          <option value="Oct/Nov">Oct/Nov</option>
                          <option value="Jan/Feb">Jan/Feb</option>
                        </select>
                        <input type="number" placeholder="Paper No." className="rounded-lg border border-ui-border px-2 py-1.5 text-sm" value={ppqEditor.paperNumber} onChange={(e) => setPpqEditor((ed) => ({ ...ed, paperNumber: e.target.value }))} />
                        <input type="number" placeholder="Question No." className="rounded-lg border border-ui-border px-2 py-1.5 text-sm" value={ppqEditor.questionNumber} onChange={(e) => setPpqEditor((ed) => ({ ...ed, questionNumber: e.target.value }))} />
                      </div>
                    </div>
                    {!ppqEditor.type ? (
                      <div className="grid grid-cols-1 gap-2">
                        {(Object.keys(TYPE_META) as QuestionType[]).map((type) => (
                          <button key={type} type="button" onClick={() => setPpqEditor((e) => ({ ...e, type }))} className="rounded-xl border border-ui-border p-3 text-left hover:border-brand-green hover:bg-brand-shell">
                            <p className="font-medium">{TYPE_META[type].label}</p>
                            <p className="text-xs text-ui-muted">{TYPE_META[type].description}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <RichTextToolbar rows={4} value={ppqEditor.questionText} placeholder="Question text..." onChange={(questionText) => setPpqEditor((ed) => ({ ...ed, questionText }))} />
                        <RichTextToolbar rows={3} value={ppqEditor.modelAnswer} placeholder="Model answer..." onChange={(modelAnswer) => setPpqEditor((ed) => ({ ...ed, modelAnswer }))} />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => savePpqMutation.mutate(false)} className="flex-1 rounded-xl border border-ui-border py-2 text-sm font-medium">Save as Draft</button>
                          <button type="button" onClick={() => savePpqMutation.mutate(true)} className="flex-1 rounded-xl bg-brand-lavender py-2 text-sm font-semibold text-white">Publish</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'publish' && lessonId && (
            <div className="space-y-4">
              <h2 className="font-serif text-xl font-semibold">Publish</h2>
              <div className="space-y-2 text-sm">
                <p><strong>Lesson:</strong> {lessonTitle}</p>
                <p><strong>Subject:</strong> {subjects.find((s) => s.id === form.subjectId)?.name ?? 'Not selected'}</p>
                <p>{notesDone ? '✓' : '○'} Notes added</p>
                <p>{visualDone ? '✓' : '○'} Visual lesson generated</p>
                <p>{practiceCount > 0 ? '✓' : '○'} Practice questions added ({practiceCount})</p>
                <p>{ppqCount > 0 ? '✓' : '○'} Past paper questions added ({ppqCount})</p>
              </div>
              <div className="max-w-sm">
                <label className="text-sm font-medium text-brand-black">Status</label>
                <select className="mt-1 w-full rounded-xl border border-ui-border px-3 py-2" value={publishStatus} onChange={(e) => setPublishStatus(e.target.value)}>
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING_REVIEW">Submit for review</option>
                </select>
              </div>
              <button type="button" onClick={() => publishMutation.mutate()} className="rounded-xl bg-brand-green px-5 py-2.5 font-semibold text-white">
                Save & Publish
              </button>
            </div>
          )}
        </div>
      </div>
    </TeacherLayout>
  );
}
