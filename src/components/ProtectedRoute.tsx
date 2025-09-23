import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePreviewRole } from '@/lib/rolePreview';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: string[];
  roles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireRole,
  roles
}) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  console.log('ProtectedRoute - loading:', loading, 'user:', !!user);
  
  // Use effective role (preview or real)
  const isPreviewEnabled = import.meta.env.VITE_ENABLE_ROLE_PREVIEW === 'true';
  let effectiveRole: string | null = null;
  
  if (isPreviewEnabled) {
    try {
      const { effectiveRole: previewEffectiveRole } = usePreviewRole();
      effectiveRole = previewEffectiveRole;
    } catch {
      // If preview context is not available, fall back to auth context
      const { userRole } = useAuth();
      effectiveRole = userRole;
    }
  } else {
    const { userRole } = useAuth();
    effectiveRole = userRole;
  }

  if (loading) {
    console.log('ProtectedRoute: Still loading authentication');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const rolesToCheck = requireRole || roles;
  if (rolesToCheck && effectiveRole && !rolesToCheck.includes(effectiveRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You don't have access to this page with your current role.</p>
          <Button 
            onClick={() => navigate('/')}
            className="mr-2"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};