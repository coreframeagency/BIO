import { useQuery } from '@tanstack/react-query';
import { Download, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StudentLayout } from '@/components/layout/RoleLayouts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, PageLoader } from '@/components/ui/Loading';
import { apiFetch } from '@/services/api';

interface PastPaper {
  id: string;
  title: string;
  year: number;
  type: 'EXAM_PAPER' | 'MARK_SCHEME' | 'SPECIMEN';
  pdfUrl: string;
  subject: {
    name: string;
    slug: string;
    grade?: {
      category?: {
        examBoard?: { name: string };
      };
    };
  };
}

const TYPE_LABELS: Record<PastPaper['type'], string> = {
  EXAM_PAPER: 'Exam paper',
  MARK_SCHEME: 'Mark scheme',
  SPECIMEN: 'Specimen',
};

export default function PastPapersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['past-papers'],
    queryFn: async () => {
      const res = await apiFetch<PastPaper[]>('/past-papers');
      if (!res.ok) throw new Error(res.error ?? 'Failed to load past papers');
      return res.data ?? [];
    },
  });

  return (
    <StudentLayout>
      <h1 className="font-serif text-2xl font-bold md:text-3xl">Past papers</h1>
      <p className="mt-1 text-sm text-ui-muted md:text-base">
        Download official exam papers and mark schemes
      </p>

      {isLoading && <PageLoader />}

      {!isLoading && data && data.length > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {data.map((paper) => {
            const boardName = paper.subject.grade?.category?.examBoard?.name ?? 'Exam board';
            return (
              <Card key={paper.id} className="flex flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand-green/10 px-2.5 py-0.5 text-xs font-medium text-brand-green">
                    {paper.subject.name}
                  </span>
                  <span className="rounded-full bg-ui-subtle px-2.5 py-0.5 text-xs text-ui-muted">
                    {boardName}
                  </span>
                  <span className="rounded-full bg-brand-lavender/20 px-2.5 py-0.5 text-xs font-medium text-brand-lavender">
                    {TYPE_LABELS[paper.type]}
                  </span>
                </div>
                <h3 className="mt-3 font-serif text-lg font-semibold">{paper.title}</h3>
                <p className="mt-1 text-sm text-ui-muted">{paper.year}</p>
                <a
                  href={paper.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:underline"
                >
                  <Download className="size-4" />
                  Download PDF
                </a>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <EmptyState
          className="mt-8"
          icon={FileText}
          title="No past papers yet"
          description="No past papers available yet."
          action={
            <Link to="/subjects">
              <Button>Browse subjects</Button>
            </Link>
          }
        />
      )}
    </StudentLayout>
  );
}
