import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/RoleLayouts';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Loading';
import { apiFetch } from '@/services/api';

export function AdminUsersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await apiFetch<{ id: string; email: string; firstName: string; lastName: string; role: string }[]>('/admin/users');
      return res.data || [];
    },
  });

  return (
    <AdminLayout>
      <h1 className="font-serif text-3xl font-bold">Users</h1>
      {isLoading && <PageLoader />}
      <div className="mt-8 space-y-3">
        {data?.map((u) => (
          <Card key={u.id} className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{u.firstName} {u.lastName}</p>
              <p className="text-sm text-ui-muted">{u.email}</p>
            </div>
            <Badge>{u.role}</Badge>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}

export function AdminTeachersPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-teachers'],
    queryFn: async () => {
      const res = await apiFetch<{ id: string; user: { firstName: string; lastName: string; email: string } }[]>('/admin/teachers/pending');
      return res.data || [];
    },
  });

  const approve = async (id: string) => {
    await apiFetch(`/admin/teachers/${id}/approve`, { method: 'POST' });
    refetch();
  };

  return (
    <AdminLayout>
      <h1 className="font-serif text-3xl font-bold">Pending teachers</h1>
      {isLoading && <PageLoader />}
      <div className="mt-8 space-y-4">
        {data?.map((t) => (
          <Card key={t.id} className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{t.user.firstName} {t.user.lastName}</p>
              <p className="text-sm text-ui-muted">{t.user.email}</p>
            </div>
            <Button onClick={() => approve(t.id)}>Approve</Button>
          </Card>
        ))}
        {!data?.length && <p className="text-ui-muted">No pending approvals</p>}
      </div>
    </AdminLayout>
  );
}

export function AdminContentPage() {
  return (
    <AdminLayout>
      <h1 className="font-serif text-3xl font-bold">Content moderation</h1>
      <p className="mt-2 text-ui-muted">Review all platform content</p>
    </AdminLayout>
  );
}

export function AdminSubscriptionsPage() {
  return (
    <AdminLayout>
      <h1 className="font-serif text-3xl font-bold">Subscriptions</h1>
    </AdminLayout>
  );
}

export function AdminContentHierarchyPage() {
  return (
    <AdminLayout>
      <h1 className="font-serif text-3xl font-bold">Content hierarchy</h1>
      <p className="mt-2 text-ui-muted">Manage exam boards, subjects, grades, and units via the admin API.</p>
    </AdminLayout>
  );
}
