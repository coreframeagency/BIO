import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Menu, X } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/utils/helpers';

const FEATURES = [
  { icon: '📖', title: 'Complete Notes',
    desc: 'Cambridge & Edexcel notes written by teachers. Structured by topic, unit and grade.',
    color: 'bg-brand-green/20 text-brand-green' },
  { icon: '🎯', title: 'Practice Questions',
    desc: 'MCQ, short answer, calculations — AI marks your answers instantly and gives feedback.',
    color: 'bg-brand-mustard/20 text-amber-700' },
  { icon: '📄', title: 'Past Papers',
    desc: 'Download official past papers and mark schemes. Practice under real exam conditions.',
    color: 'bg-brand-lavender/20 text-brand-lavender' },
  { icon: '🔬', title: 'Visual Lessons',
    desc: 'Interactive diagrams you explore by clicking. Built for Biology, Chemistry and Physics.',
    color: 'bg-brand-sky/30 text-brand-black' },
  { icon: '🃏', title: 'Flashcards',
    desc: 'Flip cards for key terms and definitions. Rate yourself — Hard, Getting there, Easy.',
    color: 'bg-brand-tangerine/20 text-brand-tangerine' },
  { icon: '📊', title: 'Progress Tracking',
    desc: "See exactly which topics you've mastered and which need more work. Share with parents.",
    color: 'bg-brand-pink/30 text-pink-700' },
];

const STEPS = [
  {
    num: 1,
    title: 'Choose your subject',
    desc: 'Edexcel or Cambridge, any grade',
  },
  {
    num: 2,
    title: 'Study smarter',
    desc: 'Notes, visual lessons, flashcards and past papers',
  },
  {
    num: 3,
    title: 'Test yourself',
    desc: 'Practice questions with instant AI feedback',
  },
];

const STEP_COLORS = [
  'bg-brand-mustard text-brand-black',
  'bg-brand-lavender text-white',
  'bg-brand-green text-white',
];

const SUBJECTS = [
  { name: 'Biology', color: 'border-l-brand-green', available: true, slug: 'biology' },
  { name: 'Chemistry', color: 'border-l-brand-lavender', available: false, slug: 'chemistry' },
  { name: 'Physics', color: 'border-l-brand-sky', available: false, slug: 'physics' },
  { name: 'Maths', color: 'border-l-brand-mustard', available: false, slug: 'maths' },
  { name: 'English', color: 'border-l-brand-tangerine', available: false, slug: 'english' },
  { name: 'IELTS', color: 'border-l-pink-400', available: false, slug: 'ielts' },
];

const PARENT_BULLETS = [
  'Real-time progress updates',
  'Topic-by-topic performance breakdown',
  'Study streak and time spent tracking',
];

const PARENT_PROGRESS = [
  { subject: 'Cell Biology', percent: 80 },
  { subject: 'Organisation', percent: 55 },
  { subject: 'Infection & Response', percent: 30 },
];

const PRICING_FEATURES = [
  'All lessons in a subject',
  'Interactive visual lessons',
  'Practice questions with AI marking',
  'Past paper questions',
];

function FadeSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useScrollAnimation<HTMLDivElement>();
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-1.5 font-serif text-xl font-bold text-brand-black">
      Markly
      <span className="size-2 rounded-full bg-brand-green" />
    </Link>
  );
}

type Tab = 'notes' | 'visual' | 'practice' | 'papers';

const HERO_TABS: { id: Tab; label: string }[] = [
  { id: 'notes', label: 'Notes' },
  { id: 'visual', label: 'Visual' },
  { id: 'practice', label: 'Practice' },
  { id: 'papers', label: 'Papers' },
];

const PAST_PAPERS = [
  { name: '2023 Paper 1 (1BI0/1F)', size: '1.2MB' },
  { name: '2023 Paper 2 (1BI0/2F)', size: '980KB' },
  { name: '2022 Paper 1 (1BI0/1H)', size: '1.4MB' },
  { name: '2022 Paper 2 (1BI0/2H)', size: '1.1MB' },
];

function HeroDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('notes');

  return (
    <div className="overflow-hidden rounded-2xl bg-[#0F1A14] shadow-2xl ring-1 ring-white/10">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex shrink-0 gap-1.5">
          <span className="size-2.5 rounded-full bg-[#FF5F57]" />
          <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="size-2.5 rounded-full bg-[#28C840]" />
        </div>
        <div className="flex flex-1 gap-0.5 overflow-x-auto">
          {HERO_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'whitespace-nowrap px-3 py-1 text-xs transition-colors',
                activeTab === tab.id
                  ? 'rounded-md bg-brand-green text-white'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[260px] px-5 py-4">
        {activeTab === 'notes' && (
          <div>
            <p className="text-[10px] text-gray-500">Biology / Unit 1 / Introduction to Cells</p>
            <h3 className="mt-1 text-base font-bold text-white">Cell Structure &amp; Function</h3>
            <div className="mt-3 space-y-1.5 text-xs text-gray-400">
              <p>All living organisms are made of cells — the basic unit of life.</p>
              <p>Animal and plant cells share a nucleus, cytoplasm, and cell membrane.</p>
              <p>Plant cells also have a cell wall, chloroplasts, and a large vacuole.</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['Nucleus', 'Mitochondria', 'Cell wall', 'Chloroplast', 'Ribosome'].map((term) => (
                <span
                  key={term}
                  className="rounded-full bg-brand-green/15 px-2.5 py-0.5 text-[10px] text-brand-green"
                >
                  {term}
                </span>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-brand-mustard/30 bg-brand-mustard/10 px-3 py-2.5">
              <p className="text-[10px] font-semibold text-brand-mustard">Exam tip</p>
              <p className="mt-0.5 text-[10px] text-gray-400">
                Always state whether a feature is in animal, plant, or both cell types.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'visual' && (
          <div>
            <p className="text-[10px] text-gray-500">Interactive — click any organelle</p>
            <svg viewBox="0 0 180 160" className="mx-auto mt-2 h-44 w-48">
              <ellipse
                cx="90"
                cy="80"
                rx="84"
                ry="72"
                fill="none"
                stroke="#245E55"
                strokeWidth="2.5"
                strokeDasharray="6 4"
              />
              <circle cx="78" cy="72" r="28" fill="#808BC5" opacity="0.9" />
              <circle cx="78" cy="72" r="10" fill="#5A6AB5" opacity="0.8" />
              <ellipse cx="134" cy="60" rx="18" ry="10" fill="#EAC119" opacity="0.85" />
              <ellipse cx="130" cy="108" rx="14" ry="8" fill="#EAC119" opacity="0.7" />
              <circle cx="112" cy="80" r="4" fill="#9ED6DF" />
              <circle cx="50" cy="100" r="4" fill="#9ED6DF" />
              <circle cx="60" cy="48" r="3" fill="#9ED6DF" />
              <ellipse cx="90" cy="118" rx="20" ry="12" fill="#EAA7C7" opacity="0.6" />
            </svg>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { label: 'Nucleus', color: '#808BC5' },
                { label: 'Mitochondria', color: '#EAC119' },
                { label: 'Ribosomes', color: '#9ED6DF' },
                { label: 'Vacuole', color: '#EAA7C7' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[10px] text-gray-400">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'practice' && (
          <div>
            <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
              <p className="text-xs text-gray-300">
                Which organelle is responsible for producing energy in the cell?
              </p>
              <div className="mt-3 space-y-1.5">
                {[
                  { letter: 'A', text: 'Nucleus', selected: false },
                  { letter: 'B', text: 'Mitochondria', selected: true },
                  { letter: 'C', text: 'Ribosome', selected: false },
                  { letter: 'D', text: 'Cell wall', selected: false },
                ].map((opt) => (
                  <div
                    key={opt.letter}
                    className={cn(
                      'rounded-lg px-2.5 py-1.5 text-[10px]',
                      opt.selected
                        ? 'bg-brand-green/20 text-brand-green ring-1 ring-brand-green'
                        : 'bg-white/5 text-gray-400'
                    )}
                  >
                    {opt.letter}. {opt.text}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-brand-green/10 px-3 py-2">
              <p className="text-[10px] font-semibold text-brand-green">AI Feedback · Correct!</p>
              <p className="mt-0.5 text-[10px] text-gray-400">
                Mitochondria carry out aerobic respiration to release energy as ATP.
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] text-gray-500">Question 2 of 8</span>
              <div className="flex gap-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span
                    key={i}
                    className={cn('size-1.5 rounded-full', i === 0 ? 'bg-brand-green' : 'bg-white/10')}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'papers' && (
          <div>
            <p className="text-[10px] text-gray-500">Edexcel GCSE Biology — Past Papers</p>
            <div className="mt-3 space-y-2">
              {PAST_PAPERS.map((paper) => (
                <div
                  key={paper.name}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10"
                >
                  <div>
                    <p className="text-xs text-gray-300">{paper.name}</p>
                    <p className="text-[10px] text-gray-500">{paper.size}</p>
                  </div>
                  <span className="rounded-md bg-brand-green/20 px-2 py-0.5 text-[10px] font-semibold text-brand-green">
                    Download
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-white/10 px-5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[65%] rounded-full bg-brand-green" />
          </div>
          <span className="text-[10px] text-gray-500">65% complete</span>
        </div>
        <span className="rounded-full bg-brand-green/20 px-2 py-0.5 text-[10px] font-medium text-brand-green">
          Unit 1 · Biology
        </span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { to: '#notes', label: 'Notes' },
    { to: '#past-papers', label: 'Past Papers' },
    { to: '/pricing', label: 'Pricing' },
    { to: '#parents', label: 'For Parents' },
  ];

  return (
    <div className="min-h-screen bg-ui-bg">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes breathe {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .float-card { animation: float 5s ease-in-out infinite; }
        .breathe { animation: breathe 3s ease-in-out infinite; }
      `}</style>

      {/* Section 1 — Navigation */}
      <header
        className={cn(
          'sticky top-0 z-50 border-b transition-all',
          scrolled
            ? 'border-ui-border/60 bg-white/80 backdrop-blur-md'
            : 'border-transparent bg-transparent'
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <Logo />
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) =>
              link.to.startsWith('/') ? (
                <Link
                  key={link.label}
                  to={link.to}
                  className="text-sm font-medium text-ui-muted transition-colors hover:text-brand-green"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.to}
                  className="text-sm font-medium text-ui-muted transition-colors hover:text-brand-green"
                >
                  {link.label}
                </a>
              )
            )}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/login"
              className="rounded-xl border-2 border-brand-green px-5 py-2 text-sm font-semibold text-brand-green transition-colors hover:bg-brand-green/5"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-xl bg-brand-green px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Start free
            </Link>
          </div>
          <button
            type="button"
            className="rounded-xl p-2 md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-ui-border bg-white px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-3">
              {navLinks.map((link) =>
                link.to.startsWith('/') ? (
                  <Link
                    key={link.label}
                    to={link.to}
                    className="text-sm font-medium text-brand-black"
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.label}
                    href={link.to}
                    className="text-sm font-medium text-brand-black"
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                )
              )}
              <Link to="/login" className="text-sm font-semibold text-brand-green" onClick={() => setMenuOpen(false)}>
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-xl bg-brand-green py-2.5 text-center text-sm font-semibold text-white"
                onClick={() => setMenuOpen(false)}
              >
                Start free
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Section 2 — Hero */}
      <section className="page-enter mx-auto flex min-h-screen max-w-7xl flex-col items-center gap-12 px-4 py-16 md:flex-row md:px-6 lg:py-24">
        <div className="w-full text-center md:w-[55%] md:text-left">
          <span className="inline-block rounded-full bg-brand-green px-4 py-1.5 text-sm font-semibold text-white shadow-sm">
            📚 Cambridge & Edexcel — GCSE · O Level · A Level
          </span>
          <h1 className="mt-6 font-serif text-5xl leading-tight lg:text-6xl">
            <span className="font-normal text-brand-black">Everything you need</span>
            <br />
            <span className="font-bold text-brand-green">to ace your exams.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-ui-muted md:mx-0">
            Complete Cambridge & Edexcel notes, past papers, AI-marked practice questions, and
            interactive visual lessons — all in one place.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center md:justify-start">
            <Link
              to="/register"
              className="rounded-xl bg-brand-green px-8 py-4 text-center text-base font-semibold text-white transition-opacity hover:opacity-90"
            >
              Start studying free →
            </Link>
            <a
              href="#subjects"
              className="rounded-xl border border-ui-border px-8 py-4 text-center text-base font-semibold text-brand-black transition-colors hover:bg-brand-shell"
            >
              View subjects
            </a>
          </div>
          <p className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ui-muted md:justify-start">
            <span className="flex items-center gap-1.5">
              <span className="flex size-4 items-center justify-center rounded-full bg-brand-green text-[10px] text-white font-bold">✓</span>
              Free first lesson
            </span>
            <span className="flex items-center gap-1.5">
              <span className="flex size-4 items-center justify-center rounded-full bg-brand-mustard text-[10px] text-white font-bold">✓</span>
              No card required
            </span>
            <span className="flex items-center gap-1.5">
              <span className="flex size-4 items-center justify-center rounded-full bg-brand-lavender text-[10px] text-white font-bold">✓</span>
              Cambridge & Edexcel
            </span>
          </p>
        </div>

        <div className="flex w-full items-center justify-center md:w-[45%]">
          <div className="float-card w-full max-w-lg">
            <HeroDashboard />
          </div>
        </div>
      </section>

      {/* Section 3 — Feature strip */}
      <FadeSection>
        <section id="notes" className="bg-brand-black py-16">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <h2 className="mb-12 text-center font-serif text-3xl font-bold text-white">
              Everything in one platform
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/20 hover:bg-white/10"
                >
                  <div className={`flex size-12 items-center justify-center rounded-full text-xl ${feature.color}`}>
                    {feature.icon}
                  </div>
                  <h3 className="mt-4 font-serif text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeSection>

      {/* Section 4 — Subjects */}
      <FadeSection>
        <section id="subjects" className="bg-brand-shell py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <h2 className="text-center font-serif text-4xl font-bold text-brand-black">
              Pick your subject,{' '}
              <span className="relative inline-block">
                start today.
                <span className="absolute -bottom-1 left-0 h-1 w-full rounded-full bg-brand-mustard" />
              </span>
            </h2>
            <p className="mt-4 text-center text-ui-muted">
              Edexcel and Cambridge. GCSE, O Level, A Level.
            </p>
            <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-3">
              {SUBJECTS.map((subject) => {
                const inner = (
                  <>
                    <p className="font-serif text-xl font-semibold text-brand-black">
                      {subject.name}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {subject.slug !== 'ielts' && (
                        <span className="rounded-full bg-ui-subtle px-2.5 py-0.5 text-xs text-ui-muted">
                          Cambridge & Edexcel
                        </span>
                      )}
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          subject.available
                            ? 'bg-brand-green/15 text-brand-green'
                            : 'bg-amber-100 text-amber-700'
                        )}
                      >
                        {subject.available ? '✓ Available now' : 'Coming soon'}
                      </span>
                    </div>
                    {subject.available && (
                      <p className="mt-4 text-xs font-medium text-brand-green">
                        Start free lesson →
                      </p>
                    )}
                  </>
                );

                const cardClass = cn(
                  'rounded-2xl border border-ui-border border-l-4 bg-white p-6',
                  'transition-all duration-200',
                  subject.color,
                  subject.available
                    ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5 hover:border-brand-green'
                    : 'opacity-70 cursor-default'
                );

                if (subject.available) {
                  return (
                    <Link key={subject.name} to="/register" className={cardClass}>
                      {inner}
                    </Link>
                  );
                }

                return (
                  <div key={subject.name} className={cardClass} title="Coming soon">
                    {inner}
                  </div>
                );
              })}
            </div>
            <p className="mt-6 text-center text-sm text-ui-muted">More subjects added every month.</p>
          </div>
        </section>
      </FadeSection>

      {/* Section 5 — For Parents */}
      <FadeSection>
        <section id="parents" className="bg-white py-20">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-12 px-4 md:flex-row md:px-6">
            <div className="flex-1">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-green">
                FOR PARENTS
              </p>
              <h2 className="font-serif text-4xl font-bold text-brand-black">
                Know exactly how your child is studying.
              </h2>
              <p className="mt-4 max-w-md text-lg text-ui-muted">
                Link your child&apos;s account and see their progress in real time. Which lessons
                they&apos;ve completed, their quiz scores, and which topics need more attention.
              </p>
              <ul className="mt-6 space-y-3">
                {PARENT_BULLETS.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-brand-black">
                    <Check className="mt-0.5 size-5 shrink-0 text-brand-green" />
                    {item}
                  </li>
                ))}
              </ul>
              <a href="#parents" className="mt-6 inline-block font-semibold text-brand-green">
                Learn more →
              </a>
            </div>
            <div className="w-full flex-1">
              <div className="rounded-2xl border border-ui-border bg-brand-shell p-6">
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-brand-green text-sm font-bold text-white">
                    AS
                  </span>
                  <div>
                    <p className="font-semibold text-brand-black">Alex Student</p>
                    <p className="text-xs text-ui-muted">Edexcel GCSE Biology · Grade 10</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {PARENT_PROGRESS.map((row) => (
                    <div key={row.subject}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-brand-black">{row.subject}</span>
                        <span className="text-ui-muted">{row.percent}% complete</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-ui-subtle">
                        <div
                          className="h-full rounded-full bg-brand-green"
                          style={{ width: `${row.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeSection>

      {/* Section 6 — How it works */}
      <FadeSection>
        <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
          <h2 className="text-center font-serif text-3xl font-bold md:text-4xl">How Markly works</h2>
          <p className="mt-2 text-center text-ui-muted">Three steps to exam success</p>
          <div className="relative mt-12 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
            <div className="absolute left-0 right-0 top-8 hidden h-0.5 bg-brand-green/20 md:block" />
            {STEPS.map((step) => (
              <div key={step.num} className="relative text-center">
                <div
                  className={`relative z-10 mx-auto flex size-10 items-center justify-center rounded-full font-serif text-xl font-bold ${STEP_COLORS[(step.num - 1) % 3]}`}
                >
                  {step.num}
                </div>
                <h3 className="mt-4 font-serif text-lg font-semibold md:text-xl">{step.title}</h3>
                <p className="mt-2 text-sm text-ui-muted md:text-base">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </FadeSection>

      {/* Section 7 — Pricing teaser */}
      <FadeSection>
        <section id="past-papers" className="bg-brand-shell py-20">
          <div className="mx-auto max-w-7xl px-4 text-center md:px-6">
            <h2 className="font-serif text-3xl font-bold md:text-4xl">
              Affordable exam prep. No excuses.
            </h2>
            <p className="mt-2 text-ui-muted">Pay per subject. First lesson always free.</p>
            <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-ui-border bg-white p-8 shadow-lg">
                <p className="text-sm font-medium text-ui-muted">Monthly</p>
                <p className="mt-2 font-serif text-4xl font-bold text-brand-green">
                  LKR 1,499
                  <span className="text-lg font-normal text-ui-muted">/month</span>
                </p>
                <p className="mt-1 text-xs text-ui-muted">per subject</p>
                <ul className="mt-6 space-y-3 text-left text-sm">
                  {PRICING_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="size-4 text-brand-green" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className="mt-6 block w-full rounded-xl bg-brand-green py-3 font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Start free today →
                </Link>
              </div>
              <div className="relative rounded-2xl border-2 border-brand-green bg-white p-8 shadow-lg">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-green px-3 py-0.5 text-xs font-semibold text-white">
                  Save 44%
                </span>
                <p className="text-sm font-medium text-ui-muted">Annual</p>
                <p className="mt-2 font-serif text-4xl font-bold text-brand-green">
                  LKR 9,999
                  <span className="text-lg font-normal text-ui-muted">/year</span>
                </p>
                <p className="mt-1 text-xs text-ui-muted">per subject</p>
                <ul className="mt-6 space-y-3 text-left text-sm">
                  {PRICING_FEATURES.map((f) => (
                    <li key={`annual-${f}`} className="flex items-center gap-2">
                      <Check className="size-4 text-brand-green" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className="mt-6 block w-full rounded-xl border-2 border-brand-green py-3 font-semibold text-brand-green transition-colors hover:bg-brand-green/5"
                >
                  Get annual plan →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </FadeSection>

      {/* Section 8 — Final CTA */}
      <FadeSection>
        <section className="bg-brand-green py-20 text-center text-white">
          <div className="mx-auto max-w-3xl px-4 md:px-6">
            <div className="mb-6 flex justify-center gap-3">
              {['bg-brand-mustard', 'bg-brand-lavender', 'bg-brand-sky', 'bg-brand-tangerine', 'bg-brand-pink'].map((c) => (
                <span key={c} className={`size-3 rounded-full ${c} opacity-80`} />
              ))}
            </div>
            <h2 className="font-serif text-4xl font-bold text-white md:text-5xl">
              Your exams are closer than you think.
            </h2>
            <p className="mt-4 text-xl text-green-200">
              Start with a free lesson today. No card needed.
            </p>
            <Link
              to="/register"
              className="mt-8 inline-block rounded-xl bg-white px-10 py-4 text-lg font-semibold text-brand-green transition-opacity hover:opacity-90"
            >
              Start studying free →
            </Link>
            <p className="mt-4 text-sm text-green-200">
              Join students preparing for Cambridge & Edexcel exams
            </p>
          </div>
        </section>
      </FadeSection>

      {/* Section 9 — Footer */}
      <footer className="bg-brand-black py-12 text-white md:py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="flex items-center gap-1.5 font-serif text-xl font-bold">
                Markly
                <span className="size-2 rounded-full bg-brand-green" />
              </p>
              <p className="mt-2 text-sm text-gray-400">
                Exam prep for Cambridge & Edexcel students.
              </p>
            </div>
            <div>
              <p className="font-semibold">Platform</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-400">
                <li><a href="#notes" className="hover:text-white">Notes</a></li>
                <li><a href="#past-papers" className="hover:text-white">Past Papers</a></li>
                <li><a href="#notes" className="hover:text-white">Visual Lessons</a></li>
                <li><a href="#notes" className="hover:text-white">Flashcards</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">Subjects</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-400">
                <li>Biology</li>
                <li>Chemistry</li>
                <li>Physics</li>
                <li>Maths</li>
                <li>IELTS</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">Support</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-400">
                <li><a href="mailto:support@markly.lk" className="hover:text-white">Contact</a></li>
                <li><a href="#faq" className="hover:text-white">FAQ</a></li>
                <li><a href="#privacy" className="hover:text-white">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>© 2026 Markly. Built for Sri Lankan students.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
