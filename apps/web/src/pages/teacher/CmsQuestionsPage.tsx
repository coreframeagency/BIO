import { HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TeacherLayout } from '@/components/layout/RoleLayouts';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Loading';

export default function CmsQuestionsPage() {
  return (
    <TeacherLayout>
      <h1 className="font-serif text-2xl font-bold md:text-3xl">Question bank</h1>
      <EmptyState
        className="mt-8"
        icon={HelpCircle}
        title="No questions yet"
        description="Questions are managed per lesson. Create or edit them from the lesson wizard."
        action={
          <Link to="/cms/lessons/new">
            <Button>Create a lesson</Button>
          </Link>
        }
      />
    </TeacherLayout>
  );
}
