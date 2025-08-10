import React from 'react';
import { OrganizationSettings } from '@/components/organization/OrganizationSettings';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function OrganizationSettingsPage() {
  const { organization, isOrgAdmin } = useAuth();

  // Redirect if no organization or not admin
  if (!organization) {
    return <Navigate to="/organization/setup" replace />;
  }

  if (!isOrgAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Only organization administrators can access these settings.</p>
        </div>
      </div>
    );
  }

  return <OrganizationSettings />;
}