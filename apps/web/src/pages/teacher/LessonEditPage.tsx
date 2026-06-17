import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { TeacherLayout } from '@/components/layout/RoleLayouts';
import { PageLoader } from '@/components/ui/Loading';
import { WysiwygEditor } from '@/components/teacher/WysiwygEditor';
import { useToast } from '@/context/ToastContext';
import { apiFetch, API_URL, getAccessToken } from '@/services/api';
import { slugify } from '@/utils/helpers';

interface LessonData {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  notesHtml?: string | null;
  status: string;
}

interface FlashcardInput {
  front: string;
  back: string;
}

interface FlashcardRecord {
  id: string;
  front: string;
  back: string;
  order: number;
}

function flashcardsEndpoint() {
  return import.meta.env.VITE_API_URL
    ? `${API_URL.replace(/\/$/, '')}/api/flashcards`
    : '/api/flashcards';
}

export default function LessonEditPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [notesText, setNotesText] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [cards, setCards] = useState<FlashcardInput[]>([
    { front: '', back: '' },
  ]);
  const [infoSaving, setInfoSaving] = useState(false);

  const { data: lesson, isLoading: lessonLoading } = useQuery({
    queryKey: ['lesson-edit', id],
    queryFn: async () => {
      const res = await apiFetch<LessonData>(`/lessons/${id}`);
      if (!res.ok) throw new Error(res.error ?? 'Lesson not found');
      return res.data!;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (!lesson) return;
    setTitle(lesson.title ?? '');
    setSlug(lesson.slug ?? '');
    setDescription(lesson.description ?? '');
    setNotesText(lesson.notesHtml ?? '');
    setStatus(lesson.status ?? 'DRAFT');
  }, [lesson]);

  const { data: existingCards, isLoading: cardsLoading } = useQuery({
    queryKey: ['flashcards-edit', id],
    queryFn: async () => {
      const res = await apiFetch<FlashcardRecord[]>(
        `/flashcards?lessonId=${id}`
      );
      if (!res.ok) return [];
      const data = res.data ?? [];
      if (data.length > 0) {
        setCards(data.map((c) => ({ front: c.front, back: c.back })));
      }
      return data;
    },
    enabled: !!id,
  });

  const saveInfo = async () => {
    if (!id) return;
    setInfoSaving(true);
    const res = await apiFetch(`/lessons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: title.trim(),
        slug: slug.trim() || slugify(title),
        description: description.trim() || undefined,
        notesHtml: notesText,
        status,
      }),
    });
    setInfoSaving(false);
    if (res.ok) {
      showToast('Lesson saved');
      queryClient.invalidateQueries({ queryKey: ['lesson-edit', id] });
      queryClient.invalidateQueries({ queryKey: ['teacher-lessons-free'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-dashboard-v2'] });
    } else {
      showToast(res.error ?? 'Failed to save', 'error');
    }
  };

  const saveFlashcardsMutation = useMutation({
    mutationFn: async () => {
      const validCards = cards
        .filter((c) => c.front.trim() && c.back.trim())
        .map((c) => ({ front: c.front.trim(), back: c.back.trim() }));
      if (validCards.length === 0) {
        throw new Error(
          'Add at least one flashcard with front and back text'
        );
      }
      const token = getAccessToken();
      if (!token) throw new Error('Not authenticated');
      const response = await fetch(flashcardsEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ lessonId: id, cards: validCards }),
      });
      const raw = await response.text();
      let payload: { success?: boolean; error?: string };
      try {
        payload = JSON.parse(raw) as typeof payload;
      } catch {
        throw new Error(
          raw.slice(0, 200) || `Invalid response (${response.status})`
        );
      }
      if (!response.ok || !payload.success) {
        throw new Error(
          payload.error ?? `Failed to save flashcards (${response.status})`
        );
      }
    },
    onSuccess: () => {
      showToast('Flashcards saved');
      queryClient.invalidateQueries({ queryKey: ['flashcards-edit', id] });
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });

  if (lessonLoading || cardsLoading) {
    return (
      <TeacherLayout>
        <PageLoader />
      </TeacherLayout>
    );
  }

  const statusOptions = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PENDING_REVIEW', label: 'Submit for review' },
  ];

  return (
    <TeacherLayout>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start
        justify-between gap-4">
        <div>
          <Link
            to="/cms/lessons"
            className="text-sm text-ui-muted hover:text-brand-green"
          >
            ← Back to lessons
          </Link>
          <h1 className="mt-2 font-serif text-2xl font-bold
            text-brand-black md:text-3xl">
            {lesson?.title ?? 'Edit lesson'}
          </h1>
          <p className="mt-1 text-sm text-ui-muted">
            Edit lesson content, notes and flashcards
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-ui-border
              bg-white px-3 py-2 text-sm text-brand-black
              focus:border-brand-green focus:outline-none"
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={saveInfo}
            disabled={infoSaving || !title.trim()}
            className="rounded-xl bg-brand-green px-5 py-2
              text-sm font-semibold text-white
              hover:opacity-90 disabled:opacity-50"
          >
            {infoSaving ? 'Saving…' : 'Save lesson'}
          </button>
        </div>
      </div>

      <div className="space-y-6">

        {/* Lesson info */}
        <div className="rounded-2xl border border-ui-border
          bg-white p-6">
          <h2 className="mb-4 font-serif text-lg
            font-semibold text-brand-black">
            Lesson info
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm
                font-semibold text-brand-black">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setSlug(slugify(e.target.value));
                }}
                className="w-full rounded-xl border
                  border-ui-border px-4 py-3 text-sm
                  text-brand-black
                  focus:border-brand-green
                  focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm
                font-semibold text-brand-black">
                Slug
                <span className="ml-1 text-xs
                  font-normal text-ui-muted">
                  (auto-filled from title)
                </span>
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full rounded-xl border
                  border-ui-border px-4 py-3 text-sm
                  text-brand-black
                  focus:border-brand-green
                  focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm
                font-semibold text-brand-black">
                Description
                <span className="ml-1 text-xs
                  font-normal text-ui-muted">
                  (optional)
                </span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this lesson"
                className="w-full rounded-xl border
                  border-ui-border px-4 py-3 text-sm
                  text-brand-black
                  placeholder:text-ui-muted
                  focus:border-brand-green
                  focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Notes editor */}
        <div className="rounded-2xl border border-ui-border
          bg-white p-6">
          <h2 className="mb-1 font-serif text-lg
            font-semibold text-brand-black">
            Lesson notes
          </h2>
          <p className="mb-4 text-sm text-ui-muted">
            The AI reads these notes to generate the
            visual lesson. Use headings, tables, and
            highlights to structure your content.
          </p>
          <WysiwygEditor
            value={notesText}
            onChange={setNotesText}
            placeholder="Start writing your lesson notes here..."
            minHeight={500}
          />
        </div>

        {/* Flashcards */}
        <div className="rounded-2xl border border-ui-border
          bg-white p-6">
          <h2 className="mb-1 font-serif text-lg
            font-semibold text-brand-black">
            Flashcards
          </h2>
          <p className="mb-4 text-sm text-ui-muted">
            Add term/definition pairs. Students use
            these in the lesson flashcard deck.
            ({existingCards?.length ?? 0} saved)
          </p>
          <div className="space-y-3">
            {cards.map((card, index) => (
              <div
                key={index}
                className="rounded-xl border
                  border-ui-border p-4"
              >
                <div className="mb-2 flex items-center
                  justify-between">
                  <span className="text-xs font-semibold
                    text-ui-muted">
                    Card {index + 1}
                  </span>
                  {cards.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setCards(cards.filter((_, i) => i !== index))
                      }
                      className="rounded-lg p-1 text-ui-muted
                        hover:bg-ui-subtle hover:text-red-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm
                    font-medium text-brand-black">
                    Front (term)
                  </label>
                  <input
                    type="text"
                    value={card.front}
                    placeholder="e.g. Mitochondria"
                    onChange={(e) => {
                      const updated = [...cards];
                      updated[index] = {
                        ...updated[index],
                        front: e.target.value,
                      };
                      setCards(updated);
                    }}
                    className="w-full rounded-xl border
                      border-ui-border px-3 py-2 text-sm
                      focus:border-brand-green
                      focus:outline-none"
                  />
                </div>
                <div className="mt-3">
                  <label className="mb-1 block text-sm
                    font-medium text-brand-black">
                    Back (definition)
                  </label>
                  <textarea
                    className="w-full rounded-xl border
                      border-ui-border p-3 text-sm
                      focus:border-brand-green
                      focus:outline-none"
                    rows={2}
                    value={card.back}
                    placeholder="e.g. Powerhouse of the cell — produces ATP"
                    onChange={(e) => {
                      const updated = [...cards];
                      updated[index] = {
                        ...updated[index],
                        back: e.target.value,
                      };
                      setCards(updated);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() =>
                setCards([...cards, { front: '', back: '' }])
              }
              className="rounded-xl border border-ui-border
                px-4 py-2 text-sm font-medium
                text-brand-black hover:bg-ui-subtle"
            >
              <Plus className="mr-1 inline size-4" />
              Add card
            </button>
            <button
              type="button"
              disabled={saveFlashcardsMutation.isPending}
              onClick={() => saveFlashcardsMutation.mutate()}
              className="rounded-xl bg-brand-green px-4
                py-2 text-sm font-semibold text-white
                hover:opacity-90 disabled:opacity-70"
            >
              {saveFlashcardsMutation.isPending
                ? 'Saving…'
                : 'Save flashcards'}
            </button>
          </div>
        </div>

      </div>
    </TeacherLayout>
  );
}
