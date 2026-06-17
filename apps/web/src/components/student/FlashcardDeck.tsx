import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, RotateCcw } from 'lucide-react';
import { API_URL } from '@/services/api';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  order: number;
}

interface Props {
  flashcards: Flashcard[];
  token: string;
}

export default function FlashcardDeck({ flashcards, token }: Props) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [retryIds, setRetryIds] = useState<Set<string>>(new Set());
  const [hasFlippedOnce, setHasFlippedOnce] = useState(false);

  const activeCards = useMemo(
    () => (retryIds.size > 0 ? flashcards.filter((c) => retryIds.has(c.id)) : flashcards),
    [flashcards, retryIds]
  );

  const current = activeCards[index];

  const handleFlip = () => {
    setFlipped((f) => !f);
    if (!hasFlippedOnce) setHasFlippedOnce(true);
  };

  const handleResult = async (result: 'easy' | 'medium' | 'hard') => {
    if (!current) return;
    setResults((prev) => ({ ...prev, [current.id]: result }));
    try {
      await fetch(`${API_URL}/api/flashcards/${current.id}/attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ result }),
      });
    } catch {
      // attempt is best-effort
    }
    if (index + 1 >= activeCards.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      setFlipped(false);
    }
  };

  const restart = () => {
    setIndex(0);
    setFlipped(false);
    setResults({});
    setDone(false);
    setHasFlippedOnce(false);
  };

  const handleStudyAgain = () => {
    setRetryIds(new Set());
    restart();
  };

  const handleRetryHard = () => {
    const ids = new Set(
      Object.entries(results)
        .filter(([, v]) => v === 'hard')
        .map(([k]) => k)
    );
    setRetryIds(ids);
    setIndex(0);
    setFlipped(false);
    setResults({});
    setDone(false);
    setHasFlippedOnce(false);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && index > 0) {
        setIndex((i) => i - 1);
        setFlipped(false);
      }
      if (e.key === 'ArrowRight' && index < activeCards.length - 1) {
        setIndex((i) => i + 1);
        setFlipped(false);
      }
      if (e.key === ' ') {
        e.preventDefault();
        setFlipped((f) => !f);
        if (!hasFlippedOnce) setHasFlippedOnce(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [index, activeCards.length, hasFlippedOnce]);

  const easy = Object.values(results).filter((r) => r === 'easy').length;
  const medium = Object.values(results).filter((r) => r === 'medium').length;
  const hard = Object.values(results).filter((r) => r === 'hard').length;

  if (activeCards.length === 0) {
    return <p className="text-center text-sm text-ui-muted">No flashcards to study.</p>;
  }

  if (!current) return null;

  if (done) {
    const masteryPct =
      flashcards.length > 0 ? Math.round((easy / flashcards.length) * 100) : 0;

    return (
      <div className="py-6">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-brand-green/10">
            <CheckCircle className="text-brand-green" size={32} />
          </div>
          <h3 className="font-serif text-2xl font-bold text-brand-black">Deck complete!</h3>
          <p className="mt-1 text-sm text-ui-muted">{flashcards.length} cards reviewed</p>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-brand-green/10 p-4 text-center">
            <p className="font-serif text-3xl font-bold text-brand-green">{easy}</p>
            <p className="mt-1 text-xs font-semibold text-brand-green">Easy</p>
            <p className="text-[10px] text-ui-muted">Nailed it</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4 text-center">
            <p className="font-serif text-3xl font-bold text-amber-500">{medium}</p>
            <p className="mt-1 text-xs font-semibold text-amber-600">Getting there</p>
            <p className="text-[10px] text-ui-muted">Almost</p>
          </div>
          <div className="rounded-2xl bg-red-50 p-4 text-center">
            <p className="font-serif text-3xl font-bold text-red-500">{hard}</p>
            <p className="mt-1 text-xs font-semibold text-red-500">Hard</p>
            <p className="text-[10px] text-ui-muted">Keep practising</p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-ui-border bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-brand-black">Session score</span>
            <span className="text-sm font-bold text-brand-green">{masteryPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ui-border">
            <div
              className="h-full rounded-full bg-brand-green transition-all"
              style={{ width: `${masteryPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-ui-muted">
            {easy === flashcards.length
              ? '🎉 Perfect score! You know this topic well.'
              : hard > 0
                ? `Focus on the ${hard} hard card${hard > 1 ? 's' : ''} next time.`
                : 'Good work — keep it up!'}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleStudyAgain}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-brand-green py-3 text-sm font-semibold text-brand-green transition hover:bg-brand-green/5"
          >
            <RotateCcw size={15} /> Study again
          </button>
          {hard > 0 && (
            <button
              type="button"
              onClick={handleRetryHard}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-green py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Retry hard cards
            </button>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-ui-muted">Results saved to your progress</p>
      </div>
    );
  }

  return (
    <div className="select-none">
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (index > 0) {
              setIndex((i) => i - 1);
              setFlipped(false);
            }
          }}
          disabled={index === 0}
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-ui-border bg-white text-ui-muted transition hover:border-brand-green hover:text-brand-green disabled:opacity-30"
          aria-label="Previous card"
        >
          <ChevronLeft size={15} />
        </button>

        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-ui-muted">
              Card {index + 1} of {activeCards.length}
            </span>
            <span className="text-xs font-medium text-brand-green">
              {Object.keys(results).length} rated
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ui-border">
            <div
              className="h-full rounded-full bg-brand-green transition-all duration-300"
              style={{ width: `${(index / activeCards.length) * 100}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (index < activeCards.length - 1) {
              setIndex((i) => i + 1);
              setFlipped(false);
            }
          }}
          disabled={index === activeCards.length - 1 || !results[current.id]}
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-ui-border bg-white text-ui-muted transition hover:border-brand-green hover:text-brand-green disabled:opacity-30"
          aria-label="Next card"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div
        className="flashcard w-full cursor-pointer"
        style={{ position: 'relative' }}
        onClick={handleFlip}
      >
        <div className={`flashcard-inner ${flipped ? 'flipped' : ''}`}>
          <div className="flashcard-front absolute inset-0 flex flex-col justify-between rounded-2xl border border-ui-border bg-white p-8">
            <div className="flex items-start justify-between">
              <span className="rounded-full bg-brand-lavender/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand-lavender">
                Term
              </span>
              <span className="text-xs text-ui-muted">
                {index + 1} / {activeCards.length}
              </span>
            </div>
            <div className="flex flex-1 items-center justify-center py-6">
              <p className="text-center font-serif text-2xl leading-relaxed text-brand-black">
                {current.front}
              </p>
            </div>
            <p
              className={`text-center text-xs text-ui-muted transition-all ${
                !hasFlippedOnce && index === 0 ? 'animate-pulse' : ''
              }`}
            >
              Tap to reveal · Space to flip
            </p>
          </div>

          <div className="flashcard-back absolute inset-0 flex flex-col justify-between rounded-2xl border border-brand-green/30 bg-brand-shell p-8">
            <div className="flex items-start justify-between">
              <span className="rounded-full bg-brand-green/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand-green">
                Definition
              </span>
              <span className="text-xs text-ui-muted">
                {index + 1} / {activeCards.length}
              </span>
            </div>
            <div className="flex flex-1 items-center justify-center py-6">
              <p className="text-center text-base leading-relaxed text-brand-black">
                {current.back}
              </p>
            </div>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => handleResult('hard')}
                className="flex-1 rounded-xl border-2 border-red-200 py-2.5 text-xs font-semibold text-red-500 transition-all hover:bg-red-50 active:scale-95 sm:text-sm"
              >
                Hard
              </button>
              <button
                type="button"
                onClick={() => handleResult('medium')}
                className="flex-1 rounded-xl border-2 border-amber-200 py-2.5 text-xs font-semibold text-amber-600 transition-all hover:bg-amber-50 active:scale-95 sm:text-sm"
              >
                Getting there
              </button>
              <button
                type="button"
                onClick={() => handleResult('easy')}
                className="flex-1 rounded-xl bg-brand-green py-2.5 text-xs font-semibold text-white transition-all hover:bg-brand-greenDark active:scale-95 sm:text-sm"
              >
                Easy ✓
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-ui-muted">Space to flip · Arrow keys to navigate</p>
    </div>
  );
}
