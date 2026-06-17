import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, FolderOpen, GraduationCap, Loader2, Search, X } from 'lucide-react';
import { apiFetch } from '@/services/api';

interface SearchResults {
  lessons: {
    id: string;
    title: string;
    slug: string;
    unitName: string;
    subjectName: string;
    boardName: string;
  }[];
  units: {
    id: string;
    name: string;
    slug: string;
    subjectName: string;
    boardName: string;
    boardSlug: string;
    categorySlug: string;
    gradeSlug: string;
    subjectSlug: string;
  }[];
  subjects: {
    id: string;
    name: string;
    slug: string;
    gradeName: string;
    categoryName: string;
    boardName: string;
    boardSlug: string;
    categorySlug: string;
    gradeSlug: string;
  }[];
}

interface SearchBarProps {
  open: boolean;
  onClose: () => void;
}

function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function SearchBar({ open, onClose }: SearchBarProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => {
      const res = await apiFetch<SearchResults>(`/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) throw new Error(res.error ?? 'Search failed');
      return res.data!;
    },
    enabled: open && debouncedQuery.length >= 2,
  });

  useEffect(() => {
    if (open) {
      setQuery('');
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const hasResults =
    data &&
    (data.lessons.length > 0 || data.units.length > 0 || data.subjects.length > 0);
  const showEmpty = debouncedQuery.length >= 2 && !isLoading && !isFetching && !hasResults;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div
        className="mx-auto mt-16 max-w-lg px-4 md:mt-24"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center gap-3 border-b border-ui-border px-4 py-3">
            <Search className="size-5 shrink-0 text-ui-muted" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search lessons, topics..."
              className="flex-1 bg-transparent text-lg outline-none"
            />
            <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-ui-subtle">
              <X className="size-5 text-ui-muted" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {query.length < 2 && (
              <p className="p-4 text-center text-sm text-ui-muted">Type at least 2 characters</p>
            )}
            {(isLoading || isFetching) && debouncedQuery.length >= 2 && (
              <div className="flex items-center justify-center gap-2 p-6 text-ui-muted">
                <Loader2 className="size-5 animate-spin" />
                Searching...
              </div>
            )}
            {showEmpty && (
              <p className="p-6 text-center text-sm text-ui-muted">No results found</p>
            )}
            {hasResults && data && (
              <div className="space-y-4 p-2">
                {data.lessons.length > 0 && (
                  <section>
                    <p className="px-2 text-xs font-semibold uppercase text-ui-muted">Lessons</p>
                    {data.lessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        type="button"
                        className="flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-ui-subtle"
                        onClick={() => {
                          navigate(`/lessons/${lesson.slug}`);
                          onClose();
                        }}
                      >
                        <BookOpen className="mt-0.5 size-4 shrink-0 text-brand-green" />
                        <div>
                          <p className="font-medium">{lesson.title}</p>
                          <p className="text-xs text-ui-muted">
                            {lesson.boardName} › {lesson.subjectName}
                            {lesson.unitName ? ` › ${lesson.unitName}` : ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </section>
                )}
                {data.units.length > 0 && (
                  <section>
                    <p className="px-2 text-xs font-semibold uppercase text-ui-muted">Units</p>
                    {data.units.map((unit) => (
                      <button
                        key={unit.id}
                        type="button"
                        className="flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-ui-subtle"
                        onClick={() => {
                          navigate(
                            `/subjects/${unit.boardSlug}/${unit.categorySlug}/${unit.gradeSlug}/${unit.subjectSlug}/${unit.slug}`
                          );
                          onClose();
                        }}
                      >
                        <FolderOpen className="mt-0.5 size-4 shrink-0 text-brand-lavender" />
                        <div>
                          <p className="font-medium">{unit.name}</p>
                          <p className="text-xs text-ui-muted">
                            {unit.boardName} › {unit.subjectName}
                          </p>
                        </div>
                      </button>
                    ))}
                  </section>
                )}
                {data.subjects.length > 0 && (
                  <section>
                    <p className="px-2 text-xs font-semibold uppercase text-ui-muted">Subjects</p>
                    {data.subjects.map((subject) => (
                      <button
                        key={subject.id}
                        type="button"
                        className="flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-ui-subtle"
                        onClick={() => {
                          navigate(
                            `/subjects/${subject.boardSlug}/${subject.categorySlug}/${subject.gradeSlug}/${subject.slug}`
                          );
                          onClose();
                        }}
                      >
                        <GraduationCap className="mt-0.5 size-4 shrink-0 text-brand-mustard" />
                        <div>
                          <p className="font-medium">{subject.name}</p>
                          <p className="text-xs text-ui-muted">
                            {subject.boardName} › {subject.categoryName} › {subject.gradeName}
                          </p>
                        </div>
                      </button>
                    ))}
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function useSearchShortcut(onOpen: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpen]);
}
