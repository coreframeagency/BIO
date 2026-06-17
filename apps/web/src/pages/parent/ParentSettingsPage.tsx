import { ParentLayout } from '@/components/layout/ParentLayout';
import { useAuth } from '@/context/AuthContext';

export default function ParentSettingsPage() {
  const { user } = useAuth();

  return (
    <ParentLayout>
      <div className="min-h-full bg-brand-shell p-4 md:p-8">
        <h1 className="font-serif text-3xl font-bold text-brand-black">Settings</h1>
        <div className="mt-8 rounded-2xl border border-ui-border bg-white p-6">
          <p className="text-sm text-ui-muted">Signed in as</p>
          <p className="mt-1 font-semibold text-brand-black">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-sm text-ui-muted">{user?.email}</p>
        </div>
      </div>
    </ParentLayout>
  );
}
