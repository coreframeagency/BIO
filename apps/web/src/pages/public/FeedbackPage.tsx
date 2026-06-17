import { useState } from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { apiFetch } from '@/services/api';

type Category = 'Bug' | 'Suggestion' | 'General';

const CATEGORIES: { value: Category; label: string;
  emoji: string; desc: string }[] = [
  {
    value: 'Bug',
    label: 'Bug report',
    emoji: '🐛',
    desc: 'Something is broken or not working',
  },
  {
    value: 'Suggestion',
    label: 'Suggestion',
    emoji: '💡',
    desc: 'An idea to make Markly better',
  },
  {
    value: 'General',
    label: 'General',
    emoji: '💬',
    desc: 'Anything else on your mind',
  },
];

export default function FeedbackPage() {
  const [category, setCategory] =
    useState<Category | ''>('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!category || !message.trim()) {
      setError('Please select a category and write a message.');
      return;
    }
    setLoading(true);
    setError('');
    const res = await apiFetch('/feedback', {
      method: 'POST',
      body: JSON.stringify({ category, message, email }),
    });
    setLoading(false);
    if (res.ok) {
      setSubmitted(true);
    } else {
      setError(res.error ?? 'Something went wrong. Try again.');
    }
  };

  if (submitted) {
    return (
      <PublicLayout>
        <div className="mx-auto flex min-h-[60vh] max-w-md
          flex-col items-center justify-center px-4 py-16
          text-center">
          <div className="text-5xl mb-6">🎉</div>
          <h1 className="font-serif text-3xl font-bold
            text-brand-black">
            Thank you!
          </h1>
          <p className="mt-3 text-ui-muted">
            Your feedback has been received. We read every
            submission and use it to make Markly better.
          </p>
          <a href="/"
            className="mt-8 inline-block rounded-xl
              bg-brand-green px-6 py-3 text-sm font-semibold
              text-white hover:opacity-90">
            Back to home
          </a>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-lg px-4 py-16">

        <h1 className="font-serif text-4xl font-bold
          text-brand-black">
          Share feedback
        </h1>
        <p className="mt-2 text-ui-muted">
          Found a bug? Have a suggestion? We want to hear it.
        </p>

        <div className="mt-10 space-y-6">

          <div>
            <label className="mb-3 block text-sm font-semibold
              text-brand-black">
              What is this about?
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={[
                    'rounded-2xl border-2 p-4 text-left',
                    'transition hover:border-brand-green/40',
                    category === c.value
                      ? 'border-brand-green bg-brand-green/5'
                      : 'border-ui-border bg-white',
                  ].join(' ')}
                >
                  <span className="text-2xl">{c.emoji}</span>
                  <p className="mt-2 text-sm font-semibold
                    text-brand-black">
                    {c.label}
                  </p>
                  <p className="mt-0.5 text-xs text-ui-muted">
                    {c.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold
              text-brand-black">
              Your message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Tell us what happened or what you'd like to see..."
              className="w-full rounded-2xl border border-ui-border
                bg-white px-4 py-3 text-sm text-brand-black
                placeholder:text-ui-muted focus:border-brand-green
                focus:outline-none resize-none"
            />
            <p className="mt-1 text-right text-xs text-ui-muted">
              {message.length} / 2000
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold
              text-brand-black">
              Your email
              <span className="ml-1 font-normal text-ui-muted">
                (optional — so we can follow up)
              </span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-ui-border
                bg-white px-4 py-3 text-sm text-brand-black
                placeholder:text-ui-muted focus:border-brand-green
                focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3
              text-sm text-brand-red">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={loading || !category || !message.trim()}
            onClick={handleSubmit}
            className="w-full rounded-2xl bg-brand-green py-4
              text-sm font-semibold text-white hover:opacity-90
              disabled:opacity-50 transition"
          >
            {loading ? 'Sending…' : 'Send feedback →'}
          </button>

        </div>
      </div>
    </PublicLayout>
  );
}
