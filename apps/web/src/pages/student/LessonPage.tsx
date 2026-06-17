import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Clock,
  FileText,
  Layers,
  Lock,
  Pencil,
  Sparkles,
} from 'lucide-react';
import { StudentLayout } from '@/components/layout/RoleLayouts';
import { useAuth } from '@/context/AuthContext';
import FlashcardDeck from '@/components/student/FlashcardDeck';
import { PracticeQuestionCard } from '@/components/student/PracticeQuestionCard';
import { apiFetch, getAccessToken } from '@/services/api';
import { Lesson, PaperQuestion } from '@/types';
import { cn } from '@/utils/helpers';

type SectionId = 'notes' | 'visual' | 'practice' | 'flashcards' | 'paper';

interface SubscriptionPaywall {
  subjectId: string;
  subjectName: string;
  boardSlug: string;
  categorySlug: string;
  gradeSlug: string;
  subjectSlug: string;
}

type LessonQueryResult =
  | { kind: 'lesson'; lesson: Lesson }
  | { kind: 'paywall'; paywall: SubscriptionPaywall };

const SECTIONS: { id: SectionId; label: string; emoji: string }[] = [
  { id: 'notes', label: 'Notes', emoji: '📖' },
  { id: 'visual', label: 'Visual lesson', emoji: '🎬' },
  { id: 'practice', label: 'Practice', emoji: '✏️' },
  { id: 'flashcards', label: 'Flashcards', emoji: '🃏' },
  { id: 'paper', label: 'Past paper Qs', emoji: '📄' },
];

function getBackUrl(lesson: Lesson): string {
  const unit = lesson.unitLinks?.[0]?.unit;
  if (!unit?.subject) return '/subjects';

  const boardSlug = unit.subject.grade?.category?.examBoard?.slug;
  const categorySlug = unit.subject.grade?.category?.slug;
  const gradeSlug = unit.subject.grade?.slug;
  const subjectSlug = unit.subject.slug;
  const unitSlug = unit.slug;

  if (boardSlug && categorySlug && gradeSlug && subjectSlug && unitSlug) {
    return `/subjects/${boardSlug}/${categorySlug}/${gradeSlug}/${subjectSlug}/${unitSlug}`;
  }

  return '/subjects';
}

function getSubjectLabel(lesson: Lesson): string {
  const subject = lesson.unitLinks?.[0]?.unit?.subject;
  if (!subject) return 'Subject';

  const board = subject.grade?.category?.examBoard?.name;
  const category = subject.grade?.category?.name;
  if (board && category) return `${board} ${category} ${subject.name}`;
  return subject.name;
}

function computeProgress(lesson: Lesson, hasFlashcards: boolean): number {
  let done = 0;
  const total = 5;

  if (lesson.notesHtml || lesson.notesRawText) done += 1;
  if (lesson.visualStatus === 'APPROVED' && lesson.visualHtml) done += 1;
  if ((lesson.practiceQuestions?.length ?? 0) > 0) done += 1;
  if (hasFlashcards) done += 1;
  if ((lesson.paperQuestionLinks?.length ?? 0) > 0) done += 1;

  return Math.round((done / total) * 100);
}

function isSectionDone(lesson: Lesson, sectionId: SectionId, hasFlashcards: boolean): boolean {
  switch (sectionId) {
    case 'notes':
      return !!(lesson.notesHtml || lesson.notesRawText);
    case 'visual':
      return lesson.visualStatus === 'APPROVED' && !!lesson.visualHtml;
    case 'practice':
      return (lesson.practiceQuestions?.length ?? 0) > 0;
    case 'flashcards':
      return hasFlashcards;
    case 'paper':
      return (lesson.paperQuestionLinks?.length ?? 0) > 0;
    default:
      return false;
  }
}

function LessonSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-2/3 rounded-lg bg-ui-subtle" />
      <div className="h-4 w-1/2 rounded bg-ui-subtle" />
      <div className="h-64 rounded-2xl bg-ui-subtle" />
      <div className="h-48 rounded-2xl bg-ui-subtle" />
    </div>
  );
}

type NotesBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

function isNotesHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.endsWith(':')) return true;
  const letters = trimmed.replace(/[^a-zA-Z]/g, '');
  return letters.length >= 2 && trimmed === trimmed.toUpperCase();
}

function isNotesBullet(line: string): boolean {
  return /^[\s]*[-•*]\s+/.test(line);
}

function parseNotesRawText(text: string): NotesBlock[] {
  const lines = text.split('\n');
  const blocks: NotesBlock[] = [];
  let listItems: string[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraphLines.join(' ').trim() });
      paragraphLines = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: 'list', items: listItems });
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      flushParagraph();
      continue;
    }
    if (isNotesBullet(line)) {
      flushParagraph();
      listItems.push(trimmed.replace(/^[-•*]\s+/, ''));
    } else if (isNotesHeading(trimmed)) {
      flushList();
      flushParagraph();
      blocks.push({ type: 'heading', text: trimmed });
    } else {
      flushList();
      paragraphLines.push(trimmed);
    }
  }

  flushList();
  flushParagraph();
  return blocks;
}

function NotesRawContent({ text }: { text: string }) {
  const blocks = parseNotesRawText(text);

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          return (
            <h3 key={i} className="font-semibold text-brand-black">
              {block.text}
            </h3>
          );
        }
        if (block.type === 'list') {
          return (
            <ul key={i} className="list-none space-y-2">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2.5 text-base leading-relaxed text-brand-black">
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand-green" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-base leading-relaxed text-brand-black">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

function SectionCard({
  accentBorder,
  icon,
  iconBg,
  title,
  headerExtra,
  contentClassName,
  flushContent,
  children,
}: {
  accentBorder: string;
  icon: ReactNode;
  iconBg: string;
  title: string;
  headerExtra?: ReactNode;
  contentClassName?: string;
  flushContent?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-ui-border border-l-4 bg-white shadow-sm lg:rounded-2xl',
        accentBorder
      )}
    >
      <div className="flex items-center gap-3 border-b border-ui-border p-6">
        <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', iconBg)}>
          {icon}
        </div>
        <h2 className="flex-1 font-serif text-xl font-semibold text-brand-black">{title}</h2>
        {headerExtra}
      </div>
      <div className={cn(!flushContent && 'p-6 lg:p-8', contentClassName)}>{children}</div>
    </div>
  );
}

function PastPaperQuestionCard({
  paperQuestion,
  index,
}: {
  paperQuestion: PaperQuestion & { pastPaper: { title: string; year: number } };
  index: number;
}) {
  return (
    <div className="mb-4 rounded-xl border border-ui-border p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-brand-green px-2 py-0.5 text-xs font-bold text-white">
          Q{index + 1}
        </span>
        <span className="rounded-full bg-brand-mustard/20 px-2 py-0.5 text-xs text-brand-black">
          {paperQuestion.marks} mark{paperQuestion.marks !== 1 ? 's' : ''}
        </span>
        <span className="rounded-full bg-brand-green/10 px-2 py-0.5 text-xs text-brand-green">
          {paperQuestion.pastPaper.title} ({paperQuestion.pastPaper.year})
        </span>
      </div>
      <p className="mt-3 font-medium text-brand-black">{paperQuestion.questionText}</p>
    </div>
  );
}

function SectionNav({
  lesson,
  activeSection,
  onSelect,
  variant,
  hasFlashcards,
}: {
  lesson: Lesson;
  activeSection: SectionId;
  onSelect: (id: SectionId) => void;
  variant: 'sidebar' | 'mobile';
  hasFlashcards: boolean;
}) {
  if (variant === 'mobile') {
    return (
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:hidden">
        {SECTIONS.map((section) => {
          const active = activeSection === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                active
                  ? 'border-brand-green bg-brand-green text-white'
                  : 'border-ui-border bg-white text-ui-muted hover:bg-brand-shell'
              )}
            >
              {section.label}
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="mt-4 flex flex-col gap-1">
      {SECTIONS.map((section) => {
        const done = isSectionDone(lesson, section.id, hasFlashcards);
        const active = activeSection === section.id;

        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelect(section.id)}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
              active && 'bg-brand-green font-medium text-white',
              !active && 'text-brand-black hover:bg-brand-shell'
            )}
          >
            <span
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                done ? 'bg-brand-green' : 'bg-gray-300',
                active && done && 'bg-white'
              )}
            />
            <span>
              {section.emoji} {section.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default function LessonPage() {
  const { lessonSlug } = useParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeSection, setActiveSection] = useState<SectionId>('notes');

  const notesRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const practiceRef = useRef<HTMLDivElement>(null);
  const flashcardsRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  const sectionRefs: Record<SectionId, React.RefObject<HTMLDivElement | null>> = {
    notes: notesRef,
    visual: visualRef,
    practice: practiceRef,
    flashcards: flashcardsRef,
    paper: paperRef,
  };

  const { data: lessonResult, isLoading, error } = useQuery({
    queryKey: ['lesson', lessonSlug],
    queryFn: async (): Promise<LessonQueryResult> => {
      const res = await apiFetch<Lesson>(`/lessons/by-slug/${lessonSlug}`);
      if (res.ok && res.data) {
        return { kind: 'lesson', lesson: res.data };
      }
      if (res.status === 403 && res.error === 'SUBSCRIPTION_REQUIRED') {
        return {
          kind: 'paywall',
          paywall: {
            subjectId: res.subjectId ?? '',
            subjectName: res.subjectName ?? 'this subject',
            boardSlug: res.boardSlug ?? '',
            categorySlug: res.categorySlug ?? '',
            gradeSlug: res.gradeSlug ?? '',
            subjectSlug: res.subjectSlug ?? '',
          },
        };
      }
      throw new Error(res.error ?? 'Lesson not found');
    },
    enabled: !!lessonSlug && !authLoading && isAuthenticated,
  });

  const lesson = lessonResult?.kind === 'lesson' ? lessonResult.lesson : undefined;
  const paywall = lessonResult?.kind === 'paywall' ? lessonResult.paywall : undefined;

  const { data: flashcards } = useQuery({
    queryKey: ['flashcards', lesson?.id],
    queryFn: async () => {
      const res = await apiFetch<{ id: string; front: string; back: string; order: number }[]>(
        `/flashcards?lessonId=${lesson!.id}`
      );
      if (!res.ok) return [];
      return res.data ?? [];
    },
    enabled: !!lesson?.id,
  });

  const hasFlashcards = (flashcards?.length ?? 0) > 0;

  useEffect(() => {
    if (lesson?.id) {
      apiFetch(`/progress/lesson/${lesson.id}`, { method: 'PUT', body: JSON.stringify({}) });
    }
  }, [lesson?.id]);

  const scrollToSection = (id: SectionId) => {
    setActiveSection(id);
    sectionRefs[id].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const progress = lesson ? computeProgress(lesson, hasFlashcards) : 0;
  const backUrl = lesson ? getBackUrl(lesson) : '/subjects';
  const showLoading = authLoading || isLoading;

  return (
    <StudentLayout>
      <div className="min-h-full bg-brand-shell">
        {showLoading && (
          <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
            <LessonSkeleton />
          </div>
        )}

        {error && (
          <div className="mx-auto max-w-lg px-6 py-16 text-center">
            <h1 className="font-serif text-2xl font-bold text-brand-black">Lesson not found</h1>
            <p className="mt-2 text-ui-muted">{(error as Error).message}</p>
            <Link
              to="/subjects"
              className="mt-6 inline-block rounded-xl bg-brand-green px-6 py-2.5 font-semibold text-white"
            >
              ← Back to subjects
            </Link>
          </div>
        )}

        {paywall && (
          <div className="mx-auto max-w-lg px-6 py-16">
            <div className="rounded-2xl border border-ui-border bg-white p-8 text-center">
              <Lock className="mx-auto mb-4 size-12 text-brand-green" />
              <h1 className="font-serif text-2xl font-bold text-brand-black">
                This lesson requires a subscription
              </h1>
              <p className="mt-2 text-ui-muted">{paywall.subjectName}</p>
              <Link
                to={`/subjects/${paywall.boardSlug}/${paywall.categorySlug}/${paywall.gradeSlug}/${paywall.subjectSlug}/pricing`}
                className="mt-6 inline-block w-full rounded-xl bg-brand-green px-6 py-3 font-semibold text-white"
              >
                Unlock {paywall.subjectName} →
              </Link>
              <Link
                to={`/subjects/${paywall.boardSlug}/${paywall.categorySlug}/${paywall.gradeSlug}/${paywall.subjectSlug}`}
                className="mt-4 inline-block text-sm text-ui-muted hover:text-brand-green"
              >
                ← Back
              </Link>
            </div>
          </div>
        )}

        {lesson && (
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-4 lg:flex-row lg:px-6 lg:py-8">
            {/* Desktop sidebar */}
            <aside className="sticky top-6 hidden self-start lg:block lg:w-64 lg:shrink-0">
              <div className="rounded-2xl border border-ui-border bg-white p-4 shadow-sm">
                <Link to={backUrl} className="text-sm text-ui-muted hover:text-brand-green">
                  ← Back to unit
                </Link>
                <p className="mt-4 font-serif text-base font-semibold text-brand-black">
                  {lesson.title}
                </p>
                <div className="mt-6">
                  <div className="mb-1.5 flex justify-between text-sm text-ui-muted">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-brand-shell">
                    <div
                      className="h-1.5 rounded-full bg-brand-green transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <SectionNav
                  lesson={lesson}
                  activeSection={activeSection}
                  onSelect={scrollToSection}
                  variant="sidebar"
                  hasFlashcards={hasFlashcards}
                />
              </div>
            </aside>

            {/* Main content */}
            <main className="min-w-0 flex-1 max-w-4xl space-y-8 px-4 py-4">
              <Link
                to={backUrl}
                className="text-sm text-ui-muted hover:text-brand-green lg:hidden"
              >
                ← Back to unit
              </Link>

              <SectionNav
                lesson={lesson}
                activeSection={activeSection}
                onSelect={scrollToSection}
                variant="mobile"
                hasFlashcards={hasFlashcards}
              />

              <header className="scroll-mt-24 rounded-2xl border border-ui-border border-t-4 border-t-brand-green bg-white p-6 shadow-sm lg:p-8">
                <h1 className="mb-4 font-serif text-4xl font-bold leading-tight text-brand-black">
                  {lesson.title}
                </h1>
                <div className="mb-6 flex flex-wrap gap-2">
                  {lesson.learningObjectives.map((obj) => (
                    <span
                      key={obj}
                      className="rounded-full border border-brand-green/20 bg-brand-green/10 px-3 py-1.5 text-xs font-medium text-brand-green"
                    >
                      {obj}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-4 border-b border-ui-border pb-6 text-sm text-ui-muted">
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-4" />
                    {lesson.estimatedMinutes} min estimated
                  </span>
                  <span className="rounded-full bg-brand-green/10 px-3 py-1 text-xs font-medium text-brand-green">
                    {getSubjectLabel(lesson)}
                  </span>
                </div>
              </header>

              {/* Notes */}
              <div ref={notesRef} className="scroll-mt-24">
                <SectionCard
                  accentBorder="border-l-brand-green"
                  icon={<BookOpen className="size-5 text-brand-green" />}
                  iconBg="bg-brand-green/10"
                  title="Notes"
                  contentClassName="bg-brand-shell/50"
                >
                  {lesson.notesHtml ? (
                    <div
                      className="prose prose-slate max-w-none text-base leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: lesson.notesHtml }}
                    />
                  ) : lesson.notesRawText ? (
                    <NotesRawContent text={lesson.notesRawText} />
                  ) : (
                    <p className="italic text-ui-muted">
                      Notes for this lesson are being prepared. Check back soon.
                    </p>
                  )}
                </SectionCard>
              </div>

              {/* Visual */}
              <div ref={visualRef} className="scroll-mt-24">
                <SectionCard
                  accentBorder="border-l-brand-lavender"
                  icon={<Sparkles className="size-5 text-brand-lavender" />}
                  iconBg="bg-brand-lavender/10"
                  title="Visual Lesson"
                  flushContent={lesson.visualStatus === 'APPROVED' && !!lesson.visualHtml}
                  headerExtra={
                    lesson.visualStatus === 'APPROVED' ? (
                      <span className="ml-auto rounded-full bg-brand-green/10 px-3 py-1 text-xs font-medium text-brand-green">
                        Live
                      </span>
                    ) : undefined
                  }
                >
                  {lesson.visualStatus === 'APPROVED' && lesson.visualHtml ? (
                    <iframe
                      srcDoc={lesson.visualHtml}
                      sandbox="allow-scripts allow-same-origin allow-modals"
                      className="block h-[400px] w-full border-0 lg:h-[min(70vh,600px)]"
                      title="Visual lesson"
                      onLoad={(e) => {
                        const iframe = e.target as HTMLIFrameElement;
                        if (iframe.contentDocument) {
                          iframe.contentDocument.body.style.margin = '0';
                          iframe.contentDocument.body.style.overflow = 'auto';
                        }
                      }}
                    />
                  ) : (
                    <div className="flex h-[300px] flex-col items-center justify-center text-center">
                      <Sparkles className="mb-4 size-16 text-brand-lavender" />
                      <p className="font-serif text-2xl text-brand-black">
                        Interactive visual lesson coming soon
                      </p>
                      <p className="mx-auto mt-2 max-w-xs text-center text-sm text-ui-muted">
                        Your teacher is preparing an interactive visual lesson for this topic.
                      </p>
                    </div>
                  )}
                </SectionCard>
              </div>

              {/* Practice */}
              <div ref={practiceRef} className="scroll-mt-24">
                <SectionCard
                  accentBorder="border-l-brand-mustard"
                  icon={<Pencil className="size-5 text-brand-mustard" />}
                  iconBg="bg-brand-mustard/20"
                  title="Practice Questions"
                >
                  {lesson.practiceQuestions && lesson.practiceQuestions.length > 0 ? (
                    lesson.practiceQuestions.map((q, i) => (
                      <PracticeQuestionCard key={q.id} question={q} index={i} />
                    ))
                  ) : (
                    <div className="py-8 text-center">
                      <Pencil className="mx-auto mb-3 size-10 text-ui-muted" />
                      <p className="text-ui-muted">
                        Practice questions are being added for this lesson.
                      </p>
                    </div>
                  )}
                </SectionCard>
              </div>

              {/* Flashcards */}
              <div ref={flashcardsRef} className="scroll-mt-24">
                <SectionCard
                  accentBorder="border-l-brand-sky"
                  icon={<Layers className="size-5 text-brand-sky" />}
                  iconBg="bg-brand-sky/20"
                  title="Flashcards"
                >
                  {hasFlashcards && flashcards ? (
                    <FlashcardDeck flashcards={flashcards} token={getAccessToken() ?? ''} />
                  ) : (
                    <div className="py-8 text-center">
                      <Layers className="mx-auto mb-3 size-10 text-ui-muted" />
                      <p className="font-medium text-brand-black">Flashcards coming soon</p>
                      <p className="mt-2 text-sm text-ui-muted">
                        Your teacher is preparing flashcards for this lesson.
                      </p>
                    </div>
                  )}
                </SectionCard>
              </div>

              {/* Past paper */}
              <div ref={paperRef} className="scroll-mt-24">
                <SectionCard
                  accentBorder="border-l-brand-tangerine"
                  icon={<FileText className="size-5 text-brand-tangerine" />}
                  iconBg="bg-brand-tangerine/10"
                  title="Past Paper Questions"
                >
                  {lesson.paperQuestionLinks && lesson.paperQuestionLinks.length > 0 ? (
                    lesson.paperQuestionLinks.map(({ paperQuestion }, i) => (
                      <PastPaperQuestionCard
                        key={paperQuestion.id}
                        paperQuestion={paperQuestion}
                        index={i}
                      />
                    ))
                  ) : (
                    <div className="py-8 text-center">
                      <FileText className="mx-auto mb-3 size-10 text-ui-muted" />
                      <p className="text-ui-muted">
                        Past paper questions for this topic will be linked here.
                      </p>
                    </div>
                  )}
                </SectionCard>
              </div>
            </main>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
