import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap, Layers, Search, X } from 'lucide-react';
import { API_URL, getAccessToken } from '@/services/api';

interface SearchResult {
  lessons: Array<{
    id: string;
    title: string;
    slug: string;
    unitName: string;
    subjectName: string;
    boardName: string;
    boardSlug: string;
    categorySlug: string;
    gradeSlug: string;
    subjectSlug: string;
    unitSlug: string;
  }>;
  units: Array<{
    id: string;
    name: string;
    slug: string;
    subjectName: string;
    boardName: string;
    boardSlug: string;
    categorySlug: string;
    gradeSlug: string;
    subjectSlug: string;
  }>;
  subjects: Array<{
    id: string;
    name: string;
    slug: string;
    gradeName: string;
    categoryName: string;
    boardName: string;
    boardSlug: string;
    categorySlug: string;
    gradeSlug: string;
  }>;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const token = getAccessToken();
        const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(query)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        setResults(json.data);
      } catch {
        setResults(null);
      }
      setLoading(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!isOpen) return null;

  const hasResults =
    results &&
    (results.lessons.length > 0 || results.units.length > 0 || results.subjects.length > 0);

  const goToLesson = (r: SearchResult['lessons'][0]) => {
    navigate(`/lessons/${r.slug}`);
    onClose();
  };

  const goToUnit = (r: SearchResult['units'][0]) => {
    navigate(
      `/subjects/${r.boardSlug}/${r.categorySlug}/${r.gradeSlug}/${r.subjectSlug}/${r.slug}`
    );
    onClose();
  };

  const goToSubject = (r: SearchResult['subjects'][0]) => {
    navigate(`/subjects/${r.boardSlug}/${r.categorySlug}/${r.gradeSlug}/${r.slug}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-20"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-ui-border px-5 py-4">
          <Search size={18} className="shrink-0 text-ui-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lessons, topics, subjects..."
            className="flex-1 bg-transparent text-base text-brand-black outline-none placeholder:text-ui-muted"
          />
          {loading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-green border-t-transparent" />
          )}
          <button type="button" onClick={onClose} className="text-ui-muted hover:text-brand-black">
            <X size={18} />
          </button>
        </div>

        {query.length < 2 && (
          <div className="px-5 py-8 text-center text-sm text-ui-muted">
            Type at least 2 characters to search
          </div>
        )}

        {query.length >= 2 && !loading && !hasResults && (
          <div className="px-5 py-8 text-center text-sm text-ui-muted">
            No results found for &quot;{query}&quot;
          </div>
        )}

        {hasResults && (
          <div className="max-h-96 overflow-y-auto py-2">
            {results!.lessons.length > 0 && (
              <div>
                <div className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-ui-muted">
                  Lessons
                </div>
                {results!.lessons.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => goToLesson(r)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-brand-shell"
                  >
                    <BookOpen size={16} className="shrink-0 text-brand-green" />
                    <div>
                      <div className="text-sm font-medium text-brand-black">{r.title}</div>
                      <div className="text-xs text-ui-muted">
                        {r.boardName} · {r.subjectName} · {r.unitName}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {results!.units.length > 0 && (
              <div>
                <div className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-ui-muted">
                  Units
                </div>
                {results!.units.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => goToUnit(r)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-brand-shell"
                  >
                    <Layers size={16} className="shrink-0 text-brand-lavender" />
                    <div>
                      <div className="text-sm font-medium text-brand-black">{r.name}</div>
                      <div className="text-xs text-ui-muted">
                        {r.boardName} · {r.subjectName}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {results!.subjects.length > 0 && (
              <div>
                <div className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-ui-muted">
                  Subjects
                </div>
                {results!.subjects.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => goToSubject(r)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-brand-shell"
                  >
                    <GraduationCap size={16} className="shrink-0 text-brand-mustard" />
                    <div>
                      <div className="text-sm font-medium text-brand-black">{r.name}</div>
                      <div className="text-xs text-ui-muted">
                        {r.boardName} · {r.categoryName} · {r.gradeName}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 border-t border-ui-border px-5 py-3 text-xs text-ui-muted">
          <span>↵ to select</span>
          <span>ESC to close</span>
          <span className="ml-auto">⌘K to open</span>
        </div>
      </div>
    </div>
  );
}
