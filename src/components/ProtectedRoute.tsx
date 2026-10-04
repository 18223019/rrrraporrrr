import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'coach' | 'member';
  redirectTo?: string;
}

export const ProtectedRoute = ({ 
  children, 
  requiredRole,
  redirectTo = '/login'
}: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-stone-200">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (requiredRole && role !== requiredRole) {
    // Redirect ke halaman yang sesuai dengan role user
    const destination = role === 'coach' ? '/coach/' : `/${user.uid}`;
    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
};
