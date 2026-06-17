import { ReactNode } from 'react';
import {
  BarChart2,
  BookOpen,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react';
import { DashboardLayout, NavItem } from './DashboardLayout';

const studentNav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/subjects', label: 'My Subjects', icon: BookOpen },
  { to: '/past-papers', label: 'Past Papers', icon: FileText },
  { to: '/progress', label: 'Progress', icon: BarChart2 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const teacherNav: NavItem[] = [
  { to: '/cms', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/cms/lessons', label: 'Lessons', icon: BookOpen },
  { to: '/cms/questions', label: 'Questions', icon: ClipboardList },
  { to: '/cms/past-papers', label: 'Past Papers', icon: FileText },
  { to: '/cms/students', label: 'Students', icon: Users },
];

export function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout navItems={studentNav} showSearch>
      {children}
    </DashboardLayout>
  );
}

export function TeacherLayout({ children }: { children: ReactNode }) {
  return <DashboardLayout navItems={teacherNav} title="Teacher CMS">{children}</DashboardLayout>;
}

export { ParentLayout } from './ParentLayout';
export { AdminLayout } from './AdminLayout';
