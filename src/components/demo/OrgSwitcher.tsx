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
    <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10 dark:border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary dark:text-primary">
          <CheckCircle className="h-5 w-5" />
          Single-Tenant Mode Active
        </CardTitle>
        <CardDescription className="text-primary/80 dark:text-primary/80">
          SkillBridge is running in single-tenant mode
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary dark:text-primary">
              {organization.name}
            </span>
          </div>
          <p className="text-xs text-primary/80 dark:text-primary/80">
            All users are automatically assigned to this organization. 
            Organization switching has been removed for single-tenant deployments.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};