import { ReactNode } from 'react';
import { LayoutDashboard, Settings, Users } from 'lucide-react';
import { DashboardLayout, NavItem } from './DashboardLayout';

const parentNav: NavItem[] = [
  { to: '/parent', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/parent/children', label: 'My Children', icon: Users },
  { to: '/parent/settings', label: 'Settings', icon: Settings },
];

export function ParentLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout navItems={parentNav} title="Parent">
      {children}
    </DashboardLayout>
  );
}
