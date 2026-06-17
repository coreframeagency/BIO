import { ReactNode } from 'react';
import {
  BookMarked,
  BookOpen,
  CreditCard,
  DollarSign,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Settings,
  Users,
} from 'lucide-react';
import { DashboardLayout, NavItem } from './DashboardLayout';

const adminNav: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/teachers', label: 'Teachers', icon: GraduationCap },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { to: '/admin/pricing', label: 'Pricing', icon: DollarSign },
  { to: '/admin/content', label: 'Content', icon: BookOpen },
  { to: '/admin/subjects', label: 'Subjects', icon: BookMarked },
  { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/admin/feedback', label: 'Feedback', icon: MessageSquare },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout navItems={adminNav} title="Admin">
      {children}
    </DashboardLayout>
  );
}
