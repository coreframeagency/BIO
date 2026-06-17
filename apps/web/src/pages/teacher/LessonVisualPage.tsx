import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Circle, Sparkles } from 'lucide-react';
import { TeacherLayout } from '@/components/layout/RoleLayouts';
import { API_URL, apiFetch, getAccessToken } from '@/services/api';
import { useSSE } from '@/hooks/useSSE';
import { Lesson } from '@/types';
import { cn } from '@/utils/helpers';

const PROGRESS_STEPS = [
  'Reading lesson notes',
  'Identifying key concepts',
  'Building interactive components',
  'Saving visual lesson',
  'Complete',
];

function getApiBaseUrl(): string {
  if (!import.meta.env.VITE_API_URL) return '';
  return API_URL.replace(/\/$/, '');
}

function isStepComplete(stepIndex: number, messages: { status: string }[]): boolean {
  const statuses = new Set(messages.map((m) => m.status));
  if (stepIndex === 0) return statuses.has('reading') || statuses.has('generating') || statuses.has('saving') || statuses.has('complete');
  if (stepIndex === 1) return statuses.has('generating') || statuses.has('saving') || statuses.has('complete');
  if (stepIndex === 2) return statuses.has('saving') || statuses.has('complete') || messages.filter((m) => m.status === 'generating').length >= 2;
  if (stepIndex === 3) return statuses.has('saving') || statuses.has('complete');
  if (stepIndex === 4) return statuses.has('complete');
  return false;
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
        if (doc) {
          const h = doc.documentElement.scrollHeight;
          if (h > 200) setHeight(h + 40);
        }
      } catch {
        // sandboxed — keep default
      }
    };

    iframe.addEventListener('load', onLoad);

    // Also try after a short delay for dynamic content
    const timer = setTimeout(() => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          const h = doc.documentElement.scrollHeight;
          if (h > 200) setHeight(h + 40);
        }
      } catch {
        // ignore
      }
    }, 2000);

    return () => {
      iframe.removeEventListener('load', onLoad);
      clearTimeout(timer);
    };
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      title="Visual lesson preview"
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin allow-modals"
      scrolling="yes"
      loading="eager"
      className="w-full rounded-xl border border-ui-border"
      style={{ height: `${height}px`, minHeight: '700px' }}
    />
  );
}

export default function LessonVisualPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { messages, isStreaming, error: streamError, startStream } = useSSE();
  const [isRejecting, setIsRejecting] = useState(false);

  const {
    data: lesson,
    isLoading,
    isError,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: ['lesson', id],
    queryFn: async () => {
      const res = await apiFetch<Lesson>(`/lessons/${id}`);
      if (!res.ok) throw new Error(res.error ?? 'Failed to load lesson');
      return res.data!;
    },
    enabled: !!id,
  });

  const latestMessage = messages[messages.length - 1]?.message;
  const streamComplete = messages.some((m) => m.status === 'complete');
  const streamFailed = messages.some((m) => m.status === 'error');

  useEffect(() => {
    if (streamComplete && !isStreaming) {
      void refetch();
    }
  }, [streamComplete, isStreaming, refetch]);

  const handleGenerate = () => {
    if (!id) return;
    const token = getAccessToken();
    if (!token) return;
    const apiUrl = getApiBaseUrl();
    const streamUrl = apiUrl
      ? `${apiUrl}/api/lessons/${id}/generate-visual`
      : `/api/lessons/${id}/generate-visual`;
    startStream(streamUrl, token);
  };

  const handleApprove = async () => {
    if (!id) return;
    const res = await apiFetch<Lesson>(`/lessons/${id}/approve-visual`, { method: 'POST' });
    if (res.ok) navigate('/cms/lessons');
  };

  const handleReject = async () => {
    if (!id) return;
    await apiFetch(`/lessons/${id}/reject-visual`, { method: 'POST' });
    await refetch();
  };

  // Fixed: await reject fully before starting generation
  const handleRegenerate = async () => {
    setIsRejecting(true);
    try {
      await handleReject();
    } finally {
      setIsRejecting(false);
    }
    // Small delay to ensure state is updated before streaming starts
    await new Promise((resolve) => setTimeout(resolve, 300));
    handleGenerate();
  };

  const showGenerateUi =
    lesson?.visualStatus === 'NOT_GENERATED' ||
    lesson?.visualStatus === 'REJECTED' ||
    lesson?.visualStatus === 'GENERATING' ||
    !lesson?.visualStatus;

  const showGenerating = isStreaming || isRejecting;

  return (
    <TeacherLayout>
      {isLoading && (
        <div className="mx-auto max-w-2xl animate-pulse rounded-2xl border border-ui-border bg-white p-10">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-ui-subtle" />
          <div className="mx-auto h-6 w-48 rounded bg-ui-subtle" />
          <div className="mx-auto mt-3 h-4 w-64 rounded bg-ui-subtle" />
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-brand-red/30 bg-brand-red/10 p-4 text-brand-red">
          {fetchError instanceof Error ? fetchError.message : 'Failed to load lesson'}
        </div>
      )}

      {lesson && showGenerateUi && !isStreaming && !isRejecting && (
        <div className="mx-auto max-w-2xl rounded-2xl border border-ui-border bg-white p-10 text-center">
          <Sparkles className="mx-auto mb-4 size-16 text-brand-lavender" />
          <h2 className="mb-3 font-serif text-2xl font-semibold">Generate Visual Lesson</h2>
          <p className="mb-6 text-ui-muted">
            Claude AI will read your lesson notes and create a fully interactive animated lesson.
          </p>
          {lesson.notesRawText && (
            <div className="mb-6 max-h-40 overflow-y-auto rounded-xl bg-brand-shell p-4 text-left text-sm">
              {lesson.notesRawText}
            </div>
          )}
          {(streamError || streamFailed) && (
            <p className="mb-4 text-sm text-brand-red">
              {streamError ?? latestMessage ?? 'Generation failed — please try again'}
            </p>
          )}
          <button
            type="button"
            onClick={handleGenerate}
            className="rounded-xl bg-brand-green px-8 py-3 text-lg font-semibold text-white hover:opacity-90"
          >
            ✦ Generate with Claude
          </button>
        </div>
      )}

      {showGenerating && (
        <div className="mx-auto max-w-2xl rounded-2xl border border-ui-border bg-white p-10 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-green border-t-transparent" />
          <p className="mb-6 font-medium text-brand-black">
            {isRejecting ? 'Preparing to regenerate...' : (latestMessage ?? 'Generating visual lesson...')}
          </p>
          {!isRejecting && (
            <div className="flex flex-col gap-2 text-left">
              {PROGRESS_STEPS.map((step, index) => {
                const done = isStepComplete(index, messages);
                return (
                  <div key={step} className="flex items-center gap-2 text-sm">
                    {done ? (
                      <Check className="size-4 shrink-0 text-brand-green" />
                    ) : (
                      <Circle className="size-4 shrink-0 text-ui-muted" />
                    )}
                    <span className={cn(done ? 'text-brand-black' : 'text-ui-muted')}>{step}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {lesson && lesson.visualStatus === 'PENDING_APPROVAL' && !showGenerating && (
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1">
            {lesson.visualHtml && <VisualPreview html={lesson.visualHtml} />}
          </div>
          <div className="w-full shrink-0 rounded-2xl border border-ui-border bg-white p-6 lg:w-80">
            <h3 className="mb-2 font-serif text-xl font-semibold">Review Visual Lesson</h3>
            <span className="mb-4 inline-block rounded-full bg-brand-mustard/20 px-3 py-1 text-sm text-brand-black">
              Pending approval
            </span>
            <p className="mb-6 text-sm text-ui-muted">
              Review the interactive lesson below. Approve to make it live for students.
            </p>
            <button
              type="button"
              onClick={handleApprove}
              className="mb-3 w-full rounded-xl bg-brand-green px-5 py-2.5 font-semibold text-white hover:opacity-90"
            >
              Approve & Publish
            </button>
            <button
              type="button"
              onClick={() => void handleRegenerate()}
              disabled={isRejecting}
              className="mb-3 w-full rounded-xl border-2 border-brand-tangerine px-5 py-2.5 font-semibold text-brand-tangerine hover:opacity-80 disabled:opacity-50"
            >
              {isRejecting ? 'Preparing...' : 'Regenerate'}
            </button>
            <Link to="/cms/lessons" className="text-sm text-ui-muted">
              ← Back to lessons
            </Link>
          </div>
        </div>
      )}

      {lesson && lesson.visualStatus === 'APPROVED' && !showGenerating && (
        <div>
          <div className="mb-4 rounded-xl border border-brand-green bg-brand-green/10 p-4 font-medium text-brand-green">
            ✓ This visual lesson is live for students
          </div>
          {lesson.visualHtml && <VisualPreview html={lesson.visualHtml} />}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => void handleRegenerate()}
              disabled={isRejecting}
              className="rounded-xl border-2 border-brand-tangerine px-5 py-2.5 font-semibold text-brand-tangerine hover:opacity-80 disabled:opacity-50"
            >
              {isRejecting ? 'Preparing...' : 'Regenerate'}
            </button>
            <Link to="/cms/lessons" className="self-center text-sm text-ui-muted">
              ← Back to lessons
            </Link>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
