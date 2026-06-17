import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StudentLayout } from '@/components/layout/RoleLayouts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PageLoader } from '@/components/ui/Loading';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/services/api';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  metadata?: {
    examBoard?: string;
    studyLevel?: string;
    schoolName?: string;
  } | null;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const res = await apiFetch<UserProfile>('/users/me');
      if (!res.ok) throw new Error(res.error ?? 'Failed to load profile');
      return res.data!;
    },
  });

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    setChanging(true);
    const res = await apiFetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setChanging(false);
    if (res.ok) {
      showToast('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      showToast(res.error ?? 'Failed to change password', 'error');
    }
  };

  const joinedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  return (
    <StudentLayout>
      <h1 className="font-serif text-2xl font-bold md:text-3xl">Settings</h1>

      {isLoading && <PageLoader />}

      {profile && (
        <div className="mt-8 space-y-4">
          <Card>
            <h2 className="font-sans text-lg font-semibold">Account</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <dt className="text-ui-muted">Name</dt>
                <dd className="font-medium">
                  {profile.firstName} {profile.lastName}
                </dd>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <dt className="text-ui-muted">Email</dt>
                <dd className="font-medium">{profile.email}</dd>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <dt className="text-ui-muted">Role</dt>
                <dd className="font-medium capitalize">{profile.role.toLowerCase()}</dd>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <dt className="text-ui-muted">Joined</dt>
                <dd className="font-medium">{joinedDate}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="font-sans text-lg font-semibold">Study profile</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <dt className="text-ui-muted">Exam board</dt>
                <dd className="font-medium">{profile.metadata?.examBoard ?? 'Not set'}</dd>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <dt className="text-ui-muted">Grade / level</dt>
                <dd className="font-medium">{profile.metadata?.studyLevel ?? 'Not set'}</dd>
              </div>
              {profile.metadata?.schoolName && (
                <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                  <dt className="text-ui-muted">School</dt>
                  <dd className="font-medium">{profile.metadata.schoolName}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card>
            <h2 className="font-sans text-lg font-semibold">Change password</h2>
            <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
              <Input
                type="password"
                label="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <Input
                type="password"
                label="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
              <Input
                type="password"
                label="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
              <Button type="submit" isLoading={changing}>
                Update password
              </Button>
            </form>
          </Card>
        </div>
      )}

      {!isLoading && !profile && user && (
        <Card className="mt-8">
          <p className="text-ui-muted">{user.email}</p>
        </Card>
      )}
    </StudentLayout>
  );
}
