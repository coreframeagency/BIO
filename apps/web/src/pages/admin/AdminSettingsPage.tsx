import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { apiFetch } from '@/services/api';

export default function AdminSettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState(
    "Markly is currently under maintenance. We'll be back shortly."
  );
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const saveMaintenance = useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/admin/settings/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          enabled: maintenanceMode,
          message: maintenanceMsg,
        }),
      });
      if (!res.ok) throw new Error(res.error ?? 'Failed');
      return res.data;
    },
    onSuccess: () => showToast('Settings saved'),
  });

  return (
    <AdminLayout>
      <h1 className="font-serif text-3xl font-bold text-brand-black">
        Settings
      </h1>
      <p className="mt-1 text-ui-muted">Manage your platform</p>

      {toast && (
        <div className="mt-4 rounded-xl border border-brand-green/30
          bg-brand-green/10 px-4 py-3 text-sm font-medium text-brand-green">
          {toast}
        </div>
      )}

      <div className="mt-8 space-y-5">

        {/* Maintenance mode */}
        <div className="rounded-2xl border border-ui-border bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-lg font-semibold
                text-brand-black">
                Maintenance mode
              </h2>
              <p className="mt-1 text-sm text-ui-muted max-w-md">
                When enabled, students see a maintenance message
                instead of the site. Teachers and admin can still
                log in normally.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMaintenanceMode((v) => !v)}
              className={[
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer',
                'rounded-full border-2 border-transparent transition-colors',
                'focus:outline-none',
                maintenanceMode ? 'bg-brand-green' : 'bg-ui-border',
              ].join(' ')}
            >
              <span className={[
                'inline-block h-5 w-5 rounded-full bg-white shadow',
                'transform transition-transform',
                maintenanceMode ? 'translate-x-5' : 'translate-x-0',
              ].join(' ')} />
            </button>
          </div>
          {maintenanceMode && (
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium
                text-brand-black">
                Message shown to students
              </label>
              <textarea
                value={maintenanceMsg}
                onChange={(e) => setMaintenanceMsg(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-ui-border px-3
                  py-2.5 text-sm focus:border-brand-green focus:outline-none
                  resize-none"
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => saveMaintenance.mutate()}
            disabled={saveMaintenance.isPending}
            className="mt-4 rounded-xl bg-brand-green px-5 py-2
              text-sm font-semibold text-white hover:opacity-90
              disabled:opacity-50"
          >
            {saveMaintenance.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>

        {/* Platform info */}
        <div className="rounded-2xl border border-ui-border bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-brand-black">
            Platform info
          </h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between border-b border-ui-border py-2">
              <span className="text-ui-muted">Site URL</span>
              <span className="font-medium text-brand-black">
                markly.live
              </span>
            </div>
            <div className="flex justify-between border-b border-ui-border py-2">
              <span className="text-ui-muted">Contact email</span>
              <span className="font-medium text-brand-black">
                learnwithmarkly@gmail.com
              </span>
            </div>
            <div className="flex justify-between border-b border-ui-border py-2">
              <span className="text-ui-muted">Payment gateway</span>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5
                text-xs font-semibold text-amber-700">
                Pending approval
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-ui-muted">First lesson</span>
              <span className="rounded-full bg-brand-green/10 px-2.5
                py-0.5 text-xs font-semibold text-brand-green">
                Always free
              </span>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="rounded-2xl border border-ui-border bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-brand-black
            mb-4">
            Quick actions
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <a href="/admin/announcements"
              className="flex items-center gap-3 rounded-xl border
                border-ui-border p-4 hover:border-brand-green/40
                hover:bg-ui-subtle transition">
              <span className="text-xl">📢</span>
              <div>
                <p className="font-medium text-brand-black text-sm">
                  Post announcement
                </p>
                <p className="text-xs text-ui-muted">
                  Notify all students
                </p>
              </div>
            </a>
            <a href="/admin/subjects"
              className="flex items-center gap-3 rounded-xl border
                border-ui-border p-4 hover:border-brand-green/40
                hover:bg-ui-subtle transition">
              <span className="text-xl">📚</span>
              <div>
                <p className="font-medium text-brand-black text-sm">
                  Manage subjects
                </p>
                <p className="text-xs text-ui-muted">
                  Toggle availability
                </p>
              </div>
            </a>
            <a href="/admin/pricing"
              className="flex items-center gap-3 rounded-xl border
                border-ui-border p-4 hover:border-brand-green/40
                hover:bg-ui-subtle transition">
              <span className="text-xl">💰</span>
              <div>
                <p className="font-medium text-brand-black text-sm">
                  Update pricing
                </p>
                <p className="text-xs text-ui-muted">
                  Set subject and paper prices
                </p>
              </div>
            </a>
            <a href="/admin/students"
              className="flex items-center gap-3 rounded-xl border
                border-ui-border p-4 hover:border-brand-green/40
                hover:bg-ui-subtle transition">
              <span className="text-xl">🎓</span>
              <div>
                <p className="font-medium text-brand-black text-sm">
                  Grant free access
                </p>
                <p className="text-xs text-ui-muted">
                  Give a student free subject access
                </p>
              </div>
            </a>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
