import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TeacherLayout } from '@/components/layout/RoleLayouts';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Loading';
import { apiFetch, streamVisualGeneration } from '@/services/api';
import { Lesson } from '@/types';
import { useState } from 'react';

export default function VisualLessonPage() {
  const { id } = useParams();
  const [progress, setProgress] = useState('');
  const [html, setHtml] = useState('');

  const { data: lesson, isLoading, refetch } = useQuery({
    queryKey: ['lesson', id],
    queryFn: async () => {
      const res = await apiFetch<Lesson>(`/lessons/${id}`);
      if (!res.ok) throw new Error(res.error);
      return res.data!;
    },
    enabled: !!id,
  });

  const generate = async () => {
    if (!id) return;
    await streamVisualGeneration(id, (event) => {
      setProgress(event.message);
      if (event.html) setHtml(event.html);
    });
    refetch();
  };

  const approve = async () => {
    if (!id) return;
    await apiFetch(`/lessons/${id}/approve-visual`, { method: 'POST' });
    refetch();
  };

  const previewHtml = html || lesson?.visualHtml;

  return (
    <TeacherLayout>
      <h1 className="font-serif text-3xl font-bold">Visual lesson</h1>
      {isLoading && <PageLoader />}
      {lesson && (
        <Card className="mt-8">
          <h2 className="font-serif text-xl">{lesson.title}</h2>
          <p className="mt-1 text-sm text-ui-muted">Status: {lesson.visualStatus}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={generate}>Generate with Claude</Button>
            <Button variant="secondary" onClick={generate}>Regenerate</Button>
            <Button variant="ghost" onClick={approve}>Approve</Button>
          </div>
          {progress && <p className="mt-4 text-sm text-brand-green">{progress}</p>}
          {previewHtml && (
            <iframe
              title="Visual preview"
              srcDoc={previewHtml}
              sandbox="allow-scripts"
              className="mt-6 min-h-[500px] w-full rounded-xl border-0"
            />
          )}
        </Card>
      )}
    </TeacherLayout>
  );
}
