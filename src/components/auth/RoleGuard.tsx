import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ('admin' | 'manager' | 'learner')[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallback,
  redirectTo = '/'
}) => {
  const { userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const hasAccess = userRole && allowedRoles.includes(userRole as any);

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

interface ConditionalRenderProps {
  children: React.ReactNode;
  condition: boolean;
  fallback?: React.ReactNode;
}

export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  children,
  condition,
  fallback = null
}) => {
  return condition ? <>{children}</> : <>{fallback}</>;
};

interface AdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AdminOnly: React.FC<AdminOnlyProps> = ({ children, fallback = null }) => {
  const { isAdmin } = useAuth();
  return <ConditionalRender condition={isAdmin} fallback={fallback}>{children}</ConditionalRender>;
};

interface ManagerOrAdminProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ManagerOrAdmin: React.FC<ManagerOrAdminProps> = ({ children, fallback = null }) => {
  const { isAdmin, isManager } = useAuth();
  return <ConditionalRender condition={isAdmin || isManager} fallback={fallback}>{children}</ConditionalRender>;
};