import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, Loader2, X } from 'lucide-react';
import { apiFetch } from '@/services/api';
import type { AttemptResponse, McqOptionsData, Question, TableDataJson } from '@/types/question';
import { cn } from '@/utils/helpers';

const TYPE_LABELS: Record<string, string> = {
  MCQ: 'Multiple choice',
  MULTIPLE_SELECT: 'Multiple select',
  SHORT_ANSWER: 'Short answer',
  LONG_ANSWER: 'Long answer',
  TRUE_FALSE: 'True / False',
  FILL_BLANK: 'Fill in the blank',
  CALCULATION: 'Calculation',
  DATA_ANALYSIS: 'Data analysis',
  LABEL_DIAGRAM: 'Label diagram',
  MATCHING: 'Matching',
};

const DIFFICULTY_STYLES: Record<string, string> = {
  EASY: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HARD: 'bg-red-100 text-red-700',
};

function FeedbackBlock({
  attempt,
}: {
  attempt: AttemptResponse;
}) {
  const result =
    attempt.result ??
    (attempt.isCorrect === true
      ? 'CORRECT'
      : attempt.isCorrect === false
        ? 'INCORRECT'
        : attempt.marksAwarded && attempt.maxMarks && attempt.marksAwarded < attempt.maxMarks
          ? 'PARTIAL'
          : 'SELF_MARKED');

  if (result === 'CORRECT') {
    return (
      <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-2 font-medium text-green-800">
          <Check className="size-5" />
          Correct! {attempt.marksAwarded}/{attempt.maxMarks} marks
        </div>
        {attempt.feedback && <p className="mt-2 text-sm text-green-700">{attempt.feedback}</p>}
        {attempt.explanation && (
          <p className="mt-2 text-sm text-green-800">{attempt.explanation}</p>
        )}
      </div>
    );
  }

  if (result === 'PARTIAL') {
    return (
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="font-medium text-amber-900">
          Partially correct — {attempt.marksAwarded}/{attempt.maxMarks} marks
        </p>
        {attempt.feedback && <p className="mt-2 text-sm text-amber-800">{attempt.feedback}</p>}
        {attempt.modelAnswer && (
          <p className="mt-2 text-sm text-amber-900">
            <span className="font-medium">Model answer: </span>
            {attempt.modelAnswer}
          </p>
        )}
      </div>
    );
  }

  if (result === 'INCORRECT') {
    return (
      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 font-medium text-red-800">
          <X className="size-5" />
          Not quite
        </div>
        {attempt.feedback && <p className="mt-2 text-sm text-red-700">{attempt.feedback}</p>}
        {attempt.explanation && (
          <p className="mt-2 text-sm text-red-800">{attempt.explanation}</p>
        )}
        {attempt.modelAnswer && (
          <p className="mt-2 text-sm text-red-900">
            <span className="font-medium">Model answer: </span>
            {attempt.modelAnswer}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {attempt.feedback && <p className="text-sm text-ui-muted">{attempt.feedback}</p>}
      {attempt.modelAnswer && (
        <div className="rounded-xl border border-ui-border bg-ui-subtle p-4">
          <p className="text-xs font-medium uppercase text-ui-muted">Model answer</p>
          <p className="mt-2 text-sm text-brand-black">{attempt.modelAnswer}</p>
        </div>
      )}
    </div>
  );
}

function DataTableDisplay({ tableData }: { tableData: TableDataJson }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-ui-border">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {tableData.data.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td
                  key={c}
                  className={cn(
                    'min-w-[100px] border border-ui-border px-3 py-2',
                    tableData.hasHeader && r === 0
                      ? 'bg-brand-green/10 font-semibold text-brand-black'
                      : 'bg-white text-brand-black'
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
  );
}

function QuestionTimer({
  totalSeconds,
  onExpire,
  paused,
}: {
  totalSeconds: number;
  onExpire: () => void;
  paused?: boolean;
}) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const expiredRef = useRef(false);

  useEffect(() => {
    setRemaining(totalSeconds);
    expiredRef.current = false;
  }, [totalSeconds]);

  useEffect(() => {
    if (paused) return;
    if (remaining <= 0) {
      if (!expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
      return;
    }
    const timer = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(timer);
  }, [remaining, paused, onExpire]);

  const pct = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const mins = Math.floor(Math.max(0, remaining) / 60);
  const secs = Math.max(0, remaining) % 60;

  return (
    <span
      className={cn(
        'rounded-lg px-2.5 py-1 text-sm font-semibold tabular-nums',
        pct > 0.5 && 'bg-green-50 text-green-600',
        pct <= 0.5 && pct > 0.25 && 'bg-amber-50 text-amber-600',
        pct <= 0.25 && 'animate-pulse bg-red-50 text-red-600'
      )}
    >
      {mins}:{secs.toString().padStart(2, '0')}
    </span>
  );
}

export function PracticeQuestionCard({ question, index }: { question: Question; index: number }) {
  const [answer, setAnswer] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [multiSelected, setMultiSelected] = useState<number[]>([]);
  const [blankAnswers, setBlankAnswers] = useState<string[]>([]);
  const [working, setWorking] = useState('');
  const [finalAnswer, setFinalAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [attemptResult, setAttemptResult] = useState<AttemptResponse | null>(null);
  const [selfRating, setSelfRating] = useState<string | null>(null);
  const [timeUp, setTimeUp] = useState(false);

  const mcq = (question.mcqOptions ?? {}) as McqOptionsData;
  const options = mcq.options ?? [];

  const blankParts = useMemo(() => {
    if (question.type !== 'FILL_BLANK') return null;
    return question.questionText.split(/_{3,}/);
  }, [question.questionText, question.type]);

  useEffect(() => {
    if (blankParts) {
      setBlankAnswers(Array(blankParts.length - 1).fill(''));
    }
  }, [blankParts]);

  const submit = useMutation({
    mutationFn: async (payload: {
      studentAnswer: string;
      selfRating?: string;
      timeTaken?: number;
    }) => {
      const res = await apiFetch<AttemptResponse>(`/questions/${question.id}/attempt`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(res.error);
      return res.data!;
    },
    onSuccess: (data) => {
      setAttemptResult(data);
      setSubmitted(true);
    },
  });

  const toggleMulti = (idx: number) => {
    setMultiSelected((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const getStudentAnswer = useCallback((): string | null => {
    switch (question.type) {
      case 'MCQ':
      case 'LABEL_DIAGRAM':
      case 'DATA_ANALYSIS':
      case 'MATCHING':
        return selected !== null ? String(selected) : answer || null;
      case 'MULTIPLE_SELECT':
        return multiSelected.length > 0 ? JSON.stringify(multiSelected) : null;
      case 'TRUE_FALSE':
        return answer || null;
      case 'FILL_BLANK':
        return blankAnswers.some((b) => b.trim()) ? JSON.stringify(blankAnswers) : null;
      case 'CALCULATION':
        return finalAnswer.trim()
          ? JSON.stringify({ working, answer: finalAnswer })
          : null;
      case 'SHORT_ANSWER':
      case 'LONG_ANSWER':
        return answer.trim() || null;
      default:
        return answer.trim() || null;
    }
  }, [
    question.type,
    selected,
    answer,
    multiSelected,
    blankAnswers,
    working,
    finalAnswer,
  ]);

  const handleTimerExpire = useCallback(() => {
    if (submitted || submit.isPending) return;
    const studentAnswer = getStudentAnswer();
    if (studentAnswer) {
      submit.mutate({ studentAnswer, timeTaken: question.timerSeconds ?? undefined });
    } else {
      setTimeUp(true);
    }
  }, [submitted, submit, getStudentAnswer, question.timerSeconds]);

  return (
    <div className="relative mb-4 rounded-xl border border-ui-border p-5">
      {question.timerSeconds && !submitted && (
        <div className="absolute right-4 top-4 z-10">
          <QuestionTimer
            totalSeconds={question.timerSeconds}
            onExpire={handleTimerExpire}
            paused={submitted}
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 pr-20">
        <span className="rounded-lg bg-brand-green px-2 py-0.5 text-xs font-bold text-white">
          Q{index + 1}
        </span>
        <span className="rounded-full bg-ui-subtle px-2 py-0.5 text-xs text-ui-muted">
          {TYPE_LABELS[question.type] ?? question.type}
        </span>
        <span className="rounded-full bg-brand-mustard/20 px-2 py-0.5 text-xs text-brand-black">
          {question.marks} mark{question.marks !== 1 ? 's' : ''}
        </span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            DIFFICULTY_STYLES[question.difficulty] ?? 'bg-ui-subtle text-ui-muted'
          )}
        >
          {question.difficulty.charAt(0) + question.difficulty.slice(1).toLowerCase()}
        </span>
      </div>

      {timeUp && !submitted && (
        <p className="mt-2 text-sm font-medium text-red-600">Time&apos;s up!</p>
      )}

      {question.questionImageUrl && (
        <img
          src={question.questionImageUrl}
          alt=""
          className="mt-4 max-h-48 rounded-lg border border-ui-border object-contain"
        />
      )}

      {question.type === 'DATA_ANALYSIS' && question.tableData && (
        <div className="mb-4 mt-3">
          <DataTableDisplay tableData={question.tableData} />
        </div>
      )}

      {question.type !== 'FILL_BLANK' ? (
        <p className="mb-4 mt-3 font-medium text-brand-black">{question.questionText}</p>
      ) : (
        <div className="mb-4 mt-3 font-medium text-brand-black">
          {blankParts?.map((part, i) => (
            <span key={i}>
              {part}
              {i < blankParts.length - 1 && (
                <input
                  type="text"
                  disabled={submitted}
                  value={blankAnswers[i] ?? ''}
                  onChange={(e) => {
                    const next = [...blankAnswers];
                    next[i] = e.target.value;
                    setBlankAnswers(next);
                  }}
                  className={cn(
                    'mx-1 inline-block w-32 rounded border px-2 py-1 text-sm',
                    submitted &&
                      attemptResult?.blankResults?.[i]?.correct &&
                      'border-green-500 bg-green-50',
                    submitted &&
                      attemptResult?.blankResults?.[i] &&
                      !attemptResult.blankResults[i].correct &&
                      'border-red-500 bg-red-50'
                  )}
                />
              )}
            </span>
          ))}
        </div>
      )}

      {(question.type === 'MCQ' ||
        question.type === 'LABEL_DIAGRAM' ||
        question.type === 'DATA_ANALYSIS' ||
        question.type === 'MATCHING') &&
        options.length > 0 && (
          <div className="space-y-2">
            {options.map((opt, i) => (
              <button
                key={i}
                type="button"
                disabled={submitted}
                onClick={() => {
                  setSelected(i);
                  setAnswer(String(i));
                }}
                className={cn(
                  'w-full rounded-xl border border-ui-border px-4 py-3 text-left transition-colors',
                  selected === i && 'border-brand-green bg-brand-green/10',
                  !submitted && 'hover:border-brand-green hover:bg-brand-green/5'
                )}
              >
                <span className="mr-2 font-medium text-ui-muted">
                  {String.fromCharCode(65 + i)}.
                </span>
                {opt}
              </button>
            ))}
            {!submitted && selected !== null && (
              <button
                type="button"
                onClick={() => submit.mutate({ studentAnswer: answer })}
                disabled={submit.isPending}
                className="mt-2 rounded-xl bg-brand-green px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
              >
                {submit.isPending ? 'Checking...' : 'Check answer'}
              </button>
            )}
          </div>
        )}

      {question.type === 'MULTIPLE_SELECT' && options.length > 0 && (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <label
              key={i}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl border border-ui-border px-4 py-3',
                multiSelected.includes(i) && 'border-brand-green bg-brand-green/10'
              )}
            >
              <input
                type="checkbox"
                disabled={submitted}
                checked={multiSelected.includes(i)}
                onChange={() => toggleMulti(i)}
                className="size-4 accent-brand-green"
              />
              <span>{opt}</span>
            </label>
          ))}
          {!submitted && (
            <button
              type="button"
              onClick={() =>
                submit.mutate({ studentAnswer: JSON.stringify(multiSelected) })
              }
              disabled={multiSelected.length === 0 || submit.isPending}
              className="mt-2 rounded-xl bg-brand-green px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
            >
              Check answers
            </button>
          )}
        </div>
      )}

      {question.type === 'TRUE_FALSE' && (
        <div className="flex gap-3">
          {(['true', 'false'] as const).map((val) => (
            <button
              key={val}
              type="button"
              disabled={submitted}
              onClick={() => {
                setAnswer(val);
                submit.mutate({ studentAnswer: val });
              }}
              className={cn(
                'flex-1 rounded-xl border-2 py-4 text-lg font-semibold transition-colors',
                val === 'true'
                  ? 'border-green-300 hover:bg-green-50'
                  : 'border-red-300 hover:bg-red-50',
                submitted && answer === val && 'ring-2 ring-brand-green'
              )}
            >
              {val === 'true' ? 'TRUE ✓' : 'FALSE ✗'}
            </button>
          ))}
        </div>
      )}

      {question.type === 'SHORT_ANSWER' && (
        <>
          <textarea
            className="min-h-[100px] w-full resize-none rounded-xl border border-ui-border p-4 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
            placeholder="Write your answer here..."
            value={answer}
            disabled={submitted}
            onChange={(e) => setAnswer(e.target.value)}
          />
          {!submitted && (
            <button
              type="button"
              onClick={() => submit.mutate({ studentAnswer: answer })}
              disabled={!answer.trim() || submit.isPending}
              className="mt-3 flex items-center gap-2 rounded-xl bg-brand-green px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
            >
              {submit.isPending && <Loader2 className="size-4 animate-spin" />}
              {submit.isPending ? 'Claude is marking your answer...' : 'Submit for marking'}
            </button>
          )}
        </>
      )}

      {question.type === 'LONG_ANSWER' && (
        <>
          <textarea
            className="min-h-[160px] w-full resize-none rounded-xl border border-ui-border p-4 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
            placeholder="Write your extended answer here..."
            value={answer}
            disabled={submitted}
            onChange={(e) => setAnswer(e.target.value)}
          />
          {!submitted && (
            <button
              type="button"
              onClick={() => submit.mutate({ studentAnswer: answer })}
              disabled={!answer.trim() || submit.isPending}
              className="mt-3 rounded-xl bg-brand-green px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
            >
              I&apos;ve finished writing
            </button>
          )}
          {submitted && !selfRating && (
            <div className="mt-4">
              <p className="text-sm font-medium text-brand-black">How did you do?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(['poor', 'okay', 'good', 'excellent'] as const).map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => {
                      setSelfRating(rating);
                      submit.mutate({ studentAnswer: answer, selfRating: rating });
                    }}
                    className="rounded-xl border border-ui-border px-4 py-2 text-sm capitalize hover:bg-brand-shell"
                  >
                    {rating}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {question.type === 'FILL_BLANK' && !submitted && (
        <button
          type="button"
          onClick={() => submit.mutate({ studentAnswer: JSON.stringify(blankAnswers) })}
          disabled={submit.isPending}
          className="rounded-xl bg-brand-green px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
        >
          Check answers
        </button>
      )}

      {question.type === 'CALCULATION' && (
        <>
          <textarea
            className="mb-3 min-h-[80px] w-full resize-none rounded-xl border border-ui-border p-4"
            placeholder="Show your working..."
            value={working}
            disabled={submitted}
            onChange={(e) => setWorking(e.target.value)}
          />
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-xl border border-ui-border px-4 py-2"
              placeholder="Final answer"
              value={finalAnswer}
              disabled={submitted}
              onChange={(e) => setFinalAnswer(e.target.value)}
            />
            <input
              type="text"
              className="w-24 rounded-xl border border-ui-border px-4 py-2"
              placeholder="Units"
              disabled={submitted}
              defaultValue={mcq.units ?? ''}
              readOnly
            />
          </div>
          {!submitted && (
            <button
              type="button"
              onClick={() =>
                submit.mutate({
                  studentAnswer: JSON.stringify({ working, answer: finalAnswer }),
                })
              }
              disabled={!finalAnswer.trim() || submit.isPending}
              className="mt-3 rounded-xl bg-brand-green px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
            >
              Check answer
            </button>
          )}
        </>
      )}

      {submitted && attemptResult && <FeedbackBlock attempt={attemptResult} />}
    </div>
  );
}
