import { ParentLayout } from '@/components/layout/RoleLayouts';
import { Card } from '@/components/ui/Card';
import { BlobDecorator } from '@/components/ui/Decorators';
import { useAuth } from '@/context/AuthContext';

export default function ParentDashboardPage() {
  const { user } = useAuth();

  return (
    <ParentLayout>
      <div className="relative overflow-hidden rounded-2xl bg-white p-6">
        <BlobDecorator color="#9ED6DF" className="-right-8 -top-8 h-32 w-32" />
        <h1 className="relative font-serif text-3xl font-bold">Parent dashboard</h1>
        <p className="relative mt-2 text-ui-muted">Overview for {user?.firstName}</p>
      </div>
      <Card className="mt-8" accentColor="#EAA7C7">
        <p className="text-ui-muted">Link student accounts to view their progress here.</p>
      </Card>
    </ParentLayout>
  );
}

export function ParentSettingsPage() {
  return (
    <ParentLayout>
      <h1 className="font-serif text-3xl font-bold">Settings</h1>
    </ParentLayout>
  );
}
