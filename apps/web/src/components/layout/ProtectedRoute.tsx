import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Role } from '@/types';
import { PageLoader } from '@/components/ui/Loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: Role[];
  requireApprovedTeacher?: boolean;
}

export function ProtectedRoute({
  children,
  roles,
  requireApprovedTeacher,
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader />;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  if (requireApprovedTeacher && user.role === 'TEACHER' && !user.isApproved) {
    return <Navigate to="/cms" replace />;
  }

  return <>{children}</>;
}

export function getRoleHomePath(role: Role): string {
  switch (role) {
    case 'STUDENT':
      return '/dashboard';
    case 'TEACHER':
      return '/cms';
    case 'PARENT':
      return '/parent';
    case 'ADMIN':
      return '/admin';
    default:
      return '/';
  }
}
