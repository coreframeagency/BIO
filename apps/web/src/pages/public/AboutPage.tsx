import { PublicLayout } from '@/components/layout/PublicLayout';
import { Card } from '@/components/ui/Card';

export default function AboutPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-serif text-4xl font-bold">About Exam Platform</h1>
        <Card className="mt-8">
          <p className="text-ui-muted">
            We help students master their exams with AI-generated interactive visual lessons,
            comprehensive notes, practice questions, and past paper resources — organised by exam
            board, subject, and grade.
          </p>
        </Card>
      </div>
    </PublicLayout>
  );
}
