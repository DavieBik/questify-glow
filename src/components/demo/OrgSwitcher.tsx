import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, CheckCircle } from 'lucide-react';
import { getOrganizationConfig } from '@/config/organization';

export const OrgSwitcher: React.FC = () => {
  const organization = getOrganizationConfig();

  // Only show in development mode
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <CheckCircle className="h-5 w-5" />
          Single-Tenant Mode Active
        </CardTitle>
        <CardDescription className="text-emerald-600 dark:text-emerald-500">
          SkillBridge is running in single-tenant mode
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              {organization.name}
            </span>
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-500">
            All users are automatically assigned to this organization. 
            Organization switching has been removed for single-tenant deployments.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};